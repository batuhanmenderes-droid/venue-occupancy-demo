// Crowd levels shared by the venue list, heatmap and venue page.
// Bands are inclusive: 0–10 blue, 11–20 green, 21–30 yellow, 31–40 orange, 41+ crimson (same as the map's heat colours).
const LEVELS_DEFAULT = [
  { max: 10, color: '#0e6bdd' },
  { max: 20, color: '#16ca64' },
  { max: 30, color: '#ffc800' },
  { max: 40, color: '#dd5e27' },
  { max: Infinity, color: '#c11a4c' },
];
// Thresholds and colours can be changed in the map's "Occupancy levels" panel (saved per browser).
const LEVELS = LEVELS_DEFAULT.map(l => ({ ...l }));
function loadLevels() {
  try {
    const saved = JSON.parse(localStorage.getItem('levelSettings') || 'null');
    if (Array.isArray(saved)) saved.forEach((l, i) => { if (LEVELS[i]) { if (l.max != null && i < 4) LEVELS[i].max = l.max; if (l.color) LEVELS[i].color = l.color; } });
  } catch {}
  syncRanges();
}
// The thresholds above are for a busy town (about 1500 people out across all venues). With fewer people out
// they stretch up, so a venue is only purple when it is a real outlier: scale = √(1500 / total), between 1×
// and 3× (e.g. 100 people in town → 3×: Quiet 0–30 … Very crowded 121+). The list page sets it from the
// live total; the venue page reuses the last value.
const LEVEL_REF_TOTAL = 1500;
let LEVEL_SCALE = (() => { try { return Math.min(3, Math.max(1, +localStorage.getItem('levelScale') || 1)); } catch { return 1; } })();
const scaledMax = l => l.max === Infinity ? Infinity : Math.round(l.max * LEVEL_SCALE);
function setLevelScale(total) {
  const k = total > 0 ? Math.min(3, Math.max(1, Math.sqrt(LEVEL_REF_TOTAL / total))) : 1;
  LEVEL_SCALE = Math.round(k * 100) / 100;
  try { localStorage.setItem('levelScale', LEVEL_SCALE); } catch {}
  syncRanges();
}
function syncRanges() {
  LEVELS.forEach((l, i) => { const lo = i ? scaledMax(LEVELS[i - 1]) + 1 : 0, hi = scaledMax(l); l.range = hi === Infinity ? `${lo}+` : `${lo}–${hi}`; });
}
function saveLevels() {
  try { localStorage.setItem('levelSettings', JSON.stringify(LEVELS.map(l => ({ max: l.max === Infinity ? null : l.max, color: l.color })))); } catch {}
}
loadLevels();
// Level names come from i18n.js (t('levels')) in the current language.
LEVELS.forEach((l, i) => Object.defineProperty(l, 'name', { get: () => t('levels')[i] }));

function levelOf(people) {
  if (people === null || people === undefined) return null;
  return LEVELS.find(l => people <= scaledMax(l));
}

function levelBadge(people) {
  const l = levelOf(people);
  if (!l) return '';
  return `<span class="level" style="--lv:${l.color}"><span class="lv-dot"></span>${l.name} · ${l.range}</span>`;
}

const LEVEL_CSS = `
.level { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ink-2); white-space: nowrap; }
.lv-dot { width: 10px; height: 10px; border-radius: 3px; background: var(--lv); flex: none; }
`;
document.head.insertAdjacentHTML('beforeend', `<style>${LEVEL_CSS}</style>`);
