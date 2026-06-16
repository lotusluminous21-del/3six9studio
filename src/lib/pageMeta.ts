import type { Metadata } from 'next';
import { getContent } from '@/content';
import { buildAlternates, ogLocale, altOgLocale, absoluteUrl, type Locale, type RouteKey } from '@/lib/seo';

/**
 * Build per-page Next.js Metadata (title, description, canonical + hreflang,
 * OpenGraph) for a given route + locale. Kept in its own module to avoid a
 * cycle between lib/seo and the content modules.
 */
export function pageMetadata(route: RouteKey, locale: Locale): Metadata {
    const c = getContent(locale);
    const title =
        route === 'services' ? c.meta.servicesTitle :
        route === 'contact' ? c.meta.contactTitle :
        c.meta.homeTitle;
    const description =
        route === 'services' ? c.meta.servicesDescription :
        route === 'contact' ? c.meta.contactDescription :
        c.meta.homeDescription;

    return {
        // Home title already carries the brand; don't append the layout template to it.
        title: route === 'home' ? { absolute: title } : title,
        description,
        alternates: buildAlternates(route, locale),
        openGraph: {
            title,
            description,
            siteName: '3six9studio',
            url: absoluteUrl(route, locale),
            type: 'website',
            locale: ogLocale(locale),
            alternateLocale: altOgLocale(locale),
        },
    };
}
