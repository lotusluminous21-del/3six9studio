import { spawn } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { randomUUID } from 'node:crypto';
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov', '.m4v', '.avi', '.mkv']);

function parseNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function parseArgs(argv) {
    const options = {
        projectId: process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || '',
        bucket: process.env.FIREBASE_STORAGE_BUCKET || '',
        prefix: '3six9/',
        dryRun: false,
        limit: 0,
        resumeFrom: '',
        backupDir: '',
        force: false,
        minSizeMb: 8,
        maxDimension: 1080,
        maxFps: 30,
        crf: 26,
        preset: 'veryfast',
        audioBitrate: '128k',
        retries: 2,
        ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
        serviceAccount: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
        cacheControl: '',
        repairUrls: false,
    };

    for (let i = 2; i < argv.length; i += 1) {
        const arg = argv[i];
        const [flag, inline] = arg.split('=');
        const canTakeNext = inline === undefined && i + 1 < argv.length && !argv[i + 1].startsWith('--');
        const value = inline ?? (canTakeNext ? argv[i + 1] : '');

        switch (flag) {
            case '--project-id': options.projectId = value; if (canTakeNext) i += 1; break;
            case '--bucket': options.bucket = value; if (canTakeNext) i += 1; break;
            case '--prefix': options.prefix = value || options.prefix; if (canTakeNext) i += 1; break;
            case '--dry-run': options.dryRun = true; break;
            case '--limit': options.limit = parseNumber(value || '0', 0); if (canTakeNext) i += 1; break;
            case '--resume-from': options.resumeFrom = value; if (canTakeNext) i += 1; break;
            case '--backup-dir': options.backupDir = value; if (canTakeNext) i += 1; break;
            case '--min-size-mb': options.minSizeMb = parseNumber(value || '8', 8); if (canTakeNext) i += 1; break;
            case '--max-dimension': options.maxDimension = parseNumber(value || '1080', 1080); if (canTakeNext) i += 1; break;
            case '--max-fps': options.maxFps = parseNumber(value || '30', 30); if (canTakeNext) i += 1; break;
            case '--crf': options.crf = parseNumber(value || '26', 26); if (canTakeNext) i += 1; break;
            case '--preset': options.preset = value || options.preset; if (canTakeNext) i += 1; break;
            case '--audio-bitrate': options.audioBitrate = value || options.audioBitrate; if (canTakeNext) i += 1; break;
            case '--retries': options.retries = parseNumber(value || '2', 2); if (canTakeNext) i += 1; break;
            case '--ffmpeg-path': options.ffmpegPath = value || options.ffmpegPath; if (canTakeNext) i += 1; break;
            case '--service-account': options.serviceAccount = value || options.serviceAccount; if (canTakeNext) i += 1; break;
            case '--cache-control': options.cacheControl = value || ''; if (canTakeNext) i += 1; break;
            case '--force': options.force = true; break;
            case '--repair-urls': options.repairUrls = true; break;
            case '--help':
                printHelp();
                process.exit(0);
            default:
                break;
        }
    }

    return options;
}

function printHelp() {
    console.log(`Usage: node scratch/check_firestore.mjs [options]

Required:
  --bucket <name>            Firebase Storage bucket

Common options:
  --project-id <id>          Firebase project ID
  --prefix <path>            Prefix to scan (default: 3six9/)
  --dry-run                  Preview only, no writes
  --limit <n>                Max files to process
  --resume-from <path>       Skip object names up to this key
  --backup-dir <dir>         Save original local backups
  --force                    Re-process already optimized objects

Encoding options:
  --min-size-mb <n>          Skip files under this size (default: 8)
  --max-dimension <n>        Max output width/height (default: 1080)
  --max-fps <n>              FPS cap (default: 30)
  --crf <n>                  x264 CRF (default: 26)
  --preset <name>            x264 preset (default: veryfast)
  --audio-bitrate <value>    AAC bitrate (default: 128k)
  --retries <n>              Retries per file (default: 2)
  --ffmpeg-path <path>       ffmpeg executable (default: ffmpeg)
  --service-account <path>   Service account JSON path
  --cache-control <value>    Metadata cache-control override
  --repair-urls              Repair Firestore video URLs (403 fix)
`);
}

function shouldSkipByPath(name) {
    const lower = name.toLowerCase();
    return lower.includes('/thumbnails/') || lower.startsWith('thumbnails/') || lower.endsWith('.thumb.mp4');
}

