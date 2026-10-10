# Ellis Services Group

Static website candidate for Ellis Services Group. The stated service market is the Perth metropolitan area only; individual suburb, postcode, service and provider availability still require confirmation.

## Package contents

- 114 static HTML pages, including the branded `404.html`; 113 URLs in the sitemap
- Shared CSS, JavaScript, images and public data files
- `robots.txt`, `sitemap.xml` and `vercel.json`
- Portable reproducible build, local preview server and verification scripts
- An existing `api/contact.js` serverless handler, separate from the static preview

No dependency installation is required. Build the published static inputs before previewing.

## Run locally

Requires a current Node.js version with built-in `fetch` and the Node test runner. From the repository root, build first, then run the complete suite and static checker:

```powershell
node scripts/build-local.js
node --test tests/*.test.js
node tests/check-site.js
```

The build recreates ignored `dist/` and normalizes internal index links. Rebuild after editing source. The preview serves only `dist/` and exits with build instructions when that output is missing.

In a separate terminal, use an available port (the round-one acceptance preview uses 4180):

```powershell
$env:PORT=4180
node preview-server.js
```

Open [the local preview](http://127.0.0.1:4180/). The server binds only to `127.0.0.1`; stop your preview with `Ctrl+C`. Keep it running while executing the HTTP acceptance check:

```powershell
$env:ELLIS_PREVIEW_PORT=4180
node tests/http-smoke.js
```

## Contact form boundary

The repository already contains a serverless contact handler in `api/contact.js`. Its runtime sending secret and deployment configuration are required for live enquiry delivery. The local static preview does not execute that handler or send mail; contact delivery is not part of this acceptance. Do not submit a real enquiry during local review.

## Release boundary

Canonical URLs, structured data, the sitemap and robots policy use the primary origin `https://www.perthhandymate.com.au/`. This round is local acceptance only: no push, deployment, remote configuration or DNS change is authorized by these instructions. `DEPLOYMENT.md` remains historical deployment guidance, not an authorization.

Local slash/index redirects preserve the query string and stay on localhost. Explicit `/404.html` returns 200 with `noindex,follow`; unknown paths end with status 404 and the same recovery page. This preview does not validate Vercel host redirects, edge routing, response security/cache headers, production mail delivery or DNS.

The source baseline was captured from the GitHub `e84e79b` ZIP as synthetic local Git snapshot `3dcfede` after Git transport hung. Future integration must apply a reviewed diff onto the real Git history. Never force-push the synthetic snapshot history.

The committed keyword data has 31 owner clusters and four guide records. The historical 527-term inventory was unavailable and has not been verified. Source inspection also corrected the initial renderer-orphan claim: the renderer already had an inbound directory link; this round strengthens contextual discovery.

## Local verification record
Use [the 10 October 2026 round-one local verification record](docs/seo/2026-10-10-round1-local-verification.md) and this README for current acceptance evidence and boundaries. Older September reports, including `docs/seo/seo-implementation-report.md`, preserve historical evidence and do not describe this round's current state or grant deployment authorization.
