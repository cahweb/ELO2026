import {
  detectTimeZone,
  formatTimeRange,
  groupEventsByDay,
  groupEventsIntoSessions,
  partitionEvents,
  sessionHeading,
  zoneLabel,
} from "./schedule-core.js";

const CONFERENCE_ZONE = "America/New_York";
const HLS_JS_SRC = "https://cdn.jsdelivr.net/npm/hls.js@1.5.15/dist/hls.min.js";

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

function renderEvent(ev, isPast) {
  const video =
    isPast && ev.video
      ? `
                <div class="recording">
                  <button type="button" class="watch-button" data-video="${esc(ev.video)}"
                          data-title="${esc(ev.title)}">
                    ▶ Watch recording
                  </button>
                </div>`
      : "";
  return `
              <li class="event-item${ev.featured ? " featured" : ""}">
                <h4 class="event-title">
                  <a href="${esc(ev.url)}" target="_blank" rel="noopener">
                    ${esc(ev.title)}<span class="visually-hidden"> (opens in new window on the STARS repository)</span>
                  </a>
                  ${ev.featured ? `<span class="badge featured-badge">Featured</span>` : ""}
                </h4>
                ${ev.presenters ? `<p class="event-meta">${esc(ev.presenters)}</p>` : ""}${video}
              </li>`;
}

function renderSession(session, sessionId, timeZone, isPast) {
  const { heading, description } = sessionHeading(session.type);
  const hasRecording = session.events.some((ev) => ev.video);
  const recordingNote =
    isPast && !hasRecording
      ? `<p class="recording-soon">Recording will be available soon.</p>`
      : "";
  return `
        <section class="session" aria-labelledby="${sessionId}">
          <h3 class="session-heading" id="${sessionId}">
            ${esc(heading)}
            ${description ? `<span class="session-desc">${esc(description)}</span>` : ""}
          </h3>
          <p class="session-meta">
            ${esc(formatTimeRange(session.start, session.end, timeZone))}
            ${session.track ? ` &middot; ${esc(session.track)} track` : ""}
          </p>
          <ul class="event-list">
            ${session.events.map((ev) => renderEvent(ev, isPast)).join("")}
          </ul>
          ${recordingNote}
        </section>`;
}

function renderDayGroups(events, timeZone, idPrefix, isPast) {
  return groupEventsByDay(events, timeZone)
    .map(
      (group) => `
      <section aria-labelledby="${idPrefix}-day-${esc(group.key)}">
        <h2 class="day-heading" id="${idPrefix}-day-${esc(group.key)}">${esc(group.label)}</h2>
        ${groupEventsIntoSessions(group.events)
          .map((session, i) =>
            renderSession(session, `${idPrefix}-session-${esc(group.key)}-${i}`, timeZone, isPast)
          )
          .join("")}
      </section>`
    )
    .join("");
}

function renderSchedule(events, timeZone) {
  const container = document.getElementById("schedule");
  const { upcoming, past } = partitionEvents(events, new Date());

  const upcomingHtml = upcoming.length
    ? renderDayGroups(upcoming, timeZone, "upcoming", false)
    : `<p class="section-note">The conference has concluded — thank you for joining us!
       Session recordings are below.</p>`;

  const pastHtml = past.length
    ? renderDayGroups(past, timeZone, "past", true)
    : `<p class="section-note">Recordings will appear here as sessions conclude.</p>`;

  container.innerHTML = `
      <section class="schedule-part" aria-labelledby="upcoming-heading">
        <h2 class="glow-subheading part-heading" id="upcoming-heading">Upcoming Events</h2>
        ${upcomingHtml}
      </section>
      <section class="schedule-part" aria-labelledby="past-heading">
        <h2 class="glow-subheading part-heading" id="past-heading">Past Session Recordings</h2>
        <p class="section-note">Recordings are added to
        <a href="https://stars.library.ucf.edu/elo2026/" target="_blank" rel="noopener">STARS</a>
        as they are processed. Sessions without a player yet will have one soon.</p>
        ${pastHtml}
      </section>`;

  document.getElementById("tz-note").textContent =
    `All times shown in ${zoneLabel(timeZone)}.` +
    (timeZone === CONFERENCE_ZONE ? " This is the conference's own time zone." : "");
}

// STARS recordings are HLS streams on S3 (CORS-enabled). Safari plays HLS
// natively; other browsers get hls.js, loaded once on the first play click.
let hlsLoader = null;
function loadHlsJs() {
  if (!hlsLoader) {
    hlsLoader = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = HLS_JS_SRC;
      script.onload = () => resolve(window.Hls);
      script.onerror = () => reject(new Error("hls.js failed to load"));
      document.head.appendChild(script);
    });
  }
  return hlsLoader;
}

async function playRecording(button) {
  const src = button.dataset.video;
  const title = button.dataset.title || "Session recording";
  const wrapper = button.closest(".recording");
  button.disabled = true;
  button.textContent = "Loading…";

  const video = document.createElement("video");
  video.controls = true;
  video.autoplay = true;
  video.playsInline = true;
  video.className = "recording-player";
  video.setAttribute("aria-label", `Recording: ${title}`);

  const fallback = () => {
    wrapper.innerHTML = `<p class="recording-soon">The recording could not be played here —
      <a href="${esc(src)}" target="_blank" rel="noopener">open the video stream directly</a>
      or view it on the session's STARS page.</p>`;
  };

  try {
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
    } else {
      const Hls = await loadHlsJs();
      if (!Hls || !Hls.isSupported()) throw new Error("HLS unsupported");
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (data.fatal) fallback();
      });
    }
    wrapper.replaceChildren(video);
  } catch {
    fallback();
  }
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

  document.getElementById("schedule").addEventListener("click", (evt) => {
    const button = evt.target.closest(".watch-button");
    if (button) playRecording(button);
  });

  const render = () => renderSchedule(payload.events, select.value);
  select.addEventListener("change", render);
  render();
}

init();
