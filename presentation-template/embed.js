// Live app embeds: <div class="app-embed" data-src="../venue.html?…" data-mode="card|page" data-card="Title">.
//  · card mode shows one card of the page (found by its title), scaled to the box, page fixed in place;
//  · page mode shows the page at 1600 px wide and lets it scroll inside the box.
// Scrolling and arrow keys that the embedded page does not use are passed on to the deck, so the deck
// still moves on. The app opens in dark theme without changing the viewer's own app setting, and the
// iframes load only when the deck gets near their slide.
(function () {
  const W = 1600; // the app's desktop width the embeds are laid out at
  const slides = Array.from(document.querySelectorAll('.slide'));

  // Dark theme for every embed: set the app's preference while embeds load, then put it back.
  let pending = 0, saved;
  window.loadAppFrame = function (frame, src, onload) {
    if (pending++ === 0) {
      try { saved = localStorage.getItem('themePref'); localStorage.setItem('themePref', 'dark'); } catch (e) {}
    }
    frame.addEventListener('load', () => {
      if (--pending === 0) {
        try { if (saved == null) localStorage.removeItem('themePref'); else localStorage.setItem('themePref', saved); } catch (e) {}
      }
      try { onload && onload(frame.contentWindow, frame.contentDocument); } catch (e) {}
    }, { once: true });
    frame.src = src;
  };

  function forward(win, doc, mode) {
    let lastInner = 0;
    const canScroll = (dir) => mode === 'page' &&
      (dir > 0 ? win.scrollY + win.innerHeight < doc.documentElement.scrollHeight - 2 : win.scrollY > 2);
    win.addEventListener('wheel', (e) => {
      const now = Date.now(), d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (canScroll(d > 0 ? 1 : -1)) { lastInner = now; return; }            // the page scrolls itself
      e.preventDefault();
      if (now - lastInner < 350) { lastInner = now; return; }                 // finish the gesture first
      document.dispatchEvent(new WheelEvent('wheel', { deltaX: e.deltaX, deltaY: e.deltaY, deltaMode: e.deltaMode, bubbles: true, cancelable: true }));
    }, { passive: false, capture: true });
    win.addEventListener('keydown', (e) => {
      const keys = ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'f', 'F'];
      if (!keys.includes(e.key) || e.metaKey || e.ctrlKey || e.altKey) return;
      const dir = e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ' ? 1 : e.key === 'ArrowUp' || e.key === 'PageUp' ? -1 : 0;
      if (dir && canScroll(dir)) {
        e.preventDefault();
        win.scrollBy({ top: dir * (e.key === 'ArrowDown' || e.key === 'ArrowUp' ? 260 : win.innerHeight * 0.85), behavior: 'smooth' });
        return;
      }
      e.preventDefault();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: e.key, bubbles: true, cancelable: true }));
    }, { capture: true });
  }

  function findCard(doc, title) {
    return Array.from(doc.querySelectorAll('.card')).find((c) =>
      Array.from(c.querySelectorAll('*')).some((e) => e.children.length === 0 && e.textContent.trim() === title));
  }

  function setup(box) {
    const mode = box.dataset.mode || 'page';
    const frame = document.createElement('iframe');
    frame.title = box.dataset.title || 'herkez nerde?!';
    frame.setAttribute('tabindex', '-1');
    box.appendChild(frame);
    const boxW = () => box.clientWidth;

    if (mode === 'page') {
      const s = boxW() / W;
      frame.style.cssText = 'width:' + W + 'px;height:' + (box.clientHeight / s) + 'px;transform:scale(' + s + ')';
    } else {
      frame.style.cssText = 'width:' + W + 'px;height:900px';
    }

    loadAppFrame(frame, box.dataset.src, (win, doc) => {
      const st = doc.createElement('style');
      st.textContent = '#kitties{display:none!important}html{scrollbar-width:none}::-webkit-scrollbar{display:none}' + (mode === 'card' ? '.langswitch{display:none!important}' : '');
      doc.head.appendChild(st);
      forward(win, doc, mode);
      if (mode !== 'card') return;
      // Keep the chosen card in view and the box exactly its size (the page re-renders on its own).
      const place = () => {
        const card = findCard(doc, box.dataset.card);
        if (!card) return;
        const top = card.getBoundingClientRect().top + win.scrollY;
        if (Math.abs(win.scrollY - (top - 40)) > 1) win.scrollTo(0, top - 40);
        const r = card.getBoundingClientRect(), s = boxW() / r.width;
        box.style.height = (r.height * s) + 'px';
        frame.style.transform = 'translate(' + (-r.left * s) + 'px,' + (-r.top * s) + 'px) scale(' + s + ')';
      };
      place();
      setTimeout(place, 400); setTimeout(place, 1500);
      setInterval(place, 3000);
    });
  }

  const boxes = Array.from(document.querySelectorAll('.app-embed'));
  const near = (el) => {
    const me = slides.indexOf(el.closest('.slide'));
    const i = slides.findIndex((s) => s.classList.contains('is-active'));
    return Math.abs(i - me) <= 2;
  };
  function check() { boxes.forEach((b) => { if (!b.dataset.ready && near(b)) { b.dataset.ready = '1'; setup(b); } }); }
  new MutationObserver(check).observe(document.getElementById('stage'), { subtree: true, attributes: true, attributeFilter: ['class'] });
  check();
})();
