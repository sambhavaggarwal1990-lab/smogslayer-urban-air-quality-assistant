"""Air quality data from Open-Meteo (free, no API key): find a city, then read its current AQI and forecast."""
import time
from dataclasses import dataclass
from functools import lru_cache

import requests

GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
AIR_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"
CACHE_SECONDS = 30 * 60   # how long a city's reading is reused
TIMEOUT_SECONDS = 8       # per request to Open-Meteo
FORECAST_HOURS = 24       # how many upcoming hours to keep


class AirQualityError(Exception):
    """The air quality service is down or returned nothing usable."""


@dataclass(frozen=True)
class AirReading:
    """What we know about one city right now."""

    city: str
    country: str
    aqi: int
    pm25: float
    hours: tuple = ()  # upcoming hours as (label, AQI) pairs, for example ("3 PM", 120)


def _get_json(url: str, params: dict) -> dict:
    """GET a JSON document. Any network or parsing failure becomes an AirQualityError with a safe message."""
    try:
        response = requests.get(url, params=params, timeout=TIMEOUT_SECONDS)
        response.raise_for_status()
        return response.json()
    except (requests.RequestException, ValueError) as err:
        raise AirQualityError("The air-quality service is unavailable right now.") from err


def _hour_label(timestamp: str) -> str:
    """'2026-11-17T21:00' -> '9 PM'. Hour 0 is '12 AM' and hour 12 is '12 PM'."""
    hour = int(timestamp[11:13])
    return f"{hour % 12 or 12} {'AM' if hour < 12 else 'PM'}"


def _next_hours(hourly: dict, now: str) -> tuple:
    """(label, AQI) pairs from the current hour onward, skipping hours the forecast has no value for."""
    pairs = zip(hourly.get("time", []), hourly.get("us_aqi", []))
    upcoming = [(t, value) for t, value in pairs if t[:13] >= now[:13] and value is not None]
    return tuple((_hour_label(t), round(value)) for t, value in upcoming[:FORECAST_HOURS])


@lru_cache(maxsize=256)
def _fetch(city: str, cache_window: int) -> AirReading:
    """Look a city up and read its air quality. Results are cached per (city, 30-minute window)."""
    # `cache_window` is never read: it changes every 30 minutes, which makes old cache entries expire.
    params = {"name": city, "count": 1, "language": "en", "format": "json"}
    places = _get_json(GEOCODE_URL, params).get("results")
    if not places:
        raise ValueError("We couldn't find that city. Check the spelling and try again.")
    place = places[0]

    data = _get_json(AIR_URL, {
        "latitude": place["latitude"], "longitude": place["longitude"],
        "current": "us_aqi,pm2_5", "hourly": "us_aqi", "forecast_days": 2, "timezone": "auto",
    })
    current = data.get("current") or {}
    if current.get("us_aqi") is None or current.get("pm2_5") is None:
        raise AirQualityError("No live air-quality reading is available for that city.")

    hours = _next_hours(data.get("hourly") or {}, current.get("time", ""))
    return AirReading(place["name"], place.get("country", ""), round(current["us_aqi"]), current["pm2_5"], hours)


def fetch_air_quality(city: str) -> AirReading:
    """Current AQI, PM2.5 and next-24-hour forecast for a city.

    Raises ValueError if the city is unknown and AirQualityError if the data cannot be read.
    """
    return _fetch(city.casefold(), int(time.time() // CACHE_SECONDS))
