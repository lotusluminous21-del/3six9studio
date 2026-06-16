import type { Metadata } from 'next';
import { ContactPage } from '@/components/seo/Pages';
import { pageMetadata } from '@/lib/pageMeta';

export function generateMetadata(): Metadata {
    return pageMetadata('contact', 'en');
}

export default function Page() {
    return <ContactPage locale="en" />;
}
