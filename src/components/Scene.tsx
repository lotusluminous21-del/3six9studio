'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useRef, useEffect } from 'react';
import { ScrollControls, Environment } from '@react-three/drei';
import { EffectComposer, Bloom, Noise, ChromaticAberration, Vignette, DepthOfField } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { useScrollStore } from '../store/glitchStore';

import CentralSpine from './CentralSpine';
import FloatingCards from './FloatingCards';
import ScrollController from './ScrollController';
import DustMotes from './DustMotes';
import AmbientField from './AmbientField';
import AudioAnalyzer from './AudioAnalyzer';
import SceneLights from './SceneLights';
import { useAudioStore } from '../store/audioStore';
import { useGPUStore } from '../store/gpuStore';
import { useAppStore } from '../store/appStore';

// Cinematic DoF using world-unit focus distance (no normalized depth hacking)
function CinematicPostProcessing() {
    const dofRef = useRef<any>(null);
    const targetBlur = useRef(2.5);

    useFrame((state, delta) => {
        if (!dofRef.current) return;

        const velocity = useScrollStore.getState().scrollVelocity;
        const { smoothedKick } = useAudioStore.getState();

        // Bokeh intensity: base + scroll-driven + transient-driven
        const desiredBlur = 2.5 + (velocity > 0.005 ? velocity * 10.0 : 0) + (smoothedKick * 2.5);
        targetBlur.current = THREE.MathUtils.lerp(
            targetBlur.current,
            Math.min(desiredBlur, 7.5),
            6 * delta
        );
        dofRef.current.bokehScale = targetBlur.current;

        // Transients also subtly narrow the focus range
        dofRef.current.worldFocusRange = 4.0 - (smoothedKick * 2.5);
    });

    return (
        <>
            <DepthOfField
                ref={dofRef}
                worldFocusDistance={10}
                worldFocusRange={4}
                bokehScale={2.5}
                height={360}
            />
            <ChromaticAberration
                offset={new THREE.Vector2(0.001, 0.001)}
                radialModulation={true}
                modulationOffset={0.7}
            />
        </>
    );
}

export default function Scene() {
    const quality = useGPUStore((s) => s.quality);
    const detected = useGPUStore((s) => s.detected);
    const { categories, fetchCategories } = useAppStore();

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    // Scale DPR based on GPU capability
    const dpr: [number, number] = quality === 'low' ? [1, 1] : quality === 'medium' ? [1, 1.25] : [1, 1.5];

    if (!detected) return null; // Wait for GPU to avoid WebGL Context flapping

    return (
        <Canvas
            camera={{ position: [0, 0, 5], fov: 45, near: 0.1, far: 500 }}
            dpr={dpr}
            gl={{ alpha: false, antialias: quality !== 'low' }}
        >
            <AudioAnalyzer />
            <color attach="background" args={['#010005']} />

            <SceneLights />

            <Suspense fallback={null}>
                {/* Environment for reflections — skip on low-end GPUs */}
                {quality !== 'low' && <Environment preset="night" />}

                <ScrollControls pages={Math.max(3, 2 + categories.length)} damping={0.06} distance={0.8}>
                    <ScrollController />
                    <AmbientField />
                    <DustMotes />
                    <CentralSpine />
                    <FloatingCards />
                </ScrollControls>

                {quality === 'low' ? null : quality === 'medium' ? (
                    <EffectComposer depthBuffer={false} multisampling={0}>
                        <Bloom
                            luminanceThreshold={0.75}
                            luminanceSmoothing={0.5}
                            mipmapBlur={false}
                            intensity={1.8}
                        />
                        <Noise
                            opacity={0.035}
                            blendFunction={BlendFunction.SOFT_LIGHT}
                        />
                        <Vignette
                            eskil={false}
                            offset={0.25}
                            darkness={0.85}
                        />
                    </EffectComposer>
                ) : (
                    <EffectComposer multisampling={0}>
                        <Bloom
                            luminanceThreshold={0.65}
                            luminanceSmoothing={0.5}
                            mipmapBlur={true}
                            intensity={2.2}
                        />
                        <Noise
                            opacity={0.035}
                            blendFunction={BlendFunction.SOFT_LIGHT}
                        />
                        <CinematicPostProcessing />
                        <Vignette
                            eskil={false}
                            offset={0.2}
                            darkness={0.92}
                        />
                    </EffectComposer>
                )}
            </Suspense>
        </Canvas>
    );
}
