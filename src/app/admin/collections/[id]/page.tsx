'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAdminStore } from '@/store/adminStore';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import MediaUploader from '@/components/admin/MediaUploader';
import {
    detectMediaType, uploadMedia, uploadOptimizedImage,
    formatFileSize, type UploadProgress
} from '@/lib/storageService';
import {
    ArrowLeft, Trash2, ExternalLink, Music, Image as ImageIcon,
    Film, CheckSquare, Square, X, Move, ChevronRight
} from 'lucide-react';

interface UploadJob {
    id: string;
    fileName: string;
    progress: number;
    state: 'running' | 'success' | 'error';
    size: number;
}

export default function GalleryItemsPage() {
    const params = useParams();
    const collectionId = params.id as string;

    const collections = useAdminStore(s => s.collections);
    const items = useAdminStore(s => s.galleryItems);
    const loading = useAdminStore(s => s.galleryItemsLoading);
    const fetchGalleryItems = useAdminStore(s => s.fetchGalleryItems);
    const addItem = useAdminStore(s => s.addItem);
    const removeItem = useAdminStore(s => s.removeItem);
    const reorderItems = useAdminStore(s => s.reorderItems);
    const bulkRemoveItems = useAdminStore(s => s.bulkRemoveItems);
    const bulkMoveItems = useAdminStore(s => s.bulkMoveItems);
    const editCollection = useAdminStore(s => s.editCollection);

    const collection = collections.find(c => c.id === collectionId);

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSelecting, setIsSelecting] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
    const [moveTargetId, setMoveTargetId] = useState<string | null>(null);
    const [uploads, setUploads] = useState<UploadJob[]>([]);

    // Drag-and-drop state
    const dragItemRef = useRef<number | null>(null);
    const dragOverRef = useRef<number | null>(null);
    const [dragIndex, setDragIndex] = useState<number | null>(null);

    useEffect(() => {
        fetchGalleryItems(collectionId);
    }, [collectionId, fetchGalleryItems]);

    // ─── Selection ──────────────────────────────────────────────────────────

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const selectAll = () => {
        if (selectedIds.size === items.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(items.map(i => i.id!)));
        }
    };

    const cancelSelection = () => {
        setSelectedIds(new Set());
        setIsSelecting(false);
    };

    // ─── Drag-and-drop reorder ──────────────────────────────────────────────

    const handleDragStart = (index: number) => {
        dragItemRef.current = index;
        setDragIndex(index);
    };

    const handleDragEnter = (index: number) => {
        dragOverRef.current = index;
    };

    const handleDragEnd = () => {
        if (dragItemRef.current !== null && dragOverRef.current !== null && dragItemRef.current !== dragOverRef.current) {
            const newOrder = [...items];
            const [moved] = newOrder.splice(dragItemRef.current, 1);
            newOrder.splice(dragOverRef.current, 0, moved);
            reorderItems(collectionId, newOrder.map(i => i.id!));
        }
        dragItemRef.current = null;
        dragOverRef.current = null;
        setDragIndex(null);
    };

    // ─── Upload Handler ─────────────────────────────────────────────────────

    const handleFilesSelected = useCallback(async (files: File[]) => {
        const newUploads: UploadJob[] = files.map((f, i) => ({
            id: `upload-${Date.now()}-${i}`,
            fileName: f.name,
            progress: 0,
            state: 'running' as const,
            size: f.size,
        }));

        setUploads(prev => [...prev, ...newUploads]);

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const uploadId = newUploads[i].id;
            const mediaType = detectMediaType(file);
            if (!mediaType) continue;

            const storagePath = `3six9/${collection?.title?.toLowerCase().replace(/\s+/g, '%20') || 'uploads'}/${file.name}`;

            const onProgress = (p: UploadProgress) => {
                const mappedState: UploadJob['state'] = p.state === 'paused' ? 'running' : p.state;
                setUploads(prev => prev.map(u =>
                    u.id === uploadId ? { ...u, progress: p.progress, state: mappedState } : u
                ));
            };

            try {
                let url: string;

                if (mediaType === 'image') {
                    const result = await uploadOptimizedImage(file, storagePath, onProgress);
                    url = result.url;
                } else {
                    const { promise } = uploadMedia(file, storagePath, onProgress);
                    url = await promise;
                }

                // Add to Firestore
                await addItem(collectionId, {
                    type: mediaType,
                    url,
                    thumbnail: url,
                    order: items.length + i,
                });

                // If first item in collection and no cover, set it
                if (items.length === 0 && i === 0 && collection) {
                    editCollection(collectionId, { image: url });
                }

                setUploads(prev => prev.map(u =>
                    u.id === uploadId ? { ...u, state: 'success', progress: 100 } : u
                ));
            } catch {
                setUploads(prev => prev.map(u =>
                    u.id === uploadId ? { ...u, state: 'error' } : u
                ));
            }
        }

        // Clear completed uploads after 3s
        setTimeout(() => {
            setUploads(prev => prev.filter(u => u.state === 'running'));
        }, 3000);
    }, [collectionId, collection, items.length, addItem, editCollection]);

    // ─── Set as cover ───────────────────────────────────────────────────────

    const setAsCover = (url: string) => {
        editCollection(collectionId, { image: url });
    };

    // ─── Render ─────────────────────────────────────────────────────────────

    const mediaTypeIcon = (type: string) => {
        switch (type) {
            case 'image': return <ImageIcon size={10} />;
            case 'video': return <Film size={10} />;
            case 'audio': return <Music size={10} />;
            default: return null;
        }
    };

    return (
        <>
            <div className="admin-topbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Link href="/admin/collections">
                        <button className="admin-btn-icon"><ArrowLeft size={16} /></button>
                    </Link>
                    <h1 className="admin-topbar-title">{collection?.title || 'Gallery Items'}</h1>
                    <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                        {items.length} items
                    </span>
                </div>
                <div className="admin-topbar-actions">
                    {selectedIds.size > 0 ? (
                        <>
                            <span style={{ fontSize: 12, color: 'var(--admin-text-secondary)' }}>
                                {selectedIds.size} selected
                            </span>
                            <button
                                className="admin-btn admin-btn-ghost admin-btn-sm"
                                onClick={() => setMoveTargetId('_picking')}
                            >
                                <Move size={13} /> Move
                            </button>
                            <button
                                className="admin-btn admin-btn-danger admin-btn-sm"
                                onClick={() => setBulkDeleteConfirm(true)}
                            >
                                <Trash2 size={13} /> Delete
                            </button>
                            <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={cancelSelection}>
                                <X size={13} /> Cancel
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                className="admin-btn admin-btn-ghost admin-btn-sm"
                                onClick={() => { setIsSelecting(true); }}
                            >
                                <CheckSquare size={13} /> Select
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div style={{ padding: '28px' }}>
                {/* Breadcrumbs */}
                <div className="admin-breadcrumbs">
                    <Link href="/admin/collections">Collections</Link>
                    <span className="separator">›</span>
                    <span style={{ color: 'var(--admin-text)' }}>{collection?.title}</span>
                </div>

                {/* Upload Zone */}
                <div style={{ marginBottom: 20 }}>
                    <MediaUploader onFilesSelected={handleFilesSelected} />

                    {/* Upload Progress */}
                    {uploads.length > 0 && (
                        <div className="admin-upload-progress">
                            {uploads.map(up => (
                                <div key={up.id} className="admin-upload-item">
                                    <span className="admin-upload-item-name">{up.fileName}</span>
                                    <div className="admin-progress-bar">
                                        <div
                                            className={`admin-progress-fill ${up.state === 'success' ? 'done' : ''} ${up.state === 'error' ? 'error' : ''}`}
                                            style={{ width: `${up.progress}%` }}
                                        />
                                    </div>
                                    <span className="admin-upload-item-size">
                                        {up.state === 'success' ? '✓' : up.state === 'error' ? '✗' : `${Math.round(up.progress)}%`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Gallery Grid */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 60 }}>
                        <div className="admin-spinner" style={{ margin: '0 auto' }} />
                    </div>
                ) : items.length === 0 ? (
                    <div className="admin-empty">
                        <ImageIcon />
                        <h3>No items yet</h3>
                        <p>Upload images, videos, or audio files using the drop zone above.</p>
                    </div>
                ) : (
                    <div className="admin-gallery-grid">
                        {items.map((item, index) => {
                            const isSelected = selectedIds.has(item.id!);
                            const isAudio = item.type === 'audio';
                            const isVideo = item.type === 'video';

                            return (
                                <div
                                    key={item.id}
                                    className={`admin-gallery-item ${isSelected ? 'selected' : ''} ${dragIndex === index ? 'dragging' : ''}`}
                                    draggable={!isSelecting}
                                    onDragStart={() => handleDragStart(index)}
                                    onDragEnter={() => handleDragEnter(index)}
                                    onDragEnd={handleDragEnd}
                                    onDragOver={e => e.preventDefault()}
                                    onClick={() => {
                                        if (isSelecting || selectedIds.size > 0) {
                                            toggleSelect(item.id!);
                                        }
                                    }}
                                >
                                    {/* Type Badge */}
                                    <div className="admin-gallery-type-badge">
                                        {mediaTypeIcon(item.type)} {item.type}
                                    </div>

                                    {/* Checkbox */}
                                    {(isSelecting || selectedIds.size > 0) && (
                                        <div
                                            className={`admin-gallery-checkbox ${isSelected ? 'checked' : ''}`}
                                            onClick={e => { e.stopPropagation(); toggleSelect(item.id!); }}
                                        >
                                            {isSelected && <span style={{ fontSize: 12, fontWeight: 700 }}>✓</span>}
                                        </div>
                                    )}

                                    {/* Content */}
                                    {isAudio ? (
                                        <div className="admin-gallery-audio-placeholder">
                                            <Music />
                                            <span>{decodeURIComponent(item.url.split('/').pop() || '')}</span>
                                        </div>
                                    ) : isVideo ? (
                                        <video
                                            src={item.thumbnail || item.url}
                                            muted
                                            loop
                                            playsInline
                                            autoPlay
                                        />
                                    ) : (
                                        <img
                                            src={item.thumbnail || item.url}
                                            alt=""
                                            loading="lazy"
                                        />
                                    )}

                                    {/* Hover Overlay */}
                                    <div className="admin-gallery-item-overlay">
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button
                                                className="admin-btn-icon"
                                                title="Set as cover"
                                                onClick={e => { e.stopPropagation(); setAsCover(item.url); }}
                                                style={{ background: 'rgba(0,0,0,0.5)', border: 'none' }}
                                            >
                                                <ImageIcon size={13} />
                                            </button>
                                            <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                                                <button
                                                    className="admin-btn-icon"
                                                    title="Open in new tab"
                                                    style={{ background: 'rgba(0,0,0,0.5)', border: 'none' }}
                                                >
                                                    <ExternalLink size={13} />
                                                </button>
                                            </a>
                                            <button
                                                className="admin-btn-icon"
                                                title="Delete"
                                                onClick={e => { e.stopPropagation(); setDeleteTarget(item.id!); }}
                                                style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: 'var(--admin-error)' }}
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Single Delete Confirm */}
            <ConfirmDialog
                open={!!deleteTarget}
                title="Delete Item"
                message="Are you sure you want to delete this gallery item? This action cannot be undone."
                confirmLabel="Delete"
                destructive
                onConfirm={() => {
                    if (deleteTarget) removeItem(collectionId, deleteTarget);
                    setDeleteTarget(null);
                }}
                onCancel={() => setDeleteTarget(null)}
            />

            {/* Bulk Delete Confirm */}
            <ConfirmDialog
                open={bulkDeleteConfirm}
                title="Delete Selected Items"
                message={`Are you sure you want to delete ${selectedIds.size} items? This action cannot be undone.`}
                confirmLabel={`Delete ${selectedIds.size} Items`}
                destructive
                onConfirm={() => {
                    bulkRemoveItems(collectionId, Array.from(selectedIds));
                    setSelectedIds(new Set());
                    setBulkDeleteConfirm(false);
                    setIsSelecting(false);
                }}
                onCancel={() => setBulkDeleteConfirm(false)}
            />

            {/* Move Target Picker */}
            {moveTargetId === '_picking' && (
                <div className="admin-modal-overlay" onClick={() => setMoveTargetId(null)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <h3 className="admin-modal-title">Move to Collection</h3>
                            <button className="admin-btn-icon" onClick={() => setMoveTargetId(null)}>
                                <X size={16} />
                            </button>
                        </div>
                        <div className="admin-modal-body">
                            <p style={{ fontSize: 13, color: 'var(--admin-text-secondary)', marginBottom: 12 }}>
                                Select the target collection for {selectedIds.size} items:
                            </p>
                            <div className="admin-collections-list">
                                {collections
                                    .filter(c => c.id !== collectionId)
                                    .map(c => (
                                        <button
                                            key={c.id}
                                            className="admin-collection-row"
                                            onClick={() => {
                                                bulkMoveItems(collectionId, c.id!, Array.from(selectedIds));
                                                setSelectedIds(new Set());
                                                setMoveTargetId(null);
                                                setIsSelecting(false);
                                            }}
                                            style={{ cursor: 'pointer', border: 'none', width: '100%' }}
                                        >
                                            <div className="admin-collection-info">
                                                <div className="admin-collection-title">{c.title}</div>
                                                <div className="admin-collection-sub">{c.subtitle}</div>
                                            </div>
                                            <ChevronRight size={14} style={{ color: 'var(--admin-text-muted)' }} />
                                        </button>
                                    ))
                                }
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
