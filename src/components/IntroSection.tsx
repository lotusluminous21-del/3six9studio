'use client';

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Text } from '@react-three/drei';
import { motion } from 'framer-motion-3d';
import * as THREE from 'three';
import { useScrollStore } from '../store/glitchStore';
import { useAppStore } from '../store/appStore';

export default function IntroSection() {
    // The logo GLTF is loaded from public directory
    const { scene } = useGLTF('/model.glb', 'https://www.gstatic.com/draco/v1/decoders/') as any;
    const { size } = useThree();
    const isMobile = size.width < 768;

    const logoRef = useRef<THREE.Group>(null);
    const textRef = useRef<THREE.Mesh>(null);

    // Clone the scene so we can modify materials without affecting the cache
    const clonedLogo = useMemo(() => {
        const clone = scene.clone(true);

        // Create a custom Grown Crystal / Refractive Glass material
        const crystalMaterial = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color('#ffffff'),
            transmission: 1.0, // High transmission for glass effect
            opacity: 1.0,
            metalness: 0.1,
            roughness: 0.1,
            ior: 1.5, // Index of refraction (glass-like)
            thickness: 2.0, // Volume for refraction
            specularIntensity: 0.7,
            clearcoat: 0.8,
            clearcoatRoughness: 0.1,
            transparent: true,
            side: THREE.FrontSide,
        });

        // Apply it to all meshes in the logo
        clone.traverse((child: any) => {
            if (child.isMesh) {
                child.material = crystalMaterial;
            }
        });
        return { clone, crystalMaterial };
    }, [scene]);

    useFrame((state, delta) => {
        if (!logoRef.current) return;

        const { currentScrollProgress } = useScrollStore.getState();
        const { isEntered, entranceStartTime } = useAppStore.getState();
        const t = isEntered && entranceStartTime ? (performance.now() / 1000) - entranceStartTime : 0;

        // Calculate overall intro progress
        const textFadeProgress = THREE.MathUtils.clamp(currentScrollProgress / 0.15, 0, 1);

        // Continuous slow elegant spin for proper 3D logo feel
        logoRef.current.rotation.y += delta * 0.25;

        // Constant subtle floating (up and down)
        // Using state.clock.elapsedTime for a constant, non-clamped time source
        const floatY = (Math.sin(state.clock.elapsedTime * 1.5) * 0.15) - 0.3;
        logoRef.current.position.y = floatY;

        // Fade out entirely as they leave the top of the screen (around Y=7)
        // Camera hits Y=7 at offset ~0.20
        const fadeOutProgress = THREE.MathUtils.clamp((currentScrollProgress - 0.15) / 0.10, 0, 1);
        const logoVisibility = 1.0 - fadeOutProgress;

        // Text fades in smoothly from the start and fades out together with logo
        if (textRef.current) {
            (textRef.current as any).fillOpacity = textFadeProgress * logoVisibility * (isEntered ? 1.0 : 0.0);
        }

        // Update opacity
        clonedLogo.crystalMaterial.opacity = logoVisibility * (isEntered ? 1.0 : 0.0);
    });

    const isEntered = useAppStore(s => s.isEntered);

    return (
        // The intro group is placed exactly where the camera starts (Y=15, Z=-10)
        // Everything naturally scrolls up as the camera descends.
        <group position={[0, 15, -10]}>
            <motion.group 
                {...({
                    initial: { opacity: 0, scale: 0.8 },
                    animate: { 
                        opacity: isEntered ? 1 : 0, 
                        scale: isEntered ? 1 : 0.8 
                    },
                    transition: { 
                        opacity: { duration: 1.5, delay: 0.5 },
                        scale: { duration: 2.0, delay: 0.5, type: 'spring', bounce: 0.2 }
                    }
                } as any)}
            >
                {/* The Logo Group */}
                {/* Set a fixed prominent scale of 0.08, matching the user requested larger size */}
                <group ref={logoRef} position={[0, 0, 0]} scale={[0.08, 0.08, 0.08]}>
                    <primitive object={clonedLogo.clone} />
                </group>

                {/* The 3D Text Overlay */}
                <Text
                    ref={textRef as any}
                    position={[0, -2.5, 0]} // Placed closer to the logo
                    rotation={[0, Math.PI / 2, 0]} // Face the camera (+X)
                    font="/Michroma-Regular.ttf"
                    fontSize={isMobile ? 0.35 : 0.5}
                    maxWidth={8}
                    lineHeight={1.1}
                    textAlign="center"
                    color="white"
                    fillOpacity={0} // Drei Text uses fillOpacity for transparency
                    anchorX="center"
                    anchorY="middle"
                >
                    Cultivating synthetic realities. Where raw data blooms into living ecosystems.
                </Text>
            </motion.group>
        </group>
    );
}


useGLTF.preload('/model.glb', 'https://www.gstatic.com/draco/v1/decoders/');
// Preload fonts for Text components
(Text as any).preload?.('/Michroma-Regular.ttf');
