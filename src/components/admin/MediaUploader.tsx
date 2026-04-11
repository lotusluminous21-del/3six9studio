'use client';

import { useRef, useState, useCallback } from 'react';
import { Upload, AlertCircle } from 'lucide-react';
import { detectMediaType, getAcceptedFileTypes, formatFileSize } from '@/lib/storageService';

interface MediaUploaderProps {
    onFilesSelected: (files: File[]) => void;
    maxFiles?: number;
    disabled?: boolean;
}

export default function MediaUploader({ onFilesSelected, maxFiles = 50, disabled }: MediaUploaderProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    const validateAndEmit = useCallback((fileList: FileList | File[]) => {
        const files = Array.from(fileList);
        const validFiles: File[] = [];
        const errs: string[] = [];

        for (const file of files) {
            const mediaType = detectMediaType(file);
            if (!mediaType) {
                errs.push(`"${file.name}" — unsupported file type`);
                continue;
            }
            if (file.size > 500 * 1024 * 1024) {
                // Soft warning — don't block the upload
                errs.push(`"${file.name}" — large file (${formatFileSize(file.size)}), upload may take a while`);
            }
            validFiles.push(file);
        }

        if (validFiles.length > maxFiles) {
            errs.push(`Maximum ${maxFiles} files per upload. ${validFiles.length - maxFiles} files skipped.`);
            validFiles.length = maxFiles;
        }

        setErrors(errs);
        if (validFiles.length > 0) {
            onFilesSelected(validFiles);
        }
    }, [onFilesSelected, maxFiles]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (disabled) return;
        validateAndEmit(e.dataTransfer.files);
    }, [disabled, validateAndEmit]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (!disabled) setIsDragOver(true);
    }, [disabled]);

    return (
        <div>
            <div
                className={`admin-upload-zone ${isDragOver ? 'dragover' : ''}`}
                onClick={() => !disabled && fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={() => setIsDragOver(false)}
                style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
            >
                <div className="admin-upload-zone-icon">
                    <Upload size={28} />
                </div>
                <p className="admin-upload-zone-text">
                    Drop files here or <strong>click to browse</strong>
                </p>
                <p className="admin-upload-zone-hint">
                    Images (JPG, PNG, WebP) • Videos (MP4, WebM) • Audio (MP3, WAV, OGG)
                </p>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={getAcceptedFileTypes()}
                style={{ display: 'none' }}
                onChange={e => {
                    if (e.target.files) validateAndEmit(e.target.files);
                    e.target.value = '';
                }}
            />

            {errors.length > 0 && (
                <div style={{ marginTop: 10 }}>
                    {errors.map((err, i) => {
                        const isWarning = err.includes('upload may take a while');
                        return (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                fontSize: 12, color: isWarning ? '#e6a817' : 'var(--admin-error)', marginBottom: 4
                            }}>
                                <AlertCircle size={13} />
                                {err}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
