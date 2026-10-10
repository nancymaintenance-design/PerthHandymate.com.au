# SEO round one: local verification — 10 October 2026

This record and the current README are this round's acceptance evidence. September records, including `docs/seo/seo-implementation-report.md`, remain historical evidence; their old noindex/deployment statements do not represent this round or authorize release.

## Scope and reproducible commands

Work is on isolated local branch `codex/phm-seo-round1`; Task 6 began at `caddf9e`. Canonical origin is `https://www.perthhandymate.com.au/`. This acceptance performs no push, deployment, hosting/remote configuration, DNS changes or contact-email sending. `DEPLOYMENT.md` was not changed to authorize anything.

```powershell
node scripts/build-local.js
node --test tests/*.test.js
node tests/check-site.js
$env:PORT=4180
node preview-server.js
# Separate terminal, while the preview stays running:
$env:ELLIS_PREVIEW_PORT=4180
node tests/http-smoke.js
```

Build output is recreated in ignored `dist/`. Preview binds to `127.0.0.1`, serves only built output, and fails clearly if that output is missing. Rebuild after source edits. Port 4180 avoids the unrelated Python server already on 4173, which must remain untouched. Local index/slash redirects stay on localhost and preserve queries. Explicit `/404.html` is valid 200 with `noindex,follow`; unknown paths end with branded noindex status 404, root-relative navigation, CSS, scripts and service-search recovery assets.

## Evidence

Verification used Node.js `v24.19.0` at `C:\Program Files\nodejs\node.exe`. The build, full-suite and static-checker sequence exited 0. Actual output summaries:

```text
node scripts/build-local.js
Canonicalized 0 internal index.html links in 0 HTML files.

node --test tests/*.test.js
tests 168; suites 0; pass 168; fail 0
cancelled 0; skipped 0; todo 0

node tests/check-site.js
HTML pages: 114
Unique titles: 114
Unique descriptions: 114
Local references checked: 4362
Valid JSON-LD blocks: 326
Guide detail pages: 12
FAQ entries: 36
SITE CHECK PASSED

ELLIS_PREVIEW_PORT=4180 node tests/http-smoke.js
HTTP smoke passed: 113/113 built sitemap pages plus branded 404.html returned expected local HTML; unknown/nested/private paths returned noindex 404; 9 recovery assets and 3 query-preserving local redirects passed.
```

The HTTP smoke command above shows the environment assignment compactly; use the PowerShell form in the reproducible commands. The first live smoke run exited 1 because an inherited exact `<main id="main">` check rejected the valid compact handyman page's additional class attribute. The assertion now accepts that valid HTML main element without changing production content; the subsequent full HTTP run exited 0.

Retained preview: `http://127.0.0.1:4180/`, PID **35208**, listening on `127.0.0.1` only. It was started hidden with the exact Node executable and repository working directory using `Start-Process -WindowStyle Hidden -PassThru`. Logs (ignored by Git) are `E:\Ellis-Services-Group-Knowledge-Base\execution\phm-seo-round1-worktree\preview-round1.stdout.log` and `E:\Ellis-Services-Group-Knowledge-Base\execution\phm-seo-round1-worktree\preview-round1.stderr.log`. Startup stdout names the preview URL; stderr was empty at verification. The PID/URL describe this recorded session, not a permanent service.

Controller browser verification passed 12/12 checks using Playwright with installed Microsoft Edge (`channel: 'msedge'`): six routes at desktop 1440×1000 and mobile 390×844. Routes were `/`, `/areas/perth-central/`, `/projects/decking-refinishing-maintenance/`, `/services/roofing-gutters-exterior/renderers/`, `/services/electrical-plumbing-gas-air-conditioning/electricians/`, and `/acceptance/missing/`. Normal routes returned 200 and the nested missing route returned 404. Each had a main element, no horizontal overflow, no JavaScript exception, no failed localhost request and no broken image after scrolling each image into view and awaiting decode. Controller screenshot review found the area guidance, case Scope/Outcome and 404 recovery layouts usable.

A screenshot run overlapping the final build recorded one desktop electrician image decode failure while `dist/` was being recreated. That overlap may explain the transient failure. The controller repeated all 12 checks exclusively after builds finished; the stable-output rerun exited 0 with no recorded failures. No production content or image modification was required.

Browser evidence originates in `.superpowers/sdd/2026-10-10-phm-seo-round1/visual-check.cjs` and `visual-results.json`, with route/device screenshots alongside them. The final JSON was independently inspected: 12 checks, zero failures. Those scratch artifacts may later be removed by the controller; this committed record preserves the facts. The controller owns final whole-branch review. Browser checks remain local evidence, not production-device or edge verification.

