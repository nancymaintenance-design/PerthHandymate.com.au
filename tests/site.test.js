const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

global.window = global;
require('../data/search-catalog.js');

const {
  resolveServiceSearch,
  validateContact,
  contactPayload,
  mergeContactHref,
  buildContactPrefill,
} = require('../assets/js/site.js');

test('routes recognised trade aliases to the correct service detail with location preserved', () => {
  assert.deepEqual(resolveServiceSearch('  Sparky  ', '2000'), {
    route: 'services/electrical-plumbing-gas-air-conditioning/electricians/',
    service: 'Electrical, plumbing, gas & air conditioning',
    query: 'Sparky',
    postcode: '2000',
    matched: true,
  });
  assert.deepEqual(resolveServiceSearch('roofing', '4000'), {
    route: 'services/roofing-gutters-exterior/roofing/',
    service: 'Roofing, gutters & exterior',
    query: 'roofing',
    postcode: '4000',
    matched: true,
  });
  assert.deepEqual(resolveServiceSearch('lawn mowing', 'North Sydney'), {
    route: 'services/gardens-landscaping/lawn-mowing/',
    service: 'Gardens & landscaping',
    query: 'lawn mowing',
    postcode: 'North Sydney',
    matched: true,
  });
});

test('routes merged canonical display names selected from suggestions to their detail pages', () => {
  assert.deepEqual(resolveServiceSearch('Gutter Services', '3000'), {
    route: 'services/roofing-gutters-exterior/gutter-services/',
    service: 'Roofing, gutters & exterior',
    query: 'Gutter Services',
    postcode: '3000',
    matched: true,
  });
  assert.deepEqual(resolveServiceSearch('Door Installation', 'Perth'), {
    route: 'services/doors-windows-glass-screens/door-installation/',
    service: 'Doors, windows, glass & screens',
    query: 'Door Installation',
    postcode: 'Perth',
    matched: true,
  });
});

test('generated service catalog covers all 75 source labels through 67 canonical pages', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/service-catalog.json'), 'utf8'));
  assert.equal(catalog.rawServices.length, 75);
  assert.equal(new Set(catalog.rawServices.map((item) => item.label)).size, 75);
  assert.equal(catalog.canonicalServices.length, 67);
  assert.equal(new Set(catalog.canonicalServices.map((item) => item.url)).size, 67);
  for (const item of catalog.rawServices) assert.ok(fs.existsSync(path.join(__dirname, '..', item.url, 'index.html')), item.label);
});

test('exhaustively routes the 205 governed canonical, source-label and major-alias combinations', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/service-catalog.json'), 'utf8'));
  const combinations = [];
  for (const item of catalog.canonicalServices) {
    combinations.push({ query: item.title, route: item.url, canonical: item.categoryTitle, kind: 'canonical' });
    for (const query of item.rawLabels) combinations.push({ query, route: item.url, canonical: item.categoryTitle, kind: 'source' });
    for (const query of item.majorAliases || []) combinations.push({ query, route: item.url, canonical: item.categoryTitle, kind: 'alias' });
  }
  assert.equal(combinations.filter((item) => item.kind === 'canonical').length, 67);
  assert.equal(combinations.filter((item) => item.kind === 'source').length, 75);
  assert.equal(combinations.filter((item) => item.kind === 'alias').length, 63);
  assert.equal(combinations.length, 205);
  for (const item of combinations) {
    const actual = resolveServiceSearch(item.query, '2060');
    assert.equal(actual.route, item.route, `${item.kind}: ${item.query}`);
    assert.equal(actual.service, item.canonical, `${item.kind} canonical: ${item.query}`);
    assert.equal(actual.postcode, '2060', `${item.kind} location: ${item.query}`);
  }
});

test('canonical detail content has no exact summary or common-task-group reuse', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/service-catalog.json'), 'utf8'));
  const summaries = catalog.canonicalServices.map((item) => item.summary.trim().toLowerCase());
  const taskGroups = catalog.canonicalServices.map((item) => (item.commonTasks || []).map((tag) => tag.trim().toLowerCase()).join('|'));
  const tellGroups = catalog.canonicalServices.map((item) => (item.customerInfo || []).map((line) => line.trim().toLowerCase()).join('|'));
  assert.equal(new Set(summaries).size, 67, 'exact duplicate summaries remain');
  assert.equal(new Set(taskGroups).size, 67, 'exact duplicate common-task groups remain');
  assert.equal(new Set(tellGroups).size, 67, 'exact duplicate what-to-tell groups remain');
  assert.ok(catalog.canonicalServices.every((item) => item.commonTasks.length === 3 && item.customerInfo.length === 3));
});

