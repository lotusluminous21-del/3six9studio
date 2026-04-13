'use client';

import { useRef, useMemo } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { HelixMaterial } from './shaders/HelixMaterial';
import { useScrollStore } from '../store/glitchStore';
import { useAudioStore } from '../store/audioStore';
import { useAppStore } from '../store/appStore';
import { useGPUStore } from '../store/gpuStore';
import EnvironmentFlora from './EnvironmentFlora';

// Register custom materials so R3F can use them cleanly in JSX
// Not needed here since materials are instantiated with 'new' and passed to props, 
// or registered globally in FloatingCards.tsx.




export default function CentralSpine() {
    // Number of twists from top to bottom
    const twists = -12;
    // How wide the helix is
    const radius = 2.5;
    // Total height of the spiral covering all cards
    const totalHeight = 250;
    const quality = useGPUStore((s) => s.quality);
    // Number of points sampled to build the smooth curve
    const pathSamples = quality === 'low' ? 120 : quality === 'medium' ? 200 : 300;

    // Start Y from the very top of the intro sequence (15) so it merges organically
    const startY = 15;

    // Generate 3 mathematically interwoven spiral curves, and connecting bridges
    const { tube1, tube2, tube3, mergedBridges } = useMemo(() => {
        const points1 = [];
        const points2 = [];
        const points3 = [];

        for (let i = 0; i <= pathSamples; i++) {
            const t = i / pathSamples;
            const y = startY - (t * totalHeight);

            // 3 strands means each starts 120 degrees (2*PI/3) apart
            const angleBasis = t * Math.PI * 2 * twists;

            points1.push(new THREE.Vector3(
                Math.cos(angleBasis) * radius,
                y,
                Math.sin(angleBasis) * radius
            ));

            points2.push(new THREE.Vector3(
                Math.cos(angleBasis + (Math.PI * 2 / 3)) * radius,
                y,
                Math.sin(angleBasis + (Math.PI * 2 / 3)) * radius
            ));

            points3.push(new THREE.Vector3(
                Math.cos(angleBasis + (Math.PI * 4 / 3)) * radius,
                y,
                Math.sin(angleBasis + (Math.PI * 4 / 3)) * radius
            ));
        }

        // Generate uniform ladder-like bridges connecting the strands
        const bridges: { curve: THREE.Curve<THREE.Vector3>, thickness: number }[] = [];
        const numBridges = quality === 'low' ? 30 : quality === 'medium' ? 55 : 85;

        for (let i = 0; i < numBridges; i++) {
            // Add slight randomness to spacing so they feel grown, not machined
            const t = (i / numBridges) + (Math.random() * 0.005 - 0.0025);
            const y = startY - (t * totalHeight);

            // Exactly matching the helix angle at this height
            const angleBasis = t * Math.PI * 2 * twists;

            const p1 = new THREE.Vector3(Math.cos(angleBasis) * radius, y, Math.sin(angleBasis) * radius);
            const p2 = new THREE.Vector3(Math.cos(angleBasis + (Math.PI * 2 / 3)) * radius, y, Math.sin(angleBasis + (Math.PI * 2 / 3)) * radius);
            const p3 = new THREE.Vector3(Math.cos(angleBasis + (Math.PI * 4 / 3)) * radius, y, Math.sin(angleBasis + (Math.PI * 4 / 3)) * radius);

            // Calculate organic drooping midpoints between strands instead of routing to center
            const droopAmount = 1.2 + Math.random() * 0.5; // How far the mycelium sags

            const mid12 = new THREE.Vector3().lerpVectors(p1, p2, 0.5);
            mid12.y -= droopAmount;
            // Pull slightly towards center for a tighter core wrap, but ONLY on X and Z axis
            // Multiplying the whole vector pulls the Y coordinate towards 0, causing severe distortion at lower bounds
            mid12.x *= 0.7;
            mid12.z *= 0.7;

            const mid23 = new THREE.Vector3().lerpVectors(p2, p3, 0.5);
            mid23.y -= droopAmount;
            mid23.x *= 0.7;
            mid23.z *= 0.7;

            const mid31 = new THREE.Vector3().lerpVectors(p3, p1, 0.5);
            mid31.y -= droopAmount;
            mid31.x *= 0.7;
            mid31.z *= 0.7;

            // Organic, variable thickness
            const baseThickness = 0.015 + Math.random() * 0.02;

            // Connect strand to strand passing through the drooping midpoint
            bridges.push({ curve: new THREE.QuadraticBezierCurve3(p1, mid12, p2), thickness: baseThickness });
            bridges.push({ curve: new THREE.QuadraticBezierCurve3(p2, mid23, p3), thickness: baseThickness });
            bridges.push({ curve: new THREE.QuadraticBezierCurve3(p3, mid31, p1), thickness: baseThickness });
        }

        // Create and merge the actual geometries here to avoid doing it every render
        const bridgeGeometries = bridges.map(b => new THREE.TubeGeometry(b.curve, 6, b.thickness, 4, false));
        const mergedBridges = bridgeGeometries.length > 0 ? BufferGeometryUtils.mergeGeometries(bridgeGeometries) : null;

        return {
            tube1: new THREE.CatmullRomCurve3(points1),
            tube2: new THREE.CatmullRomCurve3(points2),
            tube3: new THREE.CatmullRomCurve3(points3),
            mergedBridges
        };
    }, [twists, radius, totalHeight, pathSamples, startY]);

    // Use an instance for the strands and an instance for the bridges
    const { strandMaterial, bridgeMaterial } = useMemo(() => {
        const sMat = new HelixMaterial();
        sMat.transparent = true;
        sMat.uTime = 0;
        sMat.uEntrance = 0;
        sMat.uIsFlora = 0;
        sMat.uIsBridge = 0;
        sMat.uScrollDepth = useScrollStore.getState().currentScrollProgress;
        
        // Blue-Core / Red-Accent Color Profile
        sMat.uColorBase = new THREE.Color('#020008').convertLinearToSRGB();   // Near-black deep blue
        sMat.uColorAccent = new THREE.Color('#0066cc').convertLinearToSRGB(); // Deep electric blue
        sMat.uColorGlance = new THREE.Color('#cc0055').convertLinearToSRGB(); // Magenta rim accent

        const bMat = new HelixMaterial();
        bMat.transparent = true;
        bMat.uTime = 0;
        bMat.uEntrance = 0;
        bMat.uIsFlora = 0;
        bMat.uIsBridge = 1; // Mark as bridge to trigger pulsing
        bMat.uScrollDepth = useScrollStore.getState().currentScrollProgress;
        
        // Match the green profile for the bridges
        bMat.uColorBase = sMat.uColorBase;
        bMat.uColorAccent = sMat.uColorAccent;
        bMat.uColorGlance = sMat.uColorGlance;

        return { strandMaterial: sMat, bridgeMaterial: bMat };
    }, []);

    // Track entrance animation progress
    const entranceProgress = useRef(0);
    // Track rotation for the "drilling" effect
    const rotationRef = useRef(0);
    const rotationVelocityRef = useRef(0.05); // Base slow rotation
    const groupRef = useRef<THREE.Group>(null);

    // Create a material ref for the inner core glow
    const coreMaterialRef = useRef<THREE.MeshBasicMaterial>(null);

    // The core loop: pass time, scroll position, and advance entrance animation
    useFrame((state, delta) => {
        const safeDelta = Math.min(delta, 1 / 30);
        const { isEntered, entranceStartTime } = useAppStore.getState();
        const t = isEntered && entranceStartTime ? (performance.now() / 1000) - entranceStartTime : 0;
        const scrollDepth = useScrollStore.getState().currentScrollProgress;

        // Rooting: 1.0s -> 2.5s (Starts after logo is established)
        const strandEntrance = THREE.MathUtils.clamp((t - 1.0) / 1.5, 0, 1);

        // Nexus: 1.5s -> 2.5s
        const bridgeEntrance = THREE.MathUtils.clamp((t - 1.5) / 1.0, 0, 1);

        if (strandMaterial && bridgeMaterial) {
            const { mid, highFreqSpike, smoothedKick, kickTransient } = useAudioStore.getState();

            // Drive materials
            strandMaterial.uTime = t;
            strandMaterial.uScrollDepth = scrollDepth;
            strandMaterial.uEntrance = strandEntrance;
            strandMaterial.uAudioLow = smoothedKick;       // Heavy, deep thump
            strandMaterial.uAudioMid = mid;
            strandMaterial.uAudioHigh = highFreqSpike;
            // Let the smoothed kick drive the overall strength, but delicately
            strandMaterial.uAudioStrength = 1.0 + smoothedKick * 0.8;

            bridgeMaterial.uTime = t;
            bridgeMaterial.uScrollDepth = scrollDepth;
            bridgeMaterial.uEntrance = bridgeEntrance;
            bridgeMaterial.uAudioLow = smoothedKick;
            bridgeMaterial.uAudioMid = mid;
            bridgeMaterial.uAudioHigh = highFreqSpike;
            bridgeMaterial.uAudioStrength = 1.0 + smoothedKick * 0.8;

            // --- The "Drill" Rotation ---
            if (groupRef.current) {
                // Base speed + very subtle lift from smoothed kick
                let targetVelocity = 0.05 + (smoothedKick * 0.8);

                // Sharp spike when a true kick transient hits (heavy downbeat)
                if (kickTransient > 0.1) {
                    targetVelocity += kickTransient * 1.0;
                }

                // Smoothly damp the velocity so it doesn't snap instantly
                rotationVelocityRef.current = THREE.MathUtils.lerp(
                    rotationVelocityRef.current,
                    targetVelocity,
                    Math.min(1, safeDelta * 5.0) // Adjust for faster/slower braking
                );

                rotationRef.current += rotationVelocityRef.current * safeDelta;
                groupRef.current.rotation.y = rotationRef.current;
            }
            // Fade the inner core progressively during the Nexus phase (0.5s - 1.5s)
            if (coreMaterialRef.current) {
                // Max opacity is 0.03
                coreMaterialRef.current.opacity = bridgeEntrance * 0.03;
            }
        }
    });

    return (
        <group ref={groupRef} position={[0, -5, -10]}>
            {/* Strand 1 */}
            <mesh material={strandMaterial}>
                <tubeGeometry args={[tube1, pathSamples, 0.5, quality === 'low' ? 5 : quality === 'medium' ? 6 : 8, false]} />
            </mesh>

            {/* Strand 2 */}
            <mesh material={strandMaterial}>
                <tubeGeometry args={[tube2, pathSamples, 0.5, quality === 'low' ? 5 : quality === 'medium' ? 6 : 8, false]} />
            </mesh>

            {/* Strand 3 */}
            <mesh material={strandMaterial}>
                <tubeGeometry args={[tube3, pathSamples, 0.5, quality === 'low' ? 5 : quality === 'medium' ? 6 : 8, false]} />
            </mesh>

            {mergedBridges && (
                <mesh material={bridgeMaterial}>
                    <primitive object={mergedBridges} attach="geometry" />
                </mesh>
            )}

            <EnvironmentFlora />

            {/* Very soft inner glowing core to unify the 3 strands into a single entity */}
            {/* The glow uses a simple cylinder that runs down the middle */}
            <mesh position={[0, startY - (totalHeight / 2), 0]}>
                <cylinderGeometry args={[0.5, 0.5, totalHeight, 8, 1, true]} />
                <meshBasicMaterial ref={coreMaterialRef} color="#4488ff" transparent={true} opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
        </group>
    );
}
