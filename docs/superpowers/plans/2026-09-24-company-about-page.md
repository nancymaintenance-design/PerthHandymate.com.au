# Ellis Services Group Company About Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish an original, company-led `/about/` page for Ellis Services Group with confirmed contact details and an official ABR lookup link.

**Architecture:** Add one static route at `about/index.html`, reusing the current global header, footer, CSS and contact destination. Update every customer-facing header and footer to expose the route, and strengthen static tests so the new site inventory, navigation, SEO metadata, ABR action and packaged release are verified.

**Tech Stack:** Static HTML, shared CSS and browser JavaScript, Node.js built-in test runner, PowerShell/Git, ZIP archive consumed by Vercel.

**Spec:** `docs/superpowers/specs/2026-09-24-company-about-page-design.md`

## Global Constraints

- Company name: Ellis Services Group.
- Office address: 140 St Georges Terrace, Perth WA 6000.
- Telephone: 0403 069 685.
- Email: handyman.maintenance.au@outlook.com.
- The ABR verification destination is `https://abr.business.gov.au/ABN/View?id=645821745`.
- The About page is primarily a company introduction. Existing service pages are supporting destinations only.
- Do not state insurance, policy limits, licence numbers, trade qualifications, staff counts, years in operation, project counts, testimonials or other credentials unless the user supplies verifiable source material.
- Retain the existing service-scope language: Ellis may coordinate its own teams and reviewed service partners; the actual attending provider and trade-specific requirements are confirmed before work proceeds.
- Do not add a new photograph for this release.

## Review Focus

- A visitor uses a nested service or guide page; its new About navigation link must resolve to `/about/`, not a broken relative path.
- The About page must not turn an ABR lookup link into an unsupported insurance, licence or registration-status claim.
- The new route must have one H1, unique title/description, production canonical URL, favicon and valid Organization JSON-LD.
- The ABR link must be clearly named, open in a new tab, and protect the originating page with `rel="noopener noreferrer"`.
- `perth-handymate-site.zip` must contain the About route and must not contain the old archive inside itself.

---

## File structure

- `about/index.html` — New company-led About page with original content and metadata.
- `assets/css/global.css` — Reusable About-page layout classes and mobile refinements only.
- `index.html` and every existing customer-facing `*.html` — Header navigation gains the appropriately-relative About Us link; footer Explore list gains the appropriately-relative About Us link.
- `sitemap.xml` — Canonical `/about/` URL.
- `tests/site.test.js` — Focused About-page assertions plus customer-page inventory update.
- `tests/check-site.js` — Global navigation contract, expected page count, About route and sitemap checks.
- `perth-handymate-site.zip` — Release archive regenerated from the site root after verification.

### Task 1: Establish the failing About-page contract

**Files:**
- Modify: `tests/site.test.js`
- Modify: `tests/check-site.js`

**Interfaces:**
- Consumes: static files rooted at `path.join(__dirname, '..')`.
- Produces: `node --test tests/site.test.js` and `node tests/check-site.js` contracts for the new `/about/` route.

- [ ] **Step 1: Write the failing focused test in `tests/site.test.js`**

  Append a test that reads `about/index.html` and asserts the agreed content and safe external link:

  ```js
  test('publishes a company-led About page with confirmed contact details and an ABR lookup', () => {
    const about = fs.readFileSync(path.join(__dirname, '../about/index.html'), 'utf8');
    assert.match(about, /<title>About Ellis Services Group \| Perth Property Services<\/title>/);
    assert.match(about, /<link rel="canonical" href="https:\/\/www\.perthhandymate\.com\.au\/about\/">/);
    assert.match(about, /<h1>About Ellis Services Group<\/h1>/);
    assert.match(about, /140 St Georges Terrace, Perth WA 6000/);
    assert.match(about, /href="tel:\+61403069685"/);
    assert.match(about, /mailto:handyman\.maintenance\.au@outlook\.com/);
    assert.match(about, /href="https:\/\/abr\.business\.gov\.au\/ABN\/View\?id=645821745" target="_blank" rel="noopener noreferrer"/);
    assert.match(about, />View our ABR record<\/a>/);
    assert.doesNotMatch(about, /insured|insurance policy|licen[cs]e number|policy limit/i);
  });
  ```

- [ ] **Step 2: Expand the global static-site expectations in `tests/check-site.js`**

  In the existing GA4 inventory test in `tests/site.test.js`, change its page-count assertion to:

  ```js
  assert.equal(customerPages.length, 99, 'customer-facing page inventory changed unexpectedly');
  ```

  Then change the two constants in `tests/check-site.js` so the checker expects the new page and its nav label:

  ```js
  if (htmlFiles.length !== 99) fail(`Expected 99 HTML pages, found ${htmlFiles.length}`);
  const expectedNav = ['Home', 'Services', 'Areas We Service', 'About Us', 'Guides & Advice', 'Contact Us'];
  ```

  After the existing sitemap load near the end of the file, add:

  ```js
  const about = fs.readFileSync(path.join(root, 'about/index.html'), 'utf8');
  if (!about.includes('https://www.perthhandymate.com.au/about/')) fail('About page lacks production canonical');
  if (!about.includes('https://abr.business.gov.au/ABN/View?id=645821745')) fail('About page lacks the supplied ABR lookup');
  if (!sitemap.includes('<loc>https://www.perthhandymate.com.au/about/</loc>')) fail('sitemap.xml lacks the About URL');
  ```

