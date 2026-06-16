import type { Metadata } from 'next';
import ImmersiveApp from '@/components/ImmersiveApp';
import HomeSeoLayer from '@/components/seo/HomeSeoLayer';
import JsonLd from '@/components/JsonLd';
import { getContent } from '@/content';
import { pageMetadata } from '@/lib/pageMeta';

const LOCALE = 'en' as const;

export function generateMetadata(): Metadata {
    return pageMetadata('home', LOCALE);
}

export default function EnglishHome() {
    const content = getContent(LOCALE);
    return (
        <main>
            <ImmersiveApp />
            <HomeSeoLayer content={content} locale={LOCALE} />
            <JsonLd locale={LOCALE} page="home" />
        </main>
    );
}
