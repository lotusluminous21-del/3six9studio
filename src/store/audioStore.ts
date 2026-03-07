import { create } from 'zustand';

interface AudioState {
    isPlaying: boolean;
    low: number;   // Bass
    mid: number;   // Mid-range
    high: number;  // High-range
    avg: number;   // Average volume

    // Dynamic/Fluctuating metrics
    kickTransient: number;         // Sharp spikes in sub/low (0 to 1)
    smoothedKick: number;          // Spring-damped kick for heavy recoil
    snareTransient: number;        // Sharp spikes in mid/high
    smoothedSnare: number;         // Spring-damped snare for snappy recoil
    highFreqSpike: number;         // Sharp spikes in very high frequencies
    derivative: number;            // General rate of change
    spectralCentroid: number; // Brightness of sound

    setPlaying: (playing: boolean) => void;
    setAudioData: (data: Partial<Omit<AudioState, 'setPlaying' | 'setAudioData'>>) => void;
}

export const useAudioStore = create<AudioState>((set) => ({
    isPlaying: false,
    low: 0,
    mid: 0,
    high: 0,
    avg: 0,
    kickTransient: 0,
    smoothedKick: 0,
    snareTransient: 0,
    smoothedSnare: 0,
    highFreqSpike: 0,
    derivative: 0,
    spectralCentroid: 0,
    setPlaying: (playing) => set({ isPlaying: playing }),
    setAudioData: (data) => set({ ...data }),
}));

