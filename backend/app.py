"""Flask entry point: serves the page and the /api/plan endpoint."""
import os
from dataclasses import asdict

from flask import Flask, jsonify, render_template, request
from werkzeug.middleware.proxy_fix import ProxyFix

from advice import get_advice
from air import AirQualityError, fetch_air_quality
from config import SAFETY_ALERTS
from impact import aqi_category, commute_impact, outlook
from ratelimit import RateLimiter
from validate import parse_request

DISCLAIMER = ("General guidance based on modelled air-quality estimates, not medical advice. If anyone has trouble "
              "breathing, chest pain or dizziness, get medical help now and call your local emergency number.")

ALLOWED_ORIGINS = {o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()}

app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1)  # real client IP behind Render's proxy
app.config["MAX_CONTENT_LENGTH"] = 2048  # requests are tiny, so refuse big ones
limiter = RateLimiter(limit=10, window=60)


@app.after_request
def add_security_headers(response):
    response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none'"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    origin = request.headers.get("Origin")
    if origin in ALLOWED_ORIGINS:  # lets the separate React frontend call this API
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        response.headers["Vary"] = "Origin"
    return response


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/health")
def health():
    return jsonify(status="ok")


@app.post("/api/plan")
def plan():
    if not limiter.allow(request.remote_addr):
        return jsonify(error="Too many requests. Please wait a minute."), 429
    try:
        inputs = parse_request(request.get_json(silent=True))
        reading = fetch_air_quality(inputs["city"])
    except ValueError as err:
        return jsonify(error=str(err)), 400
    except AirQualityError as err:
        return jsonify(error=str(err)), 502

    air_data = asdict(reading)
    hours = air_data.pop("hours")
    category = aqi_category(reading.aqi)
    impact = commute_impact(inputs["commute_mode"], inputs["one_way_km"])
    facts = {
        **air_data,
        "category": category,
        "commute_mode": inputs["commute_mode"],
        "one_way_km": inputs["one_way_km"],
        "monthly_co2_kg": impact["monthly_co2_kg"],
        "co2_saved_if_switched": impact["switches"],
        "sensitive_group": inputs["sensitive_group"],
        "has_purifier": inputs["has_purifier"],
        "language": inputs["language"],
    }
    return jsonify(air={**air_data, "category": category}, alert=SAFETY_ALERTS.get(category), outlook=outlook(hours),
                   impact=impact, advice=get_advice(facts), disclaimer=DISCLAIMER)
