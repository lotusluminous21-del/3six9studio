'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { useScrollStore } from '../store/glitchStore';
import { HelixMaterial } from './shaders/HelixMaterial';
import { useAudioStore } from '../store/audioStore';
import { useAppStore } from '../store/appStore';
import { useGPUStore } from '../store/gpuStore';

// Per-particle state for the lifecycle system
interface ParticleState {
    x: number;
    y: number;
    z: number;
    rotX: number;
    rotY: number;
    rotZ: number;
    scale: number;
    // Per-particle drift properties (set once on spawn)
    fallSpeed: number;     // How fast this particle drifts down
    noisePhase: number;    // Phase offset for lateral noise sway
    tumbleSpeed: number;   // How fast it tumbles
}

export default function EnvironmentFlora() {
    const quality = useGPUStore((s) => s.quality);
    const numParticles = quality === 'low' ? 80 : quality === 'medium' ? 180 : 280;
    const totalHeight = 160;
    const startY = 20;        // spawn ceiling
    const endY = startY - totalHeight; // death floor

    const dummy = useMemo(() => new THREE.Object3D(), []);
    const instancedMeshRef = useRef<THREE.InstancedMesh>(null);

    // Initialize particle states with randomized positions across the full column
    const particles = useRef<ParticleState[]>([]);

    // One-time initialization
    if (particles.current.length === 0) {
        for (let i = 0; i < numParticles; i++) {
            particles.current.push(spawnParticle(startY, endY, false));
        }
    }

    // Generate hanging filaments (dripping greenish tethers we are keeping)
    const mergedFilaments = useMemo(() => {
        const lines: THREE.TubeGeometry[] = [];
        const numFilamentClusters = quality === 'low' ? 5 : quality === 'medium' ? 10 : 16;

        for (let c = 0; c < numFilamentClusters; c++) {
            const clusterY = startY - Math.random() * totalHeight;
            const clusterAngle = Math.random() * Math.PI * 2;
            const clusterRadius = 2.0 + Math.random() * 1.5;

            const numFilaments = 3 + Math.floor(Math.random() * 4);

            for (let i = 0; i < numFilaments; i++) {
                const offsetX = (Math.random() - 0.5) * 1.5;
                const offsetZ = (Math.random() - 0.5) * 1.5;

                const startPoint = new THREE.Vector3(
                    Math.cos(clusterAngle) * clusterRadius + offsetX,
                    clusterY + (Math.random() - 0.5),
                    Math.sin(clusterAngle) * clusterRadius + offsetZ
                );

                const dropLength = 2.5 + Math.random() * 4.0;
                const endPoint = new THREE.Vector3(
                    startPoint.x,
                    startPoint.y - dropLength,
                    startPoint.z
                );

                const curve = new THREE.LineCurve3(startPoint, endPoint);
                const thickness = 0.015 + Math.random() * 0.01;

                lines.push(new THREE.TubeGeometry(curve, 8, thickness, 4, false));
            }
        }

        return lines.length > 0 ? BufferGeometryUtils.mergeGeometries(lines) : null;
    }, []);

    // Create shared materials
    const { floraMaterial, filamentMaterial } = useMemo(() => {
        const fMat = new HelixMaterial();
        fMat.uTime = 0;
        fMat.uEntrance = 1.0;
        fMat.uIsFlora = 1.0;
        fMat.uIsBridge = 0.0;
        fMat.uIsFilament = 0.0;
        fMat.uSurfaceScale = 4.0;
        fMat.uScrollDepth = useScrollStore.getState().currentScrollProgress;
        fMat.uScrollVelocity = 0.0;

        const filMat = new HelixMaterial();
        filMat.uTime = 0;
        filMat.uEntrance = 1.0;
        filMat.uIsFlora = 1.0;
        filMat.uIsBridge = 0.0;
        filMat.uIsFilament = 1.0;
        filMat.uSurfaceScale = 0.5;
        filMat.uScrollDepth = useScrollStore.getState().currentScrollProgress;
        filMat.uScrollVelocity = 0.0;

        return { floraMaterial: fMat, filamentMaterial: filMat };
    }, []);

    useFrame((state, delta) => {
        const { isEntered, entranceStartTime } = useAppStore.getState();
        const t = isEntered && entranceStartTime ? (performance.now() / 1000) - entranceStartTime : 0;
        const scrollStore = useScrollStore.getState();

        // Germination: 1.0s -> 2.0s
        const germinationEntrance = THREE.MathUtils.clamp((t - 1.0) / 1.0, 0, 1);

        // Reusable vector for inner loop
        const _outwardDir = new THREE.Vector2();

        // Feed animated uniforms to the materials
        if (floraMaterial) {
            const { low, mid, high } = useAudioStore.getState();
            floraMaterial.uTime = t;
            floraMaterial.uScrollDepth = scrollStore.currentScrollProgress;
            floraMaterial.uScrollVelocity = scrollStore.scrollVelocity;
            floraMaterial.uEntrance = germinationEntrance;
            floraMaterial.uAudioLow = low;
            floraMaterial.uAudioMid = mid;
            floraMaterial.uAudioHigh = high;
        }

        if (filamentMaterial) {
            const { low, mid, high } = useAudioStore.getState();
            filamentMaterial.uTime = t;
            filamentMaterial.uScrollDepth = scrollStore.currentScrollProgress;
            filamentMaterial.uScrollVelocity = scrollStore.scrollVelocity;
            filamentMaterial.uEntrance = germinationEntrance;
            filamentMaterial.uAudioLow = low;
            filamentMaterial.uAudioMid = mid;
            filamentMaterial.uAudioHigh = high;
        }

        // --- Particle Lifecycle Simulation ---
        if (!instancedMeshRef.current) return;

        const cappedDelta = Math.min(delta, 0.05); // Cap to prevent huge jumps on tab-switch
        const { smoothedKick, kickTransient, highFreqSpike } = useAudioStore.getState();

        // Energy multiplier makes them fall faster and sway harder during loud parts
        const energyMultiplier = 1.0 + smoothedKick * 2.5 + highFreqSpike * 1.0;
        // Beat hit causes a sudden jolt, thresholded so it doesn't trigger constantly
        const beatJolt = kickTransient > 0.05 ? kickTransient * 1.5 : 0;

        for (let i = 0; i < numParticles; i++) {
            const p = particles.current[i];

            // 1. Drift downward at this particle's unique speed + energy
            p.y -= p.fallSpeed * energyMultiplier * cappedDelta;

            // 2. Add lateral noise sway + beat jolt radially outward from center
            _outwardDir.set(p.x, p.z).normalize();

            p.x += Math.sin(t * 0.8 + p.noisePhase) * 0.15 * energyMultiplier * cappedDelta;
            p.z += Math.cos(t * 0.6 + p.noisePhase * 1.3) * 0.15 * energyMultiplier * cappedDelta;

            // Sudden push on beat
            p.x += _outwardDir.x * beatJolt * 0.1;
            p.z += _outwardDir.y * beatJolt * 0.1;

            // 3. Tumble rotation influenced by energy (significantly reduced from before)
            // It uses a much softer multiplier so they don't spin wildly
            const rotMultiplier = 1.0 + smoothedKick * 0.8;
            p.rotX += p.tumbleSpeed * 0.15 * rotMultiplier * cappedDelta;
            p.rotY += p.tumbleSpeed * 0.25 * rotMultiplier * cappedDelta;
            p.rotZ += p.tumbleSpeed * 0.1 * rotMultiplier * cappedDelta;

            // 4. End-of-life: respawn at top when below the death floor
            if (p.y < endY) {
                const respawned = spawnParticle(startY, endY, true);
                particles.current[i] = respawned;
                continue; // skip rendering old position this frame
            }

            // High freq spikes cause them to scale up slightly like flashes
            const targetScale = p.scale + highFreqSpike * 0.25 * p.scale;
            const currentScale = THREE.MathUtils.lerp(p.scale, targetScale, 0.5); // Fast scale up on hits

            // Narrative Entrance - Germination (staggered by height)
            // The top of the column is startY (20), bottom is endY (-140)
            const heightOffset = (startY - p.y) * 0.015; // Delay lower particles
            const tRelative = t - 1.0 - heightOffset;
            const particleEntrance = THREE.MathUtils.clamp(tRelative * 2.0, 0, 1);
            const sproutScale = THREE.MathUtils.smoothstep(particleEntrance, 0, 1);

            // Spores get fired out radially as if it's spring reproduction
            if (tRelative > 0.0 && tRelative < 1.0) {
                const burstForce = Math.pow(1.0 - tRelative, 3.0) * 12.0; // Explosive burst diminishing quickly
                _outwardDir.set(p.x, p.z).normalize();
                p.x += _outwardDir.x * burstForce * cappedDelta;
                p.z += _outwardDir.y * burstForce * cappedDelta;
            }

            // 5. Write to instance matrix
            dummy.position.set(p.x, p.y, p.z);
            dummy.rotation.set(p.rotX, p.rotY, p.rotZ);
            dummy.scale.set(currentScale * sproutScale, (currentScale * 0.3) * sproutScale, (currentScale * 0.8) * sproutScale);
            dummy.updateMatrix();
            instancedMeshRef.current.setMatrixAt(i, dummy.matrix);
        }

        instancedMeshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <group>
            {/* 1. Ambient Particle Ecosystem — continuously drifting spores */}
            <instancedMesh
                ref={instancedMeshRef}
                args={[undefined, undefined, numParticles]}
                material={floraMaterial}
                frustumCulled={false}
            >
                <sphereGeometry args={[1, 8, 6]} />
            </instancedMesh>

            {/* 2. Hanging Filaments (Dripping tethers physics pinned via vertex shader) */}
            <group>
                {mergedFilaments && (
                    <mesh material={filamentMaterial}>
                        <primitive object={mergedFilaments} attach="geometry" />
                    </mesh>
                )}
            </group>
        </group>
    );
}

/**
 * Spawn a single particle with randomized properties.
 * @param topY   - The Y ceiling where particles can spawn
 * @param bottomY - The Y floor (death boundary)
 * @param atTop  - If true, spawn strictly at the top (respawn). If false, scatter across full height (init).
 */
function spawnParticle(topY: number, bottomY: number, atTop: boolean): ParticleState {
    const angle = Math.random() * Math.PI * 2;
    const radius = 3.0 + Math.random() * 4.0;

    return {
        x: Math.cos(angle) * radius,
        y: atTop
            ? topY + Math.random() * 5.0  // spawn slightly above viewport so they drift in naturally
            : topY - Math.random() * (topY - bottomY), // scatter across full column on init
        z: Math.sin(angle) * radius,
        rotX: Math.random() * Math.PI,
        rotY: Math.random() * Math.PI,
        rotZ: Math.random() * Math.PI,
        scale: 0.15 + Math.random() * 0.35,
        fallSpeed: 0.3 + Math.random() * 0.6,   // units/sec — gentle, leaf-like descent
        noisePhase: Math.random() * Math.PI * 2,  // unique offset for lateral sway
        tumbleSpeed: 0.5 + Math.random() * 1.5,   // rotational velocity
    };
}
