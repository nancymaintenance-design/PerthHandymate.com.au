// Small, on-demand photo selector. No zoom, autoplay or speculative image loading.
(() => {
  function initCaseGallery(root: HTMLElement, createImage: () => HTMLImageElement = () => new Image()) {
    if (root.dataset.caseReady) return;
    const image = root.querySelector<HTMLImageElement>('[data-case-image]');
    const caption = root.querySelector<HTMLElement>('[data-case-caption]');
    const status = root.querySelector<HTMLElement>('[data-case-status]');
    const loading = root.querySelector<HTMLElement>('[data-case-loading-label]');
    const error = root.querySelector<HTMLElement>('[data-case-error-label]');
    const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-case-src]')];
    if (!image || !caption || !status || !buttons.length) return;
    root.dataset.caseReady = 'true';
    let revision = 0;
    let pending = '';

    function message(text: string) {
      status!.textContent = text;
      status!.hidden = !text;
    }

    function select(button: HTMLButtonElement) {
      const src = button.getAttribute('data-case-src');
      if (!src) return;
      if (image!.getAttribute('src') === src) {
        revision++;
        pending = '';
        root.removeAttribute('aria-busy');
        message('');
        return;
      }
      if (pending === src) return;
      const request = ++revision;
      pending = src;
      root.setAttribute('aria-busy', 'true');
      message(loading?.textContent || '');
      // Only an explicit selection fetches the next lightweight preview.
      const next = createImage();
      next.decoding = 'async';
      next.onload = () => {
        if (request !== revision) return;
        pending = '';
        image!.setAttribute('src', src);
        image!.setAttribute('alt', button.querySelector('img')?.alt || '');
        caption!.textContent = button.querySelector('[data-case-label]')?.textContent || '';
        buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
        root.removeAttribute('aria-busy');
        message('');
      };
      next.onerror = () => {
        if (request !== revision) return;
        pending = '';
        root.removeAttribute('aria-busy');
        message(error?.textContent || '');
      };
      next.src = src;
    }

    buttons.forEach((button, index) => {
      button.disabled = false;
      button.addEventListener('click', () => select(button));
      button.addEventListener('keydown', event => {
        let next: number;
        if (event.key === 'ArrowRight') next = (index + 1) % buttons.length;
        else if (event.key === 'ArrowLeft') next = (index - 1 + buttons.length) % buttons.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = buttons.length - 1;
        else return;
        event.preventDefault();
        buttons[next].focus();
        select(buttons[next]);
      });
    });
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { initCaseGallery };
  if (typeof document !== 'undefined') {
    const init = () => document.querySelectorAll<HTMLElement>('[data-case-gallery]').forEach(root => initCaseGallery(root));
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
  }
})();
