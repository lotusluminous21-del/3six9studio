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
            
            // Detect mobile explicitly since some powerful phones get Tier 3
            const isMobile = gpuTier.isMobile || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator?.userAgent || '');

            if (isMobile) {
                // Mobile devices max out at medium to save memory / prevent WebGL context blowouts
                // Tier 0-1 gets low (no post-processing)
                quality = tier <= 1 ? 'low' : 'medium';
            } else {
                // Desktop devices
                // Tier 0-1 (Intel HD 4000) gets medium
                // Tier 2-3 (e.g., Radeon 610M, RTX 3060) gets high
                quality = tier <= 1 ? 'medium' : 'high';
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