- [ ] **Step 3: Run the focused test to confirm RED**

  Run: `node --test tests/site.test.js`

  Expected: FAIL with `ENOENT` for `about/index.html` and global page-count/navigation failures because the route and links do not yet exist.

- [ ] **Step 4: Commit the test-only contract**

  ```powershell
  git add tests/site.test.js tests/check-site.js
  git commit -m "test: define company About page contract"
  ```

### Task 2: Build the company-led About route

**Files:**
- Create: `about/index.html`
- Modify: `assets/css/global.css`

**Interfaces:**
- Consumes: existing header/footer markup, `../assets/css/global.css`, `../assets/js/site.js`, the shared logo and existing contact route.
- Produces: a fully responsive `/about/` document with the classes `about-intro`, `about-principles`, `about-steps`, `about-transparency` and `about-contact` for the shared stylesheet.

- [ ] **Step 1: Create the minimum static page needed to satisfy the new test**

  Copy the established depth-one document shell from `contact/index.html`, then set these exact head values:

  ```html
  <title>About Ellis Services Group | Perth Property Services</title>
  <meta name="description" content="Learn how Ellis Services Group coordinates practical property maintenance and improvement requests across metropolitan Perth.">
  <link rel="canonical" href="https://www.perthhandymate.com.au/about/">
  <link rel="stylesheet" href="../assets/css/global.css">
  <link rel="icon" href="../assets/images/favicon-32.png">
  ```

  Include the existing Organization JSON-LD baseline and the existing GA4 snippet exactly once. Use the depth-one header/footer asset paths and mark About Us with `aria-current="page"`.

- [ ] **Step 2: Add original company-first page content**

  Use one H1 and this section order. Keep claims descriptive and conditional rather than promising timing, pricing, insurance, licences or outcomes:

  ```html
  <section class="page-hero about-hero">…<p class="eyebrow">About Ellis Services Group</p><h1>About Ellis Services Group</h1>…</section>
  <section class="section shell about-intro">…</section>
  <section class="section about-principles">…</section>
  <section class="section shell about-steps">…</section>
  <section class="section shell about-people">…</section>
  <section class="section about-transparency">…</section>
  <section class="section shell about-contact">…</section>
  <section class="cta-band">…</section>
  ```

  Include these facts verbatim in the contact section:

  ```html
  <a href="tel:+61403069685">0403 069 685</a>
  <a href="mailto:handyman.maintenance.au@outlook.com">handyman.maintenance.au@outlook.com</a>
  <p>140 St Georges Terrace, Perth WA 6000</p>
  ```

  The transparency section must use the exact official-record action:

  ```html
  <a class="button button-outline" href="https://abr.business.gov.au/ABN/View?id=645821745" target="_blank" rel="noopener noreferrer">View our ABR record</a>
  ```

  Place nearby explanatory copy that this opens the Australian Business Register, without restating the record’s value as a verified insurance, licence or registration-status claim.

- [ ] **Step 3: Add minimal responsive styling in `assets/css/global.css`**

  Add only page-specific layout rules that reuse the current palette, shell widths, card rhythm and breakpoints. Ensure multi-column content collapses to one column on narrow screens:

  ```css
  .about-intro,.about-contact{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(280px,.9fr);gap:clamp(28px,5vw,72px);align-items:start}
  .about-principles,.about-transparency{background:var(--cream)}
  .about-steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}
  @media(max-width:760px){.about-intro,.about-contact,.about-steps{grid-template-columns:1fr}}
  ```

  Use existing CSS custom properties and existing component classes rather than defining a new colour system.

- [ ] **Step 4: Run the focused About test to confirm GREEN**

  Run: `node --test tests/site.test.js`

  Expected: PASS for the new About test; the global check may still fail until all existing navigation/footer links and sitemap are updated.

- [ ] **Step 5: Commit the route and styles**

  ```powershell
  git add about/index.html assets/css/global.css
  git commit -m "feat: add company About page"
  ```

### Task 3: Integrate About navigation, footer discovery and sitemap

**Files:**
- Modify: every existing customer-facing `*.html` route
- Modify: `sitemap.xml`

**Interfaces:**
- Consumes: the existing relative URL conventions (root `./about/index.html`, one-level `../about/index.html`, two-level `../../about/index.html`, three-level `../../../about/index.html`) and the new `about/index.html` route.
- Produces: exactly one **About Us** primary-nav link and one footer Explore link on every customer-facing page; a sitemap containing the canonical About URL.

