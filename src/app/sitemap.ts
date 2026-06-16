import type { MetadataRoute } from 'next';
import { absoluteUrl, type RouteKey } from '@/lib/seo';
import { getContent } from '@/content';

/**
 * One sitemap covering both locales, with per-URL hreflang alternates
 * (el / en / x-default). Greek is primary, so x-default points to the Greek URL.
 */
export default function sitemap(): MetadataRoute.Sitemap {
    const lastModified = getContent('el').lastUpdated;

    const pages: { route: RouteKey; priority: number; changeFrequency: 'weekly' | 'monthly' | 'yearly' }[] = [
        { route: 'home', priority: 1, changeFrequency: 'weekly' },
        { route: 'services', priority: 0.9, changeFrequency: 'monthly' },
        { route: 'contact', priority: 0.7, changeFrequency: 'yearly' },
    ];

    const entries: MetadataRoute.Sitemap = [];
    for (const p of pages) {
        const languages = {
            el: absoluteUrl(p.route, 'el'),
            en: absoluteUrl(p.route, 'en'),
            'x-default': absoluteUrl(p.route, 'el'),
        };
        for (const locale of ['el', 'en'] as const) {
            entries.push({
                url: absoluteUrl(p.route, locale),
                lastModified,
                changeFrequency: p.changeFrequency,
                priority: p.priority,
                alternates: { languages },
            });
        }
    }
    return entries;
}
