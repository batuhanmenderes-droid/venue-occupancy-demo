// AI assistant slide: plays the conversation each time the slide comes on screen —
// the question, a typing indicator, then the answer in parts with venue cards in between.
(function () {
  const slide = document.querySelector('.slide--ai');
  if (!slide) return;
  const items = Array.from(slide.querySelectorAll('.ai-item'));
  const typing = slide.querySelector('.ai-typing');
  const feed = slide.querySelector('.ai-feed');
  // [item index, delay in ms after the previous step, show typing before it?]
  const SCRIPT = [[0, 700, false], [1, 1700, true], [2, 700, false], [3, 1700, true], [4, 700, false], [5, 1700, true], [6, 650, false], [7, 550, false], [8, 550, false]];
  let timers = [];
  const byT = (t) => items.find((el) => +el.dataset.t === t);
  function reset() {
    timers.forEach(clearTimeout); timers = [];
    items.forEach((el) => el.classList.remove('on'));
    typing.classList.remove('on');
  }
  function play() {
    reset();
    let at = 0;
    SCRIPT.forEach(([t, wait, think]) => {
      if (think) {
        timers.push(setTimeout(() => { feed.appendChild(typing); typing.classList.add('on'); }, at + 200));
      }
      at += wait;
      timers.push(setTimeout(() => { typing.classList.remove('on'); byT(t).classList.add('on'); }, at));
    });
  }
  let was = false;
  new MutationObserver(() => {
    const on = slide.classList.contains('is-active');
    if (on && !was) play();
    if (!on && was) reset();
    was = on;
  }).observe(slide, { attributes: true, attributeFilter: ['class'] });
  if (slide.classList.contains('is-active')) { was = true; play(); }
})();
