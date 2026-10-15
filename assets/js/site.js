(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.EllisSite = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const contactValidation = typeof module === 'object' && module.exports
    ? require('./contact-validation.js') : globalThis.EllisContactValidation;
  const serviceMap = [
    { service: 'Electricians', route: 'services/electrical-plumbing-gas-air-conditioning/', terms: ['electrician', 'electricians', 'electrical', 'sparky', 'power point', 'switchboard'] },
    { service: 'Plumbing', route: 'services/electrical-plumbing-gas-air-conditioning/', terms: ['plumber', 'plumbing', 'tap', 'toilet', 'drain', 'hot water', 'gas fitting'] },
    { service: 'Air conditioning', route: 'services/electrical-plumbing-gas-air-conditioning/', terms: ['aircon', 'air con', 'air conditioning', 'split system', 'heating', 'cooling'] },
    { service: 'Handyman', route: 'services/handyman-interiors-appliance-repairs/', terms: ['handyman', 'odd jobs', 'maintenance', 'appliance repair', 'cabinet', 'flatpack'] },
    { service: 'House painting', route: 'services/handyman-interiors-appliance-repairs/', terms: ['painter', 'painting', 'house painting', 'interior painting'] },
    { service: 'Doors, windows & glass', route: 'services/doors-windows-glass-screens/', terms: ['door', 'doors', 'window', 'windows', 'glass', 'glazier', 'flyscreen'] },
    { service: 'Roofing', route: 'services/roofing-gutters-exterior/', terms: ['roofer', 'roofing', 'roof', 'gutter', 'gutters', 'downpipe'] },
    { service: 'Lawn & garden care', route: 'services/gardens-landscaping/', terms: ['lawn', 'lawn mowing', 'mowing', 'gardener', 'gardening', 'landscaper', 'landscaping', 'tree pruning'] },
    { service: 'Outdoor structures', route: 'services/outdoor-structures-fencing-pools/', terms: ['fence', 'fencing', 'deck', 'pergola', 'pool', 'shed'] },
    { service: 'Building & renovation', route: 'services/building-renovation-structural/', terms: ['builder', 'renovation', 'carpenter', 'carpentry', 'bricklayer', 'tiler'] },
    { service: 'Planning & compliance', route: 'services/planning-inspection-compliance/', terms: ['building inspection', 'inspection', 'drafting', 'surveyor', 'planning', 'compliance'] },
    { service: 'Cleaning & removals', route: 'services/cleaning-removals-pest-hazard/', terms: ['cleaner', 'cleaning', 'removalist', 'removals', 'pest control', 'asbestos', 'mould'] },
  ];
  const canonicalServices = {
    'services/electrical-plumbing-gas-air-conditioning/': 'Electrical, plumbing, gas & air conditioning',
    'services/handyman-interiors-appliance-repairs/': 'Handyman, interiors & appliance repairs',
    'services/doors-windows-glass-screens/': 'Doors, windows, glass & screens',
    'services/roofing-gutters-exterior/': 'Roofing, gutters & exterior',
    'services/gardens-landscaping/': 'Gardens & landscaping',
    'services/outdoor-structures-fencing-pools/': 'Outdoor structures, fencing & pools',
    'services/building-renovation-structural/': 'Building, renovation & structural',
    'services/planning-inspection-compliance/': 'Planning, inspection & compliance',
    'services/cleaning-removals-pest-hazard/': 'Cleaning, removals, pest & hazard',
  };

  function clean(value) {
    return String(value || '').trim().replace(/\s+/g, ' ');
  }

  function getServiceMap() {
    if (typeof globalThis !== 'undefined' && Array.isArray(globalThis.ELLIS_SEARCH_CATALOG) && globalThis.ELLIS_SEARCH_CATALOG.length) return globalThis.ELLIS_SEARCH_CATALOG;
    return serviceMap;
  }

  function findService(query) {
    const needle = clean(query).toLowerCase();
    if (!needle) return null;
    const catalog = getServiceMap();
    return catalog.find((item) => item.terms.some((term) => needle === term)) ||
      catalog.find((item) => item.terms.some((term) => needle.includes(term) || term.includes(needle))) || null;
  }

  function resolveServiceSearch(query, postcode) {
    const cleanedQuery = clean(query);
    const match = findService(cleanedQuery);
    return {
      route: match ? match.route : 'contact/',
      service: match ? (match.canonical || canonicalServices[match.route] || '') : '',
      query: cleanedQuery,
      postcode: clean(postcode),
      matched: Boolean(match),
    };
  }

  function validateContact(values) {
    return contactValidation.validateContact(values);
  }

  function contactPayload(values) {
    return Object.fromEntries(['name', 'email', 'phone', 'postcode', 'service', 'message', 'website'].map((name) => [name, clean(values[name]) ]));
  }

  function mergeContactHref(href, currentSearch) {
    const parts = String(href).split('?');
    const params = new URLSearchParams(parts[1] || '');
    const current = new URLSearchParams(currentSearch || '');
    ['q', 'postcode', 'suburb'].forEach((name) => {
      const value = clean(current.get(name));
      if (value) params.set(name, value);
    });
    const query = params.toString();
    return parts[0] + (query ? '?' + query : '');
  }

  function buildContactPrefill(search) {
    const params = new URLSearchParams(search || '');
    const query = clean(params.get('q'));
    return {
      service: clean(params.get('service')),
      location: clean(params.get('postcode')) || clean(params.get('suburb')) || clean(params.get('location')),
      message: query ? `Service request: ${query}` : '',
    };
  }

  function resolveLocalContext(search, title, areas) {
    const value = new URLSearchParams(search || '').get('suburb');
    if (!value || /[<>\x00-\x1f]/.test(value)) return null;
    const names = (areas || []).flatMap(area => [area.name, ...area.suburbs]);
    const locality = names.find(name => name.toLowerCase() === value.trim().toLowerCase());
    if (!locality) return null;
    const topic = title.replace(/\s+in Perth$/i, '').replace(/\s+Perth$/i, '');
    return { locality, topic, heading: `${topic} in ${locality}` };
  }

  function initLocalContext(doc) {
    if (!/^\/services\/[^/]+\//.test(window.location.pathname)) return;
    const h1 = doc.querySelector('h1');
    if (!h1) return;
    const context = resolveLocalContext(window.location.search, h1.textContent, window.ELLIS_CONTENT?.serviceAreas);
    if (!context) return;
    const banner = doc.createElement('p');
    banner.className = 'selected-locality';
    banner.dataset.localContext = '';
    banner.textContent = `${context.heading} — selected repair location. Ellis confirms the scope and assessment arrangements with you.`;
    h1.after(banner);
    doc.querySelectorAll('[data-preserve-search]').forEach(link => {
      const href = new URL(link.href, window.location.href);
      if (/\/contact\/$/.test(href.pathname)) {
        href.searchParams.set('suburb', context.locality);
        if (!href.searchParams.has('q')) href.searchParams.set('q', context.topic);
        link.href = href.href;
      }
    });
  }

  function initSearch(doc) {
    doc.querySelectorAll('[data-service-search]').forEach((form) => {
      const query = form.querySelector('[name="q"]');
      const postcode = form.querySelector('[name="postcode"]');
      const clear = form.querySelector('[data-clear-search]');
      const suggestions = form.querySelector('[data-suggestions]');
      const base = form.dataset.root || './';

      function renderSuggestions() {
        const value = clean(query.value).toLowerCase();
        clear.hidden = !value;
        if (!value) { suggestions.replaceChildren(); suggestions.hidden = true; return; }
        const options = getServiceMap().filter((item) => item.service.toLowerCase().includes(value) || item.terms.some((term) => term.includes(value))).slice(0, 5);
        suggestions.replaceChildren(...options.map((item) => {
          const button = doc.createElement('button');
          button.type = 'button';
          button.textContent = item.service;
          button.addEventListener('click', () => { query.value = item.service; suggestions.hidden = true; query.focus(); });
          return button;
        }));
        suggestions.hidden = options.length === 0;
      }

      query.addEventListener('input', renderSuggestions);
      clear.addEventListener('click', () => { query.value = ''; renderSuggestions(); query.focus(); });
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const result = resolveServiceSearch(query.value, postcode.value);
        if (!result.query) { query.setAttribute('aria-invalid', 'true'); query.focus(); return; }
        const params = new URLSearchParams({ q: result.query });
        if (result.postcode) params.set('postcode', result.postcode);
        if (result.service) params.set('service', result.service);
        window.location.href = base + result.route + '?' + params.toString();
      });
    });
  }

  function initContact(doc) {
    const form = doc.querySelector('[data-contact-form]');
    if (!form || !contactValidation) return;
    const prefill = buildContactPrefill(window.location.search);
    if (prefill.service && [...form.elements.service.options].some((option) => option.value === prefill.service)) form.elements.service.value = prefill.service;
    if (prefill.location) form.elements.postcode.value = prefill.location;
    if (prefill.message) form.elements.message.value = prefill.message;
    const submit = form.querySelector('[type="submit"]');
    const status = form.querySelector('[data-form-status]');
    let sending = false;
    function showFieldErrors(errors) {
      if (!errors || typeof errors !== 'object' || Array.isArray(errors)) return false;
      let first;
      ['name', 'email', 'phone', 'postcode', 'service', 'message'].forEach(name => {
        const message = errors[name];
        const field = form.elements.namedItem(name);
        const feedback = form.querySelector(`[data-error="${name}"]`);
        if (!field || !feedback || typeof message !== 'string' || !message.trim() || message.length > 200) return;
        field.setAttribute('aria-invalid', 'true');
        feedback.textContent = message;
        first = first || field;
      });
      if (first) first.focus();
      return Boolean(first);
    }
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (sending) return;
      const values = Object.fromEntries(new FormData(form));
      const result = validateContact(values);
      form.querySelectorAll('[data-error]').forEach((node) => { node.textContent = ''; });
      form.querySelectorAll('[aria-invalid="true"]').forEach((node) => node.removeAttribute('aria-invalid'));
      status.textContent = '';
      if (!result.valid) {
        showFieldErrors(result.errors);
        status.textContent = 'Please check the highlighted details and try again.';
        return;
      }
      const previousLabel = submit.textContent;
      sending = true;
      submit.disabled = true;
      submit.textContent = 'Sending…';
      status.textContent = 'Sending your enquiry…';
      try {
        const response = await fetch(form.dataset.contactEndpoint || '/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contactPayload(values)),
        }).catch(() => {
          throw new Error('We could not send your enquiry. Your details are still here. Please try again or call 0403 069 685.');
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          const fieldsShown = response.status === 400 && showFieldErrors(body && body.errors);
          if (fieldsShown) {
            status.textContent = 'Please check the highlighted details and try again.';
            if (window.EllisAnalytics) window.EllisAnalytics.contactResult(false);
            return;
          }
          throw new Error(typeof body?.error === 'string' ? body.error : 'We could not send your enquiry just now. Please call 0403 069 685.');
        }
        if (window.EllisAnalytics) window.EllisAnalytics.contactResult(true);
        status.textContent = body.message || 'Thanks. Our customer service team will call you about your request.';
        form.reset();
      } catch (error) {
        if (window.EllisAnalytics) window.EllisAnalytics.contactResult(false);
        status.textContent = error.message || 'We could not send your enquiry just now. Please call 0403 069 685.';
      } finally {
        sending = false;
        submit.disabled = false;
        submit.textContent = previousLabel;
      }
    });
    submit.disabled = false;
  }

  function initNav(doc) {
    const toggle = doc.querySelector('[data-nav-toggle]');
    const nav = doc.querySelector('[data-nav]');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      nav.dataset.open = String(!open);
    });
  }

  function initPreservedLinks(doc) {
    doc.querySelectorAll('[data-preserve-search]').forEach((link) => {
      link.href = mergeContactHref(link.getAttribute('href'), window.location.search);
    });
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      initNav(document);
      initSearch(document);
      initPreservedLinks(document);
      initLocalContext(document);
      initContact(document);
    });
  }

  return { resolveServiceSearch, validateContact, contactPayload, findService, mergeContactHref, buildContactPrefill, resolveLocalContext };
});
