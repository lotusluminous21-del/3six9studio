'use client';

import { useRef } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import { useScrollStore } from '../store/glitchStore';
import { useAppStore } from '../store/appStore';
import { AmbientFieldMaterial } from './shaders/AmbientFieldMaterial';
import * as THREE from 'three';

extend({ AmbientFieldMaterial });

declare module '@react-three/fiber' {
    interface ThreeElements {
        ambientFieldMaterial: any;
    }
}

/**
 * AmbientField — A camera-following living background gradient.
 *
 * Renders a large plane that always stays behind the camera,
 * facing it, so the volumetric gradient is visible regardless
 * of camera orbit/rotation. The plane repositions itself every
 * frame along the camera's negative forward vector.
 */
export default function AmbientField() {
    const matRef = useRef<any>(null);
    const meshRef = useRef<THREE.Mesh>(null);

    // Reusable vectors to avoid GC pressure
    const _forward = useRef(new THREE.Vector3());
    const _targetPos = useRef(new THREE.Vector3());

    useFrame((state) => {
        if (!matRef.current || !meshRef.current) return;

        const { isEntered, entranceStartTime } = useAppStore.getState();
        const t = isEntered && entranceStartTime ? (performance.now() / 1000) - entranceStartTime : 0;

        // Feed uniforms
        matRef.current.uTime = state.clock.elapsedTime;
        matRef.current.uScrollProgress = useScrollStore.getState().currentScrollProgress;

        // Narrative sequence: Genesis (fade in 0.0s - 1.0s)
        matRef.current.uEntrance = THREE.MathUtils.clamp(t / 1.0, 0.0, 1.0);

        // Position the plane behind the camera, always facing it
        const cam = state.camera;

        // Get the camera's forward direction
        cam.getWorldDirection(_forward.current);

        // Place the plane far behind the camera's look target
        _targetPos.current.copy(cam.position).add(
            _forward.current.multiplyScalar(120)
        );
        meshRef.current.position.copy(_targetPos.current);

        // Make the plane face the camera
        meshRef.current.lookAt(cam.position);
    });

    return (
        <mesh
            ref={meshRef}
            renderOrder={-1}
            frustumCulled={false}
        >
            <planeGeometry args={[400, 400]} />
            <ambientFieldMaterial
                ref={matRef}
                side={THREE.DoubleSide}
                depthWrite={false}
            />
        </mesh>
    );
}
