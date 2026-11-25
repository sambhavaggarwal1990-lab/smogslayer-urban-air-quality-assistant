"""Input validation: what the API accepts and what it refuses."""
import unittest

from validate import parse_request

VALID = {"city": "Delhi", "commute_mode": "car", "one_way_km": 10}


class ParseRequestTests(unittest.TestCase):
    def assert_rejected(self, data):
        with self.assertRaises(ValueError):
            parse_request(data)

    def test_valid_request_gets_defaults(self):
        expected = {"city": "Delhi", "commute_mode": "car", "one_way_km": 10.0, "language": "en",
                    "sensitive_group": False, "has_purifier": False}
        self.assertEqual(parse_request(VALID), expected)

    def test_city_is_trimmed_and_accented_letters_are_allowed(self):
        self.assertEqual(parse_request({**VALID, "city": "  São Paulo "})["city"], "São Paulo")

    def test_bad_cities_are_rejected(self):
        for city in ("", " ", "A", "x" * 61, "<script>", "Delhi123", "Delhi;DROP", None, 5, ["Delhi"], {"a": 1}):
            with self.subTest(city=city):
                self.assert_rejected({**VALID, "city": city})

    def test_error_message_never_repeats_the_input(self):
        with self.assertRaises(ValueError) as caught:
            parse_request({**VALID, "city": "<script>alert(1)</script>"})
        self.assertNotIn("script", str(caught.exception))

    def test_commute_mode_must_be_listed(self):
        for mode in ("jetpack", "", None, ["car"], {"a": 1}, 5):
            with self.subTest(mode=mode):
                self.assert_rejected({**VALID, "commute_mode": mode})

    def test_distance_limits(self):
        for km in (0, 0.5, 100):
            with self.subTest(ok=km):
                self.assertEqual(parse_request({**VALID, "one_way_km": km})["one_way_km"], float(km))
        for km in (-0.1, 100.1, "10", None, True, False, float("nan"), float("inf"), [5]):
            with self.subTest(bad=km):
                self.assert_rejected({**VALID, "one_way_km": km})

    def test_checkboxes_need_a_real_true(self):
        for value in ("true", "yes", 1, "on", None):
            with self.subTest(value=value):
                self.assertFalse(parse_request({**VALID, "sensitive_group": value})["sensitive_group"])
        self.assertTrue(parse_request({**VALID, "has_purifier": True})["has_purifier"])

    def test_language_choice(self):
        for code in ("en", "hi", "hinglish"):
            self.assertEqual(parse_request({**VALID, "language": code})["language"], code)
        for code in ("fr", "", None, ["hi"]):
            with self.subTest(code=code):
                self.assert_rejected({**VALID, "language": code})

    def test_body_must_be_an_object(self):
        for body in (None, [], "text", 5):
            with self.subTest(body=body):
                self.assert_rejected(body)


if __name__ == "__main__":
    unittest.main()
