'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { useAppStore } from '../store/appStore';

/**
 * SceneLights
 * Controls the sequential illumination of the scene's lights during the entrance sequence.
 */
export default function SceneLights() {
    const keyLightRef = useRef<THREE.DirectionalLight>(null);
    const fillLightRef = useRef<THREE.DirectionalLight>(null);
    const rimLightRef = useRef<THREE.DirectionalLight>(null);

    // Target intensities for the lights to reach
    const targetKeyIntensity = 2.8;
    const targetFillIntensity = 0.5;
    const targetRimIntensity = 3.5;

    useFrame((state, delta) => {
        const { isEntered, entranceStartTime } = useAppStore.getState();
        const t = isEntered && entranceStartTime ? (performance.now() / 1000) - entranceStartTime : 0;

        // Sequence timeline:
        // Key Light: fades in 0.1s - 0.8s
        // Fill Light: fades in 0.4s - 1.1s
        // Rim Light: pierces in 0.8s - 1.5s

        if (keyLightRef.current) {
            const progress = THREE.MathUtils.clamp((t - 0.1) / 0.7, 0, 1);
            // Smoothstep for more cinematic easing
            const easedProgress = THREE.MathUtils.smoothstep(progress, 0, 1);
            keyLightRef.current.intensity = THREE.MathUtils.lerp(0, targetKeyIntensity, easedProgress);
        }

        if (fillLightRef.current) {
            const progress = THREE.MathUtils.clamp((t - 0.4) / 0.7, 0, 1);
            const easedProgress = THREE.MathUtils.smoothstep(progress, 0, 1);
            fillLightRef.current.intensity = THREE.MathUtils.lerp(0, targetFillIntensity, easedProgress);
        }

        if (rimLightRef.current) {
            const progress = THREE.MathUtils.clamp((t - 0.8) / 0.7, 0, 1);
            // Slightly sharper ease for the dramatic rim light piercing
            const easedProgress = Math.pow(progress, 2.0);
            rimLightRef.current.intensity = THREE.MathUtils.lerp(0, targetRimIntensity, easedProgress);
        }
    });

    return (
        <>
            <ambientLight intensity={0.01} color="#050a10" />
            <directionalLight ref={keyLightRef} position={[15, 10, 10]} intensity={0} color="#ff8c42" />
            <directionalLight ref={fillLightRef} position={[-15, -5, 5]} intensity={0} color="#002244" />
            <directionalLight ref={rimLightRef} position={[0, -15, -10]} intensity={0} color="#ff1a55" />
        </>
    );
}
