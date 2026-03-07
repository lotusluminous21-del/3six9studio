'use client';

import { useRef, useState, useMemo, useEffect } from 'react';
import { Group, MathUtils, Vector2 } from 'three';
import { useFrame, extend, useLoader } from '@react-three/fiber';
import { Text, useTexture, RoundedBox, useGLTF, Text3D, Center } from '@react-three/drei';
import * as THREE from 'three';
import { useScrollStore } from '../store/glitchStore';
import { useAudioStore } from '../store/audioStore';
import { useAppStore } from '../store/appStore';
import { HelixMaterial } from './shaders/HelixMaterial';
import { TTFLoader } from 'three/addons/loaders/TTFLoader.js';
import { OrganicTextMaterial } from './shaders/OrganicTextMaterial';
import { BannerMaterial } from './shaders/BannerMaterial';

// Preload the font
useLoader.preload(TTFLoader, '/Michroma-Regular.ttf');

declare module '@react-three/fiber' {
    interface ThreeElements {
        helixMaterial: any;
        organicTextMaterial: any;
        bannerMaterial: any;
    }
}


extend({ HelixMaterial, OrganicTextMaterial, BannerMaterial });


export default function FloatingCards() {
    const groupRef = useRef<Group>(null);
    const categories = useAppStore(s => s.categories);

    // Preload textures or video metadata safely
    useEffect(() => {
        categories.forEach(project => {
            if (project.image && typeof project.image === 'string' && project.image.match(/\.(jpeg|jpg|gif|png)$/i)) {
                try {
                    useTexture.preload(project.image);
                } catch(e) {}
            }
        });
    }, [categories]);

    const radius = 10;
    const ySpacing = 4.5;
    const twistRate = (Math.PI * 2) / 9;

    return (
        <group ref={groupRef} position={[0, -5, -10]}>
            <SequenceLogo index={0} radius={radius} ySpacing={ySpacing} twistRate={twistRate} />
            <SequenceText index={1} radius={radius} ySpacing={ySpacing} twistRate={twistRate} />

            {categories.map((project, index) => {
                const actualIndex = index + 2;
                const angle = actualIndex * twistRate;
                const x = Math.cos(angle) * radius;
                const z = Math.sin(angle) * radius;
                const y = -actualIndex * ySpacing;

                return (
                    <Card
                        key={project.id}
                        data={project}
                        position={[x, y, z]}
                        angle={angle}
                        index={actualIndex}
                    />
                );
            })}
        </group>
    );
}

