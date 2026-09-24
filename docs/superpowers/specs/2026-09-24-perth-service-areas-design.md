# Perth service-area directory and suburb landing pages

## Purpose

Extend the existing Areas We Service page into an eight-zone Perth metropolitan directory. Visitors can search for a suburb or postcode, browse a zone, and open an individual suburb landing page. Each suburb page explains the relevant Ellis service pathways, reserves verified case-study slots, and includes the existing enquiry form with the suburb prefilled.

The pages are enquiry pathways, not promises that every trade is available in every suburb or at every time.

## Information architecture

```text
Areas We Service
├── Suburb / postcode search
├── Eight zone hubs
│   ├── Perth CBD & Inner Suburbs
│   ├── Western Suburbs & Coast
│   ├── North Perth & Stirling
│   ├── Joondalup & Northern Suburbs
│   ├── Eastern Suburbs, Midland & Swan
│   ├── South Perth, Canning & Victoria Park
│   ├── Fremantle & Coastal South
│   └── Cockburn, Rockingham & Southern Corridor
└── Individual suburb landing pages
    ├── Service-category links
    ├── Three real case-study slots
    └── Prefilled contact form
```

Every listed suburb is a separate static URL. The source list will contain an explicit suburb, postcode, and one of the eight zones; it will be reviewed before generation so that an ambiguous locality is not presented as an Ellis service guarantee.

## Directory and suburb-page layout

The existing Areas page remains the visual and navigational base.

1. Directory hero: `Find your Perth suburb` search field, with suburb/postcode suggestions.
2. Eight zone cards: each opens a zone hub listing its suburb links.
3. Suburb hero: breadcrumb, suburb name, service-area qualifier, shared zone image, and availability disclaimer.
4. Six service pathways: Handyman repairs & assembly; carpentry, doors & windows; painting, plaster & tiling; gutters, roofing & exterior; gardens & outdoor upkeep; property-manager maintenance. Each links to the existing matching service content.
5. Case-study section: three reserved cards, each rendered only from a verified case assigned to the broader zone. Until a case is supplied, the slot remains visibly marked as `Case study image to be added` and does not make a project claim.
6. Contact section: the current form, with the suburb prefilled. It preserves the existing form-delivery limitations.

Mobile view stacks the hero, service cards, cases, and form in that order. Keyboard focus, lazy-loaded images, meaningful alt text, and reduced-motion behaviour remain supported.

## Image plan

### Initial requested image set: 33 images total

| Group | Quantity | Used where | Required file specification |
|---|---:|---|---|
| Perth directory hero | 1 | Top of Areas directory | 2400 × 1350 px, landscape, WebP or JPG, under 500 KB |
| Zone cover images | 8 | Zone hubs and all suburb heroes within that zone | 1920 × 1080 px, landscape, WebP or JPG, under 350 KB each |
| Real project case images | 24 | Three case cards in each of the eight zones | 1600 × 1000 px, landscape, WebP or JPG, under 350 KB each |

No image is required for every individual suburb page. Each suburb inherits its zone cover and that zone’s three verified case images. The current service icons can be reused; no additional service-icon assets are needed.

### Naming

```text
perth-service-areas-hero.webp
zone-perth-cbd-inner.webp
zone-western-suburbs-coast.webp
case-western-suburbs-01.webp
```

For every case image, supply a short factual record: zone, approximate suburb if publication is permitted, service category, actual scope completed, outcome, project date or year, and permission status. Do not include identifiable occupants, house numbers, registration plates, or unapproved addresses in the photo or caption.

## Content and indexing guardrails

Suburb pages may state that Ellis coordinates a local enquiry pathway and that availability is confirmed after enquiry. They must not claim a specific team completed a project in a suburb unless a supplied case record supports it.

The generated pages will retain unique suburb titles, descriptions, service copy, and contact prefills. Pages without sufficient reviewed local content will be accessible through the directory but held out of the indexable sitemap until the content is ready.

## Verification

- Directory search resolves a known suburb/postcode to its unique landing page.
- Each of eight zone hubs lists only its assigned suburbs.
- Every suburb page contains the six service links, three safe case slots, and the prefilled form.
- Shared images use responsive dimensions and lazy loading outside the hero.
- Static ZIP contains all generated pages and assets before Vercel deployment.
