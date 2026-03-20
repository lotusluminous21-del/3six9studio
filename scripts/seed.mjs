/**
 * One-time Firestore seed script — signs in with email/password then seeds data.
 * Usage:  node scripts/seed.mjs <email> <password>
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
    getFirestore, collection, doc, writeBatch, serverTimestamp, setDoc,
} from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const email = process.argv[2];
const password = process.argv[3];
if (!email || !password) { console.error('Usage: node scripts/seed.mjs <email> <password>'); process.exit(1); }

// Load .env.local
const envFile = readFileSync(resolve(projectRoot, '.env.local'), 'utf-8');
const env = {};
envFile.split(/\r?\n/).forEach(line => { const m = line.match(/^([^#=]+)=(.*)$/); if (m) env[m[1].trim()] = m[2].trim(); });

const app = initializeApp({
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
});
const authInst = getAuth(app);
const db = getFirestore(app);

// Gallery data
const galleryData = JSON.parse(readFileSync(resolve(projectRoot, 'src/data/gallery.json'), 'utf-8'));

// Work-Contact data
const serviceCategories = [
    { title: 'Static Image AI', icon: 'image', items: [
        { title: 'Single Concept (1-2 Final Images)', description: 'Ideal for a social media post or a banner.' },
        { title: 'Social Media Package (5-8 Images)', description: "Cohesive style, ideal for a month's campaigns." },
        { title: 'Complex Product Placement (8-12 Images)', description: 'Placement of a real product inside a complex AI environment.' },
        { title: 'Logo Creation', description: 'Unique, scalable, AI-generated logo design tailored to your brand identity.' },
    ]},
    { title: 'AI Video Services', icon: 'film', items: [
        { title: 'Short Video / Reel (10-15 seconds)', description: 'Includes AI generated footage, basic editing, and copyright-free music.' },
        { title: 'Full Commercial (30-45 seconds)', description: 'Includes script/prompt writing, multiple AI shots, AI voiceover, and addition of logo/texts.' },
        { title: 'Full Commercial - Art Project (0:30-1+ min)', description: 'Requires high consistency in characters and complex editing.' },
    ]},
    { title: 'AI Music Creation', icon: 'music', items: [
        { title: 'Short Form Audio (30 seconds)', description: 'Custom music tracks ideal for short videos.' },
        { title: 'Song Remix', description: 'Creative AI-driven remixing and reimagining of existing audio.' },
        { title: 'Full Song Synthesis (Ghost Writing)', description: 'Complete new track generation with unique melodies and structures.' },
        { title: 'Audio Stems', description: 'High-quality individual track elements (vocals, drums, bass, instruments) for your own mixing and production.' },
    ]},
    { title: 'Packages', icon: 'package', items: [
        { title: 'Starter AI', description: '4 AI Photos & 1 AI Reel (15 sec) per month.' },
        { title: 'Pro AI', description: '10 AI Photos & 3 AI Reels (15 sec) per month.' },
        { title: 'Full Campaign', description: 'Commercial (30-60s), 5 variations for stories, 10 static visuals (one-off).' },
    ]},
];

async function seed() {
    console.log(`\n🔐 Signing in as ${email}...`);
    const cred = await signInWithEmailAndPassword(authInst, email, password);
    console.log(`✅ Authenticated (UID: ${cred.user.uid})\n`);

    const batch = writeBatch(db);
    let gCount = 0, sCount = 0;

    // 1. Gallery
    console.log('── Gallery ──');
    for (let i = 0; i < galleryData.length; i++) {
        const e = galleryData[i];
        const cRef = doc(collection(db, 'portfolio_collections'));
        batch.set(cRef, { title: e.title, subtitle: e.subtitle, image: e.image, order: i, visible: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        for (let j = 0; j < e.gallery.length; j++) {
            const it = e.gallery[j];
            batch.set(doc(collection(db, 'portfolio_collections', cRef.id, 'items')), { type: it.type, url: it.url, thumbnail: it.thumbnail, order: j, createdAt: serverTimestamp() });
            gCount++;
        }
        console.log(`  📁 ${e.title} — ${e.gallery.length} items`);
    }

    // 2. Services
    console.log('\n── Services ──');
    for (let i = 0; i < serviceCategories.length; i++) {
        const cat = serviceCategories[i];
        const cRef = doc(collection(db, 'workcontact_services'));
        batch.set(cRef, { title: cat.title, icon: cat.icon, order: i, visible: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        for (let j = 0; j < cat.items.length; j++) {
            batch.set(doc(collection(db, 'workcontact_services', cRef.id, 'items')), { title: cat.items[j].title, description: cat.items[j].description, order: j, createdAt: serverTimestamp() });
            sCount++;
        }
        console.log(`  🏷️  ${cat.title} — ${cat.items.length} services`);
    }

    // 3. Contact config
    console.log('\n── Contact Config ──');
    batch.set(doc(db, 'workcontact_config', 'main'), {
        sectionTitle: 'Our Services',
        footerNote: '* All bundles include 2 complimentary revision rounds to guarantee perfect alignment with your vision.',
        contactTitle: 'Start Your Project',
        contactSubtitle: 'Get in touch with us to discuss your next big idea.',
        contacts: [
            { label: 'PHONE', value: '+30 6979019842', href: 'tel:+306979019842', type: 'phone' },
            { label: 'EMAIL', value: '3six9studio@proton.me', href: 'mailto:3six9studio@proton.me', type: 'email' },
            { label: 'INSTAGRAM', value: '@3six9.studio', href: 'https://www.instagram.com/3six9.studio/', type: 'social' },
        ],
    });
    console.log('  📋 Done');

    console.log('\n⏳ Committing...');
    await batch.commit();
    console.log(`\n✅ Seeded! Gallery: ${galleryData.length} collections (${gCount} items) | Services: ${serviceCategories.length} categories (${sCount} items) | Config: 1 doc`);
}

seed().then(() => process.exit(0)).catch(err => { console.error('❌', err.message); process.exit(1); });
