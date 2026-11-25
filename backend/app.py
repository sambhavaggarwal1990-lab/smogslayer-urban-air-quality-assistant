"""SmogSlayer API: a small Flask app with one real endpoint, POST /api/plan.

Request flow: validate input -> read live air quality -> compute AQI category, alert and CO2 numbers in code
-> let Gemini write tips from those facts -> return everything as JSON.
"""
import logging
import os
from dataclasses import asdict

from flask import Flask, jsonify, request
from werkzeug.exceptions import HTTPException

from advice import get_advice
from air import AirQualityError, fetch_air_quality
from config import SAFETY_ALERTS
from impact import aqi_category, commute_impact, outlook
from validate import parse_request

logger = logging.getLogger(__name__)

MAX_BODY_BYTES = 2048  # a valid request is a few hundred bytes, so anything bigger is refused
DISCLAIMER = (
    "General guidance based on modelled air-quality estimates, not medical advice. If anyone has trouble "
    "breathing, chest pain or dizziness, get medical help now and call your local emergency number."
)


def _parse_origins(value: str) -> frozenset[str]:
    """'a.com, b.com' -> frozenset({'a.com', 'b.com'}). Empty entries are ignored."""
    return frozenset(origin.strip() for origin in value.split(",") if origin.strip())


# Websites allowed to call this API from a browser (CORS), for example the published frontend. Empty = none.
ALLOWED_ORIGINS = _parse_origins(os.environ.get("ALLOWED_ORIGINS", ""))

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_BODY_BYTES


@app.after_request
def add_response_headers(response):
    """Add security headers to every response, and CORS headers when the caller's origin is allowed."""
    response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"  # this API serves no pages
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    origin = request.headers.get("Origin")
    if origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        response.headers["Vary"] = "Origin"
    return response


@app.errorhandler(HTTPException)
def handle_http_error(error: HTTPException):
    """Known HTTP errors (404, 405, 413...) as JSON instead of an HTML page."""
    return jsonify(error=error.description), error.code


@app.errorhandler(Exception)
def handle_unexpected_error(error: Exception):
    """Anything else: log the details on the server, but never show them (or a stack trace) to the caller."""
    logger.exception("Unhandled error")
    return jsonify(error="Something went wrong on the server. Please try again."), 500


@app.get("/")
def index():
    """A tiny description of the API, so visiting the address in a browser shows something useful."""
    return jsonify(service="SmogSlayer API", endpoints={"POST /api/plan": "get an air quality plan", "GET /health": "status check"})


@app.get("/health")
def health():
    """Used by the hosting platform (and by people) to check that the server is awake."""
    return jsonify(status="ok")


def _build_facts(inputs: dict, air: dict, category: str, impact: dict) -> dict:
    """Everything Gemini is allowed to know. All numbers here were calculated by code, not by the AI."""
    return {
        **air,
        "category": category,
        "commute_mode": inputs["commute_mode"],
        "one_way_km": inputs["one_way_km"],
        "monthly_co2_kg": impact["monthly_co2_kg"],
        "co2_saved_if_switched": impact["switches"],
        "sensitive_group": inputs["sensitive_group"],
        "has_purifier": inputs["has_purifier"],
        "language": inputs["language"],
    }


@app.post("/api/plan")
def plan():
    """Return today's air quality, safety alert, 24-hour outlook, commute impact and tips for one household."""
    try:
        inputs = parse_request(request.get_json(silent=True))
        reading = fetch_air_quality(inputs["city"])
    except ValueError as error:          # bad input or unknown city: the caller can fix it
        return jsonify(error=str(error)), 400
    except AirQualityError as error:     # the data provider is down: not the caller's fault
        return jsonify(error=str(error)), 502

    air = asdict(reading)
    hours = air.pop("hours")             # the forecast goes into `outlook`, not into the facts for Gemini
    category = aqi_category(reading.aqi)
    impact = commute_impact(inputs["commute_mode"], inputs["one_way_km"])
    return jsonify(
        air={**air, "category": category},
        alert=SAFETY_ALERTS.get(category),  # None when the air is good or moderate
        outlook=outlook(hours),
        impact=impact,
        advice=get_advice(_build_facts(inputs, air, category, impact)),
        disclaimer=DISCLAIMER,
    )
