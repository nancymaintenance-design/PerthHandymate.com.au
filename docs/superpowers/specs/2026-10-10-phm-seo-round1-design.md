# Perth Handymate SEO Round 1 Design

## Goal

Improve the technical indexability, entity clarity, local-service evidence and internal discovery of `perthhandymate.com.au`, while retaining the current static-site architecture and making no production deployment until the user accepts a local preview.

## Source and delivery boundary

- **Source of truth:** GitHub repository `nancymaintenance-design/PerthHandymate.com.au`, `main` at `e84e79b` (2026-10-09).
- **Working branch:** `codex/phm-seo-round1` in an isolated local worktree.
- **Hosting:** Vercel remains unchanged during implementation. No `vercel deploy`, GitHub push, DNS operation or production publication is in scope until the user explicitly approves the locally running result.
- **Known working-package limitation:** the supplied GitHub snapshot lacks some generated `dist/` files and historical audit inventory files required by a subset of existing tests. The first implementation task restores a repeatable local build/test precondition rather than weakening those tests.

## Confirmed business facts

- Ellis serves the Perth metropolitan area.
- Electrical, plumbing, gas, asbestos and structural work represented on the site are performed by Ellis's own appropriately licensed personnel.
- No licence number, exact insurance policy details, GBP Place URL, rating/count, customer review text, project completion month or client attribution has been provided. The implementation must not invent any of those facts.

## Chosen approach

Use a phased, test-first static-site update:

1. Make HTTP/indexing behaviour unambiguous: proper 404 semantics, canonical slash redirects, direct primary-host redirects and safe headers.
2. Make the organisation and service entities consistent in JSON-LD, and attach confirmed in-house licensed-team language to regulated services without unsupported credentials.
3. Improve the existing information architecture, area pages and cases with only verified on-site evidence; add contextual internal links to eliminate orphan/low-discovery priority pages.
4. Build all deployable artefacts locally, run regression checks and start a local preview server. Stop for user acceptance before any upstream action.

## Technical design

### Routing and headers

`vercel.json` will declare a true 404 response path and consolidate directory/host redirects so only `https://www.perthhandymate.com.au/` URLs remain canonical. Response headers will be added conservatively: `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and clickjacking protection. A restrictive CSP is deferred unless it can be proven compatible with current analytics, map and contact dependencies.

The generated static `404.html` remains an accessible customer-help page, but it must be `noindex,follow`; the server must issue status 404 for unknown paths.

### Entity and regulated-service markup

The homepage will contain one stable organisation identifier and one Perth operating-entity identifier in an `@graph`. Service pages will reference the same provider entity through `Service` markup; breadcrumbs remain intact. The operating entity will use the most accurate Schema subtype supported by the visible business information. The schema must only contain published NAP, hours, areas and images already supported by the page.

Regulated-service pages will include a concise, visible scope statement: work is completed by Ellis's own appropriately licensed team. It will not list an unverified licence number, rating, policy or regulator claim.

### Content and links

Existing project photographs and on-site details will be used as evidence only where the page has supporting facts. Each selected priority case will receive a structured scope/outcome block without fabricated dates, customer names or testimonials. Each area page will gain useful local-service navigation and distinct customer guidance, not merely substituted suburb names. Contextual links will connect category pages, priority service details, relevant cases and guides; the currently unlinked renderer page is an explicit target.

### Build and test contract

Tests will be written before production edits. They will verify:

- an unknown route is served as an index-excluded 404;
- redirect declarations enforce the preferred host and slash form;
- the schema graph has stable IDs and service providers reference the operating entity;
- regulated pages use the confirmed in-house licensed-team wording without unsupported credential claims;
- selected priority pages have required contextual links and no target is orphaned;
- generated `dist/` output is created before tests that inspect it.

The full existing test suite, static checker, production build, and local HTTP smoke checks will be run. Existing failures caused solely by snapshot-omitted generated/audit files will be repaired only by restoring reproducible generation or by documenting the missing external record; they will not be hidden by deleting assertions.

## Acceptance criteria

1. No production deployment, GitHub push, Vercel action or DNS change has occurred.
2. Unknown URLs return HTTP 404 and the 404 document is not indexable.
3. Canonical host and trailing-slash redirect policy is enforced by the Vercel configuration and regression-tested.
4. JSON-LD validates as JSON and uses one consistent organisation/Perth operating-entity graph; selected service pages name the entity as provider.
5. Regulated service pages visibly state the confirmed in-house appropriately licensed-team model without invented identifiers.
6. Priority service, area, case and guide links resolve locally; renderer is no longer orphaned.
7. The build and full relevant test suite pass, and the site can be inspected on a local port.

## Out of scope for Round 1

- GBP creation/verification, categories, Place URL, rating/review import, external citations and backlink outreach.
- Publishing unsupported licence numbers, insurance coverage, reviews, service guarantees, dates or customer identities.
- Large-scale programmatic area-page expansion without source evidence.
- Production deployment or a GitHub push.