function isVideoObject(name, contentType) {
    if ((contentType || '').toLowerCase().startsWith('video/')) return true;
    return VIDEO_EXTENSIONS.has(path.extname(name).toLowerCase());
}

function formatMb(bytes) {
    return (bytes / (1024 * 1024)).toFixed(2);
}

function runFfmpeg(options, inputPath, outputPath) {
    const scale = `scale='if(gt(iw,ih),min(${options.maxDimension},iw),-2)':'if(gt(iw,ih),-2,min(${options.maxDimension},ih))'`;
    const vf = `${scale},fps=min(source_fps\\,${options.maxFps})`;
    const args = [
        '-y',
        '-hide_banner',
        '-i', inputPath,
        '-map', '0:v:0',
        '-map', '0:a?',
        '-vf', vf,
        '-c:v', 'libx264',
        '-preset', options.preset,
        '-crf', String(options.crf),
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        '-c:a', 'aac',
        '-b:a', options.audioBitrate,
        outputPath,
    ];

    return new Promise((resolve, reject) => {
        const child = spawn(options.ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        let stderr = '';
        child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
        child.stdout.on('data', () => {});
        child.on('error', reject);
        child.on('close', (code) => {
            if (code === 0) resolve(undefined);
            else reject(new Error(`ffmpeg failed (${code}): ${stderr.slice(-4000)}`));
        });
    });
}

async function initFirebase(options) {
    const init = {
        projectId: options.projectId || undefined,
        storageBucket: options.bucket || undefined,
    };
    if (options.serviceAccount) {
        const json = JSON.parse(await readFile(options.serviceAccount, 'utf8'));
        initializeApp({ ...init, credential: cert(json) });
        return;
    }
    initializeApp({ ...init, credential: applicationDefault() });
}

async function* listFiles(bucket, prefix) {
    let pageToken = undefined;
    do {
        const [files, , nextQuery] = await bucket.getFiles({
            prefix,
            pageToken,
            autoPaginate: false,
            maxResults: 1000,
        });
        for (const file of files) yield file;
        pageToken = nextQuery?.pageToken;
    } while (pageToken);
}

function extractObjectPathFromUrl(urlValue, bucketName) {
    if (!urlValue) return null;
    try {
        const parsed = new URL(urlValue);
        if (parsed.hostname === 'firebasestorage.googleapis.com') {
            const marker = `/v0/b/${bucketName}/o/`;
            const idx = parsed.pathname.indexOf(marker);
            if (idx >= 0) {
                return decodeURIComponent(parsed.pathname.slice(idx + marker.length));
            }
        }
        if (parsed.hostname === 'storage.googleapis.com') {
            const rawPath = parsed.pathname.startsWith('/') ? parsed.pathname.slice(1) : parsed.pathname;
            if (rawPath.startsWith(`${bucketName}/`)) {
                return decodeURIComponent(rawPath.slice(bucketName.length + 1));
            }
        }
    } catch {
        return null;
    }
    return null;
}

function getPrimaryToken(metadata) {
    const raw = metadata?.metadata?.firebaseStorageDownloadTokens || '';
    return raw.split(',').map((token) => token.trim()).filter(Boolean)[0] || '';
}

function makeFirebaseMediaUrl(bucketName, objectPath, token) {
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;
}

async function repairFirestoreVideoUrls(options) {
    const db = getFirestore();
    const bucket = getStorage().bucket(options.bucket);
    const collectionsSnap = await db.collection('portfolio_collections').get();

    const updates = [];
    const coverReplacements = new Map();
    let scannedVideos = 0;
    let missingPath = 0;
    let missingObjects = 0;
    let itemUpdates = 0;
    let collectionUpdates = 0;
    let tokensCreated = 0;

    for (const collectionDoc of collectionsSnap.docs) {
        const collectionId = collectionDoc.id;
        const itemsSnap = await db.collection('portfolio_collections').doc(collectionId).collection('items').get();
        for (const itemDoc of itemsSnap.docs) {
            const item = itemDoc.data();
            if (item.type !== 'video') continue;
            scannedVideos += 1;

            const oldUrl = item.url || '';
            const oldThumb = item.thumbnail || '';
            const objectPath = extractObjectPathFromUrl(oldUrl, options.bucket);
            if (!objectPath) {
                missingPath += 1;
                continue;
            }

            const file = bucket.file(objectPath);
            const [exists] = await file.exists();
            if (!exists) {
                missingObjects += 1;
                continue;
            }

            const [metadata] = await file.getMetadata();
            let token = getPrimaryToken(metadata);
            if (!token) {
                token = randomUUID();
                tokensCreated += 1;
                if (!options.dryRun) {
                    await file.setMetadata({
                        metadata: {
                            ...(metadata.metadata || {}),
                            firebaseStorageDownloadTokens: token,
                        },
                    });
                }
            }

            const canonicalUrl = makeFirebaseMediaUrl(options.bucket, objectPath, token);
            const patch = {};
            let shouldUpdate = false;

            if (oldUrl !== canonicalUrl) {
                patch.url = canonicalUrl;
                shouldUpdate = true;
            }

            if (!oldThumb || oldThumb === oldUrl || oldThumb.includes('storage.googleapis.com')) {
                if (oldThumb !== canonicalUrl) {
                    patch.thumbnail = canonicalUrl;
                    shouldUpdate = true;
                }
            }

            if (shouldUpdate) {
                itemUpdates += 1;
                updates.push({
                    ref: db.collection('portfolio_collections').doc(collectionId).collection('items').doc(itemDoc.id),
                    patch,
                });
                coverReplacements.set(oldUrl, canonicalUrl);
                if (oldThumb) coverReplacements.set(oldThumb, canonicalUrl);
            }
        }
    }

    for (const collectionDoc of collectionsSnap.docs) {
        const currentImage = collectionDoc.data().image || '';
        const replacement = coverReplacements.get(currentImage);
        if (replacement && replacement !== currentImage) {
            collectionUpdates += 1;
            updates.push({
                ref: db.collection('portfolio_collections').doc(collectionDoc.id),
                patch: { image: replacement },
            });
        }
    }

    console.log(`Scanned videos:             ${scannedVideos}`);
    console.log(`Planned item URL updates:   ${itemUpdates}`);
    console.log(`Planned collection updates: ${collectionUpdates}`);
    console.log(`Missing object path:        ${missingPath}`);
    console.log(`Missing storage objects:    ${missingObjects}`);
    console.log(`Tokens created:             ${tokensCreated}`);
    console.log(`Mode:                       ${options.dryRun ? 'DRY RUN' : 'LIVE'}`);

    if (options.dryRun) return;

    let committed = 0;
    while (updates.length > 0) {
        const chunk = updates.splice(0, 400);
        const batch = db.batch();
        for (const entry of chunk) {
            batch.update(entry.ref, entry.patch);
        }
        await batch.commit();
        committed += chunk.length;
    }

    console.log(`Committed updates:          ${committed}`);
}

async function main() {
    const options = parseArgs(process.argv);
    if (!options.bucket) {
        throw new Error('Missing --bucket argument');
    }

    await initFirebase(options);
    if (options.repairUrls) {
        await repairFirestoreVideoUrls(options);
        return;
    }
    const bucket = getStorage().bucket(options.bucket);
    const minBytes = Math.floor(options.minSizeMb * 1024 * 1024);

    const stats = {
        scanned: 0,
        candidates: 0,
        optimized: 0,
        failed: 0,
        skippedByPath: 0,
        skippedNonVideo: 0,
        skippedSmall: 0,
        skippedResume: 0,
        skippedAlreadyOptimized: 0,
        skippedNotSmaller: 0,
        bytesBefore: 0,
        bytesAfter: 0,
    };

    console.log(`Scanning bucket ${options.bucket} with prefix ${options.prefix}`);
    console.log(`Mode: ${options.dryRun ? 'DRY RUN' : 'LIVE'}\n`);

    for await (const file of listFiles(bucket, options.prefix)) {
        if (options.limit > 0 && stats.candidates >= options.limit) break;
        stats.scanned += 1;

        if (options.resumeFrom && file.name <= options.resumeFrom) {
            stats.skippedResume += 1;
            continue;
        }
        if (shouldSkipByPath(file.name)) {
            stats.skippedByPath += 1;
            continue;
        }

        const [metadata] = await file.getMetadata();
        if (!isVideoObject(file.name, metadata.contentType)) {
            stats.skippedNonVideo += 1;
            continue;
        }

        const originalBytes = Number(metadata.size || 0);
        if (!Number.isFinite(originalBytes) || originalBytes < minBytes) {
            stats.skippedSmall += 1;
            continue;
        }
        if (!options.force && metadata.metadata?.videoOptimized === 'true') {
            stats.skippedAlreadyOptimized += 1;
            continue;
        }

        stats.candidates += 1;
        console.log(`[${stats.candidates}] ${file.name} (${formatMb(originalBytes)} MB)`);

        if (options.dryRun) continue;

        const tmpRoot = await mkdtemp(path.join(tmpdir(), 'firebase-video-opt-'));
        const inputPath = path.join(tmpRoot, 'input-video');
        const outputPath = path.join(tmpRoot, 'output-video.mp4');
        let success = false;
        let lastError = null;

        for (let attempt = 1; attempt <= options.retries + 1 && !success; attempt += 1) {
            try {
                await file.download({ destination: inputPath });

                if (options.backupDir) {
                    const backupPath = path.join(options.backupDir, file.name);
                    await mkdir(path.dirname(backupPath), { recursive: true });
                    await copyFile(inputPath, backupPath);
                }

                await runFfmpeg(options, inputPath, outputPath);
                const optimizedBuffer = await readFile(outputPath);
                const optimizedBytes = optimizedBuffer.byteLength;

                if (optimizedBytes <= 0 || optimizedBytes >= originalBytes) {
                    stats.skippedNotSmaller += 1;
                    console.log(`  -> skipped (optimized ${formatMb(optimizedBytes)} MB is not smaller)`);
                    success = true;
                    continue;
                }

                await file.save(optimizedBuffer, {
                    resumable: false,
                    validation: false,
                    metadata: {
                        contentType: 'video/mp4',
                        cacheControl: options.cacheControl || metadata.cacheControl || undefined,
                        contentDisposition: metadata.contentDisposition || undefined,
                        contentEncoding: metadata.contentEncoding || undefined,
                        contentLanguage: metadata.contentLanguage || undefined,
                        metadata: {
                            ...(metadata.metadata || {}),
                            videoOptimized: 'true',
                            videoOptimizedAt: new Date().toISOString(),
                            videoOriginalBytes: String(originalBytes),
                            videoOptimizedBytes: String(optimizedBytes),
                        },
                    },
                });

                stats.optimized += 1;
                stats.bytesBefore += originalBytes;
                stats.bytesAfter += optimizedBytes;
                console.log(`  -> uploaded (${formatMb(optimizedBytes)} MB, saved ${formatMb(originalBytes - optimizedBytes)} MB)`);
                success = true;
            } catch (error) {
                lastError = error;
                if (attempt <= options.retries) {
                    console.warn(`  -> attempt ${attempt} failed, retrying`);
                }
            } finally {
                await rm(inputPath, { force: true }).catch(() => undefined);
                await rm(outputPath, { force: true }).catch(() => undefined);
            }
        }

        if (!success) {
            stats.failed += 1;
            console.error(`  -> failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
        }
        await rm(tmpRoot, { recursive: true, force: true }).catch(() => undefined);
    }

    const totalSaved = Math.max(0, stats.bytesBefore - stats.bytesAfter);
    const percent = stats.bytesBefore > 0 ? ((totalSaved / stats.bytesBefore) * 100).toFixed(2) : '0.00';

    console.log('\n=== Summary ===');
    console.log(`Scanned:                    ${stats.scanned}`);
    console.log(`Candidates:                 ${stats.candidates}`);
    console.log(`Optimized uploads:          ${stats.optimized}`);
    console.log(`Failed:                     ${stats.failed}`);
    console.log(`Skipped path rules:         ${stats.skippedByPath}`);
    console.log(`Skipped non-video:          ${stats.skippedNonVideo}`);
    console.log(`Skipped small:              ${stats.skippedSmall}`);
    console.log(`Skipped already optimized:  ${stats.skippedAlreadyOptimized}`);
    console.log(`Skipped not smaller:        ${stats.skippedNotSmaller}`);
    console.log(`Skipped by resume:          ${stats.skippedResume}`);
    if (!options.dryRun) {
        console.log(`Bytes before:               ${stats.bytesBefore}`);
        console.log(`Bytes after:                ${stats.bytesAfter}`);
        console.log(`Saved bytes:                ${totalSaved} (${percent}%)`);
    }
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
