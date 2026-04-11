import {
    collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
    writeBatch, query, orderBy, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface GalleryItem {
    id?: string;
    type: 'image' | 'video' | 'audio';
    url: string;
    thumbnail: string;
    order: number;
    createdAt?: Timestamp;
}

export interface PortfolioCollection {
    id?: string;
    title: string;
    subtitle: string;
    image: string; // cover image/video URL
    order: number;
    visible: boolean;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

// Firestore shape for the public-facing gallery JSON (matches existing gallery.json)
export interface PublicCollection {
    id: number;
    title: string;
    subtitle: string;
    image: string;
    gallery: { type: string; url: string; thumbnail: string }[];
}

// ─── Collections CRUD ───────────────────────────────────────────────────────────

const COLLECTIONS_REF = 'portfolio_collections';

export async function getCollections(): Promise<PortfolioCollection[]> {
    const q = query(collection(db, COLLECTIONS_REF), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as PortfolioCollection));
}

export async function getCollection(id: string): Promise<PortfolioCollection | null> {
    const snap = await getDoc(doc(db, COLLECTIONS_REF, id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as PortfolioCollection;
}

export async function createCollection(data: Omit<PortfolioCollection, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const ref = await addDoc(collection(db, COLLECTIONS_REF), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return ref.id;
}

export async function updateCollection(id: string, data: Partial<PortfolioCollection>): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS_REF, id), {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

export async function deleteCollection(id: string): Promise<void> {
    // Delete all gallery items in the subcollection first
    const itemsSnap = await getDocs(collection(db, COLLECTIONS_REF, id, 'items'));
    const batch = writeBatch(db);
    itemsSnap.docs.forEach(d => batch.delete(d.ref));
    batch.delete(doc(db, COLLECTIONS_REF, id));
    await batch.commit();
}

export async function reorderCollections(orderedIds: string[]): Promise<void> {
    const batch = writeBatch(db);
    orderedIds.forEach((id, index) => {
        batch.update(doc(db, COLLECTIONS_REF, id), { order: index });
    });
    await batch.commit();
}

// ─── Gallery Items CRUD ─────────────────────────────────────────────────────────

function itemsRef(collectionId: string) {
    return collection(db, COLLECTIONS_REF, collectionId, 'items');
}

export async function getGalleryItems(collectionId: string): Promise<GalleryItem[]> {
    const q = query(itemsRef(collectionId), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as GalleryItem));
}

export async function addGalleryItem(collectionId: string, item: Omit<GalleryItem, 'id' | 'createdAt'>): Promise<string> {
    const ref = await addDoc(itemsRef(collectionId), {
        ...item,
        createdAt: serverTimestamp(),
    });
    return ref.id;
}

export async function updateGalleryItem(collectionId: string, itemId: string, data: Partial<GalleryItem>): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS_REF, collectionId, 'items', itemId), data);
}

export async function deleteGalleryItem(collectionId: string, itemId: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS_REF, collectionId, 'items', itemId));
}

export async function reorderGalleryItems(collectionId: string, orderedIds: string[]): Promise<void> {
    const batch = writeBatch(db);
    orderedIds.forEach((id, index) => {
        batch.update(doc(db, COLLECTIONS_REF, collectionId, 'items', id), { order: index });
    });
    await batch.commit();
}

export async function bulkDeleteGalleryItems(collectionId: string, itemIds: string[]): Promise<void> {
    const batch = writeBatch(db);
    itemIds.forEach(id => {
        batch.delete(doc(db, COLLECTIONS_REF, collectionId, 'items', id));
    });
    await batch.commit();
}

export async function bulkMoveGalleryItems(
    sourceCollectionId: string,
    targetCollectionId: string,
    itemIds: string[]
): Promise<void> {
    // Fetch items, add to target, delete from source
    const batch = writeBatch(db);
    const targetItems = await getGalleryItems(targetCollectionId);
    let nextOrder = targetItems.length;

    for (const itemId of itemIds) {
        const snap = await getDoc(doc(db, COLLECTIONS_REF, sourceCollectionId, 'items', itemId));
        if (snap.exists()) {
            const data = snap.data();
            const newRef = doc(itemsRef(targetCollectionId));
            batch.set(newRef, { ...data, order: nextOrder++ });
            batch.delete(snap.ref);
        }
    }
    await batch.commit();
}

// ─── Publish: compile Firestore data into the public gallery shape ──────────────

