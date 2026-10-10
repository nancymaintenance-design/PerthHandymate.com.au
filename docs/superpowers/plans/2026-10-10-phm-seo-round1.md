# Perth Handymate SEO Round 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved Round 1 technical, entity, content and internal-link SEO improvements in the static Perth Handymate site, then make it reviewable on a local port without publishing it.

**Architecture:** Retain the static HTML architecture. Add small, deterministic Node scripts only where cross-page consistency or a repeatable local build cannot safely be maintained by hand. Make Vercel routing declarative, and keep content claims bounded by the confirmed business facts.

**Tech Stack:** Static HTML, JSON-LD, Vercel configuration, Node.js built-in test runner and filesystem APIs.

**Spec:** `docs/superpowers/specs/2026-10-10-phm-seo-round1-design.md`

## Global Constraints

- Work only on branch `codex/phm-seo-round1` in the isolated worktree.
- The approved source snapshot is GitHub `main` commit `e84e79b`; do not push, deploy, change Vercel configuration remotely or change DNS.
- Ellis performs electrical, plumbing, gas, asbestos and structural work through its own appropriately licensed personnel.
- Never fabricate licence numbers, insurance policy details, ratings, reviews, customer names, dates, GBP Place URLs, guarantees or project facts.
- Preserve valid canonical URLs, sitemap coverage, existing page titles/descriptions and the contact endpoint.
- All new behaviour receives a failing test first; run the project-wide verification before local preview.

## Review Focus

- Unknown paths must be HTTP 404 and index-excluded while the branded 404 page stays usable.
- Vercel redirects must not create a loop or serve both slash and slashless directory URLs as indexable 200 pages.
- Every Service provider reference must resolve to the same stable operating entity, without duplicate or invented LocalBusiness facts.
- Regulated-service language must state only the confirmed in-house appropriately licensed-team claim.
- Contextual links must resolve from every changed area/case page and must not reintroduce `index.html` links or orphan the renderer page.

---

### Task 1: Reproducible local build and source-backed regression baseline

**Files:**
- Create: `scripts/build-local.js`
- Modify: `tests/conversion-language.test.js`
- Modify: `tests/keyword-content-round.test.js`
- Modify: `tests/seo-round3.test.js`
- Modify: `tests/social-brand-icons.test.js`
- Test: `tests/local-build.test.js`

**Interfaces:**
- Produces: `node scripts/build-local.js`, which recreates `dist/` from the same publish inputs as `vercel.json` and runs `scripts/normalize-index-links.js`.
- Consumes: existing root files/directories listed in `vercel.json` and `data/keyword-content-round.json`.

- [ ] **Step 1: Write the failing build test**

Create `tests/local-build.test.js` to invoke `node scripts/build-local.js` in a clean `dist/` state and assert that `dist/index.html`, `dist/404.html`, `dist/sitemap.xml`, and a representative service output exist.

- [ ] **Step 2: Run the build test to verify it fails**

Run: `node --test tests/local-build.test.js`

Expected: FAIL because `scripts/build-local.js` does not exist.

- [ ] **Step 3: Implement `scripts/build-local.js`**

Use only Node built-in filesystem/process APIs. Copy the same published root assets and directories declared by `vercel.json`, recreate `dist/`, then invoke `node scripts/normalize-index-links.js dist`. Do not copy `.git`, source documentation, test folders or secrets.

- [ ] **Step 4: Make historical-audit checks source-backed**

Replace only the assertions whose prerequisites are absent from the GitHub snapshot: tests inspecting `dist/` must call the local build first; tests depending on uncommitted historical coverage artefacts must assert the equivalent committed source data and rendered page ownership. Preserve the intent and coverage of every existing assertion.

- [ ] **Step 5: Run the baseline suite**

Run: `node --test tests/*.test.js && node tests/check-site.js`

Expected: all tests pass and the site checker reports valid HTML metadata and JSON-LD.

- [ ] **Step 6: Commit**

```bash
git add scripts/build-local.js tests/
git commit -m "test: restore reproducible local SEO baseline"
```

### Task 2: Index-control, redirect and response-header hardening

**Files:**
- Modify: `404.html`
- Modify: `vercel.json`
- Modify: `tests/canonical-origin.test.js`
- Create: `tests/index-control.test.js`

**Interfaces:**
- Consumes: Task 1 local build command.
- Produces: Vercel configuration with an explicit 404 response, direct non-www-to-www redirect, slash canonicalization, and safe response headers.

