import { create } from 'zustand';

interface ScrollState {
    scrollVelocity: number;
    currentScrollProgress: number;
    hoveredCardWorldPos: [number, number, number] | null;
    activeCardWorldPos: [number, number, number] | null;
    scrollToIndex: number | null;
    setScrollVelocity: (val: number) => void;
    setCurrentScrollProgress: (val: number) => void;
    setHoveredCardWorldPos: (pos: [number, number, number] | null) => void;
    setActiveCardWorldPos: (pos: [number, number, number] | null) => void;
    setScrollToIndex: (index: number | null) => void;
}

// A lightning-fast, unopinionated global store for WebGL communication.
// Used to track scroll velocity for adaptive post-processing and card jelly bending
// without causing React re-renders.
export const useScrollStore = create<ScrollState>((set) => ({
    scrollVelocity: 0,
    currentScrollProgress: 0,
    hoveredCardWorldPos: null,
    activeCardWorldPos: null,
    scrollToIndex: null,
    setScrollVelocity: (val) => set({ scrollVelocity: val }),
    setCurrentScrollProgress: (val) => set({ currentScrollProgress: val }),
    setHoveredCardWorldPos: (pos) => set({ hoveredCardWorldPos: pos }),
    setActiveCardWorldPos: (pos) => set({ activeCardWorldPos: pos }),
    setScrollToIndex: (index) => set({ scrollToIndex: index })
}));
