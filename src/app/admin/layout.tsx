// Force all admin routes to be dynamic (no static prerendering at build time)
// This is required because the admin area depends on Firebase Auth which is client-only
export const dynamic = 'force-dynamic';

import AdminShell from './AdminShell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return <AdminShell>{children}</AdminShell>;
}
