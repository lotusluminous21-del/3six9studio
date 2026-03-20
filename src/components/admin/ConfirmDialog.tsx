'use client';

import { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmDialog({
    open, title, message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    destructive = false,
    onConfirm, onCancel
}: ConfirmDialogProps) {
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') onCancel();
        if (e.key === 'Enter') onConfirm();
    }, [onCancel, onConfirm]);

    useEffect(() => {
        if (open) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [open, handleKeyDown]);

    if (!open) return null;

    return (
        <div className="admin-modal-overlay" onClick={onCancel}>
            <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                <div className="admin-modal-header">
                    <h3 className="admin-modal-title">{title}</h3>
                    <button className="admin-btn-icon" onClick={onCancel}>
                        <X size={16} />
                    </button>
                </div>
                <div className="admin-modal-body">
                    <p style={{ fontSize: 13, color: 'var(--admin-text-secondary)', lineHeight: 1.6 }}>
                        {message}
                    </p>
                </div>
                <div className="admin-modal-footer">
                    <button className="admin-btn admin-btn-ghost" onClick={onCancel}>
                        {cancelLabel}
                    </button>
                    <button
                        className={`admin-btn ${destructive ? 'admin-btn-danger' : 'admin-btn-primary'}`}
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
