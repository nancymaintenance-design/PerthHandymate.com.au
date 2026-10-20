// Generated from typescript/assets/js/analytics.ts; edit the TypeScript source.
(function (root) {
    'use strict';
    if (root.__ellisAnalyticsInitialized)
        return;
    root.__ellisAnalyticsInitialized = true;
    const allowed = new Set(['generate_lead', 'contact_form_error', 'phone_click']);
    function production() {
        return ['www.perthhandymate.com.au', 'perthhandymate.com.au'].includes(root.location.hostname) && typeof root.gtag === 'function';
    }
    function safePath(value) {
        return value.length <= 240 && /^\/(?:[a-z0-9-]+\/)*$/.test(value);
    }
    function track(name, properties) {
        try {
            if (!production() || !allowed.has(name))
                return;
            const method = properties && 'method' in properties && properties.method === 'phone' ? 'phone' : 'contact_form';
            root.gtag('event', name, { method, page_path: root.location.pathname });
        }
        catch (_) { /* Analytics must never interrupt an enquiry. */ }
    }
    function contactResult(success) {
        track(success ? 'generate_lead' : 'contact_form_error', { method: 'contact_form' });
    }
    root.EllisAnalytics = { track, contactResult };
    if (root.document)
        root.document.addEventListener('click', function (event) {
            try {
                const target = event.target;
                const link = target && typeof target.closest === 'function' && target.closest('a[href]');
                if (!link)
                    return;
                if (link.getAttribute('href')?.startsWith('tel:')) {
                    track('phone_click', { method: 'phone' });
                    return;
                }
                if (!production())
                    return;
                // Only the mapped ancestor links emitted by the breadcrumb component qualify.
                const nav = link.closest('nav.breadcrumbs[data-owner-id]');
                const item = link.closest('li');
                if (!nav || !item || !nav.contains(item) || item.getAttribute('aria-current'))
                    return;
                const owner = nav.getAttribute('data-owner-id') || '';
                if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(owner) || owner.length > 100)
                    return;
                const href = link.getAttribute('href') || '';
                if (!href.startsWith('https://'))
                    return;
                const destination = new URL(href);
                if (destination.origin !== root.location.origin || destination.username || destination.password)
                    return;
                const source = root.location.pathname;
                if (!safePath(source) || !safePath(destination.pathname))
                    return;
                const position = Array.from(nav.querySelectorAll('li')).indexOf(item) + 1;
                if (position < 1)
                    return;
                const properties = {
                    source_path: source,
                    target_path: destination.pathname,
                    locale: source.startsWith('/zh/') ? 'zh-Hans' : 'en-AU',
                    position,
                    owner_id: owner
                };
                root.gtag('event', 'breadcrumb_click', properties);
            }
            catch (_) { /* Navigation and enquiries must work even if analytics fails. */ }
        });
})(window);
