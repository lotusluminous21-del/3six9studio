import type { Metadata } from 'next';
import ImmersiveApp from '@/components/ImmersiveApp';
import HomeSeoLayer from '@/components/seo/HomeSeoLayer';
import JsonLd from '@/components/JsonLd';
import { getContent } from '@/content';
import { buildAlternates, ogLocale, altOgLocale, absoluteUrl } from '@/lib/seo';

const LOCALE = 'el' as const;

export function generateMetadata(): Metadata {
    const c = getContent(LOCALE);
    return {
        title: { absolute: c.meta.homeTitle },
        description: c.meta.homeDescription,
        alternates: buildAlternates('home', LOCALE),
        openGraph: {
            title: c.meta.homeTitle,
            description: c.meta.homeDescription,
            siteName: '3six9studio',
            url: absoluteUrl('home', LOCALE),
            type: 'website',
            locale: ogLocale(LOCALE),
            alternateLocale: altOgLocale(LOCALE),
        },
    };
}

/**
 * Server Component shell. Renders:
 *  1. <ImmersiveApp/> — the WebGL client island (unchanged experience).
 *  2. <HomeSeoLayer/> — the server-rendered semantic text equivalent.
 *  3. <JsonLd/> — the Schema.org @graph.
 */
export default function Home() {
    const content = getContent(LOCALE);
    return (
        <main>
            <ImmersiveApp />
            <HomeSeoLayer content={content} locale={LOCALE} />
            <JsonLd locale={LOCALE} page="home" />
        </main>
    );
}
