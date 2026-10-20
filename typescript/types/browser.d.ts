export {};

declare global {
  interface EllisSearchItem { service: string; route: string; terms: string[]; canonical?: string }
  interface EllisServiceArea { slug: string; name: string; state: string; context: string; suburbs: string[] }
  interface EllisService { slug: string; title: string; short: string; icon: string; intro: string; tasks: string[]; note: string }
  interface EllisGuide { slug: string; title: string; desc: string; metaTitle: string; metaDescription: string; read: string; sections: [string, string[]][]; faq: { question: string; answer: string }[]; intro: string; editorialSource: string }
  interface EllisContent { services: EllisService[]; serviceAreas: EllisServiceArea[]; guides: EllisGuide[]; faqs: [string, string, string][]; rawServiceGroups: Record<string, string[]> }
  type EllisContactValues = Record<string, unknown>;
  interface EllisContactResult { valid: boolean; errors: Record<string, string> }
  interface EllisValidation { validateContact(values?: EllisContactValues | null): EllisContactResult }
  interface EllisLocaleAPI { chinese(): boolean; t<T>(value: T): T | string }
  interface EllisBreadcrumbEvent { source_path: string; target_path: string; locale: 'en-AU' | 'zh-Hans'; position: number; owner_id: string }
  type EllisAnalyticsProperties = { method?: string } | EllisBreadcrumbEvent;
  interface EllisAnalyticsAPI { track(name: string, properties?: EllisAnalyticsProperties | null): void; contactResult(success: boolean): void }
  interface EllisSiteAPI {
    resolveServiceSearch(query: unknown, postcode?: unknown): { route: string; service: string; query: string; postcode: string; matched: boolean };
    validateContact(values?: EllisContactValues | null): EllisContactResult;
    contactPayload(values: EllisContactValues): Record<string, string>;
    findService(query: unknown): EllisSearchItem | null;
    mergeContactHref(href: unknown, currentSearch?: string): string;
    buildContactPrefill(search?: string): { service: string; location: string; message: string };
    resolveLocalContext(search: string, title: string, areas?: EllisServiceArea[]): { locality: string; topic: string; heading: string } | null;
  }
  var ELLIS_CONTENT: EllisContent;
  var ELLIS_SEARCH_CATALOG: EllisSearchItem[];
  var EllisContactValidation: EllisValidation;
  var EllisSite: EllisSiteAPI;
  interface Window {
    ELLIS_CONTENT: EllisContent;
    ELLIS_SEARCH_CATALOG: EllisSearchItem[];
    ELLIS_FORM_DELIVERY: Readonly<{ endpoint: string; enabled: boolean }>;
    ELLIS_ZH_MESSAGES?: Record<string, string>;
    EllisLocale: EllisLocaleAPI;
    EllisContactValidation: EllisValidation;
    EllisAnalytics?: EllisAnalyticsAPI;
    __ellisAnalyticsInitialized?: boolean;
    gtag?: (command: 'event', name: string, properties: { method: string; page_path: string } | EllisBreadcrumbEvent) => void;
  }
}
