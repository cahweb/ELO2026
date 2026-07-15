// Pure time/formatting helpers for the schedule page.
// Event times arrive as UTC ISO instants in data/events.json; every
// conversion goes through Intl.DateTimeFormat with an explicit timeZone.

export function detectTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
  } catch {
    return "America/New_York";
  }
}

function formatTime(iso, timeZone) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(iso)).replace(/[\u202f\u00a0]/g, " ");
}

export function formatTimeRange(startIso, endIso, timeZone) {
  return `${formatTime(startIso, timeZone)} – ${formatTime(endIso, timeZone)}`;
}

export function formatDayLabel(iso, timeZone) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone,
  }).format(new Date(iso));
}

export function dayKey(iso, timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).format(new Date(iso));
}

export function groupEventsByDay(events, timeZone) {
  const sorted = [...events].sort(
    (a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title)
  );
  const groups = new Map();
  for (const ev of sorted) {
    const key = dayKey(ev.start, timeZone);
    if (!groups.has(key)) {
      groups.set(key, { key, label: formatDayLabel(ev.start, timeZone), events: [] });
    }
    groups.get(key).events.push(ev);
  }
  return [...groups.values()].sort((a, b) => a.key.localeCompare(b.key));
}

// Once the conference is live the schedule splits in two: sessions still to
// come, and concluded sessions whose recordings are (or will be) on STARS.
// An event counts as past once its end time has been reached.
export function partitionEvents(events, now) {
  const cutoff = (now instanceof Date ? now : new Date(now)).getTime();
  const upcoming = [];
  const past = [];
  for (const ev of events) {
    (new Date(ev.end).getTime() <= cutoff ? past : upcoming).push(ev);
  }
  return { upcoming, past };
}

export function zoneLabel(timeZone) {
  return timeZone.replaceAll("/", " / ").replaceAll("_", " ");
}

// Display headings for the session types used in STARS. "Individual Talk"
// entries are individual papers that STARS schedules together into one
// shared time slot, so the heading describes the whole session.
const SESSION_TYPE_HEADINGS = {
  Plenary: { heading: "Plenary" },
  Keynote: { heading: "Keynote" },
  Panel: { heading: "Panel" },
  Workshop: { heading: "Workshop" },
  "Individual Talk": {
    heading: "Individual Paper Session",
    description: "3–4 papers, 10–12 minutes each",
  },
  Performance: {
    heading: "Performance Session",
    description: "Performances of 10–15 minutes each",
  },
  "Experimental Track": { heading: "Experimental Track" },
};

export function sessionHeading(type) {
  return SESSION_TYPE_HEADINGS[type] || { heading: type || "Session" };
}

// Events sharing a time slot, track, and type form one session (e.g. the
// 3–4 papers of an individual paper session). Sessions are ordered by
// start time, then track, so parallel sessions sit next to each other.
export function groupEventsIntoSessions(events) {
  const map = new Map();
  for (const ev of events) {
    const key = [ev.start, ev.end, ev.track || "", ev.type || ""].join("|");
    if (!map.has(key)) {
      map.set(key, {
        start: ev.start,
        end: ev.end,
        track: ev.track || "",
        type: ev.type || "",
        events: [],
      });
    }
    map.get(key).events.push(ev);
  }
  const sessions = [...map.values()];
  for (const session of sessions) {
    session.events.sort((a, b) => a.title.localeCompare(b.title));
  }
  return sessions.sort(
    (a, b) =>
      a.start.localeCompare(b.start) ||
      a.track.localeCompare(b.track) ||
      a.type.localeCompare(b.type)
  );
}
