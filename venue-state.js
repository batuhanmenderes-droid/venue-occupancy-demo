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

// Local sunset (hours, local clock) for a lat/lon, NOAA approximation; good to a few minutes.
function sunsetHour(at, lat = 37.05, lon = 28.33) {
  const rad = Math.PI / 180;
  const start = new Date(at.getFullYear(), 0, 0);
  const day = Math.floor((at - start) / 86400000);
  const g = 2 * Math.PI / 365 * (day - 1);
  const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const ha = Math.acos(Math.cos(90.833 * rad) / (Math.cos(lat * rad) * Math.cos(decl)) - Math.tan(lat * rad) * Math.tan(decl)) / rad;
  const utcMin = 720 - 4 * (lon - ha) - eqt;               // minutes after UTC midnight
  return (utcMin - at.getTimezoneOffset()) / 60;
}

// Beach profile (Kitebeach): fills from 11:00 to 13:00, stays at its 1000–1200 peak until 16:00,
// eases off after 16:00 and empties abruptly once the sun has set.
function beachCount(v, at) {
  const h = at.getHours() + at.getMinutes() / 60, sunset = sunsetHour(at, v.location?.lat, v.location?.lon);
  const r = simRandom(`${v.id}:${slotStart(at).getTime()}`);
  let base;
  if (h < 11) base = 40 + (h - 8) / 3 * 160;                         // 08–11: early kiters, up to ~200
  else if (h < 13) base = 200 + (h - 11) / 2 * 900;                   // 11–13: filling up to ~1100
  else if (h < 16) base = 1100;                                       // 13–16: peak
  else if (h < sunset) base = 1100 - (h - 16) / Math.max(0.5, sunset - 16) * 700;  // easing off to ~400
  else base = 400 * Math.exp(-(h - sunset) * 6);                      // after sunset: empties fast
  const jitter = h >= 13 && h < 16 ? (r - 0.5) * 200 : (r - 0.5) * base * 0.15;
  return Math.max(0, Math.round(h >= 13 && h < 16 ? Math.min(1200, Math.max(1000, base + jitter)) : base + jitter));
}

function simCount(v, at) {
  if (isClosed(v, at)) return 0;
  if (v.sim_profile === 'beach') return beachCount(v, at);
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

// ---- Trend ----
// "rising" when the latest count is clearly above where it stood up to an hour and a half ago
// (the oldest frame 30–90 minutes back): at least +5 people and +15%.
function isRising(latest, earlier) {
  if (!latest || !earlier) return false;
  const d = latest.people - earlier.people;
  return d >= 5 && d >= earlier.people * 0.15;
}
function risingFromFrames(frames) {
  const last = frames[frames.length - 1];
  if (!last) return false;
  const t = new Date(last.timestamp).getTime();
  const back = frames.filter(f => { const m = (t - new Date(f.timestamp).getTime()) / 60000; return m >= 30 && m <= 90; });
  return isRising(last, back[0]);  // frames are in time order, so back[0] is the oldest in the window
}
function risingSim(v, at = new Date()) {
  const now = simLatest(v, at), before = simLatest(v, new Date(at.getTime() - 60 * 60000));
  return isRising(now, before);
}
