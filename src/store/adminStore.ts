'use client';

import { create } from 'zustand';
import {
    getCollections, createCollection, updateCollection, deleteCollection,
    reorderCollections, getGalleryItems, addGalleryItem, updateGalleryItem,
    deleteGalleryItem, reorderGalleryItems, bulkDeleteGalleryItems,
    bulkMoveGalleryItems, compileGalleryData, seedFromGalleryJson,
    type PortfolioCollection, type GalleryItem, type PublicCollection,
    // Work-Contact
    getServiceCategories, createServiceCategory, updateServiceCategory,
    deleteServiceCategory, reorderServiceCategories,
    getServiceItems, addServiceItem as addServiceItemFn,
    updateServiceItem as updateServiceItemFn, deleteServiceItem as deleteServiceItemFn,
    reorderServiceItems,
    getWorkContactConfig, updateWorkContactConfig as updateWCConfigFn,
    seedWorkContactDefaults,
    type ServiceCategory, type ServiceItem, type WorkContactConfig
} from '@/lib/firestore';

// ─── Toast ──────────────────────────────────────────────────────────────────────

export interface Toast {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    duration?: number;
}

// ─── State ──────────────────────────────────────────────────────────────────────

interface AdminState {
    // Collections
    collections: PortfolioCollection[];
    collectionsLoading: boolean;
    collectionsError: string | null;

    // Selected collection items
    selectedCollectionId: string | null;
    galleryItems: GalleryItem[];
    galleryItemsLoading: boolean;
    galleryItemsError: string | null;

    // Operations
    operationInProgress: string | null; // description of current op

    // Toasts
    toasts: Toast[];

