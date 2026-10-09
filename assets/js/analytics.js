(function (root) {
  'use strict';
  const allowed = new Set(['generate_lead', 'contact_form_error', 'phone_click']);
  function track(name, properties) {
    try {
      if (!['www.perthhandymate.com.au', 'perthhandymate.com.au'].includes(root.location.hostname) || !allowed.has(name) || typeof root.gtag !== 'function') return;
      const method = properties && properties.method === 'phone' ? 'phone' : 'contact_form';
      root.gtag('event', name, { method, page_path: root.location.pathname });
    } catch (_) { /* Analytics must never interrupt an enquiry. */ }
  }
  function contactResult(success) {
    track(success ? 'generate_lead' : 'contact_form_error', { method: 'contact_form' });
  }
  root.EllisAnalytics = { track, contactResult };
  if (root.document) root.document.addEventListener('click', function (event) {
    const link = event.target.closest && event.target.closest('a[href^="tel:"]');
    if (link) track('phone_click', { method: 'phone' });
  });
})(window);
