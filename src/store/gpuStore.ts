import { create } from 'zustand';
import { getGPUTier } from 'detect-gpu';

export type QualityLevel = 'low' | 'medium' | 'high';

interface GPUState {
    tier: number; // 0-3 from detect-gpu
    quality: QualityLevel;
    detected: boolean;
    detect: () => Promise<void>;
}

export const useGPUStore = create<GPUState>((set, get) => ({
    tier: 3,
    quality: 'high',
    detected: false,
    detect: async () => {
        if (get().detected) return;
        try {
            const gpuTier = await getGPUTier();
            const tier = gpuTier.tier ?? 3;
            let quality: QualityLevel;
            if (tier <= 1) {
                quality = 'low';
            } else if (tier === 2) {
                quality = 'medium';
            } else {
                quality = 'high';
            }
            set({ tier, quality, detected: true });
            
            // Log successful detection for remote debugging
            console.log(`[GPU Diagnostic] Tier: ${tier}, Quality: ${quality}, Device: ${gpuTier.type}`);
        } catch (error) {
            console.error('[GPU Diagnostic] Detection failed, defaulting to high quality:', error);
            // If detection fails, assume high quality (current behavior)
            set({ tier: 3, quality: 'high', detected: true });
        }
    },
}));

// Run detection immediately on module load
useGPUStore.getState().detect();
