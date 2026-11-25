"""Reading air quality from Open-Meteo. The network is always replaced by fake responses."""
import unittest
from unittest.mock import Mock, patch

import requests

import air

GEO = {"results": [{"name": "Delhi", "country": "India", "latitude": 28.6, "longitude": 77.2}]}
AIR = {
    "current": {"time": "2026-11-17T21:15", "us_aqi": 180.4, "pm2_5": 95.2},
    "hourly": {"time": ["2026-11-17T20:00", "2026-11-17T21:00", "2026-11-17T22:00"], "us_aqi": [150, 180.4, 170.6]},
}


def reply(payload):
    """A stand-in for a successful HTTP response carrying `payload` as JSON."""
    response = Mock()
    response.json.return_value = payload
    return response


class FetchTests(unittest.TestCase):
    def setUp(self):
        air._fetch.cache_clear()

    @patch("air.requests.get", side_effect=[reply(GEO), reply(AIR)])
    def test_reads_city_air_quality_and_forecast(self, _):
        reading = air.fetch_air_quality("Delhi")
        self.assertEqual((reading.city, reading.country, reading.aqi, reading.pm25), ("Delhi", "India", 180, 95.2))
        self.assertEqual(reading.hours, (("9 PM", 180), ("10 PM", 171)))  # the 8 PM hour is already in the past

    @patch("air.requests.get", side_effect=[reply(GEO), reply(AIR)])
    def test_second_lookup_comes_from_the_cache_even_with_different_case(self, get):
        air.fetch_air_quality("Delhi")
        air.fetch_air_quality("DELHI")
        self.assertEqual(get.call_count, 2)  # one geocode call + one air call, nothing more

    @patch("air.requests.get", side_effect=[reply(GEO), reply(AIR), reply(GEO), reply(AIR)])
    def test_cache_expires_after_the_window(self, get):
        with patch("air.time.time", side_effect=[0, 10_000]):
            air.fetch_air_quality("Delhi")
            air.fetch_air_quality("Delhi")
        self.assertEqual(get.call_count, 4)

    def test_unknown_city_raises_value_error(self):
        for payload in ({}, {"results": []}):
            air._fetch.cache_clear()
            with self.subTest(payload=payload), patch("air.requests.get", return_value=reply(payload)):
                with self.assertRaises(ValueError) as caught:
                    air.fetch_air_quality("Nowhereville")
                self.assertIn("couldn't find that city", str(caught.exception))

    def test_network_problems_become_air_quality_errors(self):
        broken_json = Mock()
        broken_json.json.side_effect = ValueError("not json")
        bad_status = Mock()
        bad_status.raise_for_status.side_effect = requests.HTTPError("503")
        for failure in (requests.ConnectionError(), requests.Timeout(), broken_json, bad_status):
            air._fetch.cache_clear()
            kwargs = {"side_effect": failure} if isinstance(failure, Exception) else {"return_value": failure}
            with self.subTest(failure=repr(failure)), patch("air.requests.get", **kwargs):
                with self.assertRaises(air.AirQualityError):
                    air.fetch_air_quality("Delhi")

    def test_missing_readings_raise_air_quality_error(self):
        broken = [{}, {"current": {}}, {"current": {"us_aqi": 50}}, {"current": {"pm2_5": 9.0}}]
        for payload in broken:
            air._fetch.cache_clear()
            with self.subTest(payload=payload), patch("air.requests.get", side_effect=[reply(GEO), reply(payload)]):
                with self.assertRaises(air.AirQualityError):
                    air.fetch_air_quality("Delhi")


class HelperTests(unittest.TestCase):
    def test_hour_labels(self):
        cases = {"00": "12 AM", "01": "1 AM", "11": "11 AM", "12": "12 PM", "13": "1 PM", "23": "11 PM"}
        for hour, label in cases.items():
            with self.subTest(hour=hour):
                self.assertEqual(air._hour_label(f"2026-11-17T{hour}:00"), label)

    def test_next_hours_skips_the_past_and_missing_values(self):
        hourly = {"time": ["2026-11-17T08:00", "2026-11-17T21:00", "2026-11-17T22:00", "2026-11-17T23:00"],
                  "us_aqi": [50, 120.4, None, 90]}
        self.assertEqual(air._next_hours(hourly, "2026-11-17T21:15"), (("9 PM", 120), ("11 PM", 90)))

    def test_next_hours_keeps_at_most_24(self):
        times = [f"2026-11-{17 + h // 24}T{h % 24:02d}:00" for h in range(48)]
        hourly = {"time": times, "us_aqi": [100] * 48}
        self.assertEqual(len(air._next_hours(hourly, "2026-11-17T00:00")), 24)

    def test_next_hours_copes_with_empty_input(self):
        self.assertEqual(air._next_hours({}, "2026-11-17T21:00"), ())
        self.assertEqual(air._next_hours({"time": ["2026-11-17T21:00"], "us_aqi": [80]}, ""), (("9 PM", 80),))


if __name__ == "__main__":
    unittest.main()