- [ ] **Step 1: Write failing routing/index-control tests**

Add tests that parse `vercel.json` and `404.html`, asserting: `404.html` contains `noindex,follow`; a catch-all missing route maps to the 404 document with status `404`; slashless directory routes redirect to their slash form without applying to files; the non-www host redirect targets the final www URL; and the defined response headers include `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and clickjacking protection.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/index-control.test.js tests/canonical-origin.test.js`

Expected: FAIL because no explicit 404/noindex policy and no required headers exist.

- [ ] **Step 3: Implement the minimum static/Vercel configuration changes**

Add `<meta name="robots" content="noindex,follow">` to `404.html`. In `vercel.json`, add the tested headers and ordered redirect/rewrite/404 rules that preserve asset and file URLs. Use only Vercel-supported declarative fields. Do not introduce a CSP in this task.

- [ ] **Step 4: Run focused and full regression tests**

Run: `node --test tests/index-control.test.js tests/canonical-origin.test.js && node scripts/build-local.js && node tests/check-site.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add 404.html vercel.json tests/
git commit -m "fix: harden index control and canonical redirects"
```

### Task 3: Stable local entity graph and licensed-team service proof

**Files:**
- Create: `scripts/normalize-entity-graph.js`
- Modify: `index.html`
- Modify: `about/index.html`
- Modify: `contact/index.html`
- Modify: `services/**/index.html` (only provider/schema and regulated-service copy where applicable)
- Test: `tests/entity-graph.test.js`

**Interfaces:**
- Produces: `node scripts/normalize-entity-graph.js`, an idempotent source updater for shared organisation/Perth operating-entity JSON-LD and Service providers.
- Consumes: canonical URL, public NAP/hours/logo already in the homepage and confirmed in-house licensed-team fact.

- [ ] **Step 1: Write failing entity tests**

Create `tests/entity-graph.test.js`. It must parse JSON-LD from homepage, contact, about and all service details; require stable `#organization` and `#perth-office` identifiers, require every Service `provider.@id` to be `#perth-office`, require no provider to use a retired `#business` ID, and require electrical, plumbing, gas, asbestos and structural pages to contain the exact approved visible licensed-team scope sentence but no licence-number pattern or AggregateRating.

- [ ] **Step 2: Run the entity tests to verify they fail**

Run: `node --test tests/entity-graph.test.js`

Expected: FAIL because pages use inconsistent `#business` Organization/LocalBusiness identities and Service uses `brand` instead of a provider.

- [ ] **Step 3: Implement `scripts/normalize-entity-graph.js` and run it once**

Make the script update only JSON-LD blocks and the targeted regulated-service scope section. Generate one `Organization` and one `HomeAndConstructionBusiness` office entity in an `@graph`; retain existing verified NAP/hours/areaServed/logo facts. Change service markup to `provider` referencing `https://www.perthhandymate.com.au/#perth-office`. Add the exact sentence `Regulated work is completed by Ellis's own appropriately licensed team.` only on relevant regulated pages. Never add numeric credentials, ratings or reviews.

- [ ] **Step 4: Run focused and full semantic checks**

Run: `node --test tests/entity-graph.test.js tests/site.test.js && node scripts/build-local.js && node tests/check-site.js`

Expected: PASS with all JSON-LD blocks parseable.

- [ ] **Step 5: Commit**

```bash
git add scripts/normalize-entity-graph.js index.html about/ contact/ services/ tests/entity-graph.test.js
git commit -m "feat: unify local service entity graph"
```

### Task 4: Evidence-led area-page expansion and contextual service discovery

**Files:**
- Modify: `areas/**/index.html`
- Modify: `services/index.html`
- Modify: `services/roofing-gutters-exterior/index.html`
- Modify: `services/roofing-gutters-exterior/renderers/index.html`
- Test: `tests/local-discovery.test.js`

**Interfaces:**
- Consumes: canonical service/area URLs and entity graph from Task 3.
- Produces: all seven area pages with unique local guidance and links to prioritised services; renderer page has at least one contextual inbound link.

- [ ] **Step 1: Write failing discovery tests**

Create `tests/local-discovery.test.js` that verifies each area page contains at least one area-specific guidance section plus links to four or more detail service URLs; verifies `renderers/` has an inbound link from its parent category or services index; and resolves all added local relative links to files.

