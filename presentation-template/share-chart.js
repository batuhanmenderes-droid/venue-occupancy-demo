// "Akyaka'daki kalabalığın payı" rebuilt from the app (venue.html renderShare): the same rounded ring
// geometry, colours and data for Kulüp on 09.11.2026 16:00. Hover or tap a slice or a row to put it in
// the centre; while the slide is idle the centre walks through the slices and comes back to Kulüp.
(function () {
  const card = document.getElementById('shareCard');
  if (!card) return;
  const slide = card.closest('.slide');
  const L = 'assets/logos/';
  const VENUES = [
    { name: 'No22 Riders Inn', n: 344, logo: 'no22riders.png' },
    { name: 'Kulüp', n: 287, logo: 'kulup.png', me: true },
    { name: 'Dane Gökova', n: 230, logo: 'danegokova.png' },
    { name: 'Poison Pub', n: 172, logo: 'poisonpub.png' },
    { name: 'Kukla Pub', n: 139, logo: 'kukla.png' },
    { name: 'Back Loop', n: 135, logo: 'backloop.png' },
    { name: 'Edit.', n: 131, logo: 'edit.png' },
    { name: 'Yelken Pub', n: 125, logo: 'yelken.png' },
    { name: 'Küçük', n: 95, logo: 'kucukakyaka.png' },
    { name: 'Okapi Suites', n: 92, logo: 'okapi.png' },
    { name: 'Rahat Meyhane', n: 75, logo: 'rahatmeyhane.png' },
  ];
  const COLORS = ['#0A84FF', '#30D158', '#FF9F0A', '#BF5AF2', '#64D2FF'], ME = '#FF375F', GREY = '#8E8E93';
  const total = VENUES.reduce((a, v) => a + v.n, 0);
  const pct = (n) => Math.round(n / total * 100) + '%';

  // Slices: Kulüp + the five busiest others, the rest as one grey slice (as in the app).
  const me = VENUES.find((v) => v.me), others = VENUES.filter((v) => !v.me);
  let ci = 0;
  const slices = [me, ...others.slice(0, 5)].sort((a, b) => b.n - a.n)
    .map((v) => ({ v, n: v.n, color: v.me ? ME : COLORS[ci++] }));
  const rest = others.slice(5);
  slices.push({ rest: true, n: rest.reduce((a, v) => a + v.n, 0), count: rest.length, color: GREY });
  VENUES.forEach((v) => { v.color = (slices.find((s) => s.v === v) || {}).color || GREY; });

  // Ring geometry copied from the app: rounded annular sectors with an even gap.
  const S = 400, c = S / 2, R = 150, r = R * 0.618, gap = 3, cr = 6;
  let a = -Math.PI / 2;
  slices.forEach((s) => { s.a0 = a; s.a1 = a + s.n / total * Math.PI * 2; s.mid = (s.a0 + s.a1) / 2; a = s.a1; });
  const pt = (ang, rad) => (c + rad * Math.cos(ang)).toFixed(2) + ',' + (c + rad * Math.sin(ang)).toFixed(2);
  const sector = (s) => {
    const Ro = R - cr, Ri = r + cr;
    const dO = (gap / 2 + cr) / Ro, dI = (gap / 2 + cr) / Ri;
    const o0 = s.a0 + dO, o1 = s.a1 - dO, i0 = s.a0 + dI, i1 = s.a1 - dI, lg = o1 - o0 > Math.PI ? 1 : 0;
    return '<path d="M' + pt(o0, Ro) + ' A' + Ro + ',' + Ro + ' 0 ' + lg + ' 1 ' + pt(o1, Ro) + ' L' + pt(i1, Ri) +
      ' A' + Ri + ',' + Ri + ' 0 ' + lg + ' 0 ' + pt(i0, Ri) + ' Z" fill="' + s.color + '" stroke="' + s.color +
      '" stroke-width="' + 2 * cr + '" stroke-linejoin="round"/>';
  };
  const svg = card.querySelector('.sc-donut svg');
  svg.innerHTML = slices.map((s, k) => '<g class="sc-sec" data-k="' + k + '" style="--d:' + (k * 0.07) + 's">' + sector(s) + '</g>').join('');

  // Logo badges just outside the ring for slices of 5 % or more.
  const donut = card.querySelector('.sc-donut');
  slices.forEach((s, k) => {
    if (s.rest || s.n / total < 0.05) return;
    const bx = c + (R + 26) * Math.cos(s.mid), by = c + (R + 26) * Math.sin(s.mid);
    const b = document.createElement('span');
    b.className = 'sc-badge'; b.dataset.k = k;
    b.style.cssText = 'left:' + (bx / S * 100) + '%;top:' + (by / S * 100) + '%;--c:' + s.color + ';--d:' + (0.5 + k * 0.07) + 's';
    b.innerHTML = '<span class="sc-logo"><img src="' + L + s.v.logo + '" alt=""></span><b>' + s.n + '</b>';
    donut.appendChild(b);
  });

  // List: every venue, busiest first; Kulüp highlighted.
  const list = card.querySelector('.sc-list');
  list.innerHTML = VENUES.slice().sort((x, y) => y.n - x.n).map((v, i) =>
    '<li class="sc-row' + (v.me ? ' me' : '') + '" data-name="' + v.name + '" style="--i:' + i + '">' +
    '<i class="sc-dot" style="background:' + v.color + '"></i>' +
    '<span class="sc-logo"><img src="' + L + v.logo + '" alt=""></span>' +
    '<span class="sc-name">' + v.name + '</span>' +
    '<span class="sc-num"><b>' + v.n + '</b><small>' + pct(v.n) + '</small></span></li>').join('');

  // Centre + highlight.
  const center = card.querySelector('.sc-center');
  function focus(k) {
    const s = slices[k];
    center.querySelector('b').textContent = pct(s.n);
    center.querySelector('span').textContent = s.rest ? 'Diğer ' + s.count + ' mekân' : s.v.name;
    center.querySelector('small').textContent = s.n + ' kişi';
    card.querySelectorAll('.sc-sec, .sc-badge').forEach((e) => e.classList.toggle('dim', +e.dataset.k !== k));
    card.querySelectorAll('.sc-row').forEach((row) => {
      const v = VENUES.find((x) => x.name === row.dataset.name);
      const inSlice = s.rest ? rest.includes(v) : s.v === v;
      row.classList.toggle('sel', inSlice);
    });
    center.classList.remove('swap'); void center.offsetWidth; center.classList.add('swap');
  }
  const meK = slices.findIndex((s) => s.v === me);
  focus(meK);

  // Pointer: slices and rows.
  let hovering = false;
  card.querySelectorAll('.sc-sec').forEach((g) => {
    g.addEventListener('mouseenter', () => { hovering = true; focus(+g.dataset.k); });
    g.addEventListener('click', () => focus(+g.dataset.k));
  });
  list.querySelectorAll('.sc-row').forEach((row) => {
    const k = () => { const v = VENUES.find((x) => x.name === row.dataset.name); const i = slices.findIndex((s) => s.v === v); return i >= 0 ? i : slices.length - 1; };
    row.addEventListener('mouseenter', () => { hovering = true; focus(k()); });
  });
  card.addEventListener('mouseleave', () => { hovering = false; focus(meK); });

  // Idle tour through the slices while the slide is on screen, ending back on Kulüp.
  let timer = null, step = 0;
  const order = slices.map((_, k) => k).filter((k) => k !== meK);
  function tour() {
    if (!hovering) {
      focus(step < order.length ? order[step] : meK);
      step = (step + 1) % (order.length + 2);
    }
    timer = setTimeout(tour, step === 0 ? 3200 : 1700);
  }
  new MutationObserver(() => {
    const on = slide.classList.contains('is-active');
    if (on && !timer) { step = 0; focus(meK); timer = setTimeout(tour, 3000); }
    if (!on && timer) { clearTimeout(timer); timer = null; focus(meK); }
  }).observe(slide, { attributes: true, attributeFilter: ['class'] });
})();
