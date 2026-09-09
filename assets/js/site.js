(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.EllisSite = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
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
    const errors = {};
    if (!clean(values.name)) errors.name = 'Enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(values.email))) errors.email = 'Enter a valid email address.';
    if (!clean(values.phone)) errors.phone = 'Enter a phone number.';
    if (!clean(values.service)) errors.service = 'Choose a service area.';
    if (!clean(values.message)) errors.message = 'Tell us what you need help with.';
    return { valid: Object.keys(errors).length === 0, errors };
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
      location: clean(params.get('postcode')) || clean(params.get('suburb')),
      message: query ? `Service request: ${query}` : '',
    };
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
    if (!form) return;
    const prefill = buildContactPrefill(window.location.search);
    if (prefill.service && [...form.elements.service.options].some((option) => option.value === prefill.service)) form.elements.service.value = prefill.service;
    if (prefill.location) form.elements.postcode.value = prefill.location;
    if (prefill.message) form.elements.message.value = prefill.message;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form));
      const result = validateContact(values);
      form.querySelectorAll('[data-error]').forEach((node) => { node.textContent = ''; });
      form.querySelectorAll('[aria-invalid="true"]').forEach((node) => node.removeAttribute('aria-invalid'));
      const status = form.querySelector('[data-form-status]');
      status.textContent = '';
      if (!result.valid) {
        Object.entries(result.errors).forEach(([name, message]) => {
          const field = form.elements[name];
          field.setAttribute('aria-invalid', 'true');
          form.querySelector(`[data-error="${name}"]`).textContent = message;
        });
        form.querySelector('[aria-invalid="true"]').focus();
        return;
      }
      status.textContent = 'Details checked locally. No recipient or sending service is configured, so your enquiry was not sent.';
      form.reset();
    });
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

  function initCategoryImages(doc) {
    doc.querySelectorAll('[data-service-image]').forEach((slot) => {
      const source = slot.dataset.serviceImage;
      if (!source || typeof Image === 'undefined') return;
      const image = new Image();
      image.onload = () => {
        slot.style.backgroundImage = `linear-gradient(90deg, rgba(8,29,46,.74), rgba(8,29,46,.12)), url("${source}")`;
        slot.dataset.loaded = 'true';
      };
      image.src = source;
    });
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      initNav(document);
      initSearch(document);
      initPreservedLinks(document);
      initContact(document);
      initCategoryImages(document);
    });
  }

  return { resolveServiceSearch, validateContact, findService, mergeContactHref, buildContactPrefill };
});
