const RECIPIENT = 'handyman.maintenance.au@outlook.com';
const ALLOWED_FIELDS = new Set(['name', 'email', 'phone', 'postcode', 'service', 'message', 'website']);
const PRODUCTION_ORIGINS = new Set([
  'https://perthhandymate.com.au',
  'https://www.perthhandymate.com.au',
  'https://perthhandymate.vercel.app',
]);

function clean(value) {
  return value.trim().replace(/\s+/g, ' ');
}

function isAllowedOrigin(origin) {
  if (typeof origin !== 'string') return false;
  if (PRODUCTION_ORIGINS.has(origin)) return true;
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

function readBody(body) {
  if (typeof body === 'string') {
    try { return JSON.parse(body); } catch { return null; }
  }
  return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
}

function isJson(headers) {
  const contentType = headers && (headers['content-type'] || headers['Content-Type']);
  return typeof contentType === 'string' && /^application\/json(?:\s*;|$)/i.test(contentType);
}

function validString(value, min, max) {
  return typeof value === 'string' && clean(value).length >= min && clean(value).length <= max;
}

function isValidEnquiry(body) {
  if (!body || Object.keys(body).some((key) => !ALLOWED_FIELDS.has(key))) return false;
  if (!['name', 'email', 'phone', 'service', 'message'].every((key) => typeof body[key] === 'string')) return false;
  if (body.postcode !== undefined && typeof body.postcode !== 'string') return false;
  if (body.website !== undefined && typeof body.website !== 'string') return false;
  if (!validString(body.name, 2, 100) || !validString(body.phone, 6, 40) || !validString(body.service, 2, 160) || !validString(body.message, 10, 3000)) return false;
  if (clean(body.postcode || '').length > 100) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(body.email)) && clean(body.email).length <= 254;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function buildEmail(body, from) {
  const enquiry = {
    name: clean(body.name),
    email: clean(body.email),
    phone: clean(body.phone),
    postcode: clean(body.postcode || ''),
    service: clean(body.service),
    message: clean(body.message),
  };
  const lines = [
    `Name: ${enquiry.name}`,
    `Email: ${enquiry.email}`,
    `Phone: ${enquiry.phone}`,
    `Suburb or postcode: ${enquiry.postcode || 'Not provided'}`,
    `Service area: ${enquiry.service}`,
    '',
    'Job details:',
    enquiry.message,
  ];
  const rows = [
    ['Name', enquiry.name],
    ['Email', enquiry.email],
    ['Phone', enquiry.phone],
    ['Suburb or postcode', enquiry.postcode || 'Not provided'],
    ['Service area', enquiry.service],
  ].map(([label, value]) => `<p><strong>${label}:</strong> ${escapeHtml(value)}</p>`).join('');
  return {
    from,
    to: [RECIPIENT],
    reply_to: enquiry.email,
    subject: `New website enquiry: ${enquiry.service}`,
    text: lines.join('\n'),
    html: `${rows}<p><strong>Job details:</strong></p><p>${escapeHtml(enquiry.message).replace(/\n/g, '<br>')}</p>`,
  };
}

function respond(response, status, body) {
  return response.status(status).json(body);
}

function createContactHandler({ env = process.env, fetch: request = globalThis.fetch } = {}) {
  return async function contactHandler(requestObject, response) {
    if (requestObject.method !== 'POST') {
      response.setHeader('allow', 'POST');
      return respond(response, 405, { error: 'Method not allowed.' });
    }
    if (!isAllowedOrigin(requestObject.headers && requestObject.headers.origin)) return respond(response, 403, { error: 'This request is not allowed.' });
    if (!isJson(requestObject.headers)) return respond(response, 400, { error: 'Please check the highlighted details and try again.' });

    const body = readBody(requestObject.body);
    if (!isValidEnquiry(body)) return respond(response, 400, { error: 'Please check the highlighted details and try again.' });
    if (clean(body.website || '')) return respond(response, 200, { ok: true, message: 'Thanks. Your enquiry has been received.' });

    const apiKey = env.RESEND_API_KEY;
    const from = env.RESEND_FROM_EMAIL;
    if (!apiKey || !from || typeof request !== 'function') {
      return respond(response, 503, { error: 'Online enquiries are temporarily unavailable. Please call 0403 069 685.' });
    }

    try {
      const sendResponse = await request('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(buildEmail(body, from)),
      });
      if (!sendResponse.ok) return respond(response, 502, { error: 'We could not send your enquiry just now. Please call 0403 069 685.' });
      return respond(response, 201, { ok: true, message: 'Thanks. Your enquiry has been received.' });
    } catch {
      return respond(response, 502, { error: 'We could not send your enquiry just now. Please call 0403 069 685.' });
    }
  };
}

module.exports = createContactHandler();
module.exports.createContactHandler = createContactHandler;