export async function compileGalleryData(): Promise<PublicCollection[]> {
    const collections = await getCollections();
    // Filter out hidden collections AND collections with no valid cover image
    // (an admin may create a collection but not yet upload a cover — don't crash the frontend)
    const visibleCollections = collections.filter(c =>
        c.visible !== false &&
        c.image && typeof c.image === 'string' && c.image.trim().length > 0
    );

    const result: PublicCollection[] = [];
    for (let i = 0; i < visibleCollections.length; i++) {
        const col = visibleCollections[i];
        const items = await getGalleryItems(col.id!);
        result.push({
            id: i,
            title: col.title,
            subtitle: col.subtitle,
            image: col.image,
            gallery: items.map(item => ({
                type: item.type,
                url: item.url,
                thumbnail: item.thumbnail,
            })),
        });
    }
    return result;
}

// ─── Seed: import existing gallery.json into Firestore ──────────────────────────

export async function seedFromGalleryJson(jsonData: PublicCollection[]): Promise<number> {
    let totalItems = 0;
    const batch = writeBatch(db);

    for (let i = 0; i < jsonData.length; i++) {
        const entry = jsonData[i];
        const colRef = doc(collection(db, COLLECTIONS_REF));
        batch.set(colRef, {
            title: entry.title,
            subtitle: entry.subtitle,
            image: entry.image,
            order: i,
            visible: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        for (let j = 0; j < entry.gallery.length; j++) {
            const item = entry.gallery[j];
            const itemRef = doc(collection(db, COLLECTIONS_REF, colRef.id, 'items'));
            batch.set(itemRef, {
                type: item.type,
                url: item.url,
                thumbnail: item.thumbnail,
                order: j,
                createdAt: serverTimestamp(),
            });
            totalItems++;
        }
    }

    await batch.commit();
    return totalItems;
}

// ─── Work-Contact Types ─────────────────────────────────────────────────────────

export interface ServiceCategory {
    id?: string;
    title: string;
    icon: string;           // lucide icon name: "image", "film", "music", "package"
    order: number;
    visible: boolean;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

export interface ServiceItem {
    id?: string;
    title: string;
    description: string;
    pricing?: string;       // optional — e.g., "€150", "From €500"
    order: number;
    createdAt?: Timestamp;
}

export interface ContactEntry {
    label: string;          // "PHONE"
    value: string;          // "+30 6979019842"
    href: string;           // "tel:+306979019842"
    type: 'phone' | 'email' | 'social' | 'link';
}

export interface WorkContactConfig {
    sectionTitle: string;
    footerNote: string;
    contactTitle: string;
    contactSubtitle: string;
    contacts: ContactEntry[];
}

// ─── Service Categories CRUD ────────────────────────────────────────────────────

const SERVICES_REF = 'workcontact_services';

export async function getServiceCategories(): Promise<ServiceCategory[]> {
    const q = query(collection(db, SERVICES_REF), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceCategory));
}

export async function getServiceCategory(id: string): Promise<ServiceCategory | null> {
    const snap = await getDoc(doc(db, SERVICES_REF, id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as ServiceCategory;
}

export async function createServiceCategory(data: Omit<ServiceCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const ref = await addDoc(collection(db, SERVICES_REF), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return ref.id;
}

export async function updateServiceCategory(id: string, data: Partial<ServiceCategory>): Promise<void> {
    await updateDoc(doc(db, SERVICES_REF, id), {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

export async function deleteServiceCategory(id: string): Promise<void> {
    // Delete all service items in the subcollection first
    const itemsSnap = await getDocs(collection(db, SERVICES_REF, id, 'items'));
    const batch = writeBatch(db);
    itemsSnap.docs.forEach(d => batch.delete(d.ref));
    batch.delete(doc(db, SERVICES_REF, id));
    await batch.commit();
}

export async function reorderServiceCategories(orderedIds: string[]): Promise<void> {
    const batch = writeBatch(db);
    orderedIds.forEach((id, index) => {
        batch.update(doc(db, SERVICES_REF, id), { order: index });
    });
    await batch.commit();
}

// ─── Service Items CRUD ─────────────────────────────────────────────────────────

function serviceItemsRef(categoryId: string) {
    return collection(db, SERVICES_REF, categoryId, 'items');
}

export async function getServiceItems(categoryId: string): Promise<ServiceItem[]> {
    const q = query(serviceItemsRef(categoryId), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceItem));
}

export async function addServiceItem(categoryId: string, item: Omit<ServiceItem, 'id' | 'createdAt'>): Promise<string> {
    const ref = await addDoc(serviceItemsRef(categoryId), {
        ...item,
        createdAt: serverTimestamp(),
    });
    return ref.id;
}

export async function updateServiceItem(categoryId: string, itemId: string, data: Partial<ServiceItem>): Promise<void> {
    await updateDoc(doc(db, SERVICES_REF, categoryId, 'items', itemId), data);
}

export async function deleteServiceItem(categoryId: string, itemId: string): Promise<void> {
    await deleteDoc(doc(db, SERVICES_REF, categoryId, 'items', itemId));
}

export async function reorderServiceItems(categoryId: string, orderedIds: string[]): Promise<void> {
    const batch = writeBatch(db);
    orderedIds.forEach((id, index) => {
        batch.update(doc(db, SERVICES_REF, categoryId, 'items', id), { order: index });
    });
    await batch.commit();
}

// ─── Work-Contact Config (singleton) ────────────────────────────────────────────

const WC_CONFIG_REF = 'workcontact_config';
const WC_CONFIG_DOC = 'main';

export async function getWorkContactConfig(): Promise<WorkContactConfig | null> {
    const snap = await getDoc(doc(db, WC_CONFIG_REF, WC_CONFIG_DOC));
    if (!snap.exists()) return null;
    return snap.data() as WorkContactConfig;
}

export async function updateWorkContactConfig(data: Partial<WorkContactConfig>): Promise<void> {
    const ref = doc(db, WC_CONFIG_REF, WC_CONFIG_DOC);
    const snap = await getDoc(ref);
    if (snap.exists()) {
        await updateDoc(ref, data);
    } else {
        // Create the document if it doesn't exist (first-time setup)
        const { setDoc } = await import('firebase/firestore');
        await setDoc(ref, {
            sectionTitle: 'Our Services',
            footerNote: '* All bundles include 2 complimentary revision rounds to guarantee perfect alignment with your vision.',
            contactTitle: 'Start Your Project',
            contactSubtitle: 'Get in touch with us to discuss your next big idea.',
            contacts: [],
            ...data,
        });
    }
}

// ─── Seed Work-Contact Defaults ─────────────────────────────────────────────────

export async function seedWorkContactDefaults(): Promise<number> {
    const { setDoc } = await import('firebase/firestore');
    const batch = writeBatch(db);

    // ── Service Categories & Items ────────────────────────────────────────────

    const categoriesData = [
        {
            title: 'Static Image AI',
            icon: 'image',
            items: [
                { title: 'Single Concept (1-2 Final Images)', description: 'Ideal for a social media post or a banner.' },
                { title: 'Social Media Package (5-8 Images)', description: 'Cohesive style, ideal for a month\'s campaigns.' },
                { title: 'Complex Product Placement (8-12 Images)', description: 'Placement of a real product inside a complex AI environment.' },
                { title: 'Logo Creation', description: 'Unique, scalable, AI-generated logo design tailored to your brand identity.' },
            ],
        },
        {
            title: 'AI Video Services',
            icon: 'film',
            items: [
                { title: 'Short Video / Reel (10-15 seconds)', description: 'Includes AI generated footage, basic editing, and copyright-free music.' },
                { title: 'Full Commercial (30-45 seconds)', description: 'Includes script/prompt writing, multiple AI shots, AI voiceover, and addition of logo/texts.' },
                { title: 'Full Commercial - Art Project (0:30-1+ min)', description: 'Requires high consistency in characters and complex editing.' },
            ],
        },
        {
            title: 'AI Music Creation',
            icon: 'music',
            items: [
                { title: 'Short Form Audio (30 seconds)', description: 'Custom music tracks ideal for short videos.' },
                { title: 'Song Remix', description: 'Creative AI-driven remixing and reimagining of existing audio.' },
                { title: 'Full Song Synthesis (Ghost Writing)', description: 'Complete new track generation with unique melodies and structures.' },
                { title: 'Audio Stems', description: 'High-quality individual track elements (vocals, drums, bass, instruments) for your own mixing and production.' },
            ],
        },
        {
            title: 'Packages',
            icon: 'package',
            items: [
                { title: 'Starter AI', description: '4 AI Photos & 1 AI Reel (15 sec) per month.' },
                { title: 'Pro AI', description: '10 AI Photos & 3 AI Reels (15 sec) per month.' },
                { title: 'Full Campaign', description: 'Commercial (30-60s), 5 variations for stories, 10 static visuals (one-off).' },
            ],
        },
    ];

    let totalItems = 0;

    for (let i = 0; i < categoriesData.length; i++) {
        const cat = categoriesData[i];
        const catRef = doc(collection(db, SERVICES_REF));
        batch.set(catRef, {
            title: cat.title,
            icon: cat.icon,
            order: i,
            visible: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        for (let j = 0; j < cat.items.length; j++) {
            const item = cat.items[j];
            const itemRef = doc(collection(db, SERVICES_REF, catRef.id, 'items'));
            batch.set(itemRef, {
                title: item.title,
                description: item.description,
                order: j,
                createdAt: serverTimestamp(),
            });
            totalItems++;
        }
    }

    // ── Contact Config ────────────────────────────────────────────────────────

    const configRef = doc(db, WC_CONFIG_REF, WC_CONFIG_DOC);
    batch.set(configRef, {
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

    await batch.commit();
    return totalItems;
}
