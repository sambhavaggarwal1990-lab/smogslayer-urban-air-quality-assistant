"""Sanity checks for the lookup tables, so a typo in config.py is caught immediately."""
import math
import unittest

from config import AQI_BANDS, COMMUTE_MODES, EMISSION_KG_PER_KM, FALLBACK_TIPS, LANGUAGE_CODES, SAFETY_ALERTS


class ConfigTests(unittest.TestCase):
    def test_aqi_bands_increase_and_the_last_one_is_open_ended(self):
        limits = [limit for limit, _ in AQI_BANDS]
        self.assertEqual(limits, sorted(limits))
        self.assertTrue(math.isinf(limits[-1]))

    def test_emission_factors_are_sane(self):
        self.assertTrue(all(factor >= 0 for factor in EMISSION_KG_PER_KM.values()))
        self.assertEqual(EMISSION_KG_PER_KM["walk_or_cycle"], 0)
        self.assertEqual(COMMUTE_MODES, tuple(EMISSION_KG_PER_KM))

    def test_builtin_tips_cover_every_tier_and_section(self):
        self.assertEqual(set(FALLBACK_TIPS), {"ok", "poor", "severe"})
        for tier, sections in FALLBACK_TIPS.items():
            self.assertEqual(set(sections), {"routine", "indoor", "alternatives"}, tier)
            for tips in sections.values():
                self.assertTrue(tips and all(isinstance(tip, str) and tip for tip in tips))

    def test_safety_alerts_use_real_categories_and_skip_safe_air(self):
        labels = {label for _, label in AQI_BANDS}
        self.assertLessEqual(set(SAFETY_ALERTS), labels)
        self.assertNotIn("Good", SAFETY_ALERTS)
        self.assertNotIn("Moderate", SAFETY_ALERTS)

    def test_supported_languages(self):
        self.assertEqual(set(LANGUAGE_CODES), {"en", "hi", "hinglish"})


if __name__ == "__main__":
    unittest.main()
