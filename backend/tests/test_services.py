import unittest
from unittest.mock import Mock, patch

import requests

import advice
import air
import app as app_module
from config import SENSITIVE_TIP
from ratelimit import RateLimiter

GEO = {"results": [{"name": "Delhi", "country": "India", "latitude": 28.6, "longitude": 77.2}]}
AIR = {"current": {"us_aqi": 180.4, "pm2_5": 95.2}}
READING = air.AirReading("Delhi", "India", 180, 95.2)
FACTS = {"city": "Delhi", "aqi": 180, "sensitive_group": True}
TIPS = {"routine": ["a"], "indoor": ["b"], "alternatives": ["c"]}
BODY = {"city": "Delhi", "commute_mode": "car", "one_way_km": 10}


def fake_response(payload):
    response = Mock()
    response.json.return_value = payload
    return response


class AirTests(unittest.TestCase):
    def setUp(self):
        air._fetch.cache_clear()

    @patch("air.requests.get", side_effect=[fake_response(GEO), fake_response(AIR)])
    def test_reads_city_and_air_quality_then_caches(self, get):
        reading = air.fetch_air_quality("Delhi")
        self.assertEqual((reading.city, reading.aqi, reading.pm25), ("Delhi", 180, 95.2))
        air.fetch_air_quality("delhi")
        self.assertEqual(get.call_count, 2)  # the second lookup came from the cache

    @patch("air.requests.get", return_value=fake_response({}))
    def test_unknown_city(self, _):
        with self.assertRaises(ValueError):
            air.fetch_air_quality("Nowhereville")

    @patch("air.requests.get", side_effect=requests.ConnectionError)
    def test_network_failure(self, _):
        with self.assertRaises(air.AirQualityError):
            air.fetch_air_quality("Delhi")


class AdviceTests(unittest.TestCase):
    @patch("advice._ask_gemini", return_value=TIPS)
    def test_uses_gemini_when_reply_is_valid(self, _):
        self.assertEqual(advice.get_advice(FACTS), {"source": "gemini", **TIPS})

    @patch("advice._ask_gemini", return_value={"routine": "not a list"})
    def test_falls_back_on_unexpected_shape(self, _):
        result = advice.get_advice(FACTS)
        self.assertEqual(result["source"], "built-in")
        self.assertIn(SENSITIVE_TIP, result["routine"])

    @patch("advice._ask_gemini", side_effect=requests.Timeout)
    def test_falls_back_on_network_error(self, _):
        self.assertEqual(advice.get_advice(FACTS)["source"], "built-in")


class AppTests(unittest.TestCase):
    def setUp(self):
        app_module.limiter = RateLimiter(limit=2, window=60)
        self.client = app_module.app.test_client()

    def test_index_page(self):
        self.assertIn(b"Urban Air Quality Assistant", self.client.get("/").data)

    @patch("app.get_advice", return_value={"source": "built-in", **TIPS})
    @patch("app.fetch_air_quality", return_value=READING)
    def test_plan_has_air_impact_and_advice(self, *_):
        response = self.client.post("/api/plan", json=BODY)
        data = response.get_json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data["air"]["category"], "Unhealthy")
        self.assertEqual(data["impact"]["monthly_co2_kg"], 74.8)
        self.assertIn("default-src 'self'", response.headers["Content-Security-Policy"])

    def test_bad_input_is_400(self):
        self.assertEqual(self.client.post("/api/plan", json={"city": "x"}).status_code, 400)

    @patch("app.fetch_air_quality", side_effect=air.AirQualityError("down"))
    def test_upstream_failure_is_502(self, _):
        self.assertEqual(self.client.post("/api/plan", json=BODY).status_code, 502)

    def test_rate_limit_is_429(self):
        for _ in range(2):
            self.client.post("/api/plan", json={})
        self.assertEqual(self.client.post("/api/plan", json={}).status_code, 429)


if __name__ == "__main__":
    unittest.main()
