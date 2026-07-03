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
  }).format(new Date(iso)).replace(/ | /g, " ");
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

export function zoneLabel(timeZone) {
  return timeZone.replaceAll("/", " / ").replaceAll("_", " ");
}