function SequenceLogo({ index, radius, ySpacing, twistRate }: { index: number, radius: number, ySpacing: number, twistRate: number }) {
    const angle = index * twistRate;
    const y = -index * ySpacing;

    const { scene } = useGLTF('/model.glb', 'https://www.gstatic.com/draco/v1/decoders/') as any;
    const logoRef = useRef<THREE.Group>(null);
    const unitRef = useRef<THREE.Group>(null);
    const clonedLogo = useMemo(() => {
        const clone = scene.clone(true);
        clone.traverse((child: any) => {
            if (child.isMesh) {
                if (child.geometry) {
                    child.geometry.computeVertexNormals();
                }
                child.material = new OrganicTextMaterial();
                child.material.transparent = true;
                child.material.uColorOrganic = new THREE.Color('#8d6e63');
                child.material.uColorSynthesis = new THREE.Color('#ffccbc');
                child.material.uSynthesisProgress = 0.2;
                child.material.uWobble = 0.5;
            }
        });
        return clone;
    }, [scene]);

    const groupRef = useRef<THREE.Group>(null);
    const font = useLoader(TTFLoader, '/Michroma-Regular.ttf');
    const entranceRef = useRef({ visibility: 0 });
    const _worldPos = useRef(new THREE.Vector3());
    const textMatRef = useRef<any>(null);
    const textRef = useRef<any>(null);

    // Explicitly center the text3D geometry for perfect alignment
    useEffect(() => {
        if (textRef.current && textRef.current.geometry) {
            textRef.current.geometry.center();
        }
    }, [textRef.current]);

    useFrame((state, delta) => {
        if (!unitRef.current || !groupRef.current) return;

        const { isEntered, entranceStartTime } = useAppStore.getState();
        const t = isEntered && entranceStartTime ? (performance.now() / 1000) - entranceStartTime : 0;

        // logoRef scale (elastic bubble pop)
        const logoPopStart = 0;
        const logoPopDuration = 0.8;
        const lp = THREE.MathUtils.clamp((t - logoPopStart) / logoPopDuration, 0, 1);

        // Elastic out effect
        const c4 = (2 * Math.PI) / 3;
        const elasticScale = lp === 0 ? 0 : lp === 1 ? 1 : Math.pow(2, -10 * lp) * Math.sin((lp * 10 - 0.75) * c4) + 1;

        if (logoRef.current) {
            const baseScale = 0.02 * elasticScale;
            logoRef.current.scale.setScalar(baseScale);

            // Constant subtle floating
            const floatY = (Math.sin(state.clock.elapsedTime * 1.5) * 0.1) - 0.1;
            logoRef.current.position.y = floatY;
        }

        // --- ENTRANCE FADE & MASKING ---
        // Scroll visibility logic matches Card
        groupRef.current.getWorldPosition(_worldPos.current);
        const camDist = state.camera.position.distanceTo(_worldPos.current);
        const activationDist = 35;
        const targetVis = camDist < activationDist ? 1 : 0;
        entranceRef.current.visibility = THREE.MathUtils.lerp(
            entranceRef.current.visibility,
            targetVis,
            3 * delta
        );

        // Logo fades in fast at the very start
        const logoFade = THREE.MathUtils.clamp(t / 0.4, 0, 1);
        const finalLogoVis = logoFade * entranceRef.current.visibility;

        // Text reveal is delayed and more gradual
        const textRevealT = THREE.MathUtils.clamp((t - 0.5) / 1.0, 0, 1);
        const finalUnitVis = textRevealT * entranceRef.current.visibility;

        clonedLogo.traverse((child: any) => {
            if (child.isMesh && child.material) {
                const mat = child.material as any;
                mat.uOpacity = finalLogoVis;
                mat.uTime = t;
            }
        });

        unitRef.current.visible = finalLogoVis > 0 || finalUnitVis > 0;

        if (textMatRef.current) {
            textMatRef.current.uOpacity = finalUnitVis;
            textMatRef.current.uTime = t;

            // Breathing scale animation (subtle)
            if (textRef.current) {
                const breatheScale = 1.0 + Math.sin(state.clock.elapsedTime * 1.5) * 0.03;
                textRef.current.scale.setScalar(breatheScale);
            }
        }
    });

    return (
        <group ref={groupRef} position={[0, y, 0]} rotation={[0, -angle + Math.PI / 2, 0]}>
            <group position={[0, 0.8, radius]}>
                {/* Individual components centered independently at origin [0,0,z] */}
                <group ref={unitRef}>
                    {/* Logo — centered explicitly */}
                    <Center>
                        <group ref={logoRef} scale={[0.02, 0.02, 0.02]}>
                            <primitive object={clonedLogo} />
                        </group>
                    </Center>

                    {/* Studio name directly below logo, with curvature and tighter tracking */}
                    <group position={[0, -1.8, 0]}>
                        <Text3D
                            ref={textRef}
                            font={font as any}
                            size={0.55}
                            height={0.1}
                            curveSegments={12}
                            bevelEnabled
                            bevelThickness={0.03}
                            bevelSize={0.01}
                            bevelOffset={0}
                            bevelSegments={5}
                            lineHeight={1.0}
                            letterSpacing={-0.06}
                        >
                            {`3six9 Studio`}
                            <organicTextMaterial
                                ref={textMatRef}
                                uColorOrganic="#8d6e63"
                                uColorSynthesis="#ffccbc"
                                uOpacity={0}
                                uWobble={0.3}
                                uRadius={radius}
                                uCurvature={1.0}
                                transparent
                            />
                        </Text3D>
                    </group>
                </group>
            </group>
        </group>
    );
}

