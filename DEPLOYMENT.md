# Deployment preparation

This checklist prepares the static candidate for GitHub, Vercel and a GoDaddy-managed domain. It does not authorize or perform deployment.

## 1. Pre-release review

1. Confirm that the approved production domain remains `https://perthhandymate.com.au/`.
2. Confirm canonical, sitemap and structured-data URLs consistently use that HTTPS origin.
3. Review the production `index,follow` page directives and the crawl-allowing `robots.txt` policy.
4. Confirm the public phone number, email, Perth address, Perth metropolitan service-area wording, form behaviour, page content and image rights.
5. Run `node tests/site.test.js` and `node tests/check-site.js`, then run the HTTP smoke test against the local preview.

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
4. For online contact-form delivery, add `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in Vercel Project Settings. Never commit either value or expose it to browser JavaScript. Use a Resend-verified sender address before promoting the form.
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
