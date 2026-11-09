// Deck runtime: scales the 1920 × 1080 stage to fit, navigates with keys / buttons / swipe,
// keeps the slide number in the URL (#3) and hides the controls while idle.
(function () {
  const W = 1920, H = 1080;
  const root = document.documentElement;
  const stage = document.getElementById('stage');
  const slides = Array.from(stage.querySelectorAll('.slide'));
  const prev = document.getElementById('prev');
  const next = document.getElementById('next');
  const fs = document.getElementById('fs');
  const counter = document.getElementById('counter');
  const bar = document.getElementById('bar');
  const controls = document.querySelector('.controls');
  let index = 0;
  let flowTimer;

  // ---- Fit ----
  function fit() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const small = vw < 700 || vh < 500;
    const margin = small || document.fullscreenElement ? 0 : 48;
    const scale = Math.min((vw - margin) / W, (vh - margin) / H);
    root.style.setProperty('--scale', scale.toFixed(4));
    document.body.classList.toggle('is-fit', margin === 0);
  }

  // ---- Navigation ----
  function go(i, push) {
    const from = slides[index];
    index = Math.max(0, Math.min(slides.length - 1, i));
    const to = slides[index];
    // Slides sharing a data-hold group keep the phone still: no slide-in, the old slide stays
    // underneath until the new one has faded in, so only the copy and the screen change.
    const held = from !== to && from.dataset.hold && from.dataset.hold === to.dataset.hold;
    slides.forEach((s) => s.classList.toggle('is-held', !!held && (s === from || s === to)));
    // Slides sharing a data-flow group: the new slide shows at once, the old copy slides up and out,
    // and every [data-shared] element glides from its old position to its new one.
    const flow = from !== to && from.dataset.flow && from.dataset.flow === to.dataset.flow;
    clearTimeout(flowTimer);
    slides.forEach((s) => s.classList.remove('flow-in', 'flow-out', 'via-flow'));
    if (flow) {
      to.classList.add('flow-in', 'via-flow');
      from.classList.add('flow-out');
      flowTimer = setTimeout(() => { from.classList.remove('flow-out'); to.classList.remove('flow-in'); }, 700);
    }
    slides.forEach((s, n) => {
      s.classList.toggle('is-active', n === index);
      s.classList.toggle('is-prev', n < index);
      s.setAttribute('aria-hidden', n === index ? 'false' : 'true');
      s.inert = n !== index;
    });
    if (flow) {
      const k = parseFloat(getComputedStyle(root).getPropertyValue('--scale')) || 1;
      to.querySelectorAll('[data-scroll]').forEach((sc) => { sc.scrollTop = 0; });
      to.querySelectorAll('[data-shared]').forEach((el) => {
        const twin = from.querySelector('[data-shared="' + el.dataset.shared + '"]');
        if (!twin || !el.animate) return;
        // FLIP: start the element where (and as big as) its twin was, then let it settle.
        const a = twin.getBoundingClientRect(), b = el.getBoundingClientRect();
        const dx = (a.left - b.left) / k, dy = (a.top - b.top) / k;
        const sx = a.width / b.width, sy = a.height / b.height;
        el.style.transformOrigin = '0 0';
        el.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ',' + sy + ')' }, { transform: 'none' }],
          { duration: 950, easing: 'cubic-bezier(.65,0,.25,1)' });
      });
    }
    counter.textContent = (index + 1) + ' / ' + slides.length;
    bar.style.width = (slides.length > 1 ? (index / (slides.length - 1)) * 100 : 100) + '%';
    prev.disabled = index === 0;
    next.disabled = index === slides.length - 1;
    if (push !== false) history.replaceState(null, '', '#' + (index + 1));
  }
  const fromHash = () => (parseInt(location.hash.slice(1), 10) || 1) - 1;

  prev.addEventListener('click', () => go(index - 1));
  next.addEventListener('click', () => go(index + 1));
  window.addEventListener('hashchange', () => go(fromHash(), false));

  // ---- Slides with their own scrolling page ([data-scroll]) ----
  // Scrolling moves the page first; the deck moves on only once the page is at that end.
  const scroller = () => slides[index].querySelector('[data-scroll]');
  const canScroll = (sc, dir) => dir > 0 ? sc.scrollTop + sc.clientHeight < sc.scrollHeight - 2 : sc.scrollTop > 2;
  const scale = () => parseFloat(getComputedStyle(root).getPropertyValue('--scale')) || 1;
  stage.querySelectorAll('[data-scroll]').forEach((sc) => {
    sc.addEventListener('scroll', () => sc.closest('.slide').classList.toggle('is-scrolled', sc.scrollTop > 10), { passive: true });
  });
  // Step through the page by keys or buttons: a screenful at a time, else the next slide.
  function step(dir, big) {
    const sc = scroller();
    if (sc && canScroll(sc, dir)) {
      sc.scrollBy({ top: dir * (big ? sc.clientHeight * 0.85 : 260), behavior: 'smooth' });
      return;
    }
    go(index + dir);
  }

  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); step(1, false); break;
      case 'ArrowUp': e.preventDefault(); step(-1, false); break;
      case 'PageDown': case ' ': e.preventDefault(); step(1, true); break;
      case 'PageUp': e.preventDefault(); step(-1, true); break;
      case 'ArrowRight': case 'Enter':
        e.preventDefault(); go(index + 1); break;
      case 'ArrowLeft': case 'Backspace':
        e.preventDefault(); go(index - 1); break;
      case 'Home': go(0); break;
      case 'End': go(slides.length - 1); break;
      case 'f': case 'F': toggleFullscreen(); break;
    }
  });

  // ---- Scroll wheel / trackpad: one slide per gesture ----
  // A trackpad keeps sending inertial events after the swipe; stay locked until they pause.
  let wheelSum = 0, wheelLocked = false, lastWheel = 0, lockStart = 0, lastInner = 0;
  document.addEventListener('wheel', (e) => {
    e.preventDefault();
    const now = Date.now();
    const raw = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    const delta = e.deltaMode === 1 ? raw * 40 : e.deltaMode === 2 ? raw * 800 : raw;
    if (wheelLocked) {
      const quiet = now - lastWheel > 220, long = now - lockStart > 700;
      lastWheel = now;
      if (!(quiet && long)) return;
      wheelLocked = false;
    }
    const sc = scroller();
    if (sc) {
      const dir = delta > 0 ? 1 : -1;
      if (canScroll(sc, dir)) {
        // move the page by the same distance on screen as the gesture
        const by = delta / scale();
        if (Math.abs(delta) >= 50) sc.scrollBy({ top: by, behavior: 'smooth' });
        else sc.scrollTop += by;
        lastInner = now; wheelSum = 0;
        return;
      }
      // The page just hit its end during this gesture: let the gesture finish before leaving.
      if (now - lastInner < 350) { lastInner = now; return; }
    }
    lastWheel = now;
    wheelSum += delta;
    if (Math.abs(wheelSum) < 40) return;
    go(index + (wheelSum > 0 ? 1 : -1));
    wheelSum = 0;
    wheelLocked = true;
    lockStart = now;
  }, { passive: false });

  // ---- Swipe / tap ----
  let sx = 0, sy = 0, st = 0, atTop = true, atEnd = true;
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = Date.now();
    const sc = scroller();
    atTop = !sc || !canScroll(sc, -1);
    atEnd = !sc || !canScroll(sc, 1);
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (controls.contains(e.target)) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) go(index + (dx < 0 ? 1 : -1));
    else if (Math.abs(dy) > 50 && Math.abs(dy) > Math.abs(dx) * 1.2) {
      // On a scrolling page the swipe scrolls it natively; leave only from the end the swipe started at.
      if (dy < 0 && atEnd) go(index + 1);
      else if (dy > 0 && atTop) go(index - 1);
    }
    else if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && Date.now() - st < 300) {
      // tap on the right / left third of the screen
      if (t.clientX > window.innerWidth * 0.66) go(index + 1);
      else if (t.clientX < window.innerWidth * 0.33) go(index - 1);
    }
  }, { passive: true });

  // ---- Fullscreen ----
  function toggleFullscreen() {
    const el = document.documentElement;
    if (!document.fullscreenElement) (el.requestFullscreen || el.webkitRequestFullscreen || function () {}).call(el);
    else (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  }
  if (!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen)) fs.hidden = true;
  fs.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', fit);

  // ---- Idle controls ----
  let idle;
  function wake() {
    controls.classList.remove('is-idle');
    clearTimeout(idle);
    idle = setTimeout(() => { if (!controls.matches(':hover, :focus-within')) controls.classList.add('is-idle'); }, 2500);
  }
  ['mousemove', 'touchstart', 'keydown'].forEach((ev) => document.addEventListener(ev, wake, { passive: true }));

  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', fit);
  fit();
  // First paint: place the opening slide without the scroll animation.
  stage.classList.add('no-anim');
  go(fromHash(), false);
  requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.remove('no-anim')));
  wake();
})();
