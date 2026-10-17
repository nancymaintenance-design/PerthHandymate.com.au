/* A manual, progressively enhanced list. Every guide is a static HTML link. */
(() => {
  const track = document.getElementById('home-guide-track');
  if (!track) return;
  const section = document.getElementById('repair-planning-guides');
  const controls = section.querySelector('.home-guides-controls');
  const previous = section.querySelector('[data-guide-prev]');
  const next = section.querySelector('[data-guide-next]');
  const position = section.querySelector('[data-guide-position]');
  const cards = [...track.children];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const current = () => {
    const edge = track.getBoundingClientRect().left;
    return cards.reduce((best, card, index) => Math.abs(card.getBoundingClientRect().left - edge) < Math.abs(cards[best].getBoundingClientRect().left - edge) ? index : best, 0);
  };
  const update = () => {
    previous.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
    const label = `${current() + 1} / ${cards.length}`;
    if (position.textContent !== label) position.textContent = label;
  };
  const move = index => {
    const card = cards[Math.max(0, Math.min(index, cards.length - 1))];
    track.scrollTo({ left: track.scrollLeft + card.getBoundingClientRect().left - track.getBoundingClientRect().left - 4, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  };
  previous.addEventListener('click', () => move(current() - 1));
  next.addEventListener('click', () => move(current() + 1));
  track.addEventListener('keydown', event => {
    if (event.target !== track || event.altKey || event.ctrlKey || event.metaKey) return;
    const targets = { ArrowLeft: current() - 1, ArrowRight: current() + 1, Home: 0, End: cards.length - 1 };
    if (!Object.hasOwn(targets, event.key)) return;
    event.preventDefault();
    move(targets[event.key]);
  });
  track.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  controls.hidden = false;
  update();
})();
