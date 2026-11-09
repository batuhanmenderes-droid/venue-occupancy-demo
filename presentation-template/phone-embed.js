// The live mobile app inside the phone mockups (slides 1–6): <div class="pe" data-app="…"> in a .phone-screen.
//  map        – the heat map zoomed out over every venue, so all crowd levels show at once
//  list-ent   – list view with only No22 Riders Inn, Kulüp, Dane, Edit, Poison Pub (in that order)
//  list-food  – list view with only Lemongrass Cafe, Motto, Back Loop, Sepia, Chicken Loop
//  detail-cal – Kulüp's venue page with the activity calendar tab open
// A status bar sits above the app so the phone's island never covers it. Embeds load when the deck is
// near their slide and do not take pointer input, so scrolling keeps moving the deck.
(function () {
  const W = 390, BAR = 46;
  const LISTS = {
    'list-ent': ['No22 Riders Inn', 'Kulüp', 'Dane', 'Edit', 'Poison Pub'],
    'list-food': ['Lemongrass Cafe', 'Motto', 'Backloop', 'Sepia', 'Chicken Loop'],
  };
  const SRC = {
    'map': '../index.html?lang=tr#harita',
    'list-ent': '../index.html?lang=tr#liste',
    'list-food': '../index.html?lang=tr#liste',
    'detail-cal': '../venue.html?mekan=kulup&lang=tr&tab=calendar',
  };
  const norm = (s) => (s || '').normalize('NFC').toLocaleLowerCase('tr').replace(/[^a-zçğıöşü0-9]/g, '');
  const slides = Array.from(document.querySelectorAll('.slide'));
  const boxes = Array.from(document.querySelectorAll('.pe'));

  // keep only the chosen venues, in the given order (re-applied when the app re-renders its list)
  function filterList(doc, keep) {
    const grid = doc.getElementById('grid');
    if (!grid) return;
    const cards = Array.from(grid.querySelectorAll('.venue'));
    const nameOf = (c) => ((c.querySelector('.name') || {}).textContent || '').trim();
    const pick = keep.map((k) => cards.find((c) => norm(nameOf(c)).startsWith(norm(k).slice(0, 3))));
    cards.forEach((c) => { c.style.display = pick.includes(c) ? '' : 'none'; });
    const shown = pick.filter(Boolean);
    // compare against the visible cards only, or moving them would re-trigger the observer forever
    const visible = Array.from(grid.children).filter((c) => c.style.display !== 'none');
    if (shown.some((c, i) => visible[i] !== c)) shown.forEach((c) => grid.appendChild(c));
  }

  // zoom the map out over every venue marker so blue → red crowd levels are all in view
  function showAllLevels(win, doc) {
    try {
      const map = win.eval('map'), L = win.L;
      const pts = [];
      map.eachLayer((l) => { if (l.getLatLng && l.options && l.options.icon) pts.push(l.getLatLng()); });
      if (pts.length > 1) map.fitBounds(L.latLngBounds(pts), { padding: [24, 60], animate: false });
    } catch (e) { /* the map is still usable without it */ }
  }

  function setup(box) {
    const mode = box.dataset.app;
    const screen = box.closest('.phone-screen');
    const bar = document.createElement('div');
    bar.className = 'pe-bar';
    bar.innerHTML = '<span>16:00</span><span class="r"><span class="sig"><i style="height:4px"></i><i style="height:6px"></i><i style="height:8px"></i><i style="height:11px"></i></span><span class="bat"><i></i></span></span>';
    const frame = document.createElement('iframe');
    frame.title = 'herkez nerde?!';
    frame.setAttribute('tabindex', '-1');
    box.append(bar, frame);
    const fit = () => {
      const s = screen.clientWidth / W;
      bar.style.height = (BAR * s) + 'px';
      bar.style.fontSize = (15 * s) + 'px';
      frame.style.top = (BAR * s) + 'px';
      frame.style.width = W + 'px';
      frame.style.height = ((screen.clientHeight - BAR * s) / s) + 'px';
      frame.style.transform = 'scale(' + s + ')';
    };
    fit();
    window.addEventListener('resize', fit);
    window.loadAppFrame(frame, SRC[mode], (win, doc) => {
      const st = doc.createElement('style');
      st.textContent = '#kitties{display:none!important}html{scrollbar-width:none}::-webkit-scrollbar{display:none}';
      doc.head.appendChild(st);
      if (mode === 'map') { setTimeout(() => showAllLevels(win, doc), 1200); }
      if (LISTS[mode]) {
        // list view, not the photo gallery
        // (set on the page only, so the viewer's own app setting is left alone)
        const apply = () => { const g = doc.getElementById('grid'); if (g) g.classList.add('aslist'); filterList(doc, LISTS[mode]); };
        apply(); setTimeout(apply, 800);
        new win.MutationObserver(() => apply()).observe(doc.getElementById('grid'), { childList: true });
      }
    });
  }

  const near = (el, d) => {
    const me = slides.indexOf(el.closest('.slide'));
    const i = slides.findIndex((s) => s.classList.contains('is-active'));
    return Math.abs(i - me) <= d;
  };
  // load embeds near the current slide; free the ones far away (several live maps at once are heavy)
  function check() {
    boxes.forEach((b) => {
      if (!b.dataset.ready && near(b, 1)) { b.dataset.ready = '1'; setup(b); }
      else if (b.dataset.ready && !near(b, 3)) { b.innerHTML = ''; delete b.dataset.ready; }
    });
  }
  new MutationObserver(check).observe(document.getElementById('stage'), { subtree: true, attributes: true, attributeFilter: ['class'] });
  check();
})();
