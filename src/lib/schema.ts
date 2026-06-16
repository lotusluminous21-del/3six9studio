import { business } from './businessInfo';
import { BASE_URL, absoluteUrl, type Locale, type RouteKey } from './seo';
import { getContent } from '@/content';

/**
 * Build one Schema.org @graph for a page. Uses the 2026-recommended model:
 * Organization + WebSite + Service (via hasOfferCatalog) + FAQPage, all wired
 * by shared @id so engines merge every mention into one entity.
 *
 * Notes:
 * - Service-area business: address is locality-only (no streetAddress), with
 *   areaServed listing the countries/regions covered.
 * - The same Organization/@id is reused across pages for entity consolidation.
 */

const ORG_ID = `${BASE_URL}/#organization`;
const WEBSITE_ID = `${BASE_URL}/#website`;

function organizationNode(locale: Locale) {
    const c = getContent(locale);
    return {
        '@type': 'Organization',
        '@id': ORG_ID,
        name: business.name,
        alternateName: business.alternateName,
        legalName: business.legalName,
        url: business.url,
        logo: business.logo,
        image: business.image,
        email: business.email,
        telephone: business.phone,
        description: c.meta.homeDescription,
        address: {
            '@type': 'PostalAddress',
            addressLocality: business.address.locality,
            addressRegion: business.address.region,
            addressCountry: business.address.country,
        },
        areaServed: business.areaServed.map((name) => ({
            '@type': name === 'Europe' ? 'Place' : 'Country',
            name,
        })),
        knowsAbout: [...business.knowsAbout],
        sameAs: business.sameAs,
        contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer service',
            email: business.email,
            telephone: business.phone,
            areaServed: ['GR', 'CY', 'DE', 'EU'],
            availableLanguage: ['el', 'en'],
        },
        hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: locale === 'el' ? 'Υπηρεσίες AI content' : 'AI content services',
            itemListElement: c.services.map((s) => ({
                '@type': 'Offer',
                itemOffered: {
                    '@type': 'Service',
                    '@id': `${BASE_URL}/#service-${s.slug}`,
                    name: s.name,
                    serviceType: s.name,
                    description: s.description,
                    provider: { '@id': ORG_ID },
                    areaServed: business.areaServed.map((name) => ({
                        '@type': name === 'Europe' ? 'Place' : 'Country',
                        name,
                    })),
                },
            })),
        },
    };
}

function websiteNode(locale: Locale) {
    return {
        '@type': 'WebSite',
        '@id': WEBSITE_ID,
        url: business.url,
        name: business.name,
        inLanguage: ['el', 'en'],
        publisher: { '@id': ORG_ID },
        // dateModified surfaces a freshness signal for AI Overviews / Perplexity.
        dateModified: getContent(locale).lastUpdated,
    };
}

function faqNode(locale: Locale, page: RouteKey) {
    const c = getContent(locale);
    return {
        '@type': 'FAQPage',
        '@id': `${absoluteUrl(page, locale)}#faq`,
        inLanguage: locale,
        dateModified: c.lastUpdated,
        mainEntity: c.faq.items.map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: {
                '@type': 'Answer',
                text: item.a,
            },
        })),
    };
}

export function buildGraph(locale: Locale, page: RouteKey) {
    const graph: Record<string, unknown>[] = [organizationNode(locale), websiteNode(locale)];
    // FAQ markup only on /services, where the FAQ is actually rendered in the DOM —
    // so structured data matches visible content and isn't duplicated across URLs.
    if (page === 'services') {
        graph.push(faqNode(locale, page));
    }
    return {
        '@context': 'https://schema.org',
        '@graph': graph,
    };
}
