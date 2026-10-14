# Ellis Services Group

Static website candidate for Ellis Services Group. The stated service market is the Perth metropolitan area only; individual suburb, postcode, service and provider availability still require confirmation.

## Package contents

- 127 static HTML pages, including the branded `404.html`; 126 URLs in the sitemap
- Shared CSS, JavaScript, images and public data files
- `robots.txt`, `sitemap.xml` and `vercel.json`
- Portable reproducible build, local preview server and verification scripts
- An existing `api/contact.js` serverless handler, separate from the static preview

The static build and preview require no dependency installation. The complete test suite additionally requires Git history, Playwright and a Chromium browser as described below; these are development tools, not production website dependencies. Build the published static inputs before previewing.

## Run locally

Requires a current Node.js version with built-in `fetch` and the Node test runner (verified with Node 24). After the verification setup below, run these commands from the repository root:

```powershell
node scripts/build-local.js
node --test tests/*.test.js
node tests/check-site.js
node tools/five-category-coverage.js
```

The build recreates ignored `dist/` and normalizes internal index links. Rebuild after editing source. The preview serves only `dist/` and exits with build instructions when that output is missing.

### Reviewed keyword headings

`data/heading-keyword-policy.json` records the 127-page review and approved topic-led title/H1/H2 changes. After running a historical page generator, run `node scripts/apply-heading-keywords.js` before rebuilding. It reapplies the reviewed headings, synchronizes guide-card links and Article headlines, and maintains guide title sources without changing service scope, prices, URLs, forms or image layout. Repeated application must report zero HTML changes. Do not use the historical editorial wording to override a later user-approved heading policy.

The nine confirmed service regions are maintained in `data/content.js`. After an older region/editorial generator, run `node tools/render-regions.js`, `node tools/local-marketing-wording.js`, `node scripts/apply-heading-keywords.js`, then `node scripts/apply-content-dates.js`. The region renderer preserves the seven original destinations, adds Swanbourne and Mundaring/Kalamunda coverage, and supplies static fault-specific links. `tools/nonservice-content-round2.js` delegates regional sections to this renderer and respects the current heading policy. Selected `suburb` query context is validated against the confirmed region/suburb list before a service banner is displayed; it does not create new indexable suburb URLs.

The twelve guide articles and categorized library are maintained in `data/guide-library.js` (scenario titles, introductions, decision sections, conclusions and relationships) and `data/guide-library-body.json` (the retained approved body, scenario FAQs and evidence links). Run `node tools/render-guide-library.js` after editing either source, then apply the heading policy and content dates above. The guide entries in `data/content.js` and `data/keyword-content-round.json` are metadata/legacy projections; their `editorialSource` points to the current body owner. The older non-service editorial adapter delegates all thirteen guide pages to this renderer, and the historical keyword generator finishes with it, so neither can replace the maintained articles with previous copy. Repeated rendering and policy application must change zero HTML pages. Guide layout lives in `assets/css/guide-library.css`; global brand/header tokens remain in `assets/css/global.css`.

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

## Complete verification prerequisites

Use a full Git checkout, with Git on `PATH`. The original-image preservation test reads commit `18dd298dbc5ad48675c8a3b560216e85a689641e`, and existing catalogue/527-term preservation tests read `cc9d2b63f730d890cacdff430ed7551152b976e7`. Keep these historical objects: a ZIP export or shallow clone missing either commit cannot run the complete suite. CI must fetch full history (for example `fetch-depth: 0` with checkout); an existing shallow checkout can use `git fetch --unshallow origin`. Check availability with:

```powershell
git cat-file -t 18dd298dbc5ad48675c8a3b560216e85a689641e
git cat-file -t cc9d2b63f730d890cacdff430ed7551152b976e7
```

Install the tested Playwright version locally for development, then install its bundled Chromium browser. These commands do not change the static build or require a production package manifest:

```powershell
npm install --no-save --package-lock=false playwright@1.62.1
npx playwright install chromium
node --test tests/*.test.js
```

On Linux CI, browser system libraries may also be required; use `npx playwright install --with-deps chromium` on a host where installing them is authorized. A maintainer with Chrome or Microsoft Edge already installed can omit the Chromium download and select that browser, for example:

```powershell
$env:PHM_BROWSER_CHANNEL='msedge' # or 'chrome'
node --test tests/*.test.js
Remove-Item Env:PHM_BROWSER_CHANNEL
```

