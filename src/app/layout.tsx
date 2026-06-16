import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import { getContent } from '@/content';
import { BASE_URL, localeFromPath } from '@/lib/seo';

const elMeta = getContent('el').meta;

export const metadata: Metadata = {
    metadataBase: new URL(BASE_URL),
    title: {
        default: elMeta.homeTitle,
        template: '%s · 3six9studio',
    },
    description: elMeta.homeDescription,
    applicationName: '3six9studio',
    authors: [{ name: '3six9studio' }],
    creator: '3six9studio',
    publisher: '3six9studio',
    keywords: [
        'AI βίντεο προϊόντων',
        'φωτογράφιση προϊόντων με AI',
        'AI product video',
        'AI product photography',
        'content για eshop',
        'διαφημιστικό βίντεο Instagram',
        'AI content studio Greece',
        'Drama',
    ],
    openGraph: {
        siteName: '3six9studio',
        type: 'website',
        locale: 'el_GR',
        alternateLocale: 'en_US',
    },
    twitter: {
        card: 'summary_large_image',
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
        },
    },
};

export const viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // proxy.ts sets x-pathname so the root layout can pick the right <html lang>
    // for the bare-/ (Greek) vs /en (English) trees.
    const headerList = await headers();
    const pathname = headerList.get('x-pathname') ?? '';
    // /admin is an English-language internal tool; the public site follows its locale.
    const lang = pathname.startsWith('/admin') ? 'en' : localeFromPath(pathname);

    return (
        <html lang={lang}>
            <body>{children}</body>
        </html>
    );
}
