# Deployment preparation

This checklist prepares the static candidate for GitHub, Vercel and a GoDaddy-managed domain. It does not authorize or perform deployment.

## 1. Pre-release review

1. Confirm that the approved production domain remains `https://perthhandymate.com.au/`.
2. Confirm canonical, sitemap and structured-data URLs consistently use that HTTPS origin.
3. Run `node scripts/apply-indexing-policy.js` before testing or packaging. It keeps all 67 service URLs live, applies `index,follow` to the 15 approved core leaves, applies `noindex,follow` to the remaining service leaves, and rebuilds the 42-URL sitemap.
4. Review the crawl-allowing `robots.txt` policy. Do not add a `Disallow` rule for the retained non-core URLs: Google needs to crawl them to process their `noindex,follow` directive.
5. Confirm the public phone number, Perth metropolitan service-area wording, form limitations, page content and image rights.
6. Run `node --test tests/site.test.js tests/canonical-origin.test.js tests/contact-email.test.js` and `node tests/check-site.js`, then run the HTTP smoke test against the local preview.

## 2. GitHub repository

1. Create a private or public repository under the authorized GitHub account.
2. From this package directory, initialize Git and review `git status` before staging.
3. Confirm that no `.env` files, credentials, private keys, internal governance documents or unrelated project files are staged.
4. Commit the reviewed static package and add `<YOUR_GITHUB_REPO_URL>` as the remote.
5. Push only after the repository owner approves the destination and visibility.

## 3. Vercel project

1. In the authorized Vercel account, import `<YOUR_GITHUB_REPO_URL>`.
2. Choose the repository root as the project root.
3. Use the static/Other framework preset. Do not add an install or build command; the committed files are the output.
4. Do not add environment variables for the current candidate. It has no backend and contains no secrets.
5. Review the preview deployment, directory URLs and branded 404 behaviour before promoting anything to production.

## 4. GoDaddy DNS

1. Add `<YOUR_DOMAIN>` to the reviewed Vercel project.
2. Vercel will provide the exact current DNS records. Record them as `<VERCEL_DNS_VALUES>` and verify them in the Vercel dashboard.
3. In the authorized GoDaddy DNS manager, copy only those verified values. Do not guess A, AAAA or CNAME targets.
4. Avoid deleting mail, verification or unrelated DNS records. Record the previous values so the DNS change can be reversed.
5. Wait for Vercel to confirm domain verification and HTTPS before testing the production hostname.

## 5. Release gates

1. Candidate complete: package and local evidence are available.
2. Human acceptance: a named reviewer accepts content, layout and release settings.
3. Release authorized: a named authorized person approves the exact repository, Vercel project, domain and release time.

Do not infer a later gate from an earlier one. After any approved deployment, retest navigation, assets, canonical URLs, sitemap, phone links, Perth-only service scope, form wording and the 404 page on `<YOUR_DOMAIN>`.

## 6. Google Search Console follow-up

1. After the production deployment is ready, submit `https://www.perthhandymate.com.au/sitemap.xml` again in the PHM URL-prefix property.
2. Inspect only the homepage plus the 15 approved core service URLs. Request indexing for the homepage and a small representative set; do not batch-request the retained `noindex` pages.
3. Recheck Page indexing after 7–14 days. The intended direction is fewer discovered-but-not-indexed URLs and progressive processing of the retained `noindex,follow` leaves.
