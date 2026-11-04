// Venue opening hours, description and simulated head counts, shared by the list, map and venue page.
//
// Hours and description come from data/venues.json and can be overridden per browser from the settings
// dialog (localStorage "venueSettings"). Venues marked `simulated` have no camera yet: their count is a
// made-up demo value that changes every 40 minutes, following a daily curve for its category (CURVES).

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
// How busy a venue of each category is through the day (0..1), as [hour, level] points.
// The curves hand the crowd on through the night: tavern (meyhane) dinners peak 18–22, then people
// move on to bars and clubs; bars are steady all day, dip at 22 as the crowd heads to the clubs and
// peak after midnight when it comes back, emptying from 02; clubs fill 22–00 and thin out after.
const CURVES = {
  Meyhane:  [[0, 0.25], [1, 0.05], [2, 0], [14, 0], [15, 0.15], [17, 0.4], [18, 0.85], [19, 1], [21, 1], [22, 0.8], [23, 0.5], [24, 0.25]],
  Bar:      [[0, 0.9], [1, 1], [2, 0.9], [3, 0.4], [4, 0.1], [5, 0], [11, 0], [12, 0.4], [16, 0.5], [21, 0.55], [22, 0.4], [23, 0.35], [24, 0.9]],
  Pub:      [[0, 0.9], [1, 1], [2, 0.85], [3, 0.35], [4, 0.05], [5, 0], [11, 0], [12, 0.4], [16, 0.5], [21, 0.55], [22, 0.4], [23, 0.35], [24, 0.9]],
  Kulüp:    [[0, 0.95], [1, 0.75], [2, 0.6], [3, 0.4], [4, 0.1], [5, 0], [20, 0], [21, 0.15], [22, 0.45], [23, 0.85], [24, 0.95]],
  Restoran: [[0, 0.05], [1, 0], [10, 0], [11, 0.25], [12, 0.75], [13, 1], [15, 0.85], [17, 0.75], [18, 0.6], [20, 0.5], [22, 0.25], [24, 0.05]],
  Kafe:     [[0, 0.1], [1, 0], [7, 0], [8, 0.25], [10, 0.6], [13, 0.75], [16, 0.7], [18, 0.5], [21, 0.35], [23, 0.2], [24, 0.1]],
  Spor:     [[0, 0], [6, 0], [7, 0.5], [8, 0.8], [10, 0.4], [13, 0.2], [17, 0.6], [19, 1], [21, 0.5], [22, 0], [24, 0]],
  Otel:     [[0, 0.3], [6, 0.2], [9, 0.6], [12, 0.5], [18, 0.6], [22, 0.5], [24, 0.3]],
};
CURVES.default = CURVES.Bar;
function dayCurve(hour, type) {
  const pts = CURVES[type] || CURVES.default;
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

// Beach profile (Kitebeach): 30–50 early kiters 09:00–10:00, fills up from 10:00, swings between
// 1000 and 1200 from 12:00 to 16:00, eases off after 16:00 and empties abruptly once the sun has set.
function beachCount(v, at) {
  const h = at.getHours() + at.getMinutes() / 60, sunset = sunsetHour(at, v.location?.lat, v.location?.lon);
  const r = simRandom(`${v.id}:${slotStart(at).getTime()}`);
  if (h >= 12 && h < 16) return Math.round(1000 + r * 200);                 // 12–16: peak, 1000–1200
  if (h >= 9 && h < 10) return Math.round(30 + r * 20);                     // 09–10: 30–50
  let base;
  if (h < 9) base = 10 + (h - 8) * 20;                                       // 08–09: a handful
  else if (h < 12) base = 50 + Math.pow((h - 10) / 2, 1.6) * 950;            // 10–12: filling up to ~1000
  else if (h < sunset) base = 1100 - (h - 16) / Math.max(0.5, sunset - 16) * 700;  // 16–sunset: easing off to ~400
  else base = 400 * Math.exp(-(h - sunset) * 6);                             // after sunset: empties fast
  return Math.max(0, Math.round(base + (r - 0.5) * base * 0.15));
}

function simCount(v, at) {
  if (isClosed(v, at)) return 0;
  if (v.sim_profile === 'beach') return beachCount(v, at);
  const hour = at.getHours() + at.getMinutes() / 60;
  const busy = dayCurve(hour, v.type);
  const r = simRandom(`${v.id}:${slotStart(at).getTime()}`);
  if (busy < 0.08 || r < 0.04) return 0;                   // quiet hours, and the odd empty moment
  // Demo scale (halved): up to ~10 people at a category's peak, with ±15% noise.
  return Math.max(0, Math.round(10 * busy * (0.85 + r * 0.3)));
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
