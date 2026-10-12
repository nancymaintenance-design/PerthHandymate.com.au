# Current local content expansion — 12 October 2026

This round records current ownership and visible content evidence for the original 527 terms. The site has 125 HTML pages and 124 sitemap URLs, with the unchanged 67 priced services, eight unpriced service supplements and thirteen photographed project pages. No public release is authorised by these documents.

- [Coverage JSON](coverage.json): every original ID, term, category and research owner in original order; current primary path, status and fragment-scoped excerpts. Educational records also identify the matching visible FAQ item. Intent questions and scenarios identify their decision or scenario evidence.
- [Readable coverage](coverage.md): all 527 records, excerpts, current paths and boundary statuses.
- [Current service ownership](intent-ownership.json): all 67 canonical services and eight supplements. A page can have no original research ID and still have an established service purpose; an ID count is not a demand measurement.

Counts: 163 core terms, 91 intent questions, 91 distilled terms, 91 scenarios and 91 educational records. The 91 educational records use 88 distinct explanations and FAQ topics because three translated-equivalent pairs share an English answer. Each has service-body prose outside `details` and a relevant visible question and answer within one `details` item. Pool-gate and tree-work explanations also appear on their specialist service pages.

The 48 `boundary` records answer scope, safety, timing, pricing-policy, funding or qualification questions without advertising an unverified promise. They do not establish company registration numbers, NDIS registration or funding acceptance, free visits, guaranteed savings, universal loading, inspection results or guaranteed appointments. Regulated work retains Ellis's own appropriately licensed personnel positioning.

The original research map, historical `content-round2` routes and earlier keyword-gap action ledger remain unchanged. New four service owners handle ordinary hinged doors; cabinets and wardrobes; shelves, mirrors and pictures; and clotheslines. Previous property-maintenance, furniture-assembly, television-mounting and external-slider owners remain active. Homepage remains the broad Perth service entrance and project discovery hub; no `/projects/` index or location doorway pages have been added.

Validate locally:

```powershell
node tools/five-category-coverage.js
node --test tests/five-category-coverage.test.js
```

The validator reads real source HTML, reuses the content inventory parser and checks records, visible fragment prose, FAQ pairing and decision/scenario excerpt locations. It rejects schema-only, hidden, missing, unrelated-fragment and FAQ-as-body evidence. It does not prove semantic adequacy, credentials, rankings or external visibility; editorial and browser review remain necessary. Build and the full suite run serially before completion. Full task and source-check reports are under `E:/Ellis-Services/Perth Handymate/reports/content-expansion-local-2026-10-12/`.
