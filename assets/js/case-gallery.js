// Generated from typescript/assets/js/case-gallery.ts; edit the TypeScript source.
// Small, on-demand photo selector. No zoom, autoplay or speculative image loading.
(() => {
    function initCaseGallery(root, createImage = () => new Image()) {
        if (root.dataset.caseReady)
            return;
        const image = root.querySelector('[data-case-image]');
        const caption = root.querySelector('[data-case-caption]');
        const status = root.querySelector('[data-case-status]');
        const loading = root.querySelector('[data-case-loading-label]');
        const error = root.querySelector('[data-case-error-label]');
        const buttons = [...root.querySelectorAll('[data-case-src]')];
        if (!image || !caption || !status || !buttons.length)
            return;
        root.dataset.caseReady = 'true';
        let revision = 0;
        let pending = '';
        function message(text) {
            status.textContent = text;
            status.hidden = !text;
        }
        function select(button) {
            const src = button.getAttribute('data-case-src');
            if (!src)
                return;
            if (image.getAttribute('src') === src) {
                revision++;
                pending = '';
                root.removeAttribute('aria-busy');
                message('');
                return;
            }
            if (pending === src)
                return;
            const request = ++revision;
            pending = src;
            root.setAttribute('aria-busy', 'true');
            message(loading?.textContent || '');
            // Only an explicit selection fetches the next lightweight preview.
            const next = createImage();
            next.decoding = 'async';
            next.onload = () => {
                if (request !== revision)
                    return;
                pending = '';
                image.setAttribute('src', src);
                image.setAttribute('alt', button.querySelector('img')?.alt || '');
                caption.textContent = button.querySelector('[data-case-label]')?.textContent || '';
                buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
                root.removeAttribute('aria-busy');
                message('');
            };
            next.onerror = () => {
                if (request !== revision)
                    return;
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
                let next;
                if (event.key === 'ArrowRight')
                    next = (index + 1) % buttons.length;
                else if (event.key === 'ArrowLeft')
                    next = (index - 1 + buttons.length) % buttons.length;
                else if (event.key === 'Home')
                    next = 0;
                else if (event.key === 'End')
                    next = buttons.length - 1;
                else
                    return;
                event.preventDefault();
                buttons[next].focus();
                select(buttons[next]);
            });
        });
    }
    if (typeof module !== 'undefined' && module.exports)
        module.exports = { initCaseGallery };
    if (typeof document !== 'undefined') {
        const init = () => document.querySelectorAll('[data-case-gallery]').forEach(root => initCaseGallery(root));
        if (document.readyState === 'loading')
            document.addEventListener('DOMContentLoaded', init, { once: true });
        else
            init();
    }
})();
