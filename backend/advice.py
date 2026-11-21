"""Personalised tips: Gemini writes them, built-in tips step in if it fails."""
import json
import logging
import os
import re

import requests

from config import FALLBACK_TIPS, LANGUAGES, SENSITIVE_TIP

logger = logging.getLogger(__name__)
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
FALLBACK_MODEL = "gemini-flash-latest"
SECTIONS = ("routine", "indoor", "alternatives")
MAX_TIPS, MAX_TIP_CHARS, TIMEOUT_SECONDS = 4, 220, 20
UNSAFE = re.compile(r"medicat|medicine|dosage|prescri|diagnos|\bcure|https?://", re.IGNORECASE)  # no medical claims or links

PROMPT = """You are an urban air-quality assistant helping a family in {city} cope with air pollution.
Use only the facts below and never invent measurements. sensitive_group means children, older adults or people with asthma live at home.
Facts: {facts}
Reply with JSON only: {{"routine": [...], "indoor": [...], "alternatives": [...]}}
- routine: low-emission daily habits that suit today's air quality
- indoor: indoor air-quality hacks (consider whether they own a purifier)
- alternatives: sustainable options that quote the CO2 savings from the facts
Write 3 short, practical tips per list, in {language}. Give no medical advice or links."""


def _models():
    """The lighter Flash-Lite model first (faster, less often overloaded), then the latest Flash."""
    primary = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash-lite")
    return tuple(dict.fromkeys((primary, FALLBACK_MODEL)))


def _ask_gemini(prompt, model):
    response = requests.post(
        GEMINI_URL.format(model=model),
        headers={"x-goog-api-key": os.environ["GEMINI_API_KEY"]},
        json={"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"responseMimeType": "application/json"}},
        timeout=TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    return json.loads(response.json()["candidates"][0]["content"]["parts"][0]["text"])


def _clean(data):
    """Keep only the expected lists of short strings; raise ValueError on any other shape."""
    tips = {}
    for name in SECTIONS:
        items = data[name]
        if not isinstance(items, list) or not items or not all(isinstance(t, str) and t.strip() for t in items):
            raise ValueError(f"Unexpected '{name}' section")
        if any(UNSAFE.search(t) for t in items):
            raise ValueError(f"Unsafe content in '{name}'")
        tips[name] = [t.strip()[:MAX_TIP_CHARS] for t in items[:MAX_TIPS]]
    return tips


def _fallback(aqi, sensitive_group):
    tier = "ok" if aqi <= 100 else "poor" if aqi <= 200 else "severe"
    tips = {name: list(items) for name, items in FALLBACK_TIPS[tier].items()}
    if sensitive_group and tier != "ok":
        tips["routine"].append(SENSITIVE_TIP)
    return tips


def get_advice(facts):
    """Tips for the given facts. `source` says whether Gemini or the built-in tips wrote them."""
    prompt = PROMPT.format(city=facts["city"], facts=json.dumps(facts), language=LANGUAGES[facts.get("language", "en")])
    for model in _models():
        try:
            return {"source": "gemini", **_clean(_ask_gemini(prompt, model))}
        except (KeyError, IndexError, TypeError, ValueError, requests.RequestException) as err:
            detail = getattr(getattr(err, "response", None), "text", "")[:200]  # the API key is sent in a header, never logged
            logger.warning("Gemini (%s) unavailable: %s %s", model, err, detail)
    return {"source": "built-in", **_fallback(facts["aqi"], facts["sensitive_group"])}