'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAdminStore } from '@/store/adminStore';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { Plus, GripVertical, Trash2, Edit3, Eye, EyeOff, Music, ChevronRight } from 'lucide-react';

export default function CollectionsPage() {
    const collections = useAdminStore(s => s.collections);
    const loading = useAdminStore(s => s.collectionsLoading);
    const addCollection = useAdminStore(s => s.addCollection);
    const editCollection = useAdminStore(s => s.editCollection);
    const removeCollection = useAdminStore(s => s.removeCollection);
    const reorderCols = useAdminStore(s => s.reorderCols);

    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

    // ─── Drag-and-Drop ──────────────────────────────────────────────────────
    const dragItemRef = useRef<number | null>(null);
    const dragOverRef = useRef<number | null>(null);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const handleDragStart = (index: number) => {
        dragItemRef.current = index;
        setDragIndex(index);
    };

    const handleDragEnter = (index: number) => {
        dragOverRef.current = index;
        setDragOverIndex(index);
    };

    const handleDragEnd = () => {
        if (dragItemRef.current !== null && dragOverRef.current !== null && dragItemRef.current !== dragOverRef.current) {
            const newOrder = [...collections];
            const [movedItem] = newOrder.splice(dragItemRef.current, 1);
            newOrder.splice(dragOverRef.current, 0, movedItem);
            const orderedIds = newOrder.map(c => c.id!);
            reorderCols(orderedIds);
        }
        dragItemRef.current = null;
        dragOverRef.current = null;
        setDragIndex(null);
        setDragOverIndex(null);
    };

    // ─── Add Collection Form ────────────────────────────────────────────────
    const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        await addCollection({
            title: fd.get('title') as string,
            subtitle: fd.get('subtitle') as string,
            image: '',
            order: collections.length,
            visible: true,
        });
        setShowAddForm(false);
    };

    // ─── Inline Edit ────────────────────────────────────────────────────────
    const handleEditSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingId) return;
        const fd = new FormData(e.currentTarget);
        await editCollection(editingId, {
            title: fd.get('title') as string,
            subtitle: fd.get('subtitle') as string,
        });
        setEditingId(null);
    };

    const editTarget = editingId ? collections.find(c => c.id === editingId) : null;

    return (
        <>
            <div className="admin-topbar">
                <h1 className="admin-topbar-title">Collections</h1>
                <div className="admin-topbar-actions">
                    <button className="admin-btn admin-btn-primary" onClick={() => setShowAddForm(true)}>
                        <Plus size={14} />
                        Add Collection
                    </button>
                </div>
            </div>

            <div style={{ padding: '28px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 60 }}>
                        <div className="admin-spinner" style={{ margin: '0 auto' }} />
                    </div>
                ) : collections.length === 0 ? (
                    <div className="admin-empty">
                        <h3>No collections</h3>
                        <p>Create your first collection or seed data from Settings.</p>
                        <button
                            className="admin-btn admin-btn-primary"
                            onClick={() => setShowAddForm(true)}
                            style={{ marginTop: 16 }}
                        >
                            <Plus size={14} />
                            Add Collection
                        </button>
                    </div>
                ) : (
                    <div className="admin-collections-list">
                        {collections.map((col, index) => (
                            <div
                                key={col.id}
                                className={`admin-collection-row ${dragIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
                                draggable
                                onDragStart={() => handleDragStart(index)}
                                onDragEnter={() => handleDragEnter(index)}
                                onDragEnd={handleDragEnd}
                                onDragOver={e => e.preventDefault()}
                            >
                                <div className="admin-drag-handle">
                                    <GripVertical size={16} />
                                </div>

                                <div className="admin-collection-thumb">
                                    {col.image && (col.image.endsWith('.mp4') || col.image.endsWith('.webm')) ? (
                                        <video src={col.image} muted loop playsInline autoPlay />
                                    ) : col.image && !col.image.endsWith('.mp3') && col.image.length > 0 ? (
                                        <img src={col.image} alt={col.title} />
                                    ) : (
                                        <Music size={18} style={{ color: 'var(--admin-text-muted)' }} />
                                    )}
                                </div>

                                <Link
                                    href={`/admin/collections/${col.id}`}
                                    className="admin-collection-info"
                                    style={{ textDecoration: 'none', color: 'inherit' }}
                                >
                                    <div className="admin-collection-title">{col.title}</div>
                                    <div className="admin-collection-sub">{col.subtitle}</div>
                                </Link>

                                <span className={`admin-collection-badge ${col.visible !== false ? 'published' : 'draft'}`}>
                                    {col.visible !== false ? 'Published' : 'Draft'}
                                </span>

                                <div className="admin-collection-actions">
                                    <button
                                        className="admin-btn-icon"
                                        title={col.visible !== false ? 'Hide' : 'Show'}
                                        onClick={e => {
                                            e.stopPropagation();
                                            editCollection(col.id!, { visible: !(col.visible !== false) });
                                        }}
                                    >
                                        {col.visible !== false ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                    <button
                                        className="admin-btn-icon"
                                        title="Edit"
                                        onClick={e => { e.stopPropagation(); setEditingId(col.id!); }}
                                    >
                                        <Edit3 size={14} />
                                    </button>
                                    <button
                                        className="admin-btn-icon"
                                        title="Delete"
                                        onClick={e => { e.stopPropagation(); setDeleteTarget({ id: col.id!, title: col.title }); }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    <Link href={`/admin/collections/${col.id}`} onClick={e => e.stopPropagation()}>
                                        <button className="admin-btn-icon" title="View Items">
                                            <ChevronRight size={14} />
                                        </button>
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Collection Modal */}
            {showAddForm && (
                <div className="admin-modal-overlay" onClick={() => setShowAddForm(false)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <h3 className="admin-modal-title">New Collection</h3>
                        </div>
                        <form onSubmit={handleAdd}>
                            <div className="admin-modal-body">
                                <div className="admin-field">
                                    <label className="admin-label">Title</label>
                                    <input className="admin-input" name="title" placeholder="e.g. PHOTOS" required />
                                </div>
                                <div className="admin-field">
                                    <label className="admin-label">Subtitle</label>
                                    <input className="admin-input" name="subtitle" placeholder="e.g. COLLECTION 8" required />
                                </div>
                            </div>
                            <div className="admin-modal-footer">
                                <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setShowAddForm(false)}>Cancel</button>
                                <button type="submit" className="admin-btn admin-btn-primary">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Collection Modal */}
            {editTarget && (
                <div className="admin-modal-overlay" onClick={() => setEditingId(null)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <h3 className="admin-modal-title">Edit Collection</h3>
                        </div>
                        <form onSubmit={handleEditSave}>
                            <div className="admin-modal-body">
                                <div className="admin-field">
                                    <label className="admin-label">Title</label>
                                    <input className="admin-input" name="title" defaultValue={editTarget.title} required />
                                </div>
                                <div className="admin-field">
                                    <label className="admin-label">Subtitle</label>
                                    <input className="admin-input" name="subtitle" defaultValue={editTarget.subtitle} required />
                                </div>
                            </div>
                            <div className="admin-modal-footer">
                                <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setEditingId(null)}>Cancel</button>
                                <button type="submit" className="admin-btn admin-btn-primary">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={!!deleteTarget}
                title="Delete Collection"
                message={`Are you sure you want to delete "${deleteTarget?.title}"? This will permanently remove all gallery items in this collection.`}
                confirmLabel="Delete"
                destructive
                onConfirm={() => {
                    if (deleteTarget) removeCollection(deleteTarget.id);
                    setDeleteTarget(null);
                }}
                onCancel={() => setDeleteTarget(null)}
            />
        </>
    );
}
