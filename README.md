# Ellis Services Group

Static website candidate for Ellis Services Group. The stated service market is the Perth metropolitan area only; individual suburb, postcode, service and provider availability still require confirmation.

## Package contents

- 98 static HTML pages, including the branded `404.html`
- Shared CSS, JavaScript, images and public data files
- `robots.txt`, `sitemap.xml` and `vercel.json`
- Portable local preview server and three verification scripts

No dependency installation or build step is required.

## Run locally

Requires a current Node.js version with built-in `fetch` and the Node test runner.

```powershell
node preview-server.js
```

Open `http://127.0.0.1:4173/`. Stop the server with `Ctrl+C`.

Run the package checks from the repository root:

```powershell
node tests/site.test.js
node tests/check-site.js
```

For the HTTP smoke check, keep the preview server running in one terminal and use another terminal:

```powershell
$env:ELLIS_PREVIEW_PORT=4173
node tests/http-smoke.js
```

## Contact form boundary

The contact form is a local demonstration. It validates and prefills fields in the browser but does not transmit or store enquiries. No recipient, backend endpoint, API key or secret is included. A reviewed recipient and sending service must be configured separately before online enquiry delivery can be enabled; the visible feedback must remain accurate until then.

## Release boundary

Canonical URLs, structured data, the sitemap and robots policy are configured for `https://perthhandymate.com.au/`. Publication is currently authorized only to the named GitHub repository; the package has not been deployed through Vercel or connected through GoDaddy DNS. Follow `DEPLOYMENT.md` and obtain separate explicit authorization before any hosting or DNS action.

## Local verification record
Trigger Vercel production deployment
Recorded 9 September 2026 from this standalone package:

- `node tests/site.test.js`: 13/13 passed.
- `node tests/check-site.js`: passed; 98 HTML pages, 98 unique titles, 98 unique descriptions, 2,905 local references and 183 valid JSON-LD blocks checked.
- `node tests/http-smoke.js` against `preview-server.js`: 97/97 sitemap pages plus the branded 404 page returned expected local HTML.
