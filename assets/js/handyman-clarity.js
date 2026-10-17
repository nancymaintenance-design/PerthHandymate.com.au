'use strict';
(() => {
  function revealFragment() {
    if (!location.hash) return;
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (!target) return;
    let current = target;
    while (current) {
      if (current.tagName === 'DETAILS') current.open = true;
      current = current.parentElement;
    }
    requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
  }
  window.addEventListener('hashchange', revealFragment);
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (link && link.hash === location.hash) revealFragment();
  });
  revealFragment();
})();