    // Actions — Collections
    fetchCollections: () => Promise<void>;
    addCollection: (data: Omit<PortfolioCollection, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string | null>;
    editCollection: (id: string, data: Partial<PortfolioCollection>) => Promise<void>;
    removeCollection: (id: string) => Promise<void>;
    reorderCols: (orderedIds: string[]) => Promise<void>;

    // Actions — Gallery Items
    fetchGalleryItems: (collectionId: string) => Promise<void>;
    addItem: (collectionId: string, item: Omit<GalleryItem, 'id' | 'createdAt'>) => Promise<string | null>;
    editItem: (collectionId: string, itemId: string, data: Partial<GalleryItem>) => Promise<void>;
    removeItem: (collectionId: string, itemId: string) => Promise<void>;
    reorderItems: (collectionId: string, orderedIds: string[]) => Promise<void>;
    bulkRemoveItems: (collectionId: string, itemIds: string[]) => Promise<void>;
    bulkMoveItems: (sourceId: string, targetId: string, itemIds: string[]) => Promise<void>;

    // Actions — Publish & Seed
    publishGallery: () => Promise<PublicCollection[] | null>;
    seedData: (data: PublicCollection[]) => Promise<number>;

    // ─── Work-Contact ─────────────────────────────────────────────────────

    // Service Categories
    serviceCategories: ServiceCategory[];
    serviceCategoriesLoading: boolean;
    serviceCategoriesError: string | null;

    // Selected category items
    selectedCategoryId: string | null;
    serviceItems: ServiceItem[];
    serviceItemsLoading: boolean;

    // Work-Contact Config
    wcConfig: WorkContactConfig | null;
    wcConfigLoading: boolean;

    // Actions — Service Categories
    fetchServiceCategories: () => Promise<void>;
    addServiceCat: (data: Omit<ServiceCategory, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string | null>;
    editServiceCat: (id: string, data: Partial<ServiceCategory>) => Promise<void>;
    removeServiceCat: (id: string) => Promise<void>;
    reorderServiceCats: (orderedIds: string[]) => Promise<void>;

    // Actions — Service Items
    fetchServiceItemsForCat: (categoryId: string) => Promise<void>;
    addSvcItem: (categoryId: string, item: Omit<ServiceItem, 'id' | 'createdAt'>) => Promise<string | null>;
    editSvcItem: (categoryId: string, itemId: string, data: Partial<ServiceItem>) => Promise<void>;
    removeSvcItem: (categoryId: string, itemId: string) => Promise<void>;
    reorderSvcItems: (categoryId: string, orderedIds: string[]) => Promise<void>;

    // Actions — Work-Contact Config
    fetchWCConfig: () => Promise<void>;
    updateWCConfig: (data: Partial<WorkContactConfig>) => Promise<void>;
    seedWCData: () => Promise<number>;

    // Actions — Toasts
    addToast: (toast: Omit<Toast, 'id'>) => void;
    dismissToast: (id: string) => void;
}

let toastId = 0;

export const useAdminStore = create<AdminState>((set, get) => ({
    collections: [],
    collectionsLoading: false,
    collectionsError: null,

    selectedCollectionId: null,
    galleryItems: [],
    galleryItemsLoading: false,
    galleryItemsError: null,

    operationInProgress: null,
    toasts: [],

    // Work-Contact initial state
    serviceCategories: [],
    serviceCategoriesLoading: false,
    serviceCategoriesError: null,
    selectedCategoryId: null,
    serviceItems: [],
    serviceItemsLoading: false,
    wcConfig: null,
    wcConfigLoading: false,

    // ─── Collections ────────────────────────────────────────────────────────

    fetchCollections: async () => {
        set({ collectionsLoading: true, collectionsError: null });
        try {
            const cols = await getCollections();
            set({ collections: cols, collectionsLoading: false });
        } catch (err: any) {
            set({ collectionsError: err.message, collectionsLoading: false });
            get().addToast({ type: 'error', message: 'Failed to load collections.' });
        }
    },

    addCollection: async (data) => {
        set({ operationInProgress: 'Creating collection…' });
        try {
            const id = await createCollection(data);
            await get().fetchCollections();
            set({ operationInProgress: null });
            get().addToast({ type: 'success', message: `Collection "${data.title}" created.` });
            return id;
        } catch (err: any) {
            set({ operationInProgress: null });
            get().addToast({ type: 'error', message: `Failed to create collection: ${err.message}` });
            return null;
        }
    },

    editCollection: async (id, data) => {
        set({ operationInProgress: 'Updating collection…' });
        try {
            await updateCollection(id, data);
            // Optimistic update
            set(s => ({
                collections: s.collections.map(c => c.id === id ? { ...c, ...data } : c),
                operationInProgress: null,
            }));
            get().addToast({ type: 'success', message: 'Collection updated.' });
        } catch (err: any) {
            set({ operationInProgress: null });
            get().addToast({ type: 'error', message: `Update failed: ${err.message}` });
        }
    },

    removeCollection: async (id) => {
        set({ operationInProgress: 'Deleting collection…' });
        try {
            await deleteCollection(id);
            set(s => ({
                collections: s.collections.filter(c => c.id !== id),
                operationInProgress: null,
            }));
            get().addToast({ type: 'success', message: 'Collection deleted.' });
        } catch (err: any) {
            set({ operationInProgress: null });
            get().addToast({ type: 'error', message: `Delete failed: ${err.message}` });
        }
    },

    reorderCols: async (orderedIds) => {
        // Optimistic reorder
        const prev = get().collections;
        const reordered = orderedIds.map((id, i) => {
            const col = prev.find(c => c.id === id)!;
            return { ...col, order: i };
        });
        set({ collections: reordered });
        try {
            await reorderCollections(orderedIds);
            get().addToast({ type: 'info', message: 'Collections reordered.' });
        } catch {
            set({ collections: prev }); // rollback
            get().addToast({ type: 'error', message: 'Reorder failed — reverted.' });
        }
    },

    // ─── Gallery Items ──────────────────────────────────────────────────────

    fetchGalleryItems: async (collectionId) => {
        set({ selectedCollectionId: collectionId, galleryItemsLoading: true, galleryItemsError: null });
        try {
            const items = await getGalleryItems(collectionId);
            set({ galleryItems: items, galleryItemsLoading: false });
        } catch (err: any) {
            set({ galleryItemsError: err.message, galleryItemsLoading: false });
            get().addToast({ type: 'error', message: 'Failed to load gallery items.' });
        }
    },

    addItem: async (collectionId, item) => {
        set({ operationInProgress: 'Adding item…' });
        try {
            const id = await addGalleryItem(collectionId, item);
            await get().fetchGalleryItems(collectionId);
            set({ operationInProgress: null });
            get().addToast({ type: 'success', message: 'Item added.' });
            return id;
        } catch (err: any) {
            set({ operationInProgress: null });
            get().addToast({ type: 'error', message: `Add failed: ${err.message}` });
            return null;
        }
    },

    editItem: async (collectionId, itemId, data) => {
        set({ operationInProgress: 'Updating item…' });
        try {
            await updateGalleryItem(collectionId, itemId, data);
            set(s => ({
                galleryItems: s.galleryItems.map(i => i.id === itemId ? { ...i, ...data } : i),
                operationInProgress: null,
            }));
            get().addToast({ type: 'success', message: 'Item updated.' });
        } catch (err: any) {
            set({ operationInProgress: null });
            get().addToast({ type: 'error', message: `Update failed: ${err.message}` });
        }
    },

    removeItem: async (collectionId, itemId) => {
        set({ operationInProgress: 'Deleting item…' });
        try {
            await deleteGalleryItem(collectionId, itemId);
            set(s => ({
                galleryItems: s.galleryItems.filter(i => i.id !== itemId),
                operationInProgress: null,
            }));
            get().addToast({ type: 'success', message: 'Item deleted.' });
        } catch (err: any) {
            set({ operationInProgress: null });
            get().addToast({ type: 'error', message: `Delete failed: ${err.message}` });
        }
    },

    reorderItems: async (collectionId, orderedIds) => {
        const prev = get().galleryItems;
        const reordered = orderedIds.map((id, i) => {
            const item = prev.find(it => it.id === id)!;
            return { ...item, order: i };
        });
        set({ galleryItems: reordered });
        try {
            await reorderGalleryItems(collectionId, orderedIds);
            get().addToast({ type: 'info', message: 'Items reordered.' });
        } catch {
            set({ galleryItems: prev });
            get().addToast({ type: 'error', message: 'Reorder failed — reverted.' });
        }
    },

    bulkRemoveItems: async (collectionId, itemIds) => {
        set({ operationInProgress: `Deleting ${itemIds.length} items…` });
        try {
            await bulkDeleteGalleryItems(collectionId, itemIds);
            set(s => ({
                galleryItems: s.galleryItems.filter(i => !itemIds.includes(i.id!)),
                operationInProgress: null,
            }));
            get().addToast({ type: 'success', message: `${itemIds.length} items deleted.` });
        } catch (err: any) {
            set({ operationInProgress: null });
            get().addToast({ type: 'error', message: `Bulk delete failed: ${err.message}` });
        }
    },

    bulkMoveItems: async (sourceId, targetId, itemIds) => {
        set({ operationInProgress: `Moving ${itemIds.length} items…` });
        try {
            await bulkMoveGalleryItems(sourceId, targetId, itemIds);
            await get().fetchGalleryItems(sourceId);
            set({ operationInProgress: null });
            get().addToast({ type: 'success', message: `${itemIds.length} items moved.` });
        } catch (err: any) {
            set({ operationInProgress: null });
            get().addToast({ type: 'error', message: `Move failed: ${err.message}` });
        }
    },

    // ─── Publish & Seed ─────────────────────────────────────────────────────

    publishGallery: async () => {
        set({ operationInProgress: 'Publishing gallery…' });
        try {
            const data = await compileGalleryData();
            set({ operationInProgress: null });
            get().addToast({ type: 'success', message: 'Gallery published successfully.' });
            return data;
        } catch (err: any) {
            set({ operationInProgress: null });
            get().addToast({ type: 'error', message: `Publish failed: ${err.message}` });
            return null;
        }
    },

    seedData: async (data) => {
        set({ operationInProgress: 'Seeding data from gallery.json…' });
        try {
            const count = await seedFromGalleryJson(data);
            await get().fetchCollections();
            set({ operationInProgress: null });
            get().addToast({ type: 'success', message: `Seeded ${count} items across ${data.length} collections.` });
            return count;
        } catch (err: any) {
            set({ operationInProgress: null });
            get().addToast({ type: 'error', message: `Seed failed: ${err.message}` });
            return 0;
        }
    },

    // ─── Work-Contact: Service Categories ────────────────────────────────

    fetchServiceCategories: async () => {
        set({ serviceCategoriesLoading: true, serviceCategoriesError: null });
        try {
            const cats = await getServiceCategories();
            set({ serviceCategories: cats, serviceCategoriesLoading: false });
        } catch (err: any) {
            set({ serviceCategoriesError: err.message, serviceCategoriesLoading: false });
            get().addToast({ type: 'error', message: 'Failed to load service categories.' });
        }
    },

    addServiceCat: async (data) => {
        set({ operationInProgress: 'Creating category…' });
        try {
            const id = await createServiceCategory(data);
            await get().fetchServiceCategories();
            set({ operationInProgress: null });
            get().addToast({ type: 'success', message: `Category "${data.title}" created.` });
            return id;
        } catch (err: any) {
            set({ operationInProgress: null });
            get().addToast({ type: 'error', message: `Failed to create category: ${err.message}` });
            return null;
        }
    },

    editServiceCat: async (id, data) => {
        set({ operationInProgress: 'Updating category…' });
        try {
            await updateServiceCategory(id, data);
            set(s => ({
                serviceCategories: s.serviceCategories.map(c => c.id === id ? { ...c, ...data } : c),
                operationInProgress: null,
            }));
            get().addToast({ type: 'success', message: 'Category updated.' });
        } catch (err: any) {
            set({ operationInProgress: null });
            get().addToast({ type: 'error', message: `Update failed: ${err.message}` });
        }
    },

    removeServiceCat: async (id) => {
        set({ operationInProgress: 'Deleting category…' });
        try {
            await deleteServiceCategory(id);
            set(s => ({
                serviceCategories: s.serviceCategories.filter(c => c.id !== id),
                operationInProgress: null,
            }));
            get().addToast({ type: 'success', message: 'Category deleted.' });
        } catch (err: any) {
            set({ operationInProgress: null });
            get().addToast({ type: 'error', message: `Delete failed: ${err.message}` });
        }
    },

    reorderServiceCats: async (orderedIds) => {
        const prev = get().serviceCategories;
        const reordered = orderedIds.map((id, i) => {
            const cat = prev.find(c => c.id === id)!;
            return { ...cat, order: i };
        });
        set({ serviceCategories: reordered });
        try {
            await reorderServiceCategories(orderedIds);
            get().addToast({ type: 'info', message: 'Categories reordered.' });
        } catch {
            set({ serviceCategories: prev });
            get().addToast({ type: 'error', message: 'Reorder failed — reverted.' });
        }
    },

    // ─── Work-Contact: Service Items ─────────────────────────────────────

    fetchServiceItemsForCat: async (categoryId) => {
        set({ selectedCategoryId: categoryId, serviceItemsLoading: true });
        try {
            const items = await getServiceItems(categoryId);
            set({ serviceItems: items, serviceItemsLoading: false });
        } catch (err: any) {
            set({ serviceItemsLoading: false });
            get().addToast({ type: 'error', message: 'Failed to load service items.' });
        }
    },

    addSvcItem: async (categoryId, item) => {
        set({ operationInProgress: 'Adding service…' });
        try {
            const id = await addServiceItemFn(categoryId, item);
            await get().fetchServiceItemsForCat(categoryId);
            set({ operationInProgress: null });
            get().addToast({ type: 'success', message: 'Service added.' });
            return id;
        } catch (err: any) {
            set({ operationInProgress: null });
            get().addToast({ type: 'error', message: `Add failed: ${err.message}` });
            return null;
        }
    },

    editSvcItem: async (categoryId, itemId, data) => {
        set({ operationInProgress: 'Updating service…' });
        try {
            await updateServiceItemFn(categoryId, itemId, data);
            set(s => ({
                serviceItems: s.serviceItems.map(i => i.id === itemId ? { ...i, ...data } : i),
                operationInProgress: null,
            }));
            get().addToast({ type: 'success', message: 'Service updated.' });
        } catch (err: any) {
            set({ operationInProgress: null });
            get().addToast({ type: 'error', message: `Update failed: ${err.message}` });
        }
    },

    removeSvcItem: async (categoryId, itemId) => {
        set({ operationInProgress: 'Deleting service…' });
        try {
            await deleteServiceItemFn(categoryId, itemId);
            set(s => ({
                serviceItems: s.serviceItems.filter(i => i.id !== itemId),
                operationInProgress: null,
            }));
            get().addToast({ type: 'success', message: 'Service deleted.' });
        } catch (err: any) {
            set({ operationInProgress: null });
            get().addToast({ type: 'error', message: `Delete failed: ${err.message}` });
        }
    },

    reorderSvcItems: async (categoryId, orderedIds) => {
        const prev = get().serviceItems;
        const reordered = orderedIds.map((id, i) => {
            const item = prev.find(it => it.id === id)!;
            return { ...item, order: i };
        });
        set({ serviceItems: reordered });
        try {
            await reorderServiceItems(categoryId, orderedIds);
            get().addToast({ type: 'info', message: 'Services reordered.' });
        } catch {
            set({ serviceItems: prev });
            get().addToast({ type: 'error', message: 'Reorder failed — reverted.' });
        }
    },

    // ─── Work-Contact: Config ────────────────────────────────────────────

    fetchWCConfig: async () => {
        set({ wcConfigLoading: true });
        try {
            const config = await getWorkContactConfig();
            set({ wcConfig: config, wcConfigLoading: false });
        } catch (err: any) {
            set({ wcConfigLoading: false });
            get().addToast({ type: 'error', message: 'Failed to load contact config.' });
        }
    },

    updateWCConfig: async (data) => {
        set({ operationInProgress: 'Saving contact config…' });
        try {
            await updateWCConfigFn(data);
            set(s => ({
                wcConfig: s.wcConfig ? { ...s.wcConfig, ...data } : data as WorkContactConfig,
                operationInProgress: null,
            }));
            get().addToast({ type: 'success', message: 'Contact config saved.' });
        } catch (err: any) {
            set({ operationInProgress: null });
            get().addToast({ type: 'error', message: `Save failed: ${err.message}` });
        }
    },

    seedWCData: async () => {
        set({ operationInProgress: 'Seeding work-contact data…' });
        try {
            const count = await seedWorkContactDefaults();
            await get().fetchServiceCategories();
            await get().fetchWCConfig();
            set({ operationInProgress: null });
            get().addToast({ type: 'success', message: `Seeded 4 categories with ${count} services + contact config.` });
            return count;
        } catch (err: any) {
            set({ operationInProgress: null });
            get().addToast({ type: 'error', message: `Seed failed: ${err.message}` });
            return 0;
        }
    },

    // ─── Toasts ─────────────────────────────────────────────────────────────

    addToast: (toast) => {
        const id = `toast-${++toastId}`;
        set(s => ({ toasts: [...s.toasts, { ...toast, id }] }));
        // Auto-dismiss
        setTimeout(() => get().dismissToast(id), toast.duration ?? 4000);
    },

    dismissToast: (id) => {
        set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }));
    },
}));