function SequenceText({ index, radius, ySpacing, twistRate }: { index: number, radius: number, ySpacing: number, twistRate: number }) {
    const angle = index * twistRate;
    const y = -index * ySpacing;

    const groupRef = useRef<THREE.Group>(null);
    const materialRef = useRef<any>(null);
    const bannerMatRef = useRef<any>(null);
    const textRef = useRef<any>(null);

    const entranceRef = useRef({ visibility: 0 });
    const _worldPos = useRef(new THREE.Vector3());

    const font = useLoader(TTFLoader, '/Michroma-Regular.ttf');

    // Center the geometry
    useEffect(() => {
        if (textRef.current && textRef.current.geometry) {
            textRef.current.geometry.center();
        }
    }, [textRef.current]);

    useFrame((state, delta) => {
        if (!groupRef.current || !materialRef.current) return;

        const { isEntered, entranceStartTime } = useAppStore.getState();
        const t = isEntered && entranceStartTime ? (performance.now() / 1000) - entranceStartTime : 0;

        groupRef.current.getWorldPosition(_worldPos.current);
        const camDist = state.camera.position.distanceTo(_worldPos.current);
        const activationDist = 35;
        const targetVis = camDist < activationDist ? 1 : 0;
        entranceRef.current.visibility = THREE.MathUtils.lerp(
            entranceRef.current.visibility,
            targetVis,
            3 * delta
        );

        // Delayed entrance: 1.8s
        const entranceProgress = THREE.MathUtils.clamp((t - 1.8) / 1.2, 0, 1);
        const finalVis = entranceProgress * entranceRef.current.visibility;

        // Horizontal expansion for banner (from 1.8s to 2.8s)
        const bannerExpansion = THREE.MathUtils.clamp((t - 1.8) / 1.0, 0, 1);
        const eX = THREE.MathUtils.lerp(0.001, 1.0, bannerExpansion);

        materialRef.current.uOpacity = finalVis;
        materialRef.current.uTime = t;

        if (bannerMatRef.current) {
            bannerMatRef.current.uOpacity = finalVis;
            bannerMatRef.current.uTime = t;
            // Apply horizontal expansion
            bannerMatRef.current.uExpansion = eX;
        }
    });


    return (
        <group ref={groupRef} position={[0, y, 0]} rotation={[0, -angle + Math.PI / 2, 0]}>
            <group position={[0, 0, radius]}>
                <Center>
                    {/* The Banner Stage */}
                    <mesh position={[0, 0, -0.3]} rotation={[0, 0, 0]}>
                        <planeGeometry args={[80, 2.5, 256, 4]} />
                        <bannerMaterial
                            ref={bannerMatRef}
                            uRadius={radius}
                            uCurvature={1.0}
                            uWobble={0.2}
                            uOpacity={0}
                            transparent
                        />
                    </mesh>

                    <Text3D

                        ref={textRef}
                        font={font as any}
                        size={0.5}
                        height={0.15}
                        curveSegments={12}
                        bevelEnabled
                        bevelThickness={0.05}
                        bevelSize={0.02}
                        bevelOffset={0}
                        bevelSegments={5}
                        lineHeight={0.45}
                        letterSpacing={0.01}
                    >
                        {`SYNTHETIC\nREALITIES`}
                        <organicTextMaterial
                            ref={materialRef}
                            uColorOrganic="#8d6e63"
                            uColorSynthesis="#ffccbc"
                            uRadius={radius}
                            uCurvature={1.0}
                            uWobble={0.4}
                            uOpacity={0}
                            transparent
                        />
                    </Text3D>
                </Center>
            </group>
        </group>
    );
}

useGLTF.preload('/model.glb', 'https://www.gstatic.com/draco/v1/decoders/');

