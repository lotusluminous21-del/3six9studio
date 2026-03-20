'use client';

import { useState } from 'react';
import { useAdminStore } from '@/store/adminStore';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { Database, Rocket, Trash2, AlertTriangle } from 'lucide-react';
import galleryData from '@/data/gallery.json';

export default function SettingsPage() {
    const seedData = useAdminStore(s => s.seedData);
    const publishGallery = useAdminStore(s => s.publishGallery);
    const collections = useAdminStore(s => s.collections);
    const operationInProgress = useAdminStore(s => s.operationInProgress);
    const addToast = useAdminStore(s => s.addToast);

    const [seedConfirm, setSeedConfirm] = useState(false);
    const [publishConfirm, setPublishConfirm] = useState(false);
    const [lastPublished, setLastPublished] = useState<string | null>(null);

    const handleSeed = async () => {
        setSeedConfirm(false);
        await seedData(galleryData as any);
    };

    const handlePublish = async () => {
        setPublishConfirm(false);
        const data = await publishGallery();
        if (data) {
            setLastPublished(new Date().toLocaleString());
            addToast({ type: 'info', message: `Published ${data.length} collections.` });
        }
    };

    return (
        <>
            <div className="admin-topbar">
                <h1 className="admin-topbar-title">Settings</h1>
            </div>

            <div style={{ padding: '28px' }}>
                {/* Publish Panel */}
                <div className="admin-settings-section">
                    <h3 className="admin-settings-title">Publish</h3>
                    <div className="admin-card">
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                            <div className="admin-stat-icon green">
                                <Rocket size={18} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--admin-text)', marginBottom: 4 }}>
                                    Publish Gallery Data
                                </div>
                                <p style={{ fontSize: 13, color: 'var(--admin-text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
                                    Compile all visible collections and their items from Firestore into the public-facing gallery format.
                                    The portfolio frontend will read this data on next page load.
                                </p>
                                {lastPublished && (
                                    <p style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginBottom: 10 }}>
                                        Last published: {lastPublished}
                                    </p>
                                )}
                                <p style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginBottom: 14 }}>
                                    {collections.length} collections • {collections.filter(c => c.visible !== false).length} visible
                                </p>
                                <button
                                    className="admin-btn admin-btn-primary"
                                    onClick={() => setPublishConfirm(true)}
                                    disabled={!!operationInProgress || collections.length === 0}
                                >
                                    <Rocket size={14} />
                                    Publish Now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Seed Data Panel */}
                <div className="admin-settings-section">
                    <h3 className="admin-settings-title">Data Migration</h3>
                    <div className="admin-card">
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                            <div className="admin-stat-icon blue">
                                <Database size={18} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--admin-text)', marginBottom: 4 }}>
                                    Seed from gallery.json
                                </div>
                                <p style={{ fontSize: 13, color: 'var(--admin-text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
                                    Import the existing <code style={{
                                        padding: '1px 5px', background: 'var(--admin-bg-subtle)',
                                        borderRadius: 4, fontSize: 12
                                    }}>gallery.json</code> data into Firestore.
                                    This will create {galleryData.length} collections with all their gallery items.
                                </p>
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    fontSize: 12, color: 'var(--admin-warning)', marginBottom: 14
                                }}>
                                    <AlertTriangle size={13} />
                                    This adds data without clearing existing collections.
                                </div>
                                <button
                                    className="admin-btn admin-btn-ghost"
                                    onClick={() => setSeedConfirm(true)}
                                    disabled={!!operationInProgress}
                                >
                                    <Database size={14} />
                                    Seed Data
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info */}
                <div className="admin-settings-section">
                    <h3 className="admin-settings-title">System Info</h3>
                    <div className="admin-card">
                        <div style={{ display: 'grid', gap: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                <span style={{ color: 'var(--admin-text-secondary)' }}>Firebase Project</span>
                                <span style={{ color: 'var(--admin-text)' }}>
                                    {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'Not configured'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                <span style={{ color: 'var(--admin-text-secondary)' }}>Storage Bucket</span>
                                <span style={{ color: 'var(--admin-text)' }}>
                                    {process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'Not configured'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                <span style={{ color: 'var(--admin-text-secondary)' }}>Collections in DB</span>
                                <span style={{ color: 'var(--admin-text)' }}>{collections.length}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Seed Confirm */}
            <ConfirmDialog
                open={seedConfirm}
                title="Seed Data from gallery.json"
                message={`This will import ${galleryData.length} collections into Firestore. Existing data will not be removed. Continue?`}
                confirmLabel="Seed Data"
                onConfirm={handleSeed}
                onCancel={() => setSeedConfirm(false)}
            />

            {/* Publish Confirm */}
            <ConfirmDialog
                open={publishConfirm}
                title="Publish Gallery"
                message="This will compile all visible collections into the public gallery format. Visitors will see the updated data on their next page load."
                confirmLabel="Publish"
                onConfirm={handlePublish}
                onCancel={() => setPublishConfirm(false)}
            />
        </>
    );
}
