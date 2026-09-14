const test = require('node:test');
const assert = require('node:assert/strict');

const { createContactHandler } = require('../api/contact.js');

function makeResponse() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function validEnquiry(overrides = {}) {
  return {
    name: 'Alex Morgan',
    email: 'alex@example.com',
    phone: '0400 000 000',
    postcode: '6000',
    service: 'Roofing, gutters & exterior',
    message: 'Please inspect a leaking gutter near the rear deck.',
    website: '',
    ...overrides,
  };
}

function makeHandler(options = {}) {
  const calls = [];
  const handler = createContactHandler({
    env: {
      RESEND_API_KEY: 'test-resend-key',
      RESEND_FROM_EMAIL: 'Ellis Services Group <onboarding@resend.dev>',
      ...options.env,
    },
    fetch: async (...args) => {
      calls.push(args);
      return options.resendResponse || { ok: true, status: 200, json: async () => ({ id: 'email_123' }) };
    },
  });
  return { handler, calls };
}

function request(body, overrides = {}) {
  const { headers = {}, ...rest } = overrides;
  return {
    method: 'POST',
    headers: {
      origin: 'https://perthhandymate.com.au',
      'content-type': 'application/json',
      ...headers,
    },
    body,
    ...rest,
  };
}

test('rejects methods other than POST before processing an enquiry', async () => {
  const { handler, calls } = makeHandler();
  const response = makeResponse();

  await handler(request(validEnquiry(), { method: 'GET' }), response);

  assert.equal(response.statusCode, 405);
  assert.deepEqual(response.body, { error: 'Method not allowed.' });
  assert.equal(calls.length, 0);
});

test('rejects a cross-origin contact request before it can send an email', async () => {
  const { handler, calls } = makeHandler();
  const response = makeResponse();

  await handler(request(validEnquiry(), { headers: { origin: 'https://example.com' } }), response);

  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.body, { error: 'This request is not allowed.' });
  assert.equal(calls.length, 0);
});

test('accepts the current Vercel production origin for a valid enquiry', async () => {
  const { handler, calls } = makeHandler();
  const response = makeResponse();

  await handler(request(validEnquiry(), { headers: { origin: 'https://perthhandymate.vercel.app' } }), response);

  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.body, { ok: true, message: 'Thanks. Your enquiry has been received.' });
  assert.equal(calls.length, 1);
});

test('rejects malformed or incomplete JSON enquiries without calling Resend', async () => {
  const { handler, calls } = makeHandler();
  const response = makeResponse();

  await handler(request(validEnquiry({ email: 'not-an-email', message: 'short' })), response);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { error: 'Please check the highlighted details and try again.' });
  assert.equal(calls.length, 0);
});

test('rejects a content type that only resembles JSON without calling Resend', async () => {
  const { handler, calls } = makeHandler();
  const response = makeResponse();

  await handler(request(validEnquiry(), { headers: { 'content-type': 'application/jsonx' } }), response);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { error: 'Please check the highlighted details and try again.' });
  assert.equal(calls.length, 0);
});

test('accepts a filled honeypot without forwarding it to Resend', async () => {
  const { handler, calls } = makeHandler();
  const response = makeResponse();

  await handler(request(validEnquiry({ website: 'https://spam.example' })), response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { ok: true, message: 'Thanks. Your enquiry has been received.' });
  assert.equal(calls.length, 0);
});

test('sends a valid same-origin enquiry to Ellis with the customer email as reply-to', async () => {
  const { handler, calls } = makeHandler();
  const response = makeResponse();

  await handler(request(validEnquiry()), response);

  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.body, { ok: true, message: 'Thanks. Your enquiry has been received.' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'https://api.resend.com/emails');
  const outbound = JSON.parse(calls[0][1].body);
  assert.deepEqual(outbound.to, ['handyman.maintenance.au@outlook.com']);
  assert.equal(outbound.reply_to, 'alex@example.com');
  assert.match(outbound.text, /Alex Morgan/);
  assert.equal(outbound.text.includes('test-resend-key'), false);
});

test('returns a safe temporary-unavailable message when sending is not configured', async () => {
  const { handler, calls } = makeHandler({ env: { RESEND_API_KEY: '', RESEND_FROM_EMAIL: '' } });
  const response = makeResponse();

  await handler(request(validEnquiry()), response);

  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.body, { error: 'Online enquiries are temporarily unavailable. Please call 0403 069 685.' });
  assert.equal(calls.length, 0);
});

test('does not expose an upstream delivery error to the customer', async () => {
  const { handler } = makeHandler({ resendResponse: { ok: false, status: 422, json: async () => ({ message: 'Sensitive provider detail' }) } });
  const response = makeResponse();

  await handler(request(validEnquiry()), response);

  assert.equal(response.statusCode, 502);
  assert.deepEqual(response.body, { error: 'We could not send your enquiry just now. Please call 0403 069 685.' });
});