function Card({ data, position, angle, index }: {
    data: any;
    position: [number, number, number];
    angle: number;
    index: number;
}) {
    const cardRef = useRef<Group>(null);
    const glassMatRef = useRef<any>(null);
    const imageMatRef = useRef<any>(null);
    const textMatTitleRef = useRef<any>(null);
    const textMatSubRef = useRef<any>(null);
    const textGroupRef = useRef<Group>(null);
    const imageGroupRef = useRef<Group>(null);
    const [hovered, setHovered] = useState(false);

    // Reusable objects for useFrame
    const _cardWorldPos = useRef(new THREE.Vector3());
    const _targetColor = useRef(new THREE.Color());

    const isVideo = data.image && (data.image.endsWith('.mp4') || data.image.endsWith('.webm'));
    const isAudio = data.image && (data.image.endsWith('.mp3') || data.image.endsWith('.wav'));
    
    // We only load texture if it's an image. Otherwise we fallback to null or a video texture.
    const texture = isVideo || isAudio ? null : useTexture(data.image) as THREE.Texture;
    
    // For video cover
    const [video] = useState(() => {
        if (isVideo) {
            const vid = document.createElement("video");
            vid.src = data.image;
            vid.crossOrigin = "Anonymous";
            vid.loop = true;
            vid.muted = true;
            vid.defaultMuted = true;
            vid.playsInline = true;
            vid.setAttribute('loop', 'true');
            vid.setAttribute('muted', 'true');
            vid.setAttribute('playsinline', 'true');
            return vid; // Playback handled by useFrame
        }
        return null;
    });

    const entranceRef = useRef({ visibility: 0 });
    const videoPlaying = useRef(false);

    useFrame((state, delta) => {
        if (!cardRef.current) return;

        const { isEntered, entranceStartTime } = useAppStore.getState();
        const t = isEntered && entranceStartTime ? (performance.now() / 1000) - entranceStartTime : 0;

        // --- NARRATIVE BLOSSOM ANIMATION ---
        // Cards pop into existence starting at 2.2s (after helix and banner)
        const blossomStartT = 2.2 + index * 0.15;
        const blossomDuration = 0.4; // Very snappy pop
        const blossomProgress = THREE.MathUtils.clamp((t - blossomStartT) / blossomDuration, 0, 1);
        const easedBlossom = THREE.MathUtils.clamp(blossomProgress, 0, 1);

        // Very snappy, elastic pop for scale (overshoots noticeably then settles)
        const c1 = 1.70158;
        const c3 = c1 + 1;
        const p = blossomProgress;
        const popScale = p === 0 ? 0 : p === 1 ? 1 : 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);

        // --- SCROLL-DRIVEN ENTRANCE ANIMATION ---
        cardRef.current.getWorldPosition(_cardWorldPos.current);
        const camDist = state.camera.position.distanceTo(_cardWorldPos.current);

        const activationDist = 35;
        const targetVis = camDist < activationDist ? 1 : 0;
        
        // Video performance optimization & robust playback state
        if (video) {
            // Play video when card is visible and blossomed, pause otherwise
            if (targetVis === 1 && easedBlossom > 0) {
                if (!videoPlaying.current || video.paused) {
                    video.play().catch(e => console.warn("Video play failed:", e));
                    videoPlaying.current = true;
                }
            } else {
                if (videoPlaying.current && !video.paused) {
                    video.pause();
                    videoPlaying.current = false;
                }
            }
        }

        entranceRef.current.visibility = THREE.MathUtils.lerp(
            entranceRef.current.visibility,
            targetVis,
            3 * delta
        );
        const scrollVis = entranceRef.current.visibility;

        // --- ELEGANT SCALE (Card Pop) ---
        // From 0 visibility directly to popping into existence
        let baseS = THREE.MathUtils.lerp(0.001, 1.0, popScale) * scrollVis;
        let hoverS = hovered && easedBlossom > 0.9 ? 0.08 : 0.0;
        let targetScale = Math.max(0.001, baseS + hoverS); // Prevent 0 scale matrix issues

        const { smoothedSnare, smoothedKick } = useAudioStore.getState();
        if (smoothedSnare > 0.05) targetScale += smoothedSnare * 0.04;
        if (smoothedKick > 0.05) targetScale += smoothedKick * 0.04;

        cardRef.current.scale.setScalar(
            THREE.MathUtils.lerp(cardRef.current.scale.x, targetScale, 8 * delta)
        );

        // --- SMOOTH ORGANIC ROTATION ---
        const organicFloatY = Math.sin(t * 1.5 + angle) * 0.02;
        const organicFloatX = Math.cos(t * 1.2 + angle) * 0.015;

        const baseRotY = -angle + Math.PI / 2;

        cardRef.current.rotation.y = THREE.MathUtils.lerp(
            cardRef.current.rotation.y,
            baseRotY + organicFloatY,
            5 * delta
        );
        cardRef.current.rotation.x = THREE.MathUtils.lerp(
            cardRef.current.rotation.x,
            organicFloatX,
            5 * delta
        );

        // --- IMAGE REVEAL ---
        if (imageMatRef.current) {
            imageMatRef.current.opacity = scrollVis * easedBlossom; // Only show image when blossomed
            // From muted/dim to bright and clear
            const brightness = hovered ? 1.05 : 0.65;
            _targetColor.current.setRGB(brightness, brightness, brightness);
            imageMatRef.current.color.lerp(_targetColor.current, 5 * delta);
        }

        // --- TEXT DISSOLVE & SHIFT ---
        if (textGroupRef.current) {
            const targetTextY = hovered ? -0.15 : 0;
            const targetTextZ = hovered ? 0.05 : 0.15;
            textGroupRef.current.position.y = THREE.MathUtils.lerp(textGroupRef.current.position.y, targetTextY, 5 * delta);
            textGroupRef.current.position.z = THREE.MathUtils.lerp(textGroupRef.current.position.z, targetTextZ, 5 * delta);
        }

        const targetTextOpacity = (hovered ? 0.0 : 1.0) * scrollVis * easedBlossom; // Text only post-blossom
        if (textMatTitleRef.current) {
            textMatTitleRef.current.opacity = THREE.MathUtils.lerp(textMatTitleRef.current.opacity, targetTextOpacity, 6 * delta);
        }
        if (textMatSubRef.current) {
            textMatSubRef.current.opacity = THREE.MathUtils.lerp(textMatSubRef.current.opacity, targetTextOpacity, 6 * delta);
        }

        // --- GLASS CRYSTALLIZATION ---
        if (glassMatRef.current) {
            const glassRoughness = hovered ? 0.05 : 0.25;
            glassMatRef.current.roughness = glassRoughness;

            // Pop directly as glass
            glassMatRef.current.opacity = 0.95 * easedBlossom;
            glassMatRef.current.emissiveIntensity = 0.0;

            // Adjust clearcoat based on blossom
            glassMatRef.current.clearcoat = easedBlossom;
        }
    });

    const baseW = 4.5;
    const baseH = 2.7;
    const boundsScale = 1.4;

    return (
        <group
            ref={cardRef}
            position={position}
            onPointerOver={(e) => {
                e.stopPropagation();
                setHovered(true);
                document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
                setHovered(false);
                document.body.style.cursor = 'auto';
            }}
            onClick={(e) => {
                e.stopPropagation();
                // Set the selected project in the global store when tapped/clicked
                useAppStore.getState().setSelectedProject(data);
            }}
        >
            {/* The physical card backing: Frosted Glass */}
            <RoundedBox
                args={[baseW * boundsScale, baseH * boundsScale, 0.1]}
                radius={1.5}
                smoothness={32}
                scale={[1, 1, 0.02]}
            >
                <meshPhysicalMaterial
                    ref={glassMatRef}
                    opacity={0.95}
                    roughness={0.25}
                    metalness={0.1}
                    color="#40404b"
                    envMapIntensity={1.0}
                    clearcoat={1.0}
                    clearcoatRoughness={0.10}
                    transparent
                />
            </RoundedBox>

            {/* Image/Video layer */}
            <group ref={imageGroupRef} position={[0, 0, 0.08]} raycast={() => null}>
                <mesh>
                    <planeGeometry args={[baseW, baseH]} />
                    <meshBasicMaterial
                        ref={imageMatRef}
                        map={isVideo && video ? new THREE.VideoTexture(video) : texture}
                        color={isAudio ? "#111" : "#fff"}
                        transparent={true}
                        opacity={0}
                        toneMapped={false}
                    />
                </mesh>
            </group>

            {/* Content Overlay */}
            <group ref={textGroupRef} position={[0, 0, 0.15]} raycast={() => null}>
                <Text
                    fontSize={0.35}
                    anchorX="center"
                    anchorY="middle"
                    font="/Michroma-Regular.ttf"
                    fontWeight="bold"
                    letterSpacing={-0.02}
                >
                    {data.title}
                    <meshBasicMaterial
                        ref={textMatTitleRef}
                        color="#ffffff"
                        transparent={true}
                    />
                </Text>

                <Text
                    position={[0, -0.5, 0.05]}
                    fontSize={0.11}
                    anchorX="center"
                    anchorY="middle"
                    font="/Michroma-Regular.ttf"
                    letterSpacing={0.25}
                    fontWeight="bold"
                >
                    {data.subtitle}
                    <meshBasicMaterial
                        ref={textMatSubRef}
                        color="#d0d0d0"
                        transparent={true}
                    />
                </Text>
            </group>
        </group>
    );
}
