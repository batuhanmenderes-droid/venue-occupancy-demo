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
    index = Math.max(0, Math.min(slides.length - 1, i));
    slides.forEach((s, n) => {
      s.classList.toggle('is-active', n === index);
      s.classList.toggle('is-prev', n < index);
      s.setAttribute('aria-hidden', n === index ? 'false' : 'true');
      s.inert = n !== index;
    });
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

  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ': case 'Enter':
        e.preventDefault(); go(index + 1); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'Backspace':
        e.preventDefault(); go(index - 1); break;
      case 'Home': go(0); break;
      case 'End': go(slides.length - 1); break;
      case 'f': case 'F': toggleFullscreen(); break;
    }
  });

  // ---- Swipe / tap ----
  let sx = 0, sy = 0, st = 0;
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = Date.now();
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (controls.contains(e.target)) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) go(index + (dx < 0 ? 1 : -1));
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
  go(fromHash(), false);
  wake();
})();
