/**
 * Single source of truth for the studio's NAP (name / address / phone),
 * brand identity and social profiles.
 *
 * Everything that needs these facts — JSON-LD, metadata, the contact page,
 * the WorkContactView fallback, the Firestore seed — should import from here
 * so the values can never drift across copies again.
 *
 * Contact values are the confirmed site-code values (Proton email, GR phone,
 * Instagram). Location is city-level only (Drama, Greece) + areaServed, which
 * is the correct model for a remote, service-area business with no storefront.
 */

export const business = {
    name: '3six9studio',
    alternateName: '369studios',
    legalName: '3six9studio',
    url: 'https://3six9studio.com',
    // Public, stable asset URLs (served from /public)
    logo: 'https://3six9studio.com/3six9studios%20logomark.svg',
    image: 'https://3six9studio.com/3six9studios%20logomark.svg',

    email: '3six9studio@proton.me',
    emailHref: 'mailto:3six9studio@proton.me',
    phone: '+30 6979019842',
    phoneHref: 'tel:+306979019842',

    instagram: 'https://www.instagram.com/3six9.studio/',
    instagramHandle: '@3six9.studio',

    // Service-area business: locality only, no streetAddress.
    address: {
        locality: 'Drama',
        region: 'Eastern Macedonia and Thrace',
        country: 'GR',
    },

    // Countries / regions served, used for areaServed in JSON-LD.
    areaServed: ['Greece', 'Cyprus', 'Germany', 'Europe'] as const,

    // External profiles that represent the same entity (Organization.sameAs).
    // Add LinkedIn / YouTube / Behance / Google Business Profile here as they go live.
    sameAs: [
        'https://www.instagram.com/3six9.studio/',
    ] as string[],

    knowsAbout: [
        'AI Product Video Production',
        'AI Product Photography',
        'E-commerce Content',
        'Branded Campaigns',
        'Beauty and Cosmetics Content',
    ] as const,
} as const;

export type BusinessInfo = typeof business;
