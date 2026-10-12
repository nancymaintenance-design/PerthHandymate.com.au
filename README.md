# Ellis Services Group

Static website candidate for Ellis Services Group. The stated service market is the Perth metropolitan area only; individual suburb, postcode, service and provider availability still require confirmation.

## Package contents

- 125 static HTML pages, including the branded `404.html`; 124 URLs in the sitemap
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

In a separate terminal, use an available port (the current keyword-gap candidate preview uses 4182):

```powershell
$env:PORT=4182
node preview-server.js
```

Open [the local preview](http://127.0.0.1:4182/). The server binds only to `127.0.0.1`; stop your preview with `Ctrl+C`. Keep it running while executing the HTTP acceptance check:

```powershell
$env:ELLIS_PREVIEW_PORT=4182
node tests/http-smoke.js
```

## Contact form boundary

The repository already contains a serverless contact handler in `api/contact.js`. Its runtime sending secret and deployment configuration are required for live enquiry delivery. The local static preview does not execute that handler or send mail; contact delivery is not part of this acceptance. Do not submit a real enquiry during local review.

## Release boundary

Canonical URLs, structured data, the sitemap and robots policy use the primary origin `https://www.perthhandymate.com.au/`. This round is local acceptance only: no push, deployment, remote configuration or DNS change is authorized by these instructions. `DEPLOYMENT.md` remains historical deployment guidance, not an authorization.

Local slash/index redirects preserve the query string and stay on localhost. Explicit `/404.html` returns 200 with `noindex,follow`; unknown paths end with status 404 and the same recovery page. This preview does not validate Vercel host redirects, edge routing, response security/cache headers, production mail delivery or DNS.

The current source checkout uses the real Git history of `nancymaintenance-design/PerthHandymate.com.au`, with latest verified remote main `cdd814d7f93bf224142276076a5d03a803ce9c53` (12 October 2026). Local work is on `codex/phm-keyword-gap-local-2026-10-12`; the 125-page candidate includes eight supplementary task pages and three additional photographed examples beyond the unchanged 67-service priced catalogue. This is local work only and does not authorise a push or release.

The committed historical inventory contains 527 term IDs and routes in `docs/seo/content-round2/term-routing.json`; they remain intact. Current editorial intent ownership for all 67 catalogue pages and four supplements, the 49 accepted gap actions and supplemental current-term mapping are in `docs/seo/keyword-gap-round-2026-10-12/`. The older 31 owner clusters and four guide records describe the previous content round, not the current full service ownership.

## Local verification record
Current evidence: [12 October keyword-gap ownership and coverage](docs/seo/keyword-gap-round-2026-10-12/README.md), plus Task 1 and Task 2 reports under `../reports/content-gap-local-2026-10-12/`. The [10 October round-one local record](docs/seo/2026-10-10-round1-local-verification.md) and older September reports remain dated historical evidence. Their 114-page or 99/15 approval counts do not describe the expanded candidate and do not grant deployment authorisation.
