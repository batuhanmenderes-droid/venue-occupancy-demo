// The live mobile app inside the phone mockups (slides 1–6): <div class="pe" data-app="…"> in a .phone-screen.
//  map        – the heat map zoomed out over every venue, so all crowd levels show at once
//  list-ent   – list view with only No22 Riders Inn, Kulüp, Dane, Edit, Poison Pub (in that order)
//  list-food  – list view with only Lemongrass Cafe, Motto, Back Loop, Sepia, Chicken Loop
//  detail-cal – Poison Pub's venue page with the activity calendar tab open
//  list-featured – the list as it opens, with the featured venues
// A status bar sits above the app so the phone's island never covers it. Embeds load when the deck is
// near their slide and do not take pointer input, so scrolling keeps moving the deck.
(function () {
  const W = 390, BAR = 46;
  const LISTS = {
    'list-ent': ['Poison Pub', 'No22 Riders Inn', 'Kulüp', 'Dane', 'Edit'],
    'list-food': ['Lemongrass Cafe', 'Motto', 'Backloop', 'Sepia', 'Chicken Loop'],
  };
  const SRC = {
    'map': '{app}?lang=tr#harita',
    // ?open=all opens the app's "All venues" section for this page only (the viewer's saved sections stay)
    'list-ent': '{app}?lang=tr&open=all#liste',
    'list-food': '{app}?lang=tr&open=all#liste',
    'detail-cal': '{app}?mekan=poison-pub&lang=tr&tab=calendar',
    'list-featured': '{app}?lang=tr&open=featured#liste',  // the list as a visitor first sees it
  };
  const norm = (s) => (s || '').normalize('NFC').toLocaleLowerCase('tr').replace(/[^a-zçğıöşü0-9]/g, '');
  const slides = Array.from(document.querySelectorAll('.slide'));
  const boxes = Array.from(document.querySelectorAll('.pe'));

  // keep only the chosen venues, in the given order (re-applied when the app re-renders its list);
  // the list is the app's "All venues" section, shown without the section headers
  const listGrid = (doc) => doc.querySelector('#sec-all .vgrid') || doc.querySelector('.vgrid');  // sections (older app) or one list
  function filterList(doc, keep) {
    const grid = listGrid(doc);
    if (!grid) return;
    const cards = Array.from(grid.querySelectorAll('.venue'));
    const nameOf = (c) => ((c.querySelector('.name') || {}).textContent || '').trim();
    const pick = keep.map((k) => cards.find((c) => norm(nameOf(c)).startsWith(norm(k).slice(0, 3))));
    // !important: the app's list styles set the rows' display themselves
    cards.forEach((c) => { if (pick.includes(c)) c.style.removeProperty('display'); else c.style.setProperty('display', 'none', 'important'); });
    const shown = pick.filter(Boolean);
    // compare against the visible cards only, or moving them would re-trigger the observer forever
    const visible = Array.from(grid.children).filter((c) => c.style.display !== 'none');
    if (shown.some((c, i) => visible[i] !== c)) shown.forEach((c) => grid.appendChild(c));
  }

  // zoom the map out over every venue marker so blue → red crowd levels are all in view
  function showAllLevels(win, doc) {
    try {
      const map = win.herkezMap;  // the app exposes its map; Leaflet itself is bundled, so bounds come from the map's own classes
      const pts = [];
      map.eachLayer((l) => { if (l.getLatLng && l.options && l.options.icon) pts.push(l.getLatLng()); });
      if (pts.length > 1) { const Bounds = map.getBounds().constructor; map.fitBounds(new Bounds(pts), { padding: [24, 60], animate: false }); }
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
        st.textContent += '#view-liste:has(#sec-all) > div:not(:has(#sec-all)){display:none!important}#view-liste:has(#sec-all) > div > button{display:none!important}';  // only when the list has sections
        const apply = () => filterList(doc, LISTS[mode]);
        const watch = () => { const g = listGrid(doc); if (!g) return setTimeout(watch, 300); apply(); new win.MutationObserver(apply).observe(g, { childList: true }); };
        watch();
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
