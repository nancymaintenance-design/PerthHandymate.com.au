interface ContactRequest {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
}

type ContactField = 'name' | 'email' | 'phone' | 'postcode' | 'service' | 'message' | 'website';
type ValidationErrors = Partial<Record<ContactField, string>>;
interface ContactValidationResult {
  valid: boolean;
  errors: ValidationErrors;
}
interface ContactValidationApi {
  validateContact(values: Record<string, unknown>): ContactValidationResult;
}

// The shared validator establishes these fields before an email is constructed.
interface ValidatedContactBody {
  name: string;
  email: string;
  phone: string;
  postcode?: string;
  service: string;
  message: string;
  website?: string;
}

type ContactResponseBody = { error: string; errors?: ValidationErrors } | { ok: true; message: string };
interface ContactResponse {
  setHeader(name: string, value: string): unknown;
  status(status: number): ContactResponse;
  json(body: ContactResponseBody): unknown;
}
interface ContactEmail {
  from: string;
  to: string[];
  reply_to: string;
  subject: string;
  text: string;
  html: string;
}
interface EmailRequestOptions {
  method: string;
  headers: Record<string, string>;
  body: string;
}
type EmailFetch = (url: string, options: EmailRequestOptions) => Promise<{ ok: boolean }>;
interface ContactHandlerOptions {
  env?: Record<string, string | undefined>;
  fetch?: EmailFetch;
}
type ContactHandler = (request: ContactRequest, response: ContactResponse) => Promise<unknown>;

const RECIPIENT = 'handyman.maintenance.au@outlook.com';
const { validateContact } = require('../assets/js/contact-validation.js') as ContactValidationApi;
const ALLOWED_FIELDS = new Set(['name', 'email', 'phone', 'postcode', 'service', 'message', 'website']);
const PRODUCTION_ORIGINS = new Set([
  'https://perthhandymate.com.au',
  'https://www.perthhandymate.com.au',
  'https://perthhandymate.vercel.app',
]);

function clean(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function isAllowedOrigin(origin: unknown): boolean {
  if (typeof origin !== 'string') return false;
  if (PRODUCTION_ORIGINS.has(origin)) return true;
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

function readBody(body: unknown): unknown {
  if (typeof body === 'string') {
    try { return JSON.parse(body) as unknown; } catch { return null; }
  }
  return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
}

function isJson(headers: ContactRequest['headers']): boolean {
  const contentType = headers && (headers['content-type'] || headers['Content-Type']);
  return typeof contentType === 'string' && /^application\/json(?:\s*;|$)/i.test(contentType);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

function buildEmail(body: ValidatedContactBody, from: string): ContactEmail {
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
    `Type of work: ${enquiry.service}`,
    '',
    'Job details:',
    enquiry.message,
  ];
  const rows = [
    ['Name', enquiry.name],
    ['Email', enquiry.email],
    ['Phone', enquiry.phone],
    ['Suburb or postcode', enquiry.postcode || 'Not provided'],
    ['Type of work', enquiry.service],
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

function respond(response: ContactResponse, status: number, body: ContactResponseBody): unknown {
  return response.status(status).json(body);
}

function createContactHandler({ env = process.env, fetch: request = globalThis.fetch }: ContactHandlerOptions = {}): ContactHandler {
  return async function contactHandler(requestObject, response) {
    if (requestObject.method !== 'POST') {
      response.setHeader('allow', 'POST');
      return respond(response, 405, { error: 'Method not allowed.' });
    }
    if (!isAllowedOrigin(requestObject.headers && requestObject.headers.origin)) return respond(response, 403, { error: 'This request is not allowed.' });
    if (!isJson(requestObject.headers)) return respond(response, 400, { error: 'Please check the highlighted details and try again.' });

    const parsedBody = readBody(requestObject.body);
    if (!parsedBody || typeof parsedBody !== 'object' || Array.isArray(parsedBody)) return respond(response, 400, { error: 'Please check the highlighted details and try again.' });
    const body = parsedBody as Record<string, unknown>;
    if (Object.keys(body).some(key => !ALLOWED_FIELDS.has(key)) || (body.website !== undefined && typeof body.website !== 'string')) return respond(response, 400, { error: 'Please check the highlighted details and try again.' });
    const validation = validateContact(body);
    if (!validation.valid) return respond(response, 400, { error: 'Please check the highlighted details and try again.', errors: validation.errors });
    const validatedBody = body as unknown as ValidatedContactBody;
    if (clean(validatedBody.website || '')) return respond(response, 200, { ok: true, message: 'Thanks. Our customer service team will call you about your request.' });

    const apiKey = env.RESEND_API_KEY;
    const from = env.RESEND_FROM_EMAIL;
    if (!apiKey || !from || typeof request !== 'function') {
      return respond(response, 503, { error: 'Online enquiries are temporarily unavailable. Please call 0403 069 685.' });
    }

    try {
      const sendResponse = await request('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(buildEmail(validatedBody, from)),
      });
      if (!sendResponse.ok) return respond(response, 502, { error: 'We could not send your enquiry just now. Please call 0403 069 685.' });
      return respond(response, 201, { ok: true, message: 'Thanks. Our customer service team will call you about your request.' });
    } catch {
      return respond(response, 502, { error: 'We could not send your enquiry just now. Please call 0403 069 685.' });
    }
  };
}

module.exports = createContactHandler();
module.exports.createContactHandler = createContactHandler;
