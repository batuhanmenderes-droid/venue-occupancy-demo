// Venue opening hours, description and simulated head counts, shared by the list, map and venue page.
//
// Hours and description come from data/venues.json and can be overridden per browser from the settings
// dialog (localStorage "venueSettings"). Venues marked `simulated` have no camera yet: their count is a
// made-up demo value that changes every 40 minutes, 5–10 at busy times and lower or 0 at quiet times.

const SIM_SLOT_MIN = 40;

function readSettings() {
  try { return JSON.parse(localStorage.getItem('venueSettings') || '{}'); } catch { return {}; }
}
function writeSettings(all) {
  try { localStorage.setItem('venueSettings', JSON.stringify(all)); } catch {}
}
// Venue with this browser's overrides applied.
function withSettings(v) {
  const o = readSettings()[v.id];
  if (!o) return v;
  return { ...v, hours: o.hours !== undefined ? o.hours : v.hours, description: o.description ?? v.description };
}
function saveVenueSettings(id, hours, description) {
  const all = readSettings();
  all[id] = { hours, description };
  writeSettings(all);
}

// ---- Open / closing soon / closed ----
const toMin = hhmm => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
// state: 'open' | 'closing' (less than an hour left) | 'closed' | 'always' (no hours set).
function venueStatus(v, at = new Date()) {
  const h = v.hours;
  if (!h || !h.open || !h.close) return { state: 'always' };
  const now = at.getHours() * 60 + at.getMinutes();
  const open = toMin(h.open), close = toMin(h.close);
  const span = (close - open + 1440) % 1440 || 1440;      // overnight hours wrap past midnight
  const since = (now - open + 1440) % 1440;
  if (since >= span) return { state: 'closed', opens: h.open };
  const left = span - since;
  return left <= 60 ? { state: 'closing', closes: h.close, left } : { state: 'open', closes: h.close };
}
const isClosed = (v, at) => venueStatus(v, at).state === 'closed';

// ---- Simulated counts ----
function simRandom(seed) {
  let x = 2166136261;
  for (const c of seed) x = Math.imul(x ^ c.charCodeAt(0), 16777619);
  x = Math.imul(x ^ (x >>> 15), 2246822507);
  x = Math.imul(x ^ (x >>> 13), 3266489909);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}
// How busy a typical evening-leaning venue is at this hour (0..1).
function dayCurve(hour) {
  const pts = [[0, 0.55], [2, 0.25], [4, 0], [9, 0], [11, 0.3], [14, 0.5], [17, 0.6], [20, 1], [22, 0.95], [24, 0.55]];
  for (let i = 1; i < pts.length; i++) {
    const [h1, v1] = pts[i - 1], [h2, v2] = pts[i];
    if (hour <= h2) return v1 + (v2 - v1) * (hour - h1) / (h2 - h1);
  }
  return 0;
}
const slotStart = at => new Date(Math.floor(at.getTime() / (SIM_SLOT_MIN * 60000)) * SIM_SLOT_MIN * 60000);
const localIso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`;

function simCount(v, at) {
  if (isClosed(v, at)) return 0;
  const hour = at.getHours() + at.getMinutes() / 60;
  const busy = dayCurve(hour);
  const r = simRandom(`${v.id}:${slotStart(at).getTime()}`);
  if (busy < 0.15 || r < 0.06) return 0;                   // quiet hours, and the odd empty moment
  const level = Math.min(1, Math.max(0, busy * 0.85 + (r - 0.5) * 0.5));
  // Halved for the demo: quiet 0–6, busy 5–10.
  return Math.round((busy < 0.45 ? level * 12 : 10 + level * 10) / 2);
}
// One simulated frame per 40-minute slot of a business day (06:00 → 06:00), up to `until`.
function simFrames(v, day, until = new Date()) {
  const out = [];
  const start = new Date(`${day}T06:00:00`), end = new Date(start.getTime() + 24 * 3600000);
  for (let t = slotStart(start); t < end && t <= until; t = new Date(t.getTime() + SIM_SLOT_MIN * 60000)) {
    if (t < start) continue;
    out.push({ file: null, timestamp: localIso(t), camera: 'DEMO', people: simCount(v, t), note: '', note_en: '', simulated: true });
  }
  return out;
}
function simLatest(v, at = new Date()) {
  const s = slotStart(at);
  return { file: null, timestamp: localIso(s), people: simCount(v, s), simulated: true };
}
