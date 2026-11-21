"""Check and clean the request body before anything else touches it."""
import re

from config import COMMUTE_MODES, LANGUAGE_CODES, MAX_ONE_WAY_KM

CITY_PATTERN = re.compile(r"[A-Za-z\u00C0-\u024F .,'\-]{2,60}")


def parse_request(data):
    """Return clean inputs, or raise ValueError with a message that is safe to show."""
    if not isinstance(data, dict):
        raise ValueError("Send a JSON object.")
    city = str(data.get("city", "")).strip()
    if not CITY_PATTERN.fullmatch(city):
        raise ValueError("Enter a city name using letters only (2-60 characters).")
    mode = data.get("commute_mode")
    if mode not in COMMUTE_MODES:
        raise ValueError("Choose one of the listed commute modes.")
    km = data.get("one_way_km")
    if isinstance(km, bool) or not isinstance(km, (int, float)) or not 0 <= km <= MAX_ONE_WAY_KM:
        raise ValueError(f"Distance must be a number from 0 to {MAX_ONE_WAY_KM} km.")
    language = data.get("language", "en")
    if language not in LANGUAGE_CODES:
        raise ValueError("Choose one of the listed languages.")
    return {
        "city": city,
        "language": language,
        "commute_mode": mode,
        "one_way_km": float(km),
        "sensitive_group": data.get("sensitive_group") is True,
        "has_purifier": data.get("has_purifier") is True,
    }
