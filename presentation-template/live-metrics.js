// Live metric cards (slide "Anlık metrikler"): while the slide is on screen the visitor count
// takes a small random step every ~0.9 s and every number derived from it rolls to its new value.
(function () {
  const slide = document.querySelector('.slide--metrics');
  if (!slide) return;
  const $ = (k) => slide.querySelector('[data-out="' + k + '"]');
  const bar = (k) => slide.querySelector('[data-bar="' + k + '"]');
  const AREA = 250, PREV_HOUR = 129, AVG = 220;
  let count = 287, record = 305, todayPeak = 287;
  const shown = {};
  const fmtTR = (n, d) => n.toFixed(d).replace('.', ',');
  const signed = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n);

  // Roll a number from what is shown now to its new value.
  function roll(key, to, fmt) {
    const el = $(key); if (!el) return;
    const from = shown[key] ?? to;
    shown[key] = to;
    if (from === to) { el.textContent = fmt(to); return; }
    const t0 = performance.now(), dur = 520;
    el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick');
    (function frame(now) {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(from + (to - from) * e);
      if (p < 1) requestAnimationFrame(frame);
    })(t0);
  }

  // m² grid: 40 cells of about 1 m², as many lit as there are people per 40 m² (same as the app).
  const grid = $('grid');
  grid.innerHTML = Array.from({ length: 40 }, () => '<i></i>').join('');
  const cells = Array.from(grid.children);

  function render() {
    const hourBar = Math.round(count * 0.75);
    todayPeak = Math.max(todayPeak, count);
    record = Math.max(record, todayPeak);
    const density = count / AREA;
    roll('last', count, (v) => String(Math.round(v)));
    roll('hourBar', hourBar, (v) => String(Math.round(v)));
    roll('record', record, (v) => String(Math.round(v)));
    roll('recordBar', record, (v) => String(Math.round(v)));
    roll('todayBar', todayPeak, (v) => String(Math.round(v)));
    roll('density', density, (v) => fmtTR(v, 2));
    $('hourChip').textContent = (count >= PREV_HOUR ? '▲ ' : '▼ ') + signed(count - PREV_HOUR) + ' son 1 saatte';
    $('recordChip').textContent = (todayPeak >= record ? '▲ ' : '▼ ') + signed(todayPeak - record) + ' bugün rekora göre';
    bar('hourBar').style.setProperty('--h', (hourBar / Math.max(hourBar, PREV_HOUR)).toFixed(3));
    bar('recordBar').style.setProperty('--h', 1);
    bar('avgBar').style.setProperty('--h', (AVG / record).toFixed(3));
    bar('todayBar').style.setProperty('--h', (todayPeak / record).toFixed(3));
    const lit = Math.min(40, Math.round(density * 40));
    cells.forEach((c, i) => c.classList.toggle('on', i < lit));
  }

  // Random walk around a busy night, with an occasional bigger jump (a group walking in or out).
  function step() {
    const big = Math.random() < 0.15;
    const d = big ? (Math.random() < 0.5 ? -1 : 1) * (8 + Math.floor(Math.random() * 10)) : Math.round((Math.random() - 0.45) * 8);
    count = Math.max(248, Math.min(312, count + d));
    render();
  }

  render();
  let timer = null;
  const tick = () => { step(); timer = setTimeout(tick, 650 + Math.random() * 600); };
  new MutationObserver(() => {
    const on = slide.classList.contains('is-active');
    if (on && !timer) timer = setTimeout(tick, 900);
    if (!on && timer) { clearTimeout(timer); timer = null; }
  }).observe(slide, { attributes: true, attributeFilter: ['class'] });
  if (slide.classList.contains('is-active')) timer = setTimeout(tick, 900);
})();
