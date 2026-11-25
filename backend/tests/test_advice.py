"""Tips from Gemini: success, every kind of failure, safety checks, caching and the built-in fallback."""
import logging
import os
import unittest
from unittest.mock import patch

import requests

import advice
from config import FALLBACK_TIPS, SENSITIVE_TIP

TIPS = {"routine": ["a"], "indoor": ["b"], "alternatives": ["c"]}
FACTS = {"city": "Delhi", "aqi": 180, "sensitive_group": True, "language": "en"}


class AdviceTestCase(unittest.TestCase):
    def setUp(self):
        advice._cache.clear()
        logging.disable(logging.CRITICAL)  # expected failures log warnings; keep the test output clean
        self.addCleanup(logging.disable, logging.NOTSET)
        env = patch.dict(os.environ)
        env.start()
        os.environ.pop("GEMINI_MODEL", None)
        self.addCleanup(env.stop)

    def with_tip(self, section, text):
        return {**TIPS, section: [text]}


class GeminiTests(AdviceTestCase):
    @patch("advice._ask_gemini", return_value=TIPS)
    def test_valid_answer_is_used(self, _):
        self.assertEqual(advice.get_advice(FACTS), {"source": "gemini", **TIPS})

    def test_any_failure_falls_back_to_builtin_tips(self):
        failures = [requests.Timeout(), requests.ConnectionError(), requests.HTTPError("503"), KeyError("candidates"),
                    IndexError(), ValueError("bad json"), TypeError()]
        for failure in failures:
            with self.subTest(failure=repr(failure)), patch("advice._ask_gemini", side_effect=failure):
                self.assertEqual(advice.get_advice(FACTS)["source"], "built-in")

    def test_wrongly_shaped_answers_are_rejected(self):
        shapes = [{}, {"routine": "text", "indoor": ["b"], "alternatives": ["c"]}, self.with_tip("indoor", 5),
                  {**TIPS, "alternatives": []}, {**TIPS, "routine": ["fine", ""]}, {**TIPS, "routine": [None]}]
        for shape in shapes:
            with self.subTest(shape=shape), patch("advice._ask_gemini", return_value=shape):
                self.assertEqual(advice.get_advice(FACTS)["source"], "built-in")

    def test_missing_api_key_uses_builtin_tips_without_any_network_call(self):
        with patch.dict(os.environ, clear=True), patch("advice.requests.post") as post:
            self.assertEqual(advice.get_advice(FACTS)["source"], "built-in")
        post.assert_not_called()

    def test_prompt_mentions_the_city_and_language(self):
        with patch("advice._ask_gemini", return_value=TIPS) as ask:
            advice.get_advice({**FACTS, "language": "hi"})
        prompt = ask.call_args.args[0]
        self.assertIn("Delhi", prompt)
        self.assertIn("Hindi", prompt)


class ModelChoiceTests(AdviceTestCase):
    def test_second_model_is_tried_when_the_first_fails(self):
        with patch("advice._ask_gemini", side_effect=[requests.Timeout(), TIPS]) as ask:
            self.assertEqual(advice.get_advice(FACTS), {"source": "gemini", **TIPS})
        self.assertEqual([call.args[1] for call in ask.call_args_list], [advice.DEFAULT_MODEL, advice.FALLBACK_MODEL])

    def test_both_models_failing_gives_builtin_tips(self):
        with patch("advice._ask_gemini", side_effect=requests.Timeout()) as ask:
            self.assertEqual(advice.get_advice(FACTS)["source"], "built-in")
        self.assertEqual(ask.call_count, 2)

    def test_model_list_follows_the_environment(self):
        self.assertEqual(advice._models(), (advice.DEFAULT_MODEL, advice.FALLBACK_MODEL))
        os.environ["GEMINI_MODEL"] = "my-model"
        self.assertEqual(advice._models(), ("my-model", advice.FALLBACK_MODEL))
        os.environ["GEMINI_MODEL"] = advice.FALLBACK_MODEL
        self.assertEqual(advice._models(), (advice.FALLBACK_MODEL,))


class SafetyTests(AdviceTestCase):
    def test_medical_words_and_links_are_blocked(self):
        for text in ("Take your medication", "the right medicine", "Check the dosage", "ask for a prescription",
                     "self diagnosis", "a quick cure", "see https://spam.example", "go to http://x.y"):
            with self.subTest(text=text), patch("advice._ask_gemini", return_value=self.with_tip("indoor", text)):
                self.assertEqual(advice.get_advice(FACTS)["source"], "built-in")

    def test_harmless_words_that_contain_cure_are_allowed(self):
        with patch("advice._ask_gemini", return_value=self.with_tip("indoor", "Use a secure window seal")):
            self.assertEqual(advice.get_advice(FACTS)["source"], "gemini")

    def test_answers_are_trimmed_to_the_limits(self):
        long_answer = {name: ["  " + "x" * 300 + "  "] * 6 for name in advice.SECTIONS}
        with patch("advice._ask_gemini", return_value=long_answer):
            result = advice.get_advice(FACTS)
        for name in advice.SECTIONS:
            self.assertEqual(len(result[name]), advice.MAX_TIPS)
            self.assertTrue(all(len(tip) == advice.MAX_TIP_CHARS for tip in result[name]))


class BuiltinTipTests(AdviceTestCase):
    def test_tier_edges(self):
        for aqi, tier in ((0, "ok"), (100, "ok"), (101, "poor"), (200, "poor"), (201, "severe"), (500, "severe")):
            with self.subTest(aqi=aqi):
                self.assertEqual(advice._tier(aqi), tier)

    def test_sensitive_caution_only_when_needed(self):
        self.assertNotIn(SENSITIVE_TIP, advice._fallback(50, True)["routine"])
        self.assertNotIn(SENSITIVE_TIP, advice._fallback(150, False)["routine"])
        self.assertIn(SENSITIVE_TIP, advice._fallback(150, True)["routine"])

    def test_the_shared_table_is_never_modified(self):
        advice._fallback(150, True)
        self.assertNotIn(SENSITIVE_TIP, FALLBACK_TIPS["poor"]["routine"])


class CacheTests(AdviceTestCase):
    def test_repeat_requests_reuse_the_gemini_answer(self):
        with patch("advice._ask_gemini", return_value=TIPS) as ask:
            first, second = advice.get_advice(FACTS), advice.get_advice(FACTS)
        self.assertEqual(first, second)
        self.assertEqual(ask.call_count, 1)

    def test_builtin_tips_are_not_cached_so_gemini_is_retried(self):
        with patch("advice._ask_gemini", side_effect=requests.Timeout()) as ask:
            advice.get_advice(FACTS)
            advice.get_advice(FACTS)
        self.assertEqual(ask.call_count, 4)  # two models, twice

    def test_different_facts_are_cached_separately(self):
        with patch("advice._ask_gemini", return_value=TIPS) as ask:
            advice.get_advice(FACTS)
            advice.get_advice({**FACTS, "aqi": 90})
        self.assertEqual(ask.call_count, 2)

    def test_old_entries_expire(self):
        with patch("advice.time.monotonic", side_effect=[0, 5000]):
            advice._cache_put("k", TIPS)
            self.assertIsNone(advice._cache_get("k"))

    def test_the_cache_drops_its_oldest_entry_when_full(self):
        with patch("advice.CACHE_MAX_ENTRIES", 2):
            for key in ("a", "b", "c"):
                advice._cache_put(key, TIPS)
        self.assertEqual(list(advice._cache), ["b", "c"])


if __name__ == "__main__":
    unittest.main()
