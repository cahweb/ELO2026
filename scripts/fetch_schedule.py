"""Scrape the ELO 2026 combined schedule from STARS into data/events.json.

STARS (Digital Commons) publishes wall-clock times that are US Eastern
(America/New_York); its RSS feed mislabels them PDT. We parse the hCalendar
microformat rows on the combined-schedule page and store UTC instants.
"""

import json
import re
import sys
import urllib.request
from datetime import datetime, timezone
from html import unescape
from pathlib import Path
from zoneinfo import ZoneInfo

SCHEDULE_URL = "https://stars.library.ucf.edu/elo2026/combined_schedule/"
RSS_URL = "https://stars.library.ucf.edu/elo2026/combined_schedule/all/recent-events.rss"
OUTPUT = Path(__file__).resolve().parent.parent / "data" / "events.json"
EASTERN = ZoneInfo("America/New_York")
USER_AGENT = "ELO2026-schedule-sync (github.com/AMSUCF/ELO2026)"
MIN_EVENTS = 50


def _to_utc_iso(stamp):
    dt = datetime.strptime(stamp, "%Y-%m-%dT%H%M%S").replace(tzinfo=EASTERN)
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _clean(fragment):
    text = re.sub(r"<[^>]+>", " ", fragment)
    text = unescape(text)
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\s+,", ",", text)
    return text.strip().rstrip(",")


def _abbr_stamp(block, cls):
    for tag in re.findall(r"<abbr[^>]+>", block):
        if f'class="{cls}"' in tag:
            m = re.search(r'title="([^"]+)"', tag)
            if m:
                return m.group(1)
    return None


def _field(block, cls):
    m = re.search(rf'<p class="{cls}">(.*?)</p>', block, re.S)
    return _clean(m.group(1)) if m else ""


def parse_schedule(html):
    events = []
    seen = set()
    for chunk in re.split(r'<tr[^>]*class="vevent[^"]*"[^>]*>', html)[1:]:
        block = chunk.split("</tr>")[0]
        summary = re.search(r'<p class="summary"><a href="([^"]+)"\s*>(.*?)</a>', block, re.S)
        start = _abbr_stamp(block, "dtstart")
        if not summary or not start:
            continue
        url = summary.group(1).strip()
        if url in seen:
            continue
        seen.add(url)
        end = _abbr_stamp(block, "dtend") or start
        events.append({
            "title": _clean(summary.group(2)),
            "url": url,
            "presenters": _field(block, "presenters"),
            "track": _field(block, "location"),
            "type": _field(block, "document_type"),
            "start": _to_utc_iso(start),
            "end": _to_utc_iso(end),
        })
    return events
