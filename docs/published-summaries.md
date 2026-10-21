# Published bilingual summaries

The existing visible introduction is the single summary source. Do not keep a separate SEO synopsis or apply an English character-length threshold to Chinese content.

- Home: the `p.hero-copy` following the main H1.
- Standard service, area, company, contact and case templates: the first `p.lede` following the main H1.
- Guides: the first paragraph in `.guide-introduction` following the H1; `.article-meta` is not an introduction.

`typescript/scripts/enrich-structured-data.ts` reads the final localized, operator-reviewed HTML. That text populates WebPage.description, the primary Service/Article/CreativeWork description, RSS item description and JSON Feed item summary. Missing introduction markup fails the build rather than silently selecting a later warning or enquiry paragraph.

Change the existing introduction in its HTML/content owner and its active Chinese translation owner when the actual summary needs updating. No extra visible paragraph is added. Run `npm run build`, `node --test tests/published-summary.test.js tests/structured-feeds.test.js`, `npm run typecheck` and the project suite.

Follow-up approved wording is in `config/operator-copy-followup.json`, applied by `typescript/scripts/lib/customer-voice.ts`. Rules are bilingual sentence-level edits; retain actual safety actions, product restrictions, contact destinations, case photos and the existing inline links. Do not hand-edit generated JavaScript or `dist/`.
