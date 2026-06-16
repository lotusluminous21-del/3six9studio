import type { Metadata } from 'next';
import { ServicesPage } from '@/components/seo/Pages';
import { pageMetadata } from '@/lib/pageMeta';

export function generateMetadata(): Metadata {
    return pageMetadata('services', 'el');
}

export default function Page() {
    return <ServicesPage locale="el" />;
}
