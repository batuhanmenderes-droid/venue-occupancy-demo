// Slide "Tam kontrol.": the map underneath is the app's own map view (../index.html#harita) in an iframe,
// so it is real, live HTML. It loads once the deck gets near the slide; the app's first-visit "kitties"
// notice is hidden, and the app opens in dark theme without changing the viewer's own app setting.
(function () {
  const slide = document.querySelector('.slide--reveal');
  if (!slide) return;
  const frame = slide.querySelector('iframe');
  const slides = Array.from(document.querySelectorAll('.slide'));
  const me = slides.indexOf(slide);
  let loaded = false;

  function load() {
    if (loaded) return; loaded = true;
    // embed.js's loader opens the app in dark theme and puts the viewer's own setting back afterwards
    window.loadAppFrame(frame, '../index.html?lang=tr#harita', (win, doc) => {
      const st = doc.createElement('style');
      st.textContent = '#kitties{display:none!important}';
      doc.head.appendChild(st);
    });
  }

  // Load when the deck is within two slides of this one.
  const near = () => { const i = slides.findIndex((s) => s.classList.contains('is-active')); return Math.abs(i - me) <= 2; };
  new MutationObserver(() => { if (near()) load(); })
    .observe(document.getElementById('stage'), { subtree: true, attributes: true, attributeFilter: ['class'] });
  if (near()) load();
})();
