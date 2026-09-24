# Ellis Services Group company About page design

## Purpose

Create a company-led About page for Ellis Services Group. The page should help Perth property owners, landlords, property managers and commercial-property contacts understand who the company is, how it coordinates work and how to get in touch. It is not a duplicate of the Services directory.

The content and page rhythm may take inspiration from the supplied Melone Renovations About page, but all copy, claims and layout details will be original to Ellis Services Group.

## Confirmed facts and boundaries

- Company name: Ellis Services Group.
- Office address: 140 St Georges Terrace, Perth WA 6000.
- Telephone: 0403 069 685.
- Email: handyman.maintenance.au@outlook.com.
- The ABR verification destination is `https://abr.business.gov.au/ABN/View?id=645821745`.
- The About page is primarily a company introduction. Existing service pages are supporting destinations only.
- Do not state insurance, policy limits, licence numbers, trade qualifications, staff counts, years in operation, project counts, testimonials or other credentials unless the user supplies verifiable source material.
- Retain the existing service-scope language: Ellis may coordinate its own teams and reviewed service partners; the actual attending provider and trade-specific requirements are confirmed before work proceeds.

## Information architecture

The new canonical route is `/about/`, backed by `about/index.html`. It will be included in the main header navigation, the footer Explore links and `sitemap.xml`.

The page uses the existing brand, typography, colour system, responsive header/footer, CTA styling and contact-page destination. It needs no new image asset to launch; the design should use the existing company logo and restrained graphic treatments. A future company or team photograph can be added to the hero without changing the content structure.

## Page structure and original content

1. **Hero: About Ellis Services Group**
   - Company-led introduction for coordinated property maintenance and improvement across metropolitan Perth.
   - Primary CTA: contact the team. Secondary action: call 0403 069 685.

2. **Our approach**
   - Explain the value proposition plainly: one point of contact, clear scope discussion and a practical next step for each request.
   - Avoid guarantees about response time, price or availability.

3. **How a request moves forward**
   - Four readable steps: tell us what needs attention; confirm property/location/scope; identify the suitable delivery pathway; confirm the provider and requirements before work proceeds.
   - Make clear that suitability, availability and any regulated-trade requirement are assessed for the individual request.

4. **Who we support**
   - Short company-introduction copy for homeowners, landlords, property managers and commercial-property contacts.
   - Link to Services and Areas We Service as supporting navigation, not a long service catalogue.

5. **Transparency and ABR**
   - Describe the ABR button as an official business-register lookup.
   - Open the supplied ABR URL in a new tab with safe link attributes.
   - Do not infer ABN, insurance, licensing or registration-status facts from the URL alone; the external register remains the source of record.

6. **Perth office and contact**
   - Display the confirmed address, telephone and email.
   - Reuse the established office-map component or clear map/contact links where appropriate.
   - Close with a contact CTA to `/contact/`.

## Navigation and SEO

- Add **About Us** between Areas We Service and Guides & Advice in the header, with the active-state attribute on the About page.
- Add **About Us** to the footer Explore list.
- Give the page an original title, concise description, canonical URL and Organization structured-data baseline consistent with existing pages.
- Add `/about/` to `sitemap.xml`.
- Preserve relative asset paths at each page depth and include the site favicon.

## Accessibility and responsive behaviour

- Use one H1 and hierarchical H2 headings.
- Maintain visible focus states, sufficient contrast and descriptive link names.
- Ensure telephone and email use `tel:` and `mailto:` links.
- Label the external ABR action clearly, indicating that it opens the official register in a new tab.
- Keep all sections readable from narrow mobile layouts without horizontal scrolling.

## Verification plan

- Add/extend automated site checks for the new route, canonical URL, navigation links, ABR destination and sitemap entry.
- Run the existing static-site checker and focused automated tests.
- Inspect the built ZIP to ensure the new About files are included before deployment.
- Verify the deployed `/about/` page returns the expected title, canonical URL and ABR link after GitHub/Vercel publication.

## Out of scope

- No online form-delivery integration.
- No fabricated case studies, review quotes, certifications, insurance promises or licence claims.
- No new photographs are required for the first release.
