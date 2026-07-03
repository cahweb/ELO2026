import json
import unittest
from pathlib import Path

from scripts.fetch_schedule import parse_schedule, _to_utc_iso

FIXTURE = Path(__file__).parent / "fixtures" / "combined_schedule.html"


class ToUtcIsoTests(unittest.TestCase):
    def test_eastern_wall_clock_converts_to_utc(self):
        # 12:30 PM EDT on July 15 is 16:30 UTC
        self.assertEqual(_to_utc_iso("2026-07-15T123000"), "2026-07-15T16:30:00Z")

    def test_keynote_time(self):
        self.assertEqual(_to_utc_iso("2026-07-18T130000"), "2026-07-18T17:00:00Z")


class ParseScheduleTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.events = parse_schedule(FIXTURE.read_text(encoding="utf-8"))

    def test_finds_a_full_schedule(self):
        self.assertGreater(len(self.events), 50)

    def test_first_event_is_welcome_remarks(self):
        ev = self.events[0]
        self.assertEqual(ev["title"], "ELO 2026 (Un)Supervised Conference Welcome Remarks")
        self.assertEqual(ev["url"], "https://stars.library.ucf.edu/elo2026/combined_schedule/all/1")
        self.assertEqual(ev["start"], "2026-07-15T16:30:00Z")
        self.assertEqual(ev["end"], "2026-07-15T16:45:00Z")
        self.assertEqual(ev["track"], "Algorithms & Imaginaries")
        self.assertEqual(ev["type"], "Plenary")
        self.assertIn("Anastasia Salter", ev["presenters"])

    def test_no_duplicate_urls(self):
        urls = [e["url"] for e in self.events]
        self.assertEqual(len(urls), len(set(urls)))

    def test_every_event_has_required_fields(self):
        for ev in self.events:
            self.assertTrue(ev["title"], msg=ev)
            self.assertTrue(ev["url"].startswith("https://stars.library.ucf.edu/"), msg=ev)
            self.assertRegex(ev["start"], r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$", msg=ev)
            self.assertLessEqual(ev["start"], ev["end"], msg=ev)

    def test_html_entities_are_unescaped(self):
        titles = " ".join(e["title"] for e in self.events)
        self.assertNotIn("&quot;", titles)
        self.assertNotIn("&amp;", titles)


if __name__ == "__main__":
    unittest.main()
