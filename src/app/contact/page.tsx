import type { Metadata } from 'next';
import { ContactPage } from '@/components/seo/Pages';
import { pageMetadata } from '@/lib/pageMeta';

export function generateMetadata(): Metadata {
    return pageMetadata('contact', 'el');
}

export default function Page() {
    return <ContactPage locale="el" />;
}