- [ ] **Step 2: Run discovery tests to verify they fail**

Run: `node --test tests/local-discovery.test.js`

Expected: FAIL because area pages primarily link categories and renderer has no contextual inbound link.

- [ ] **Step 3: Add only differentiated, evidence-safe page copy and links**

On each area page, add a short guidance section grounded in the existing page’s stated housing/access context and link to relevant services. Do not claim projects, dates, testimonials, hyper-local branch addresses or unsupported conditions. Add renderer to its category/services discovery route and link the renderer page back to its category, relevant guide and contact flow.

- [ ] **Step 4: Run discovery and site checks**

Run: `node --test tests/local-discovery.test.js tests/canonical-origin.test.js && node scripts/build-local.js && node tests/check-site.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add areas/ services/ tests/local-discovery.test.js
git commit -m "feat: strengthen local service discovery"
```

### Task 5: Evidence-first case-study structure and service/guide links

**Files:**
- Modify: `projects/**/index.html`
- Modify: `index.html`
- Test: `tests/case-evidence.test.js`

**Interfaces:**
- Consumes: existing project photos, captions and service/guide URLs.
- Produces: a reusable visible scope/outcome structure on each project page and working service/guide links without fabricated date, client or review details.

- [ ] **Step 1: Write failing case-evidence tests**

Create `tests/case-evidence.test.js` to assert each project page includes separate `Scope` and `Outcome` headings, at least one existing related service link, one related guide link where a relevant guide exists, and excludes unsupported testimonial/finished-date wording.

- [ ] **Step 2: Run the case test to verify it fails**

Run: `node --test tests/case-evidence.test.js`

Expected: FAIL because the standardised evidence structure and linking contract do not exist on all case pages.

- [ ] **Step 3: Implement factual case structures**

Use the existing image descriptions and visible page facts to introduce a concise Scope/Outcome block for every case. Keep wording observational and outcome-oriented; do not state project dates, client names, prices or review claims. Link each page to the corresponding service detail and the most relevant existing guide where one exists.

- [ ] **Step 4: Run focused and site checks**

Run: `node --test tests/case-evidence.test.js tests/public-copy.test.js && node scripts/build-local.js && node tests/check-site.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add projects/ index.html tests/case-evidence.test.js
git commit -m "feat: add evidence-led case study links"
```

### Task 6: Full release verification and local acceptance preview

**Files:**
- Modify: `README.md`
- Create: `docs/seo/2026-10-10-round1-local-verification.md`
- Test: `tests/http-smoke.js`

**Interfaces:**
- Consumes: Tasks 1–5 and `node scripts/build-local.js`.
- Produces: documented exact verification commands and an active local preview URL; no remote side effect.

- [ ] **Step 1: Write failing documentation assertion**

Add a small test or extend `tests/local-build.test.js` to require README local instructions to name `node scripts/build-local.js` before the preview and HTTP smoke steps.

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tests/local-build.test.js`

Expected: FAIL because README does not document the reproducible local build command.

- [ ] **Step 3: Document the local-only release procedure**

Update README and add the verification record template. Include build, full test suite, static checker, preview server, HTTP smoke test and an explicit no-deploy boundary. Do not alter `DEPLOYMENT.md` to authorize deployment.

- [ ] **Step 4: Perform complete verification**

Run: `node scripts/build-local.js && node --test tests/*.test.js && node tests/check-site.js`; then start `node preview-server.js`, run `ELLIS_PREVIEW_PORT=<port> node tests/http-smoke.js`, and retain the server for user review.

Expected: PASS, with the localhost URL available for the user. Record actual command outputs and constraints in `docs/seo/2026-10-10-round1-local-verification.md`.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/seo/ tests/
git commit -m "docs: record local SEO round one verification"
```

## Plan self-review

- **Spec coverage:** Tasks 1–2 cover the test/build and technical-routing requirements; Task 3 covers entity/regulated-service requirements; Tasks 4–5 cover local content and links; Task 6 covers verification and the local-only handoff.
- **Interface consistency:** every generated/updated workflow uses `node scripts/build-local.js`; later tasks run it before static checks.
- **Review focus coverage:** Task 2 owns 404/redirect tests; Task 3 owns entity/provider/licensed copy; Tasks 4–5 own contextual links; Task 6 owns real local HTTP verification.
- **Proportion:** the plan supplies file and assertion-level decisions without embedding implementation code.
