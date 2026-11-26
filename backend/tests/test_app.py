"""The HTTP API end to end. Air data and Gemini are replaced by fakes, so no network is used."""
import unittest
from unittest.mock import patch

import air
import app as app_module
from config import SAFETY_ALERTS
from impact import aqi_category

BODY = {"city": "Delhi", "commute_mode": "car", "one_way_km": 10}
HOURS = (("3 PM", 80), ("4 PM", 150), ("5 PM", 210))
TIPS = {"source": "built-in", "routine": ["a"], "indoor": ["b"], "alternatives": ["c"]}


def reading(aqi=180, hours=HOURS):
    return air.AirReading("Delhi", "India", aqi, 95.2, hours)


class ApiTestCase(unittest.TestCase):
    def setUp(self):
        self.client = app_module.app.test_client()

    def plan(self, aqi=180, body=BODY, hours=HOURS):
        """POST /api/plan with fake air data and fake tips."""
        with patch("app.fetch_air_quality", return_value=reading(aqi, hours)), patch("app.get_advice", return_value=TIPS):
            return self.client.post("/api/plan", json=body)


class PlanTests(ApiTestCase):
    def test_success_returns_every_section(self):
        response = self.plan()
        data = response.get_json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(set(data), {"air", "alert", "outlook", "impact", "advice", "disclaimer"})
        self.assertEqual(data["air"]["category"], "Unhealthy")
        self.assertEqual(data["impact"]["monthly_co2_kg"], 72.6)
        self.assertEqual(data["outlook"]["best"]["label"], "3 PM")
        self.assertEqual(data["advice"], TIPS)
        self.assertIn("emergency number", data["disclaimer"])

    def test_each_unhealthy_band_gets_its_fixed_alert(self):
        for aqi in (120, 180, 250, 400):
            with self.subTest(aqi=aqi):
                self.assertEqual(self.plan(aqi).get_json()["alert"], SAFETY_ALERTS[aqi_category(aqi)])

    def test_clean_air_has_no_alert_and_no_forecast_is_fine(self):
        data = self.plan(aqi=60, hours=()).get_json()
        self.assertIsNone(data["alert"])
        self.assertIsNone(data["outlook"])

    def test_gemini_only_gets_calculated_facts(self):
        with patch("app.fetch_air_quality", return_value=reading()), patch("app.get_advice", return_value=TIPS) as ask:
            self.client.post("/api/plan", json={**BODY, "language": "hinglish"})
        facts = ask.call_args.args[0]
        self.assertEqual((facts["city"], facts["language"], facts["category"]), ("Delhi", "hinglish", "Unhealthy"))
        self.assertEqual(facts["monthly_co2_kg"], 72.6)
        self.assertNotIn("hours", facts)  # the raw forecast is shown to the user, not sent to the AI


class ErrorTests(ApiTestCase):
    def test_bad_input_is_a_400_with_a_message(self):
        for body in ({}, {"city": "x"}, {**BODY, "commute_mode": "jetpack"}, {**BODY, "one_way_km": -5}):
            with self.subTest(body=body):
                response = self.client.post("/api/plan", json=body)
                self.assertEqual(response.status_code, 400)
                self.assertTrue(response.get_json()["error"])

    def test_a_body_that_is_not_json_is_a_400(self):
        response = self.client.post("/api/plan", data="not json", content_type="text/plain")
        self.assertEqual((response.status_code, response.get_json()["error"]), (400, "Send a JSON object."))

    def test_unknown_city_is_a_400(self):
        with patch("app.fetch_air_quality", side_effect=ValueError("We couldn't find a city called 'Zzz'.")):
            self.assertEqual(self.client.post("/api/plan", json=BODY).status_code, 400)

    def test_data_provider_outage_is_a_502(self):
        with patch("app.fetch_air_quality", side_effect=air.AirQualityError("down")):
            response = self.client.post("/api/plan", json=BODY)
        self.assertEqual((response.status_code, response.get_json()["error"]), (502, "down"))

    def test_unexpected_errors_hide_their_details(self):
        with patch("app.fetch_air_quality", side_effect=RuntimeError("secret detail")), self.assertLogs("app", "ERROR"):
            response = self.client.post("/api/plan", json=BODY)
        self.assertEqual(response.status_code, 500)
        self.assertNotIn("secret", response.get_data(as_text=True))

    def test_http_errors_are_json_too(self):
        self.assertEqual(self.client.get("/nope").status_code, 404)
        self.assertEqual(self.client.get("/api/plan").status_code, 405)
        for path in ("/nope", "/api/plan"):
            self.assertIn("error", self.client.get(path).get_json())

    def test_oversized_bodies_are_refused(self):
        response = self.client.post("/api/plan", data="x" * 5000, content_type="application/json")
        self.assertEqual(response.status_code, 413)
        self.assertIn("error", response.get_json())


class OpenEndpointTests(ApiTestCase):
    def test_index_describes_the_api(self):
        self.assertEqual(self.client.get("/").get_json()["service"], "SmogSlayer API")

    def test_health(self):
        self.assertEqual(self.client.get("/health").get_json(), {"status": "ok"})

    def test_there_is_no_request_throttle_in_the_app(self):
        for _ in range(30):
            self.assertEqual(self.client.post("/api/plan", json={}).status_code, 400)  # never 429


class HeaderTests(ApiTestCase):
    def test_security_headers_are_on_successes_and_errors(self):
        for response in (self.plan(), self.client.get("/nope"), self.client.post("/api/plan", json={})):
            with self.subTest(status=response.status_code):
                self.assertEqual(response.headers["X-Content-Type-Options"], "nosniff")
                self.assertEqual(response.headers["Referrer-Policy"], "no-referrer")
                self.assertIn("default-src 'none'", response.headers["Content-Security-Policy"])

    def test_cors_is_only_granted_to_allowed_origins(self):
        with patch.object(app_module, "ALLOWED_ORIGINS", frozenset({"https://site.example"})):
            allowed = self.client.get("/health", headers={"Origin": "https://site.example"})
            other = self.client.get("/health", headers={"Origin": "https://evil.example"})
            none = self.client.get("/health")
            preflight = self.client.options("/api/plan", headers={"Origin": "https://site.example"})
        self.assertEqual(allowed.headers["Access-Control-Allow-Origin"], "https://site.example")
        self.assertNotIn("Access-Control-Allow-Origin", other.headers)
        self.assertNotIn("Access-Control-Allow-Origin", none.headers)
        self.assertEqual(preflight.headers["Access-Control-Allow-Headers"], "Content-Type")

    def test_origin_list_parsing(self):
        self.assertEqual(app_module._parse_origins("https://a.com, https://b.com,, "), frozenset({"https://a.com", "https://b.com"}))
        self.assertEqual(app_module._parse_origins(""), frozenset())


if __name__ == "__main__":
    unittest.main()
