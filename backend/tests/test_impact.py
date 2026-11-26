"""The calculations: AQI categories, commute emissions and the 24-hour outlook."""
import unittest

from impact import aqi_category, commute_impact, monthly_co2_kg, outlook


class AqiCategoryTests(unittest.TestCase):
    def test_every_band_edge(self):
        cases = [(0, "Good"), (50, "Good"), (51, "Moderate"), (100, "Moderate"),
                 (101, "Unhealthy for sensitive groups"), (150, "Unhealthy for sensitive groups"),
                 (151, "Unhealthy"), (200, "Unhealthy"), (201, "Very unhealthy"), (300, "Very unhealthy"),
                 (301, "Hazardous"), (500, "Hazardous")]
        for aqi, expected in cases:
            with self.subTest(aqi=aqi):
                self.assertEqual(aqi_category(aqi), expected)


class CommuteTests(unittest.TestCase):
    def test_monthly_co2_for_every_mode(self):
        # 10 km each way, 2 trips a day, 22 working days.
        expected = {"car": 72.6, "motorbike": 50.2, "bus": 47.5, "metro": 15.4, "walk_or_cycle": 0.0}
        for mode, kg in expected.items():
            with self.subTest(mode=mode):
                self.assertEqual(monthly_co2_kg(mode, 10), kg)

    def test_emissions_grow_with_distance(self):
        self.assertEqual(monthly_co2_kg("car", 20), 2 * monthly_co2_kg("car", 10))

    def test_switches_are_cleaner_only_and_sorted_by_saving(self):
        modes = lambda mode: [s["mode"] for s in commute_impact(mode, 10)["switches"]]
        self.assertEqual(modes("car"), ["walk_or_cycle", "metro", "bus", "motorbike"])
        self.assertEqual(modes("metro"), ["walk_or_cycle"])
        self.assertEqual(modes("walk_or_cycle"), [])

    def test_savings_are_the_difference_between_modes(self):
        savings = {s["mode"]: s["saves_kg"] for s in commute_impact("car", 10)["switches"]}
        self.assertEqual(savings["metro"], 57.2)  # 72.6 - 15.4
        self.assertEqual(savings["walk_or_cycle"], 72.6)

    def test_zero_distance_means_nothing_to_save(self):
        result = commute_impact("car", 0)
        self.assertEqual(result["monthly_co2_kg"], 0)
        self.assertEqual(result["switches"], [])


class OutlookTests(unittest.TestCase):
    HOURS = (("3 PM", 80), ("4 PM", 150), ("5 PM", 210))

    def test_finds_best_and_worst_hour(self):
        result = outlook(self.HOURS)
        self.assertEqual((result["best"]["label"], result["worst"]["label"]), ("3 PM", "5 PM"))

    def test_every_row_has_a_category(self):
        categories = [row["category"] for row in outlook(self.HOURS)["hours"]]
        self.assertEqual(categories, ["Moderate", "Unhealthy for sensitive groups", "Very unhealthy"])

    def test_ties_pick_the_earliest_hour(self):
        result = outlook((("1 PM", 90), ("2 PM", 90)))
        self.assertEqual((result["best"]["label"], result["worst"]["label"]), ("1 PM", "1 PM"))

    def test_no_forecast_gives_none(self):
        self.assertIsNone(outlook(()))


if __name__ == "__main__":
    unittest.main()
