"""Personalised tips: Gemini writes them, and safe built-in tips step in whenever it cannot.

The flow in `get_advice`: reuse a recent answer -> ask Gemini (lighter model first, then the fallback model)
-> check the answer is safe -> otherwise use the built-in tips. The app therefore always has tips to show.
"""
import json
import logging
import os
import re
import time

import requests

from config import FALLBACK_TIPS, LANGUAGES, SENSITIVE_TIP

logger = logging.getLogger(__name__)

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
DEFAULT_MODEL = "gemini-3.5-flash-lite"  # lighter and faster, so it is overloaded less often
FALLBACK_MODEL = "gemini-flash-latest"   # tried next if the first model fails
SECTIONS = ("routine", "indoor", "alternatives")
MAX_TIPS, MAX_TIP_CHARS = 4, 220         # limits applied to whatever Gemini returns
TIMEOUT_SECONDS = 20                     # per Gemini request
CACHE_SECONDS, CACHE_MAX_ENTRIES = 30 * 60, 256

# Gemini output containing medical terms or links is rejected (see _clean).
UNSAFE = re.compile(r"medicat|medicine|dosage|prescri|diagnos|\bcure|https?://", re.IGNORECASE)

PROMPT = """You are an urban air-quality assistant helping a family in {city} cope with air pollution.
Use only the facts below and never invent measurements. sensitive_group means children, older adults or people with asthma live at home.
Facts: {facts}
Reply with JSON only: {{"routine": [...], "indoor": [...], "alternatives": [...]}}
- routine: low-emission daily habits that suit today's air quality
- indoor: indoor air-quality hacks (consider whether they own a purifier)
- alternatives: sustainable options that quote the CO2 savings from the facts
Write 3 short, practical tips per list, in {language}. Give no medical advice or links."""

# Recent Gemini answers, so repeated requests do not use up the free quota. Built-in tips are never stored here.
_cache: dict[str, tuple[float, dict]] = {}


def _models() -> tuple[str, ...]:
    """Models to try, in order: GEMINI_MODEL (or the default), then the fallback model."""
    primary = os.environ.get("GEMINI_MODEL", DEFAULT_MODEL)
    return tuple(dict.fromkeys((primary, FALLBACK_MODEL)))  # dict.fromkeys drops a duplicate but keeps the order


def _ask_gemini(prompt: str, model: str) -> dict:
    """Send the prompt to one Gemini model and return its JSON reply. The API key travels in a header, never in the URL."""
    response = requests.post(
        GEMINI_URL.format(model=model),
        headers={"x-goog-api-key": os.environ["GEMINI_API_KEY"]},
        json={"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"responseMimeType": "application/json"}},
        timeout=TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    return json.loads(response.json()["candidates"][0]["content"]["parts"][0]["text"])


def _clean(data: dict) -> dict:
    """Keep only the expected lists of short, safe strings; raise ValueError for any other shape or content."""
    tips = {}
    for name in SECTIONS:
        items = data[name]
        if not isinstance(items, list) or not items or not all(isinstance(t, str) and t.strip() for t in items):
            raise ValueError(f"Unexpected '{name}' section")
        if any(UNSAFE.search(t) for t in items):
            raise ValueError(f"Unsafe content in '{name}'")
        tips[name] = [t.strip()[:MAX_TIP_CHARS] for t in items[:MAX_TIPS]]
    return tips


def _tier(aqi: float) -> str:
    """Which built-in tip set suits this AQI: 'ok' (up to 100), 'poor' (up to 200) or 'severe'."""
    if aqi <= 100:
        return "ok"
    return "poor" if aqi <= 200 else "severe"


def _fallback(aqi: float, sensitive_group: bool) -> dict:
    """Built-in tips for this AQI, with an extra caution when sensitive people live at home."""
    tier = _tier(aqi)
    tips = {name: list(items) for name, items in FALLBACK_TIPS[tier].items()}  # copy, so the table is never changed
    if sensitive_group and tier != "ok":
        tips["routine"].append(SENSITIVE_TIP)
    return tips


def _cache_get(key: str) -> dict | None:
    """A stored answer that is younger than CACHE_SECONDS, or None."""
    hit = _cache.get(key)
    return hit[1] if hit and time.monotonic() - hit[0] < CACHE_SECONDS else None


def _cache_put(key: str, tips: dict) -> None:
    """Store an answer, dropping the oldest entry when the cache is full."""
    if len(_cache) >= CACHE_MAX_ENTRIES:
        _cache.pop(next(iter(_cache)))
    _cache[key] = (time.monotonic(), tips)


def get_advice(facts: dict) -> dict:
    """Tips for these facts. The `source` field says whether Gemini or the built-in tips wrote them."""
    key = json.dumps(facts, sort_keys=True)
    cached = _cache_get(key)
    if cached:
        return {"source": "gemini", **cached}

    prompt = PROMPT.format(city=facts["city"], facts=key, language=LANGUAGES[facts.get("language", "en")])
    for model in _models():
        try:
            tips = _clean(_ask_gemini(prompt, model))
        except (KeyError, IndexError, TypeError, ValueError, requests.RequestException) as err:
            detail = getattr(getattr(err, "response", None), "text", "")[:200]  # Google's own error text, never the key
            logger.warning("Gemini (%s) unavailable: %s %s", model, err, detail)
            continue
        _cache_put(key, tips)
        return {"source": "gemini", **tips}
    return {"source": "built-in", **_fallback(facts["aqi"], facts["sensitive_group"])}
