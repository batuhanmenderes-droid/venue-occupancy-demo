// Crowd levels shared by the venue list, heatmap and venue page.
// Bands are inclusive: 0–10 blue, 11–20 green, 21–30 yellow, 31–40 orange, 41+ crimson (same as the map's heat colours).
const LEVELS = [
  { max: 10, range: '0–10', color: '#0e6bdd' },
  { max: 20, range: '11–20', color: '#16ca64' },
  { max: 30, range: '21–30', color: '#ffc800' },
  { max: 40, range: '31–40', color: '#dd5e27' },
  { max: Infinity, range: '41–100', color: '#c11a4c' },
];
// Level names come from i18n.js (t('levels')) in the current language.
LEVELS.forEach((l, i) => Object.defineProperty(l, 'name', { get: () => t('levels')[i] }));

function levelOf(people) {
  if (people === null || people === undefined) return null;
  return LEVELS.find(l => people <= l.max);
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
