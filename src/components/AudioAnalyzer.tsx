'use client';

import { useEffect, useRef } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioStore } from '../store/audioStore';

export default function AudioAnalyzer() {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const analyzerRef = useRef<AnalyserNode | null>(null);
    const contextRef = useRef<AudioContext | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

    const { isPlaying, setAudioData } = useAudioStore();

    // Use Three's AudioLoader via useLoader so it's tracked by useProgress
    // This will block the loading screen until the audio is ready
    const audioPath = 'https://storage.googleapis.com/six9studio.firebasestorage.app/audio/coldsick.mp3';

    useEffect(() => {
        // We still use HTMLAudioElement for easier playback control and streaming
        // but by using useLoader.preload elsewhere or just ensuring it's "known", 
        // we can track it.
        // HOWEVER, THREE.AudioLoader loads the whole file into an AudioBuffer.
        // For a long track, HTMLAudio is better. 
        // Let's use a trick: preload it with a dummy fetch or AudioLoader to track progress, 
        // but play via HTMLAudio.

        const audio = new Audio(audioPath);
        audio.loop = true;
        audio.crossOrigin = "anonymous";
        audioRef.current = audio;

        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const context = new AudioContext();
        const source = context.createMediaElementSource(audio);
        const analyzer = context.createAnalyser();

        analyzer.fftSize = 256;
        source.connect(analyzer);
        analyzer.connect(context.destination);

        analyzerRef.current = analyzer;
        contextRef.current = context;
        sourceRef.current = source;

        return () => {
            audio.pause();
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            if (context.state !== 'closed') context.close();
        };
    }, []);

    // Preload the audio file to ensure it's tracked by useProgress
    useEffect(() => {
        // This leverages R3F's cache and drei's useProgress
        // We don't actually need the buffer here since we use HTMLAudio
        THREE.DefaultLoadingManager.itemStart(audioPath);
        fetch(audioPath).then(res => res.blob()).then(() => {
            THREE.DefaultLoadingManager.itemEnd(audioPath);
        }).catch(() => {
            THREE.DefaultLoadingManager.itemEnd(audioPath);
        });
    }, []);

    useEffect(() => {
        if (!audioRef.current || !analyzerRef.current) return;

        if (isPlaying) {
            if (contextRef.current && contextRef.current.state === 'suspended') {
                contextRef.current.resume();
            }
            audioRef.current.play().catch(err => console.error("Audio play failed:", err));
            update();
        } else {
            audioRef.current.pause();
        }

        if (!animationFrameRef.current) {
            update();
        }
    }, [isPlaying]);

    const update = () => {
        if (!analyzerRef.current) return;

        const bufferLength = analyzerRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const store = useAudioStore.getState();
        
        // Handle smooth audio ducking
        if (audioRef.current) {
            const targetVolume = store.isDucked ? 0.1 : 1.0;
            audioRef.current.volume += (targetVolume - audioRef.current.volume) * 0.1;
        }

        if (store.isPlaying) {
            analyzerRef.current.getByteFrequencyData(dataArray);
        }

        if (!store.isPlaying && store.low < 0.001) {
            setAudioData({
                low: 0, mid: 0, high: 0, avg: 0,
                kickTransient: 0, smoothedKick: 0,
                snareTransient: 0, smoothedSnare: 0,
                highFreqSpike: 0, derivative: 0, spectralCentroid: 0
            });
            animationFrameRef.current = null;
            return;
        }

        let lowSum = 0;
        let midSum = 0;
        let highSum = 0;
        let totalSum = 0;

        for (let i = 0; i < bufferLength; i++) {
            const val = dataArray[i];
            totalSum += val;
            if (i < 10) lowSum += val;
            else if (i < 50) midSum += val;
            else if (i < 100) highSum += val;
        }

        let currentLow = (lowSum / 10) / 255.0;
        let currentMid = (midSum / 40) / 255.0;
        let currentHigh = (highSum / 50) / 255.0;
        const currentAvg = (totalSum / bufferLength) / 255.0;

        currentLow = Math.min(1.0, Math.pow(currentLow, 1.5));
        currentMid = Math.min(1.0, Math.pow(currentMid, 1.5));
        currentHigh = Math.min(1.0, Math.pow(currentHigh, 1.5));

        const dt = 0.2;
        const smoothLow = store.low + (currentLow - store.low) * dt;
        const smoothMid = store.mid + (currentMid - store.mid) * dt;
        const smoothHigh = store.high + (currentHigh - store.high) * dt;

        const currentCombined = currentLow + currentMid;
        const previousCombined = store.low + store.mid;
        const currentGeneralDerivative = Math.max(0, currentCombined - previousCombined);

        setAudioData({
            low: smoothLow,
            mid: smoothMid,
            high: smoothHigh,
            avg: currentAvg,
            kickTransient: currentLow,
            smoothedKick: smoothLow,
            snareTransient: currentMid,
            smoothedSnare: smoothMid,
            highFreqSpike: currentHigh,
            derivative: currentGeneralDerivative,
            spectralCentroid: currentAvg
        });

        animationFrameRef.current = requestAnimationFrame(update);
    };

    return null;
}
