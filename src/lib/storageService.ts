import {
    ref, uploadBytesResumable, getDownloadURL, deleteObject,
    listAll, getMetadata, UploadTask
} from 'firebase/storage';
import { storage } from './firebase';
import imageCompression from 'browser-image-compression';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface UploadProgress {
    progress: number; // 0-100
    bytesTransferred: number;
    totalBytes: number;
    state: 'running' | 'paused' | 'success' | 'error';
}

export type ProgressCallback = (progress: UploadProgress) => void;

// ─── Media type detection ───────────────────────────────────────────────────────

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'];

export function detectMediaType(file: File): 'image' | 'video' | 'audio' | null {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
    if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
    if (AUDIO_EXTENSIONS.includes(ext)) return 'audio';

    // Fallback: MIME type
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return null;
}

export function getAcceptedFileTypes(): string {
    return [
        ...IMAGE_EXTENSIONS.map(e => `.${e}`),
        ...VIDEO_EXTENSIONS.map(e => `.${e}`),
        ...AUDIO_EXTENSIONS.map(e => `.${e}`),
    ].join(',');
}

// ─── Image Optimization ─────────────────────────────────────────────────────────

export interface OptimizationOptions {
    maxWidthOrHeight?: number;
    quality?: number;
    convertToWebP?: boolean;
}

export interface VideoOptimizationOptions {
    maxWidthOrHeight?: number;
    maxFps?: number;
    crf?: number;
    preset?: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium';
    audioBitrate?: string;
    timeoutMs?: number;
    minSavingsBytes?: number;
}

const FFMPEG_CORE_BASE = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
let ffmpegPromise: Promise<any> | null = null;

function getOutputVideoName(file: File): string {
    const baseName = file.name.replace(/\.[^.]+$/, '');
    return `${baseName}.mp4`;
}

function raceWithTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
    if (timeoutMs <= 0) return promise;
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
        promise
            .then((result) => {
                clearTimeout(timer);
                resolve(result);
            })
            .catch((error) => {
                clearTimeout(timer);
                reject(error);
            });
    });
}

