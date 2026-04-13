'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useRef, useEffect, useState } from 'react';
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
function CinematicPostProcessing({ effectRecovery = 1 }: { effectRecovery?: number }) {
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
            Math.min(desiredBlur, 7.5) * effectRecovery,
            Math.min(1, 6 * delta)
        );
        dofRef.current.bokehScale = targetBlur.current;

        // Transients also subtly narrow the focus range
        dofRef.current.worldFocusRange = 4.0 - (smoothedKick * 2.5 * effectRecovery);
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
                offset={new THREE.Vector2(0.001 * effectRecovery, 0.001 * effectRecovery)}
                radialModulation={true}
                modulationOffset={0.7}
            />
        </>
    );
}

function FrameStabilizer({ freezeScene }: { freezeScene: boolean }) {
    const clock = useThree((state) => state.clock);
    const invalidate = useThree((state) => state.invalidate);

    useEffect(() => {
        if (freezeScene) {
            clock.stop();
            return;
        }

        // Reset clock baseline so the first resumed frame does not receive
        // a giant delta that can produce post-processing/shader artifacts.
        clock.start();
        invalidate();

        // Warm up a few immediate frames to stabilize composer buffers.
        const raf1 = requestAnimationFrame(() => invalidate());
        const raf2 = requestAnimationFrame(() => invalidate());
        const raf3 = requestAnimationFrame(() => invalidate());

        return () => {
            cancelAnimationFrame(raf1);
            cancelAnimationFrame(raf2);
            cancelAnimationFrame(raf3);
        };
    }, [freezeScene, clock, invalidate]);

    return null;
}

export default function Scene() {
    const quality = useGPUStore((s) => s.quality);
    const detected = useGPUStore((s) => s.detected);
    const { categories, fetchCategories, selectedProject, isWorkContactOpen } = useAppStore();
    const freezeScene = Boolean(selectedProject) || isWorkContactOpen;
    const [effectRecovery, setEffectRecovery] = useState(1);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    useEffect(() => {
        if (freezeScene) {
            setEffectRecovery(0);
            return;
        }

        let raf = 0;
        const start = performance.now();
        const durationMs = 550;

        const tick = () => {
            const elapsed = performance.now() - start;
            const raw = THREE.MathUtils.clamp(elapsed / durationMs, 0, 1);
            const eased = THREE.MathUtils.smoothstep(raw, 0, 1);
            setEffectRecovery(eased);
            if (raw < 1) raf = requestAnimationFrame(tick);
        };

        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [freezeScene]);

    // Scale DPR based on GPU capability
    const dpr: [number, number] = quality === 'low' ? [1, 1] : quality === 'medium' ? [1, 1.25] : [1, 1.5];

    if (!detected) return null; // Wait for GPU to avoid WebGL Context flapping

    return (
        <Canvas
            camera={{ position: [0, 0, 5], fov: 45, near: 0.1, far: 500 }}
            dpr={dpr}
            gl={{ alpha: false, antialias: quality !== 'low' }}
            frameloop={freezeScene ? 'never' : 'always'}
        >
            <FrameStabilizer freezeScene={freezeScene} />
            <AudioAnalyzer />
            <color attach="background" args={['#010005']} />

            <SceneLights effectRecovery={effectRecovery} />

            <Suspense fallback={null}>
                {/* Environment for reflections — skip on low-end GPUs */}
                {quality !== 'low' && <Environment preset="night" />}

                <ScrollControls
                    pages={Math.max(3, 2 + categories.length)}
                    damping={0.06}
                    distance={0.8}
                    enabled={!freezeScene}
                >
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
                            intensity={1.8 * effectRecovery}
                        />
                        <Noise
                            opacity={0.035 * effectRecovery}
                            blendFunction={BlendFunction.SOFT_LIGHT}
                        />
                        <Vignette
                            eskil={false}
                            offset={0.25}
                            darkness={0.85 * effectRecovery}
                        />
                    </EffectComposer>
                ) : (
                    <EffectComposer multisampling={0}>
                        <Bloom
                            luminanceThreshold={0.65}
                            luminanceSmoothing={0.5}
                            mipmapBlur={true}
                            intensity={2.2 * effectRecovery}
                        />
                        <Noise
                            opacity={0.035 * effectRecovery}
                            blendFunction={BlendFunction.SOFT_LIGHT}
                        />
                        <CinematicPostProcessing effectRecovery={effectRecovery} />
                        <Vignette
                            eskil={false}
                            offset={0.2}
                            darkness={0.92 * effectRecovery}
                        />
                    </EffectComposer>
                )}
            </Suspense>
        </Canvas>
    );
}
