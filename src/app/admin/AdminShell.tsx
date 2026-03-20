'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAdminStore } from '@/store/adminStore';
import { LayoutDashboard, Layers, Settings, LogOut, X, Loader2, Briefcase } from 'lucide-react';
import './admin.css';

// ─── Toast Component ────────────────────────────────────────────────────────────

function ToastContainer() {
    const toasts = useAdminStore(s => s.toasts);
    const dismissToast = useAdminStore(s => s.dismissToast);

    if (toasts.length === 0) return null;

    return (
        <div className="admin-toast-container">
            {toasts.map(toast => (
                <div key={toast.id} className={`admin-toast ${toast.type}`}>
                    <span>{toast.message}</span>
                    <button className="admin-toast-dismiss" onClick={() => dismissToast(toast.id)}>
                        <X size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
}

// ─── Operation Banner ───────────────────────────────────────────────────────────

function OperationBanner() {
    const op = useAdminStore(s => s.operationInProgress);
    if (!op) return null;

    return (
        <>
            <div className="admin-op-banner" />
            <div className="admin-op-text">
                <Loader2 size={13} className="admin-spinner" style={{ border: 'none', width: 13, height: 13 }} />
                {op}
            </div>
        </>
    );
}

// ─── Login / Register Form ──────────────────────────────────────────────────────

function LoginPage({ login, register, error, loading }: {
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string) => Promise<void>;
    error: string | null;
    loading: boolean;
}) {
    const [isRegister, setIsRegister] = useState(false);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const email = fd.get('email') as string;
        const password = fd.get('password') as string;

        if (isRegister) {
            register(email, password);
        } else {
            login(email, password);
        }
    };

    return (
        <div className="admin-login-page">
            <div className="admin-login-card">
                <h1>3six9 Studio</h1>
                <p className="admin-login-sub">
                    {isRegister ? 'Create Account' : 'Admin Access'}
                </p>
                <form onSubmit={handleSubmit}>
                    <input
                        className="admin-input"
                        type="email"
                        name="email"
                        placeholder="Email"
                        required
                        autoComplete="email"
                    />
                    <input
                        className="admin-input"
                        type="password"
                        name="password"
                        placeholder="Password"
                        required
                        autoComplete={isRegister ? 'new-password' : 'current-password'}
                    />
                    {error && <p className="admin-login-error">{error}</p>}
                    <button className="admin-btn admin-btn-primary" type="submit" disabled={loading}>
                        {loading
                            ? (isRegister ? 'Creating account…' : 'Signing in…')
                            : (isRegister ? 'Register' : 'Sign In')}
                    </button>
                </form>
                <p className="admin-login-toggle">
                    {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <button
                        type="button"
                        className="admin-login-toggle-btn"
                        onClick={() => setIsRegister(!isRegister)}
                    >
                        {isRegister ? 'Sign In' : 'Register'}
                    </button>
                </p>
            </div>
        </div>
    );
}

// ─── Sidebar Navigation ─────────────────────────────────────────────────────────

const NAV_ITEMS = [
    { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/admin/collections', icon: Layers, label: 'Collections' },
    { href: '/admin/work-contact', icon: Briefcase, label: 'Work & Contact' },
    { href: '/admin/settings', icon: Settings, label: 'Settings' },
];

function Sidebar({ email, onLogout }: { email: string; onLogout: () => void }) {
    const pathname = usePathname();

    const isActive = (href: string) => {
        if (href === '/admin') return pathname === '/admin';
        return pathname.startsWith(href);
    };

    return (
        <aside className="admin-sidebar">
            <div className="admin-sidebar-brand">
                <h2>3six9</h2>
                <span>Content Manager</span>
            </div>

            <nav className="admin-sidebar-nav">
                {NAV_ITEMS.map(item => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`admin-nav-link ${isActive(item.href) ? 'active' : ''}`}
                    >
                        <item.icon size={18} />
                        <span>{item.label}</span>
                    </Link>
                ))}
            </nav>

            <div className="admin-sidebar-footer">
                <div className="admin-sidebar-user">
                    <div className="admin-sidebar-user-avatar">
                        {email.charAt(0).toUpperCase()}
                    </div>
                    <div className="admin-sidebar-user-info">
                        <div className="admin-sidebar-user-name">Admin</div>
                        <div className="admin-sidebar-user-email">{email}</div>
                    </div>
                </div>
                <button className="admin-nav-link" onClick={onLogout} style={{ marginTop: 6 }}>
                    <LogOut size={18} />
                    <span>Sign Out</span>
                </button>
            </div>
        </aside>
    );
}

// ─── Admin Shell (Client Component) ─────────────────────────────────────────────

export default function AdminShell({ children }: { children: React.ReactNode }) {
    const { user, isAdmin, loading, error, login, register, logout } = useAdminAuth();
    const fetchCollections = useAdminStore(s => s.fetchCollections);

    // Fetch collections on mount once admin is verified
    useEffect(() => {
        if (isAdmin) {
            fetchCollections();
        }
    }, [isAdmin, fetchCollections]);

    // Loading state
    if (loading) {
        return (
            <div className="admin-loading">
                <div className="admin-spinner" />
            </div>
        );
    }

    // Not authenticated or not admin
    if (!user || !isAdmin) {
        return <LoginPage login={login} register={register} error={error} loading={loading} />;
    }

    return (
        <div className="admin-shell">
            <Sidebar email={user.email || ''} onLogout={logout} />

            <main className="admin-main">
                <OperationBanner />
                <div className="admin-content">
                    {children}
                </div>
            </main>

            <ToastContainer />
        </div>
    );
}
