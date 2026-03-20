'use client';

import { useAdminStore } from '@/store/adminStore';
import { Layers, Image, Film, Music, Rocket } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
    const collections = useAdminStore(s => s.collections);
    const loading = useAdminStore(s => s.collectionsLoading);

    const totalItems = collections.reduce((sum, c) => sum, 0); // items need fetch
    const publishedCount = collections.filter(c => c.visible !== false).length;
    const draftCount = collections.filter(c => c.visible === false).length;

    return (
        <>
            <div className="admin-topbar">
                <h1 className="admin-topbar-title">Dashboard</h1>
                <div className="admin-topbar-actions">
                    <Link href="/admin/collections">
                        <button className="admin-btn admin-btn-primary">
                            <Layers size={14} />
                            Manage Collections
                        </button>
                    </Link>
                </div>
            </div>

            <div style={{ padding: '28px' }}>
                {/* Stats */}
                <div className="admin-stats-grid">
                    <div className="admin-stat-card">
                        <div className="admin-stat-icon blue"><Layers size={18} /></div>
                        <div className="admin-stat-label">Total Collections</div>
                        <div className="admin-stat-value">{loading ? '…' : collections.length}</div>
                    </div>
                    <div className="admin-stat-card">
                        <div className="admin-stat-icon green"><Rocket size={18} /></div>
                        <div className="admin-stat-label">Published</div>
                        <div className="admin-stat-value">{loading ? '…' : publishedCount}</div>
                    </div>
                    <div className="admin-stat-card">
                        <div className="admin-stat-icon yellow"><Film size={18} /></div>
                        <div className="admin-stat-label">Drafts</div>
                        <div className="admin-stat-value">{loading ? '…' : draftCount}</div>
                    </div>
                </div>

                {/* Quick Access: collections list */}
                <div className="admin-card" style={{ marginBottom: 20 }}>
                    <div className="admin-card-header">
                        <div>
                            <div className="admin-card-title">Collections</div>
                            <div className="admin-card-subtitle">Quick overview of all portfolio collections</div>
                        </div>
                        <Link href="/admin/collections">
                            <button className="admin-btn admin-btn-ghost admin-btn-sm">View All</button>
                        </Link>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 30 }}>
                            <div className="admin-spinner" style={{ margin: '0 auto' }} />
                        </div>
                    ) : collections.length === 0 ? (
                        <div className="admin-empty">
                            <Layers />
                            <h3>No collections yet</h3>
                            <p>Head to Settings to seed from your existing gallery.json, or create a new collection.</p>
                        </div>
                    ) : (
                        <div className="admin-collections-list">
                            {collections.slice(0, 5).map(col => (
                                <Link
                                    key={col.id}
                                    href={`/admin/collections/${col.id}`}
                                    className="admin-collection-row"
                                >
                                    <div className="admin-collection-thumb">
                                        {col.image && (col.image.endsWith('.mp4') || col.image.endsWith('.webm')) ? (
                                            <video src={col.image} muted loop playsInline autoPlay />
                                        ) : col.image && !col.image.endsWith('.mp3') ? (
                                            <img src={col.image} alt={col.title} />
                                        ) : (
                                            <Music size={18} style={{ color: 'var(--admin-text-muted)' }} />
                                        )}
                                    </div>
                                    <div className="admin-collection-info">
                                        <div className="admin-collection-title">{col.title}</div>
                                        <div className="admin-collection-sub">{col.subtitle}</div>
                                    </div>
                                    <span className={`admin-collection-badge ${col.visible !== false ? 'published' : 'draft'}`}>
                                        {col.visible !== false ? 'Published' : 'Draft'}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Getting Started info */}
                <div className="admin-card">
                    <div className="admin-card-title" style={{ marginBottom: 12 }}>Getting Started</div>
                    <div style={{ fontSize: 13, color: 'var(--admin-text-secondary)', lineHeight: 1.7 }}>
                        <p style={{ marginBottom: 8 }}>
                            <strong>1. Seed Data</strong> — Go to <Link href="/admin/settings" style={{ color: 'var(--admin-accent)' }}>Settings</Link> and
                            click &quot;Seed from gallery.json&quot; to import your existing portfolio data into Firestore.
                        </p>
                        <p style={{ marginBottom: 8 }}>
                            <strong>2. Manage Collections</strong> — Add, edit, reorder, or remove collections.
                            Drag and drop to change the order.
                        </p>
                        <p>
                            <strong>3. Add Gallery Items</strong> — Click into any collection to manage its images,
                            videos, and audio tracks. Upload new files with automatic WebP optimization for images.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
