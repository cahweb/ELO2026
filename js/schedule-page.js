import {
  detectTimeZone,
  formatTimeRange,
  groupEventsByDay,
  zoneLabel,
} from "./schedule-core.js";

const CONFERENCE_ZONE = "America/New_York";

const ZONES = [
  ["America/New_York", "Conference time — US Eastern"],
  ["America/Chicago", "US Central"],
  ["America/Denver", "US Mountain"],
  ["America/Los_Angeles", "US Pacific"],
  ["America/Sao_Paulo", "Brazil — São Paulo"],
  ["America/Argentina/Buenos_Aires", "Argentina — Buenos Aires"],
  ["UTC", "UTC"],
  ["Europe/London", "UK & Ireland"],
  ["Europe/Paris", "Central Europe"],
  ["Europe/Helsinki", "Eastern Europe"],
  ["Asia/Kolkata", "India"],
  ["Asia/Shanghai", "China"],
  ["Asia/Tokyo", "Japan & Korea"],
  ["Australia/Sydney", "Australia — Eastern"],
  ["Pacific/Auckland", "New Zealand"],
];

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);

function renderSchedule(events, timeZone) {
  const container = document.getElementById("schedule");
  const groups = groupEventsByDay(events, timeZone);
  container.innerHTML = groups
    .map(
      (group) => `
      <section aria-labelledby="day-${group.key}">
        <h2 class="day-heading" id="day-${group.key}">${esc(group.label)}</h2>
        <ul class="event-list">
          ${group.events
            .map(
              (ev) => `
            <li class="event-item${ev.featured ? " featured" : ""}">
              <p class="event-time">${esc(formatTimeRange(ev.start, ev.end, timeZone))}</p>
              <h3 class="event-title">
                <a href="${esc(ev.url)}" target="_blank" rel="noopener">
                  ${esc(ev.title)}<span class="visually-hidden"> (opens in new window on the STARS repository)</span>
                </a>
                ${ev.type ? `<span class="badge">${esc(ev.type)}</span>` : ""}
                ${ev.featured ? `<span class="badge featured-badge">Featured</span>` : ""}
              </h3>
              ${ev.presenters ? `<p class="event-meta">${esc(ev.presenters)}</p>` : ""}
              ${ev.track ? `<p class="event-meta">Track: ${esc(ev.track)}</p>` : ""}
            </li>`
            )
            .join("")}
        </ul>
      </section>`
    )
    .join("");

  document.getElementById("tz-note").textContent =
    `All times shown in ${zoneLabel(timeZone)}.` +
    (timeZone === CONFERENCE_ZONE ? " This is the conference's own time zone." : "");
}

async function init() {
  const select = document.getElementById("tz-select");
  const detected = detectTimeZone();

  const options = [[detected, `Your time zone — ${zoneLabel(detected)}`]].concat(
    ZONES.filter(([zone]) => zone !== detected)
  );
  select.innerHTML = options
    .map(([zone, label]) => `<option value="${esc(zone)}">${esc(label)}</option>`)
    .join("");

  let payload;
  try {
    const resp = await fetch("data/events.json");
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    payload = await resp.json();
  } catch (err) {
    document.getElementById("schedule").innerHTML = `
      <div class="status-message">
        <p>Sorry — the schedule could not be loaded right now.</p>
        <p><a href="https://stars.library.ucf.edu/elo2026/combined_schedule/">View the full schedule on STARS</a>
        (times listed there are US Eastern).</p>
      </div>`;
    return;
  }

  const synced = new Date(payload.generated).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  document.getElementById("sync-note").innerHTML =
    `Schedule last synced from <a href="${esc(payload.source)}">STARS</a> on ${esc(synced)}. ` +
    `Session times entered in STARS are US Eastern.`;

  const render = () => renderSchedule(payload.events, select.value);
  select.addEventListener("change", render);
  render();
}

init();
