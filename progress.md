# PHM indexing recovery — execution ledger

## 2026-09-21

- Created an isolated working copy from `phm-ga4-t1`.
- Git worktree creation was not possible: the source checkout contains stale Git metadata pointing to a missing `D:` worktree. No source files were changed and no Git operation will be used for delivery.
- Implementation follows the approved indexing-recovery plan: retain every existing URL, make non-core service leaves `noindex,follow`, and restrict the sitemap, homepage promotion, and search catalogue to the focused core.

## Decisions

- No pages will be deleted, redirected, blocked in `robots.txt`, or submitted for removal.
- Final delivery will be an extracted upload folder and ZIP whose contents are uploaded to the repository root, replacing matching files only.

## Verification

- Added policy-based automated coverage before implementation; it failed because the policy file and focused outputs did not yet exist.
- Corrected the generator to tolerate the source catalog's introductory comment and to treat an already-correct robots directive as idempotent.
- Passed `node --test tests/site.test.js tests/canonical-origin.test.js tests/contact-email.test.js`: 19/19 tests.
- Passed `node tests/check-site.js`: 98 HTML pages, 98 unique titles and descriptions, 2,905 local references, 183 valid JSON-LD blocks.
