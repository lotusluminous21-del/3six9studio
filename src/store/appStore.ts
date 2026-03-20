import { create } from 'zustand';
import { compileGalleryData } from '@/lib/firestore';

interface AppState {
    isLoaded: boolean;
    isEntered: boolean;
    entranceStartTime: number | null;
    selectedProject: any | null;
    categories: any[];
    categoriesLoaded: boolean;
    setIsLoaded: (val: boolean) => void;
    enter: (startTime: number) => void;
    setSelectedProject: (project: any | null) => void;
    setCategories: (categories: any[]) => void;
    fetchCategories: () => Promise<void>;
    isWorkContactOpen: boolean;
    setIsWorkContactOpen: (val: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
    isLoaded: false,
    isEntered: false,
    entranceStartTime: null,
    selectedProject: null,
    categories: [],
    categoriesLoaded: false,
    isWorkContactOpen: false,
    setIsLoaded: (val) => set({ isLoaded: val }),
    enter: (startTime) => set({ isEntered: true, entranceStartTime: startTime }),
    setSelectedProject: (project) => set({ selectedProject: project }),
    setCategories: (categories) => set({ categories }),
    setIsWorkContactOpen: (val) => set({ isWorkContactOpen: val }),
    fetchCategories: async () => {
        try {
            // Fetch directly from Firestore (client-side), same pattern as WorkContactView
            const firestoreData = await compileGalleryData();
            if (firestoreData && firestoreData.length > 0) {
                set({ categories: firestoreData, categoriesLoaded: true });
                return;
            }
        } catch (err) {
            console.warn('Firestore gallery fetch failed, falling back to API:', err);
        }

        // Fallback: fetch from API route (serves static gallery.json)
        try {
            const res = await fetch('/api/gallery');
            if (res.ok) {
                const data = await res.json();
                set({ categories: data, categoriesLoaded: true });
            } else {
                set({ categoriesLoaded: true });
            }
        } catch (error) {
            console.error("Failed to fetch categories:", error);
            set({ categoriesLoaded: true });
        }
    }
}));
