/**
 * Centralised SEO routing + metadata helpers.
 *
 * The production domain lives in exactly one place (BASE_URL / metadataBase in
 * the root layout). Per-page metadata uses relative paths and Next.js resolves
 * them to absolute URLs against metadataBase.
 */

export const BASE_URL = 'https://3six9studio.com';

export const LOCALES = ['el', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'el';

/**
 * Canonical path for each page in each locale.
 * Greek is primary and lives at the bare path; English is prefixed with /en.
 */
export const ROUTES = {
    home: { el: '/', en: '/en' },
    services: { el: '/services', en: '/en/services' },
    contact: { el: '/contact', en: '/en/contact' },
} as const;

export type RouteKey = keyof typeof ROUTES;

/**
 * Build the `alternates` block for a page's metadata: a self-referencing
 * canonical plus the el/en/x-default hreflang cluster (x-default -> Greek root,
 * the primary market).
 */
export function buildAlternates(route: RouteKey, locale: Locale) {
    // Use absolute URLs so canonical/hreflang match the sitemap, OpenGraph and
    // JSON-LD exactly. (A relative '/' would be resolved against metadataBase to a
    // trailing-slash URL that disagrees with the slash-free URLs used elsewhere.)
    return {
        canonical: absoluteUrl(route, locale),
        languages: {
            el: absoluteUrl(route, 'el'),
            en: absoluteUrl(route, 'en'),
            'x-default': absoluteUrl(route, 'el'),
        },
    };
}

export function ogLocale(locale: Locale): string {
    return locale === 'el' ? 'el_GR' : 'en_US';
}

export function altOgLocale(locale: Locale): string {
    return locale === 'el' ? 'en_US' : 'el_GR';
}

/** Resolve the active locale from a request pathname. */
export function localeFromPath(pathname: string | null | undefined): Locale {
    return pathname && pathname.startsWith('/en') ? 'en' : 'el';
}

/** Absolute URL for a given route + locale. */
export function absoluteUrl(route: RouteKey, locale: Locale): string {
    const path = ROUTES[route][locale];
    return path === '/' ? BASE_URL : `${BASE_URL}${path}`;
}
