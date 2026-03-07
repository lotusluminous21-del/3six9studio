'use client';

import { useEffect, useRef, useMemo } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { useScrollStore } from '../store/glitchStore';
import { shaderMaterial } from '@react-three/drei';

import { useAudioStore } from '../store/audioStore';
import { useAppStore } from '../store/appStore';
import { useGPUStore } from '../store/gpuStore';

const DustMoteMaterial = shaderMaterial(
    {
        uTime: 0,
        uVelocity: 0,
        uAudioLow: 0,
        uAudioHigh: 0,
        uEntrance: 0,
        uColor: new THREE.Color("#d4e8e1") // Soft minty/teal tint
    },
    // Vertex Shader
    `
    precision mediump float;
    uniform float uTime;
    uniform float uVelocity;
    uniform float uAudioLow;
    uniform float uAudioHigh;
    uniform float uEntrance;
    varying float vAlpha;
    
    void main() {
        // Start with local stretched geometry
        vec3 transformed = position;
        
        // Stretch local Y based on velocity. 
        // We multiply by a large factor because velocity is usually very small (0.01 to 0.1)
        float stretch = 1.0 + uVelocity * 80.0;
        transformed.y *= stretch;

        // Apply instance matrix to get basic world size/rotation/position
        vec4 instanceWorld = instanceMatrix * vec4(transformed, 1.0);
        
        // Add organic slow drift based on world position
        instanceWorld.y += sin(uTime * 0.5 + instanceWorld.x) * 0.5;
        instanceWorld.x += cos(uTime * 0.3 + instanceWorld.y) * 0.5;
        
        // Add high-frequency jitter
        float jitter = uAudioHigh * 0.5;
        instanceWorld.xyz += vec3(
            sin(uTime * 50.0 + float(gl_InstanceID)) * jitter,
            cos(uTime * 45.0 + float(gl_InstanceID)) * jitter,
            sin(uTime * 60.0 + float(gl_InstanceID)) * jitter
        );

        // Bass expansion
        instanceWorld.xyz *= 1.0 + uAudioLow * 0.05;

        // Final screen position
        vec4 mvPosition = viewMatrix * modelMatrix * instanceWorld;
        gl_Position = projectionMatrix * mvPosition;
        
        // Random alpha based on ID + high freq pulse
        float pulse = sin(uTime * 15.0 + float(gl_InstanceID)) * uAudioHigh;
        vAlpha = (0.2 + 0.4 * sin(uTime * 0.5 + float(gl_InstanceID)) + pulse) * uEntrance;
    }
    `,
    // Fragment Shader
    `
    precision mediump float;
    uniform vec3 uColor;
    varying float vAlpha;
    
    void main() {
        // Create a soft spherical look using point coordinates if we were using gl.Points, 
        // but since we render a very tiny geometry, we just output the color.
        gl_FragColor = vec4(uColor, vAlpha);
        
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
    }
    `
);

extend({ DustMoteMaterial });

declare module '@react-three/fiber' {
    interface ThreeElements {
        dustMoteMaterial: any;
    }
}

export default function DustMotes() {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const matRef = useRef<any>(null);
    const quality = useGPUStore((s) => s.quality);
    const count = quality === 'low' ? 200 : quality === 'medium' ? 500 : 800;

    useEffect(() => {
        if (!meshRef.current) return;
        const dummy = new THREE.Object3D();

        for (let i = 0; i < count; i++) {
            // Distribute widely around the scene bounds
            // X: [-25, 25]
            // Y: [15, -60] to cover entire scroll depth
            // Z: [-30, 0]
            dummy.position.set(
                (Math.random() - 0.5) * 50,
                15 - Math.random() * 75,
                -30 + Math.random() * 35
            );

            // Random scaling
            const scale = 0.2 + Math.random() * 0.8;
            dummy.scale.set(scale, scale, scale);

            // We keep rotation at 0 so local Y aligns with world Y for correct velocity stretching!
            dummy.rotation.set(0, 0, 0);

            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [count]);

    useFrame((state) => {
        if (matRef.current) {
            const { isEntered, entranceStartTime } = useAppStore.getState();
            const t = isEntered && entranceStartTime ? (performance.now() / 1000) - entranceStartTime : 0;

            const { derivative, highFreqSpike } = useAudioStore.getState();
            matRef.current.uTime = state.clock.elapsedTime;
            matRef.current.uVelocity = useScrollStore.getState().scrollVelocity;
            matRef.current.uAudioLow = derivative;
            matRef.current.uAudioHigh = highFreqSpike;
            matRef.current.uEntrance = THREE.MathUtils.clamp(t / 1.0, 0.0, 1.0);
        }
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]} renderOrder={1} frustumCulled={false}>
            <sphereGeometry args={[0.02, 4, 4]} />
            <dustMoteMaterial ref={matRef} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
        </instancedMesh>
    );
}
