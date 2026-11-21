import unittest

from impact import aqi_category, commute_impact, monthly_co2_kg
from ratelimit import RateLimiter
from validate import parse_request

VALID = {"city": "Delhi", "commute_mode": "car", "one_way_km": 10}


class ImpactTests(unittest.TestCase):
    def test_category_boundaries(self):
        self.assertEqual(aqi_category(50), "Good")
        self.assertEqual(aqi_category(51), "Moderate")
        self.assertEqual(aqi_category(500), "Hazardous")

    def test_monthly_co2(self):
        self.assertEqual(monthly_co2_kg("car", 10), 74.8)  # 0.17 kg/km * 10 km * 2 trips * 22 days

    def test_switches_are_cleaner_and_sorted_by_saving(self):
        modes = [s["mode"] for s in commute_impact("car", 10)["switches"]]
        self.assertEqual(modes, ["walk_or_cycle", "metro", "bus", "motorbike"])

    def test_cleanest_mode_has_no_switches(self):
        self.assertEqual(commute_impact("walk_or_cycle", 10)["switches"], [])


class ValidateTests(unittest.TestCase):
    def test_accepts_valid_input(self):
        expected = {**VALID, "one_way_km": 10.0, "sensitive_group": False, "has_purifier": False, "language": "en"}
        self.assertEqual(parse_request(VALID), expected)

    def test_rejects_bad_values(self):
        bad = [None, {**VALID, "city": "<script>"}, {**VALID, "commute_mode": "jetpack"},
               {**VALID, "one_way_km": -1}, {**VALID, "one_way_km": 500},
               {**VALID, "one_way_km": True}, {**VALID, "one_way_km": float("nan")}]
        for data in bad:
            with self.subTest(data=data), self.assertRaises(ValueError):
                parse_request(data)


class RateLimiterTests(unittest.TestCase):
    def test_blocks_after_limit_then_recovers(self):
        limiter = RateLimiter(limit=2, window=60)
        self.assertTrue(limiter.allow("a", now=0))
        self.assertTrue(limiter.allow("a", now=1))
        self.assertFalse(limiter.allow("a", now=2))
        self.assertTrue(limiter.allow("b", now=2))  # other clients are unaffected
        self.assertTrue(limiter.allow("a", now=61))


if __name__ == "__main__":
    unittest.main()
