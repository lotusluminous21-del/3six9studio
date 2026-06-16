// Force all admin routes to be dynamic (no static prerendering at build time)
// This is required because the admin area depends on Firebase Auth which is client-only
export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import AdminShell from './AdminShell';

export const metadata: Metadata = {
    // Bare 'Admin' — the root layout's title template appends ' · 3six9studio'.
    title: 'Admin',
    robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return <AdminShell>{children}</AdminShell>;
}
