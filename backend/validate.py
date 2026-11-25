"""Input validation: check the request body before anything else touches it.

Free text never reaches the AI model. The city is pattern-checked, everything else is a fixed choice
or a bounded number, which also keeps prompt-injection out of the Gemini prompt.
"""
import re

from config import COMMUTE_MODES, LANGUAGE_CODES, MAX_ONE_WAY_KM

# Letters (including accented ones), spaces and . , ' - only; 2 to 60 characters.
CITY_PATTERN = re.compile(r"[A-Za-z\u00C0-\u024F .,'\-]{2,60}")


def _clean_city(value: object) -> str:
    """Return the trimmed city name, or raise ValueError if it looks wrong."""
    city = str(value or "").strip()
    if not CITY_PATTERN.fullmatch(city):
        raise ValueError("Enter a city name using letters only (2-60 characters).")
    return city


def _choice(value: object, allowed: tuple[str, ...], message: str) -> str:
    """Return `value` if it is one of the allowed strings. A tuple is used so unhashable input cannot crash."""
    if value not in allowed:
        raise ValueError(message)
    return value  # type: ignore[return-value]


def _distance(value: object) -> float:
    """Return a one-way distance in km between 0 and MAX_ONE_WAY_KM. Booleans and NaN are rejected."""
    is_number = isinstance(value, (int, float)) and not isinstance(value, bool)
    if not is_number or not 0 <= value <= MAX_ONE_WAY_KM:  # NaN fails the comparison, so it is rejected too
        raise ValueError(f"Distance must be a number from 0 to {MAX_ONE_WAY_KM} km.")
    return float(value)


def parse_request(data: object) -> dict:
    """Validate the JSON body and return clean inputs, or raise ValueError with a message safe to show."""
    if not isinstance(data, dict):
        raise ValueError("Send a JSON object.")
    return {
        "city": _clean_city(data.get("city")),
        "commute_mode": _choice(data.get("commute_mode"), COMMUTE_MODES, "Choose one of the listed commute modes."),
        "one_way_km": _distance(data.get("one_way_km")),
        "language": _choice(data.get("language", "en"), LANGUAGE_CODES, "Choose one of the listed languages."),
        # Checkboxes count as ticked only when they are exactly `true`, never for strings like "yes".
        "sensitive_group": data.get("sensitive_group") is True,
        "has_purifier": data.get("has_purifier") is True,
    }