Task 6 RED: `node --test tests/local-build.test.js` exited 1 (2 tests, 1 pass, 1 fail); README assertion failed with `README must document node scripts/build-local.js`. Combined focused RED (`node --test tests/local-build.test.js tests/preview-server.test.js`) exited 1 (8 tests, 2 pass, 6 fail): documentation absent, unbuilt source served, index redirect returned 200, malformed URI reset the connection, and missing `dist/` continued serving. The existing nested-404 baseline already passed.

Focused GREEN after implementation: the same combined command exited 0 (8 tests, 8 pass, 0 fail). An intermediate green attempt exposed Windows `EPERM` fixture cleanup because the child server held its temporary working directory; fixture children now launch with the OS temporary parent as working directory. That intermediate run was 7 pass/1 cleanup failure and is not counted as final acceptance.

## Preserved implementation rulings and remaining risks

- Source provenance: the GitHub `e84e79b` ZIP was captured as synthetic local Git snapshot `3dcfede` after Git transport hung. Future integration must apply a reviewed diff onto real Git history; never force-push synthetic history.
- Omitted generated/audit prerequisites were restored through a reproducible build and committed-source assertions, without deleting SEO assertions. Missing inherited evidence can hide a regression; changed checks require review and full-suite verification.
- Keyword evidence consists of 31 committed owner clusters and four guide records. Checks retain owner/landing-target, guide-scenario/question and FAQ agreement coverage. The historical 527-term inventory was unavailable; completeness for those unavailable terms remains unverified until that source is supplied.
- Dist-consuming tests use isolated temporary copies and delegate to the same `scripts/build-local.js` interface to avoid parallel tests racing over shared `dist/`. The build contract test compares published inputs with `vercel.json`; future changes must preserve that alignment.
- Task 2's routes-only Vercel configuration has declarative regression checks. Local preview intentionally implements only built-file serving, local index/slash redirects, malformed-URI handling and recovery 404 routing. Vercel host canonicalization, edge delivery, response security/cache headers, production mail and DNS are not validated by this local server and need separate verification after authorized deployment.
- Entity work recorded 114 page entity graphs and 76 Service providers while preserving 126 FAQ/Breadcrumb blocks. Source tests validate markup; they do not establish external provider availability or licences.
- Source inspection corrected the initial renderer-orphan hypothesis: the renderer already had a directory inbound link, and area pages already had three detail links. This round strengthens contextual discovery and local guidance; a deeper crawl could still find a separate discovery gap. All 67 service detail pages have reachability checks.
- Closed Task 4 minor: final whole-branch review confirmed the seven area sections were distinct but their test accepted any guidance heading. Test-only commit `be23978` adds a meaningful area-specific heading phrase for each of the seven fixtures; independent scoped re-review marked the finding ADDRESSED with no new breakage.
- Task 6's preview extension was expressly allowed because serving raw source would not validate the publication artifact. Preview/Vercel differences remain a risk; do not describe these HTTP checks as deployed edge verification.
- The existing `api/contact.js` handler requires runtime sending credentials/configuration. Static preview does not execute it, and no real enquiry or email is sent in this verification.
- No search-engine indexation, ranking, traffic, Search Console, analytics or other external performance metrics are inferred from these local checks.

Tasks 1–5 were recorded complete in the controller ledger (Task 1 `5cdaea3..a40b9ca`, Task 2 `a40b9ca..7eee6c0`, Task 3 `7eee6c0..c023afc`, Task 4 `c023afc..82a687d`, Task 5 `82a687d..caddf9e`). Their reported RED/GREEN chronology is historical task evidence, not something deduced from the final diff. This committed record preserves the rulings before any later scratch cleanup.

## Final independent review and handoff

Task 6 (`caddf9e..8a902da`) passed its independent spec/quality review. The whole-branch review (`3dcfede..8a902da`) inspected all 114 changed HTML pages and found no Critical or Important issues; its sole minor is closed above. Final scoped re-review covers `8a902da..be23978`. The controller reran the complete suite at `be23978`: 168 passed, zero failures; static checker passed with the same 114 pages, 4,362 references and 326 valid JSON-LD blocks. The final change is test-only and does not alter the previously built, HTTP/browser-verified publication artifact.

Local acceptance is ready. Branch `codex/phm-seo-round1`, the isolated worktree and localhost preview are retained for user inspection. No merge, push, deployment, Vercel remote configuration, DNS action or real enquiry/email has been performed. User acceptance is still required before any online release.