- [ ] **Step 1: Add the About link to the primary nav of every customer-facing page**

  Insert the link between Areas We Service and Guides & Advice. Preserve each page’s existing relative depth and do not change the active state of unrelated pages:

  ```html
  <!-- root index.html -->
  <a href="./about/index.html">About Us</a>

  <!-- about/index.html -->
  <a href="../about/index.html" aria-current="page">About Us</a>

  <!-- services/index.html -->
  <a href="../about/index.html">About Us</a>

  <!-- services/handyman-interiors-appliance-repairs/index.html -->
  <a href="../../about/index.html">About Us</a>

  <!-- services/handyman-interiors-appliance-repairs/handymen/index.html -->
  <a href="../../../about/index.html">About Us</a>
  ```

  Apply this to all existing customer-facing pages, including `404.html`, Areas, Guides, FAQ, Contact and all service pages. Do not update `google28003a8fb6bb282a.html`.

- [ ] **Step 2: Add the About link to every footer Explore block**

  Insert the same depth-correct href into the Explore block between Areas and FAQ:

  ```html
  <a href="../about/index.html">About Us</a>
  ```

  For pages at other depths, use the same relative-depth mapping as the header.

- [ ] **Step 3: Add the canonical sitemap entry**

  Place this entry after `/areas/` and before `/contact/`:

  ```xml
  <url><loc>https://www.perthhandymate.com.au/about/</loc></url>
  ```

- [ ] **Step 4: Run the global static checker to confirm GREEN**

  Run: `node tests/check-site.js`

  Expected: `SITE CHECK PASSED`, 99 HTML pages, 99 unique titles/descriptions, and no broken local relative references.

- [ ] **Step 5: Run the focused test suite**

  Run: `node --test tests/site.test.js`

  Expected: all focused tests pass, including the About-page and global-navigation contracts.

- [ ] **Step 6: Commit discovery and sitemap integration**

  ```powershell
  git add -- '*.html' sitemap.xml
  git commit -m "feat: link company About page sitewide"
  ```

### Task 4: Package and verify the deployable site

**Files:**
- Modify: `perth-handymate-site.zip`

**Interfaces:**
- Consumes: the verified site-root file tree and `vercel.json` build command (`unzip -q perth-handymate-site.zip -d dist`).
- Produces: a ZIP with `./about/index.html` plus all current files, excluding `.git`, `.superpowers`, `dist` and both archive filenames.

- [ ] **Step 1: Build a replacement archive without recursively adding itself**

  Run from the repository root:

  ```powershell
  tar -a -cf perth-handymate-site.new.zip --exclude=perth-handymate-site.zip --exclude=perth-handymate-site.new.zip --exclude=.git --exclude=.superpowers --exclude=dist .
  Move-Item -LiteralPath .\perth-handymate-site.new.zip -Destination .\perth-handymate-site.zip -Force
  ```

- [ ] **Step 2: Inspect the release archive**

  Run:

  ```powershell
  $zipEntries = tar -tf .\perth-handymate-site.zip
  $zipEntries | Select-String -SimpleMatch './about/index.html'
  $zipEntries | Select-String -SimpleMatch 'perth-handymate-site.zip'
  ```

  Expected: `./about/index.html` appears once; no archive filename appears in the output.

- [ ] **Step 3: Run the complete local verification set**

  Run:

  ```powershell
  node --test tests/site.test.js
  node tests/check-site.js
  node --test tests\*.test.js
  ```

  Expected: About-specific and site-check suites pass. If the known unrelated `air-conditioning status module` test in `tests/price-guides.test.js` still fails, record it as pre-existing and confirm the failure output does not reference About files.

- [ ] **Step 4: Commit the release archive**

  ```powershell
  git add perth-handymate-site.zip
  git commit -m "build: package company About page"
  ```

### Task 5: Publish via the approved GitHub-to-Vercel path and verify production

**Files:**
- Modify: none locally after the package commit.

**Interfaces:**
- Consumes: the GitHub remote `origin/main` and Vercel’s configured production build from `perth-handymate-site.zip`.
- Produces: a production `/about/` document whose fetched markup has the expected title, canonical URL and ABR link.

- [ ] **Step 1: Confirm the branch is ready to publish**

  Run:

  ```powershell
  git status --short --branch
  git log --oneline origin/main..HEAD
  ```

  Expected: no uncommitted work; only intentional About-page commits are ahead of `origin/main`.

- [ ] **Step 2: Push to the approved GitHub remote**

  Run:

  ```powershell
  git push origin main
  ```

  Expected: the remote reports the new commit range; do not claim publication if the push fails.

- [ ] **Step 3: Check the Vercel production deployment and fetch `/about/`**

  Use the Vercel deployment status for project `prj_jS2BS5Gnw1HYdg9EkLlCXHKIikUF` on team `team_HgQsqT9oDcIK0DwS4mIs4L0W`. Once the deployment state is `READY`, fetch `https://www.perthhandymate.com.au/about/` and assert all of:

  ```text
  status: 200
  <title>About Ellis Services Group | Perth Property Services</title>
  https://www.perthhandymate.com.au/about/
  https://abr.business.gov.au/ABN/View?id=645821745
  ```

- [ ] **Step 4: Report the published result with the contact and ABR boundaries**

  State the live URL, confirm the official ABR lookup is linked, and note that no insurance or licence claims were added because no verified details were supplied.