Alternatively set `PHM_BROWSER_EXECUTABLE_PATH` to an absolute Chrome/Edge executable path; do not set both browser overrides. With no override, tests use bundled Chromium when available, then detect installed Chrome/Edge in standard Windows, macOS or Linux locations. Set the explicit path for a nonstandard installation. A missing module, browser or failed launch fails the suite; real browser coverage is mandatory and is never silently skipped. Browser tests serve fixtures on an ephemeral loopback port, block external requests and POSTs, and do not send real enquiries.

Module loading tries standard Node `require('playwright')` resolution first. If that is unavailable, `PHM_PLAYWRIGHT_MODULE` may point to an absolute Playwright package directory in another development installation. As a convenience only, an existing Codex runtime package under the defined `USERPROFILE` or `HOME` is a final optional fallback; neither Codex nor its cache is required. For example, after installing Playwright in your own tooling directory:

```powershell
$env:PHM_PLAYWRIGHT_MODULE='C:/path/to/tooling/node_modules/playwright'
$env:PHM_BROWSER_CHANNEL='chrome'
node --test tests/*.test.js
Remove-Item Env:PHM_PLAYWRIGHT_MODULE,Env:PHM_BROWSER_CHANNEL
```

## Maintaining confirmed office facts

Edit `data/business-facts.json` only from confirmed evidence, then run `node scripts/normalize-entity-graph.js` and rebuild. The normalizer refreshes shared office/schema hours, the existing reception paragraph in home/about/contact, footer reception text and known Google-review/social anchors on every run. It preserves separate onsite availability, office Maps directions, unrelated links and other content. The visible reception sentence and structured opening-hours values must be updated together in the fact source. Re-run the complete suite and static/coverage checks after a factual change.

## Contact form boundary

The repository already contains a serverless contact handler in `api/contact.js`. Its runtime sending secret and deployment configuration are required for live enquiry delivery. The local static preview does not execute that handler or send mail; contact delivery is not part of this acceptance. Do not submit a real enquiry during local review.

## Release boundary

Canonical URLs, structured data, the sitemap and robots policy use the primary origin `https://www.perthhandymate.com.au/`. This round is local acceptance only: no push, deployment, remote configuration or DNS change is authorized by these instructions. `DEPLOYMENT.md` remains historical deployment guidance, not an authorization.

Local slash/index redirects preserve the query string and stay on localhost. Explicit `/404.html` returns 200 with `noindex,follow`; unknown paths end with status 404 and the same recovery page. This preview does not validate Vercel host redirects, edge routing, response security/cache headers, production mail delivery or DNS.

The current source checkout uses the real Git history of `nancymaintenance-design/PerthHandymate.com.au`, with latest verified remote main `18dd298dbc5ad48675c8a3b560216e85a689641e` (14 October 2026). Local work is on `codex/phm-audit-local-2026-10-13`; the 127-page candidate includes nine confirmed regions, eight supplementary task pages and three additional photographed examples beyond the unchanged 67-service priced catalogue. This is local work only and does not authorise a push or release.

The committed historical inventory contains 527 term IDs and routes in `docs/seo/content-round2/term-routing.json`; they remain intact. Current ownership for all 67 priced service pages and eight supplements, and visible evidence for all 527 original terms, are in [the content expansion record](docs/seo/content-expansion-2026-10-12/README.md). All 91 educational records identify service prose outside FAQ plus a relevant visible FAQ question and answer. The [earlier keyword-gap round](docs/seo/keyword-gap-round-2026-10-12/README.md) retains its four-supplement snapshot and 49 accepted actions as dated evidence. The older 31 owner clusters and four guide records describe the previous content round.

## Local verification record
Current evidence: [12 October five-category coverage](docs/seo/content-expansion-2026-10-12/coverage.md), plus Task 1 and Task 2 reports under `../reports/content-expansion-local-2026-10-12/`. Run `node tools/five-category-coverage.js` to validate the current excerpt locations. The [earlier keyword-gap record](docs/seo/keyword-gap-round-2026-10-12/README.md), its reports under `../reports/content-gap-local-2026-10-12/`, the [10 October round-one local record](docs/seo/2026-10-10-round1-local-verification.md) and older September reports remain dated historical evidence. Their 114-page or 99/15 approval counts do not describe the expanded candidate and do not grant deployment authorisation.
