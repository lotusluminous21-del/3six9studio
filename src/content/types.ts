import type { Locale } from '@/lib/seo';

export interface ServiceCopy {
    /** Anchor id / stable slug for the service. */
    slug: string;
    name: string;
    tagline: string;
    description: string;
    idealFor: string[];
}

export interface FaqItem {
    q: string;
    /** Answer-first: the FIRST sentence must stand alone as a complete answer. */
    a: string;
}

export interface ComparisonRow {
    label: string;
    ai: string;
    traditional: string;
}

export interface GlossaryItem {
    term: string;
    definition: string;
}

export interface MetaCopy {
    homeTitle: string;
    homeDescription: string;
    servicesTitle: string;
    servicesDescription: string;
    contactTitle: string;
    contactDescription: string;
}

export interface SiteContent {
    locale: Locale;
    brandTagline: string;
    hero: {
        h1: string;
        h2: string;
        body: string;
        ctaServices: string;
        ctaContact: string;
    };
    intro: string;
    services: ServiceCopy[];
    whyUs: {
        title: string;
        points: string[];
    };
    comparison: {
        title: string;
        aiLabel: string;
        traditionalLabel: string;
        rows: ComparisonRow[];
    };
    faq: {
        title: string;
        items: FaqItem[];
    };
    glossary: {
        title: string;
        items: GlossaryItem[];
    };
    contact: {
        title: string;
        intro: string;
        basedInLabel: string;
        areaServedLabel: string;
        responseNote: string;
    };
    nav: {
        home: string;
        services: string;
        contact: string;
        backToExperience: string;
    };
    meta: MetaCopy;
    /** ISO date of the last content review — surfaced as a freshness signal. */
    lastUpdated: string;
}
