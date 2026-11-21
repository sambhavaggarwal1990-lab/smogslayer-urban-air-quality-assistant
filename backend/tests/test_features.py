import unittest
from unittest.mock import patch

import advice
import air
import app as app_module
from impact import outlook
from ratelimit import RateLimiter
from validate import parse_request

HOURS = (("3 PM", 80), ("4 PM", 150), ("5 PM", 210))
TIPS = {"routine": ["a"], "indoor": ["b"], "alternatives": ["c"]}
BASE = {"city": "Delhi", "commute_mode": "bus", "one_way_km": 5}


class OutlookTests(unittest.TestCase):
    def test_finds_best_and_worst_hour(self):
        result = outlook(HOURS)
        self.assertEqual((result["best"]["label"], result["worst"]["label"]), ("3 PM", "5 PM"))
        self.assertEqual(result["hours"][2]["category"], "Very unhealthy")

    def test_no_forecast_gives_none(self):
        self.assertIsNone(outlook(()))

    def test_next_hours_skip_past_and_gaps(self):
        hourly = {"time": ["2026-11-17T08:00", "2026-11-17T21:00", "2026-11-17T22:00", "2026-11-17T23:00"],
                  "us_aqi": [50, 120.4, None, 90]}
        self.assertEqual(air._next_hours(hourly, "2026-11-17T21:15"), (("9 PM", 120), ("11 PM", 90)))


class SafetyTests(unittest.TestCase):
    def test_language_is_checked(self):
        self.assertEqual(parse_request({**BASE, "language": "hi"})["language"], "hi")
        with self.assertRaises(ValueError):
            parse_request({**BASE, "language": ["hi"]})

    def test_unsafe_ai_tips_fall_back(self):
        for bad in ("Take this medication twice daily", "Visit https://spam.example"):
            with self.subTest(bad=bad), patch("advice._ask_gemini", return_value={**TIPS, "indoor": [bad]}):
                result = advice.get_advice({"city": "Delhi", "aqi": 80, "sensitive_group": False})
                self.assertEqual(result["source"], "built-in")


class AppFeatureTests(unittest.TestCase):
    def setUp(self):
        app_module.limiter = RateLimiter(limit=5, window=60)
        self.client = app_module.app.test_client()

    @patch("app.get_advice", return_value={"source": "built-in", **TIPS})
    @patch("app.fetch_air_quality", return_value=air.AirReading("Delhi", "India", 320, 210.0, HOURS))
    def test_hazardous_air_returns_alert_and_outlook(self, *_):
        data = self.client.post("/api/plan", json=BASE).get_json()
        self.assertIn("hazardous", data["alert"].lower())
        self.assertEqual(data["outlook"]["best"]["label"], "3 PM")
        self.assertIn("emergency number", data["disclaimer"])

    def test_oversized_body_is_rejected(self):
        response = self.client.post("/api/plan", data="x" * 5000, content_type="application/json")
        self.assertEqual(response.status_code, 413)


    def test_cors_header_only_for_allowed_origin(self):
        with patch.object(app_module, "ALLOWED_ORIGINS", {"http://localhost:8080"}):
            allowed = self.client.get("/health", headers={"Origin": "http://localhost:8080"})
            other = self.client.get("/health", headers={"Origin": "http://evil.example"})
        self.assertEqual(allowed.headers.get("Access-Control-Allow-Origin"), "http://localhost:8080")
        self.assertNotIn("Access-Control-Allow-Origin", other.headers)


if __name__ == "__main__":
    unittest.main()
