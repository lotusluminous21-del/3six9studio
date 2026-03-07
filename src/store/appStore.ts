import { create } from 'zustand';

interface AppState {
    isLoaded: boolean;
    isEntered: boolean;
    entranceStartTime: number | null;
    selectedProject: any | null;
    categories: any[];
    setIsLoaded: (val: boolean) => void;
    enter: (startTime: number) => void;
    setSelectedProject: (project: any | null) => void;
    setCategories: (categories: any[]) => void;
    fetchCategories: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
    isLoaded: false,
    isEntered: false,
    entranceStartTime: null,
    selectedProject: null,
    categories: [],
    setIsLoaded: (val) => set({ isLoaded: val }),
    enter: (startTime) => set({ isEntered: true, entranceStartTime: startTime }),
    setSelectedProject: (project) => set({ selectedProject: project }),
    setCategories: (categories) => set({ categories }),
    fetchCategories: async () => {
        try {
            const res = await fetch('/api/gallery');
            if (res.ok) {
                const data = await res.json();
                set({ categories: data });
            }
        } catch (error) {
            console.error("Failed to fetch categories:", error);
        }
    }
}));
