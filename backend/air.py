"""Find a city and its current air quality with Open-Meteo (free, no API key)."""
import time
from dataclasses import dataclass
from functools import lru_cache

import requests

GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
AIR_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"
CACHE_SECONDS = 30 * 60
TIMEOUT_SECONDS = 8


class AirQualityError(Exception):
    """The air-quality service is down or returned nothing usable."""


@dataclass(frozen=True)
class AirReading:
    city: str
    country: str
    aqi: int
    pm25: float
    hours: tuple = ()  # next hours as (label, AQI) pairs


def _get_json(url, params):
    try:
        response = requests.get(url, params=params, timeout=TIMEOUT_SECONDS)
        response.raise_for_status()
        return response.json()
    except (requests.RequestException, ValueError) as err:
        raise AirQualityError("The air-quality service is unavailable right now.") from err


def _next_hours(hourly, now, count=24):
    """(label, AQI) pairs from the current hour onward, skipping gaps in the forecast."""
    rows = zip(hourly.get("time", []), hourly.get("us_aqi", []))
    upcoming = [(t, v) for t, v in rows if t[:13] >= now[:13] and v is not None][:count]
    return tuple((f"{int(t[11:13]) % 12 or 12} {'AM' if int(t[11:13]) < 12 else 'PM'}", round(v)) for t, v in upcoming)


@lru_cache(maxsize=256)
def _fetch(city, cache_window):
    # cache_window is never read: a new value every 30 minutes simply expires old entries.
    places = _get_json(GEOCODE_URL, {"name": city, "count": 1, "language": "en", "format": "json"}).get("results")
    if not places:
        raise ValueError(f"We couldn't find a city called '{city}'.")
    place = places[0]
    params = {
        "latitude": place["latitude"], "longitude": place["longitude"],
        "current": "us_aqi,pm2_5", "hourly": "us_aqi", "forecast_days": 2, "timezone": "auto",
    }
    data = _get_json(AIR_URL, params)
    current = data.get("current") or {}
    if current.get("us_aqi") is None or current.get("pm2_5") is None:
        raise AirQualityError("No live air-quality reading is available for that city.")
    hours = _next_hours(data.get("hourly") or {}, current.get("time", ""))
    return AirReading(place["name"], place.get("country", ""), round(current["us_aqi"]), current["pm2_5"], hours)


def fetch_air_quality(city):
    """Current AQI and PM2.5 for a city, cached for 30 minutes."""
    return _fetch(city.casefold(), int(time.time() // CACHE_SECONDS))