test('ships the reviewed 67-service content in the public catalog and rendered pages', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/service-catalog.json'), 'utf8')).canonicalServices;
  assert.equal(catalog.length, 67);
  for (const item of catalog) {
    assert.equal(item.commonTasks.length, 3, `${item.slug} commonTasks`);
    assert.equal(item.customerInfo.length, 3, `${item.slug} customerInfo`);
    for (const field of ['summary', 'safetyNote', 'nextStep']) assert.equal(typeof item[field], 'string', `${item.slug} ${field}`);
    const page = fs.readFileSync(path.join(__dirname, '..', item.url, 'index.html'), 'utf8');
    for (const text of [item.summary, ...item.commonTasks, ...item.customerInfo, item.safetyNote, item.nextStep]) assert.ok(page.includes(text.replaceAll('&', '&amp;')), `${item.slug} visible: ${text}`);
  }
});

test('reviewed service content has no duplicate leaves or retired template language', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/service-catalog.json'), 'utf8')).canonicalServices;
  const scalarFields = ['summary', 'safetyNote', 'nextStep'];
  assert.ok(catalog.every((item) => scalarFields.every((field) => typeof item[field] === 'string') && ['commonTasks', 'customerInfo'].every((field) => Array.isArray(item[field]))), 'reviewed leaf fields are missing');
  for (const field of scalarFields) {
    const values = catalog.map((item) => item[field].trim().toLowerCase());
    assert.equal(new Set(values).size, 67, `${field} exact duplicates`);
  }
  for (const field of ['commonTasks', 'customerInfo']) {
    const values = catalog.flatMap((item) => item[field].map((value) => value.trim().toLowerCase()));
    assert.equal(new Set(values).size, 201, `${field} leaf exact duplicates`);
  }
  const allLeafText = catalog.flatMap((item) => [item.summary, ...item.commonTasks, ...item.customerInfo, item.safetyNote, item.nextStep]).join('\n').toLowerCase();
  for (const retired of ['mowing & tidy-up', 'whether switchboards is', 'whether access controls is', 'review the property for']) assert.equal(allLeafText.includes(retired), false, retired);
  assert.equal(catalog.some((item) => /^plan /i.test(item.commonTasks[1] || '') && /^coordinate /i.test(item.commonTasks[2] || '')), false, 'generic Review/Plan/Coordinate task sequence');
});

test('routes an unknown non-empty service query to contact while preserving inputs', () => {
  assert.deepEqual(resolveServiceSearch('solar battery tuning', '2060'), {
    route: 'contact/',
    service: '',
    query: 'solar battery tuning',
    postcode: '2060',
    matched: false,
  });
});

test('rejects missing contact fields, phone and malformed email without sending anything', () => {
  assert.deepEqual(validateContact({ name: '', email: 'not-an-email', phone: '', service: '', message: '' }), {
    valid: false,
    errors: {
      name: 'Enter your name.',
      email: 'Enter a valid email address.',
      phone: 'Enter a phone number.',
      service: 'Choose a service area.',
      message: 'Tell us what you need help with.',
    },
  });
});

test('accepts a complete local enquiry check', () => {
  assert.deepEqual(validateContact({
    name: 'Alex Morgan',
    email: 'alex@example.com',
    phone: '0400 000 000',
    service: 'Roofing, gutters & exterior',
    message: 'Please inspect a leaking gutter near the rear deck.',
  }), { valid: true, errors: {} });
});

test('submits only the approved enquiry fields to the contact endpoint', () => {
  assert.deepEqual(contactPayload({
    name: 'Alex Morgan',
    email: 'alex@example.com',
    phone: '0400 000 000',
    postcode: '6000',
    service: 'Roofing, gutters & exterior',
    message: 'Please inspect a leaking gutter near the rear deck.',
    website: '',
    untrusted: 'must not be sent',
  }), {
    name: 'Alex Morgan',
    email: 'alex@example.com',
    phone: '0400 000 000',
    postcode: '6000',
    service: 'Roofing, gutters & exterior',
    message: 'Please inspect a leaking gutter near the rear deck.',
    website: '',
  });
});

test('preserves the known search query and location when continuing from a service page', () => {
  assert.equal(
    mergeContactHref('../../contact/index.html?service=Electrical%2C+plumbing%2C+gas+%26+air+conditioning', '?q=sparky&postcode=2000'),
    '../../contact/index.html?service=Electrical%2C+plumbing%2C+gas+%26+air+conditioning&q=sparky&postcode=2000',
  );
});

test('builds local contact prefills from unknown query and suburb parameters', () => {
  assert.deepEqual(buildContactPrefill('?q=solar+battery+tuning&suburb=North+Sydney'), {
    service: '',
    location: 'North Sydney',
    message: 'Service request: solar battery tuning',
  });
});

test('builds local contact prefills from canonical service and postcode parameters', () => {
  assert.deepEqual(buildContactPrefill('?service=Roofing%2C+gutters+%26+exterior&q=roofer&postcode=4000'), {
    service: 'Roofing, gutters & exterior',
    location: '4000',
    message: 'Service request: roofer',
  });
});