async function getBrowserFfmpeg() {
    if (!ffmpegPromise) {
        ffmpegPromise = (async () => {
            const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
                import('@ffmpeg/ffmpeg'),
                import('@ffmpeg/util'),
            ]);
            const ffmpeg = new FFmpeg();
            const coreURL = await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.js`, 'text/javascript');
            const wasmURL = await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm');
            await ffmpeg.load({ coreURL, wasmURL });
            return ffmpeg;
        })();
    }
    return ffmpegPromise;
}

export async function optimizeImage(
    file: File,
    options: OptimizationOptions = {}
): Promise<{ file: File; originalSize: number; optimizedSize: number }> {
    const {
        maxWidthOrHeight = 2048,
        quality = 0.82,
    } = options;

    const originalSize = file.size;

    // Use browser-image-compression for resize + quality reduction
    const compressed = await imageCompression(file, {
        maxWidthOrHeight,
        maxSizeMB: 5,
        useWebWorker: true,
        fileType: 'image/webp',
        initialQuality: quality,
    });

    // Rename to .webp
    const baseName = file.name.replace(/\.[^.]+$/, '');
    const optimizedFile = new File([compressed], `${baseName}.webp`, {
        type: 'image/webp',
    });

    return {
        file: optimizedFile,
        originalSize,
        optimizedSize: optimizedFile.size,
    };
}

export async function optimizeVideo(
    file: File,
    options: VideoOptimizationOptions = {}
): Promise<{ file: File; originalSize: number; optimizedSize: number; wasOptimized: boolean }> {
    if (typeof window === 'undefined') {
        return {
            file,
            originalSize: file.size,
            optimizedSize: file.size,
            wasOptimized: false,
        };
    }

    const {
        maxWidthOrHeight = 1080,
        maxFps = 30,
        crf = 27,
        preset = 'veryfast',
        audioBitrate = '128k',
        timeoutMs = 4 * 60 * 1000,
        minSavingsBytes = 80 * 1024,
    } = options;

    const originalSize = file.size;
    const ffmpeg = await getBrowserFfmpeg();
    const { fetchFile } = await import('@ffmpeg/util');

    const inputName = 'input-video';
    const outputName = 'output-video.mp4';
    const vf = `scale='if(gt(iw,ih),min(${maxWidthOrHeight},iw),-2)':'if(gt(iw,ih),-2,min(${maxWidthOrHeight},ih))',fps=min(source_fps\\,${maxFps})`;

    try {
        await ffmpeg.writeFile(inputName, await fetchFile(file));

        await raceWithTimeout(
            ffmpeg.exec([
                '-i', inputName,
                '-map', '0:v:0',
                '-map', '0:a?',
                '-vf', vf,
                '-c:v', 'libx264',
                '-preset', preset,
                '-crf', String(crf),
                '-pix_fmt', 'yuv420p',
                '-movflags', '+faststart',
                '-c:a', 'aac',
                '-b:a', audioBitrate,
                outputName,
            ]),
            timeoutMs,
            'Video optimization timed out'
        );

        const output = await ffmpeg.readFile(outputName);
        const optimizedData = output instanceof Uint8Array ? output : new Uint8Array();
        const optimizedSize = optimizedData.byteLength;

        if (optimizedSize <= 0 || originalSize - optimizedSize < minSavingsBytes) {
            return {
                file,
                originalSize,
                optimizedSize: originalSize,
                wasOptimized: false,
            };
        }

        const normalizedData = new Uint8Array(optimizedData.byteLength);
        normalizedData.set(optimizedData);
        const optimizedBlob = new Blob([normalizedData], { type: 'video/mp4' });
        const optimizedFile = new File([optimizedBlob], getOutputVideoName(file), {
            type: 'video/mp4',
            lastModified: file.lastModified,
        });

        return {
            file: optimizedFile,
            originalSize,
            optimizedSize: optimizedFile.size,
            wasOptimized: true,
        };
    } finally {
        await ffmpeg.deleteFile(inputName).catch(() => undefined);
        await ffmpeg.deleteFile(outputName).catch(() => undefined);
    }
}

// ─── Upload ─────────────────────────────────────────────────────────────────────

export function uploadMedia(
    file: File,
    storagePath: string,
    onProgress?: ProgressCallback
): { task: UploadTask; promise: Promise<string> } {
    const storageRef = ref(storage, storagePath);
    const task = uploadBytesResumable(storageRef, file, {
        contentType: file.type,
    });

    const promise = new Promise<string>((resolve, reject) => {
        task.on(
            'state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                onProgress?.({
                    progress,
                    bytesTransferred: snapshot.bytesTransferred,
                    totalBytes: snapshot.totalBytes,
                    state: snapshot.state as UploadProgress['state'],
                });
            },
            (error) => {
                onProgress?.({
                    progress: 0,
                    bytesTransferred: 0,
                    totalBytes: 0,
                    state: 'error',
                });
                reject(error);
            },
            async () => {
                const url = await getDownloadURL(task.snapshot.ref);
                onProgress?.({
                    progress: 100,
                    bytesTransferred: task.snapshot.totalBytes,
                    totalBytes: task.snapshot.totalBytes,
                    state: 'success',
                });
                resolve(url);
            }
        );
    });

    return { task, promise };
}

export async function uploadOptimizedImage(
    file: File,
    storagePath: string,
    onProgress?: ProgressCallback,
    optimizationOptions?: OptimizationOptions
): Promise<{ url: string; originalSize: number; optimizedSize: number }> {
    const { file: optimized, originalSize, optimizedSize } = await optimizeImage(file, optimizationOptions);
    const webpPath = storagePath.replace(/\.[^.]+$/, '.webp');
    const { promise } = uploadMedia(optimized, webpPath, onProgress);
    const url = await promise;
    return { url, originalSize, optimizedSize };
}

// ─── Delete ─────────────────────────────────────────────────────────────────────

export async function deleteMedia(url: string): Promise<void> {
    try {
        const storageRef = ref(storage, url);
        await deleteObject(storageRef);
    } catch (error: any) {
        // If file not found, it may have already been deleted — don't throw
        if (error.code !== 'storage/object-not-found') {
            throw error;
        }
    }
}

// ─── Storage stats ──────────────────────────────────────────────────────────────

export interface StorageStats {
    totalFiles: number;
    totalSizeBytes: number;
    byType: { images: number; videos: number; audio: number; other: number };
}

export async function getStorageStats(prefix: string = '3six9'): Promise<StorageStats> {
    const listRef = ref(storage, prefix);
    const stats: StorageStats = {
        totalFiles: 0,
        totalSizeBytes: 0,
        byType: { images: 0, videos: 0, audio: 0, other: 0 },
    };

    try {
        const result = await listAll(listRef);

        // Count files in subdirectories
        for (const folderRef of result.prefixes) {
            const folderItems = await listAll(folderRef);
            stats.totalFiles += folderItems.items.length;

            for (const item of folderItems.items) {
                try {
                    const meta = await getMetadata(item);
                    stats.totalSizeBytes += meta.size;
                    const ct = meta.contentType || '';
                    if (ct.startsWith('image/')) stats.byType.images++;
                    else if (ct.startsWith('video/')) stats.byType.videos++;
                    else if (ct.startsWith('audio/')) stats.byType.audio++;
                    else stats.byType.other++;
                } catch {
                    // skip
                }
            }
        }

        // Count files in root
        stats.totalFiles += result.items.length;
    } catch (error) {
        console.warn('Could not list storage:', error);
    }

    return stats;
}

// ─── Format helpers ─────────────────────────────────────────────────────────────

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
