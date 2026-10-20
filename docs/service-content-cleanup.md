# Service content consolidation

Local-only revision, 2026-10-20. Preserve the earlier GSC service edits and the local editor. No release authorization accompanies this change.

Authoritative implementation: `typescript/scripts/service-content-cleanup.ts`; compile via `npm run compile`. The compatible `scripts/service-content-cleanup.js` is generated, not hand-edited.

Apply with `node scripts/service-content-cleanup.js`, then `npm run build`. Existing service consolidation and round-two editorial adapters call this final boundary too. The transformer is scoped to canonical production service URLs; it does not mutate unscoped fixtures, the homepage, areas or guides.

- Category catalogues own the task list. Remove the repeated checklist and generic three-card request block; retain the category safety note visibly, using the existing `data/content.js` category inventory if a note is missing.
- Door-category repair/installation/slider decisions belong together in the existing FAQ, using the dedicated service owners, not the generic handyman destination.
- Ordinary service pages have one FAQ section and one disclosure list. Keep detailed and maintenance FAQ fragment wrappers and complete answer bodies. Scope/preparation panels remain outside the answers.
- Keep useful related reading before the final contact band. No service content follows that final action.
- The compact handyman educational disclosures and six-part property-maintenance design are deliberately excluded.
- Keep existing images, price modules, contact routes and canonical identities. Existing FAQ schema is synchronized with visible answers; do not manufacture schema-only content.
- New bilingual copy is maintained in `locales/parts/revision-service-cleanup-20261020.json`; prior unchanged translations remain owned by their existing dictionaries.

Regression tests: `tests/service-cleanup.test.js`; legacy editorial idempotence, FAQ/JSON-LD parity, service content depth and desktop/mobile spacing remain part of `npm test`.

The local preview uses `dist/`, so rebuild after source changes. Never push merely to refresh a local preview.
