import { create } from 'zustand';

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
