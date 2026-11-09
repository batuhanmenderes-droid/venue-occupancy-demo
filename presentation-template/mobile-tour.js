// Slide 21: the live mobile app in a phone, walked through step by step (the deck's data-step 0–5).
//  1 · pan the map to the user and point at "Buradasın" and the pictogram
//  2 · point at Kulüp's POI and its label
//  3 · point at the filter button
//  4 · point at the AI assistant (Öneriler)
//  5 · Kulüp's detail page slides in and scrolls slowly through its numbers
(function () {
  const slide = document.querySelector('.slide--mobile');
  if (!slide) return;
  const slides = Array.from(document.querySelectorAll('.slide'));
  const me = slides.indexOf(slide);
  const screen = slide.querySelector('.mob-screen');
  const spot = slide.querySelector('.mob-spot');
  const mapFrame = slide.querySelector('.mob-frame--map iframe');
  const detailFrame = slide.querySelector('.mob-frame--detail iframe');
  const items = Array.from(slide.querySelectorAll('.mob-steps > li'));
  const S = 407 / 390; // iframe px → screen px
  let mapWin = null, mapDoc = null, detailWin = null, loaded = false, panned = false, scrollTimer = null;

  const hideStyle = (doc) => {
    const st = doc.createElement('style');
    st.textContent = '#kitties{display:none!important}html{scrollbar-width:none}::-webkit-scrollbar{display:none}';
    doc.head.appendChild(st);
  };
  function load() {
    if (loaded) return; loaded = true;
    window.loadAppFrame(mapFrame, '../index.html?lang=tr#harita', (w, d) => { mapWin = w; mapDoc = d; hideStyle(d); render(); });
    window.loadAppFrame(detailFrame, '../venue.html?mekan=kulup&lang=tr&tab=density', (w, d) => { detailWin = w; hideStyle(d); });
  }

  // Elements to point at, inside the map iframe.
  const targets = {
    1: () => [mapDoc.querySelector('.youmark'), ...Array.from(mapDoc.querySelectorAll('.you-label'))],
    2: () => {
      const label = Array.from(mapDoc.querySelectorAll('.leaflet-tooltip')).find((t) => t.textContent.includes('Kulüp'));
      const logo = Array.from(mapDoc.querySelectorAll('.leaflet-marker-icon')).find((m) => m.innerHTML.includes('kulup'));
      return [label, logo];
    },
    3: () => [mapDoc.getElementById('filterBtn')],
    4: () => [mapDoc.querySelector('.tabbar [data-nav="rec"]') || Array.from(mapDoc.querySelectorAll('.tabbar button')).find((b) => /Öneri/.test(b.textContent))],
  };
  function pointAt(step) {
    const get = targets[step];
    if (!get || !mapDoc) { spot.classList.remove('on'); return; }
    const els = get().filter(Boolean);
    if (!els.length) { spot.classList.remove('on'); return; }
    const rs = els.map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0);
    const l = Math.min(...rs.map((r) => r.left)), t = Math.min(...rs.map((r) => r.top));
    const r = Math.max(...rs.map((r) => r.right)), b = Math.max(...rs.map((r) => r.bottom));
    const pad = 8;
    const top0 = 52; // the app starts below the status bar
    spot.style.left = (l * S - pad) + 'px'; spot.style.top = (top0 + t * S - pad) + 'px';
    spot.style.width = ((r - l) * S + pad * 2) + 'px'; spot.style.height = ((b - t) * S + pad * 2) + 'px';
    spot.classList.add('on');
  }

  // Centre the map on the user once (step 1 onwards), then point.
  function centreOnUser(then) {
    if (panned || !mapWin) { then(); return; }
    try {
      const you = mapDoc.querySelector('.youmark').getBoundingClientRect();
      const box = mapDoc.querySelector('.leaflet-container').getBoundingClientRect();
      const dx = you.left + you.width / 2 - (box.left + box.width / 2);
      const dy = you.top + you.height / 2 - (box.top + box.height * 0.42);
      mapWin.eval('map').panBy([dx, dy], { animate: true, duration: 0.9 });
      panned = true;
      setTimeout(then, 1000);
    } catch (e) { then(); }
  }

  function render() {
    const step = +slide.dataset.step || 0;
    items.forEach((li) => {
      const s = +li.dataset.s;
      li.classList.toggle('shown', s <= step);
      li.classList.toggle('active', s === step);
    });
    clearInterval(scrollTimer);
    if (step >= 1 && step <= 4) centreOnUser(() => { if ((+slide.dataset.step || 0) === step) pointAt(step); });
    else spot.classList.remove('on');
    if (step === 5 && detailWin) {
      // read down the detail page slowly: numbers, trend, m², then back to the top
      detailWin.scrollTo(0, 0);
      let y = 0, dir = 1;
      scrollTimer = setInterval(() => {
        const max = detailWin.document.documentElement.scrollHeight - detailWin.innerHeight;
        y += dir * 1.2;
        if (y >= Math.min(max, 1500)) dir = -1;
        if (y <= 0) dir = 1;
        detailWin.scrollTo(0, y);
      }, 16);
    }
  }

  new MutationObserver(render).observe(slide, { attributes: true, attributeFilter: ['data-step', 'class'] });
  const near = () => { const i = slides.findIndex((s) => s.classList.contains('is-active')); return Math.abs(i - me) <= 2; };
  new MutationObserver(() => { if (near()) load(); })
    .observe(document.getElementById('stage'), { subtree: true, attributes: true, attributeFilter: ['class'] });
  if (near()) load();
  render();
})();
