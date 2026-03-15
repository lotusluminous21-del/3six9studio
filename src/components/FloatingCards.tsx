'use client';

import { useRef, useState, useMemo, useEffect } from 'react';
import { Group, MathUtils, Vector2 } from 'three';
import { useFrame, extend, useLoader, useThree } from '@react-three/fiber';
import { Text, useTexture, RoundedBox, useGLTF, Text3D, Center } from '@react-three/drei';
import { motion } from 'framer-motion-3d';
import * as THREE from 'three';
import { useScrollStore } from '../store/glitchStore';
import { useAudioStore } from '../store/audioStore';
import { useAppStore } from '../store/appStore';
import { HelixMaterial } from './shaders/HelixMaterial';
import { OrganicTextMaterial } from './shaders/OrganicTextMaterial';
import { BannerMaterial } from './shaders/BannerMaterial';
import { ThumbnailMaterial } from './shaders/ThumbnailMaterial';
import { TTFLoader } from 'three/addons/loaders/TTFLoader.js';
import { MotionValue, useTransform } from 'framer-motion';

// Preload the font
useLoader.preload(TTFLoader, '/Michroma-Regular.ttf');

declare module '@react-three/fiber' {
    interface ThreeElements {
        helixMaterial: any;
        organicTextMaterial: any;
        bannerMaterial: any;
        thumbnailMaterial: any;
    }
}


extend({ HelixMaterial, OrganicTextMaterial, BannerMaterial, ThumbnailMaterial });


export default function FloatingCards() {
    const groupRef = useRef<Group>(null);
    const categories = useAppStore(s => s.categories);

    // Preload textures or video metadata safely
    useEffect(() => {
        categories.forEach(project => {
            if (project.image && typeof project.image === 'string' && project.image.match(/\.(jpeg|jpg|gif|png)$/i)) {
                try {
                    useTexture.preload(project.image);
                } catch (e) { }
            }
        });
    }, [categories]);

    const radius = 10;
    const ySpacing = 4.5;
    const twistRate = -(Math.PI * 2) / 9;

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
    const { size } = useThree();
    const isMobile = size.width < 768;
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
                child.material.uColorOrganic = new THREE.Color('#0a0a15');
                child.material.uColorSynthesis = new THREE.Color('#aabbcc');
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

    const isEntered = useAppStore(s => s.isEntered);
    const delay = 0.5; // Offset logo animation slightly

    return (
        <group ref={groupRef} position={[0, y, 0]} rotation={[0, -angle + Math.PI / 2, 0]}>
            <group position={[0, 0.8, radius]}>
                {/* Individual components centered independently at origin [0,0,z] */}
                <motion.group
                    ref={unitRef as any}
                    {...({
                        initial: { opacity: 0, scale: 0.8 },
                        animate: {
                            opacity: isEntered ? 1 : 0,
                            scale: isEntered ? 1 : 0.8
                        },
                        transition: {
                            opacity: { delay, duration: 1.5, ease: "easeInOut" },
                            scale: { delay, duration: 1.8, type: "spring", bounce: 0.4 }
                        }
                    } as any)}
                >
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
                            size={isMobile ? 0.3 : 0.55}
                            height={0.1}
                            curveSegments={6}
                            bevelEnabled
                            bevelThickness={0.03}
                            bevelSize={0.01}
                            bevelOffset={0}
                            bevelSegments={2}
                            lineHeight={1.0}
                            letterSpacing={-0.06}
                        >
                            {`3six9 Studio`}
                            <organicTextMaterial
                                ref={textMatRef}
                                uColorOrganic="#0a0a15"
                                uColorSynthesis="#aabbcc"
                                uOpacity={0}
                                uWobble={0.3}
                                uRadius={radius}
                                uCurvature={1.0}
                                transparent
                            />
                        </Text3D>
                    </group>
                </motion.group>
            </group>
        </group>
    );
}

function SequenceText({ index, radius, ySpacing, twistRate }: { index: number, radius: number, ySpacing: number, twistRate: number }) {
    const { size } = useThree();
    const isMobile = size.width < 768;
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

    const isEntered = useAppStore(s => s.isEntered);
    const delay = 1.8; // Banner and text come in later

    return (
        <group ref={groupRef} position={[0, y, 0]} rotation={[0, -angle + Math.PI / 2, 0]}>
            <motion.group
                position={[0, 0, radius]}
                {...({
                    initial: { opacity: 0, scale: 0.9, y: 1 },
                    animate: {
                        opacity: isEntered ? 1 : 0,
                        scale: isEntered ? 1 : 0.9,
                        y: isEntered ? 0 : 1
                    },
                    transition: {
                        opacity: { delay, duration: 1.0 },
                        scale: { delay, duration: 1.2, type: "spring", bounce: 0.2 },
                        y: { delay, duration: 1.0, type: "spring", bounce: 0.1 }
                    }
                } as any)}
            >
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
                        size={isMobile ? 0.25 : 0.5}
                        height={0.15}
                        curveSegments={6}
                        bevelEnabled
                        bevelThickness={0.05}
                        bevelSize={0.02}
                        bevelOffset={0}
                        bevelSegments={2}
                        lineHeight={0.45}
                        letterSpacing={0.01}
                    >
                        {`SYNTHETIC\nREALITIES`}
                        <organicTextMaterial
                            ref={materialRef}
                            uColorOrganic="#0a0a15"
                            uColorSynthesis="#aabbcc"
                            uRadius={radius}
                            uCurvature={1.0}
                            uWobble={0.4}
                            uOpacity={0}
                            transparent
                        />
                    </Text3D>
                </Center>
            </motion.group>
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
            return vid;
        }
        return null;
    });

    // MEMOIZE TEXTURE: This is critical. Prevent creating a new texture object on every re-render.
    const videoTexture = useMemo(() => {
        if (!video) return null;
        const vt = new THREE.VideoTexture(video);
        vt.minFilter = THREE.LinearFilter;
        vt.magFilter = THREE.LinearFilter;
        vt.format = THREE.RGBAFormat;
        return vt;
    }, [video]);

    const entranceRef = useRef({ visibility: 0 });
    const videoPlaying = useRef(false);

    useFrame((state, delta) => {
        if (!cardRef.current) return;

        const { isEntered, entranceStartTime } = useAppStore.getState();
        const t = isEntered && entranceStartTime ? (performance.now() / 1000) - entranceStartTime : 0;

        // --- SCROLL-DRIVEN ENTRANCE ANIMATION ---
        cardRef.current.getWorldPosition(_cardWorldPos.current);
        const camDist = state.camera.position.distanceTo(_cardWorldPos.current);

        const activationDist = 35;
        const targetVis = camDist < activationDist ? 1 : 0;

        // Video performance optimization & robust playback state
        if (video) {
            // Play video when card is visible
            if (targetVis === 1) {
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
        // Handled by Framer Motion now. Only adding audio reactive bumps.
        let targetScale = 1.0;

        const { smoothedSnare, smoothedKick } = useAudioStore.getState();
        if (smoothedSnare > 0.05) targetScale += smoothedSnare * 0.04;
        if (smoothedKick > 0.05) targetScale += smoothedKick * 0.04;

        cardRef.current.scale.setScalar(targetScale);

        // --- SMOOTH ORGANIC ROTATION ---
        const organicFloatY = Math.sin(t * 1.5 + angle) * 0.02;
        const organicFloatX = Math.cos(t * 1.2 + angle) * 0.015;

        // Base rot handled by Motion, but we add organic floating relative to the current rotation
        cardRef.current.rotation.x = THREE.MathUtils.lerp(
            cardRef.current.rotation.x,
            organicFloatX,
            5 * delta
        );

        // --- IMAGE REVEAL & BLENDING ---
        if (imageMatRef.current) {
            imageMatRef.current.uOpacity = scrollVis;
            imageMatRef.current.uTime = t;
            imageMatRef.current.uHover = THREE.MathUtils.lerp(
                imageMatRef.current.uHover || 0,
                hovered ? 1.0 : 0.0,
                5 * delta
            );
        }

        // --- TEXT DISSOLVE & SHIFT ---
        const targetTextOpacity = (hovered ? 0.0 : 1.0) * scrollVis;
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
            glassMatRef.current.opacity = 0.95;
            glassMatRef.current.emissiveIntensity = 0.0;

            // Adjust clearcoat based on blossom
            glassMatRef.current.clearcoat = 1.0;
        }
    });

    const baseW = 4.5;
    const baseH = 2.7;
    const boundsScale = 1.4;

    // Framer Motion spring config
    const springConfig = { type: 'spring', stiffness: 200, damping: 15, mass: 1.2 };
    const delay = 2.2 + index * 0.15; // Delay blossom relative to index

    return (
        <motion.group
            ref={cardRef as any}
            position={position}
            userData={{ id: `project-${data.id}` }} // Storing id for potential future use instead of layoutId
            // Entrance & Hover states declarative
            {...({
                initial: { scale: 0.001, rotateY: -angle + Math.PI / 2 },
                animate: {
                    scale: hovered ? 1.05 : 1.0,
                    rotateY: -angle + Math.PI / 2 + (hovered ? (index % 2 === 0 ? 0.1 : -0.1) : 0),
                },
                transition: {
                    ...springConfig,
                    scale: { delay: hovered ? 0 : delay, ...springConfig }, // Delay only on mount
                    rotateY: { delay: hovered ? 0 : delay, ...springConfig }
                }
            } as any)}
            onPointerOver={(e: any) => {
                e.stopPropagation();
                setHovered(true);
                document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
                setHovered(false);
                document.body.style.cursor = 'auto';
            }}
            onClick={(e: any) => {
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
                    color="#0d0208"
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
                    <thumbnailMaterial
                        ref={imageMatRef}
                        uTexture={isVideo ? videoTexture : texture}
                        uColor={isAudio ? new THREE.Color("#111") : new THREE.Color("#fff")}
                        uOpacity={0}
                        uTime={0}
                        uHover={0}
                        transparent={true}
                    />
                </mesh>
            </group>

            {/* Content Overlay */}
            <motion.group
                ref={textGroupRef as any}
                position={[0, 0, 0.15]}
                raycast={() => null}
                {...({
                    initial: { y: 0, z: 0.15 },
                    animate: {
                        y: hovered ? -0.15 : 0,
                        z: hovered ? 0.05 : 0.15
                    },
                    transition: springConfig
                } as any)}
            >
                {(isAudio || (data.title && data.title.toLowerCase().includes('music'))) && (
                    <WaveformIndicator hovered={hovered} />
                )}

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
            </motion.group>
        </motion.group>
    );
}

function WaveformIndicator({ hovered }: { hovered: boolean }) {
    const groupRef = useRef<THREE.Group>(null);
    const barsRef = useRef<THREE.Mesh[]>([]);

    const barCount = 15;
    const barWidth = 0.06;
    const gap = 0.04;
    const totalWidth = barCount * barWidth + (barCount - 1) * gap;
    const startX = -totalWidth / 2 + barWidth / 2;

    useFrame((state, delta) => {
        const t = state.clock.elapsedTime;
        const { isPlaying, smoothedKick, smoothedSnare, highFreqSpike } = useAudioStore.getState();
        
        if (groupRef.current) {
            const targetY = hovered ? 0.3 : 0.55;
            groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, 8 * delta);
        }

        barsRef.current.forEach((bar, i) => {
            if (!bar) return;

            let height = 0.1;
            
            if (isPlaying) {
                const isBass = i < barCount / 3;
                const isMid = i >= barCount / 3 && i < (2 * barCount) / 3;
                
                let baseHeight = 0.1;
                if (isBass) baseHeight += smoothedKick * 1.5;
                else if (isMid) baseHeight += smoothedSnare * 1.5;
                else baseHeight += highFreqSpike * 1.5;
                
                const wave = Math.sin(t * 8 + i * 0.8) * 0.2;
                height = baseHeight + wave + 0.2;
            } else {
                const wave = Math.sin(t * 3 + i * 0.5) * 0.5 + 0.5;
                const wave2 = Math.cos(t * 4 - i * 0.3) * 0.5 + 0.5;
                const jitter = Math.sin(t * 20 + i * 1.5) * 0.1;
                const combined = (wave + wave2) * 0.5;
                height = 0.15 + combined * 0.4 + jitter;
            }
            
            // Milder hover deformation
            const targetScaleY = hovered ? height * 0.9 : height * 0.5;
            bar.scale.y = THREE.MathUtils.lerp(bar.scale.y, Math.max(0.01, targetScaleY), 10 * delta);
            
            if (bar.material) {
                const mat = bar.material as THREE.MeshBasicMaterial;
                const targetOpacity = hovered ? (0.6 + height * 0.3) : 0.3;
                mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, 8 * delta);
            }
        });
    });

    return (
        <group ref={groupRef} position={[0, 0.55, 0.05]}>
            {Array.from({ length: barCount }).map((_, i) => (
                <mesh
                    key={i}
                    position={[startX + i * (barWidth + gap), 0, 0]}
                    ref={(el: any) => barsRef.current[i] = el}
                >
                    <planeGeometry args={[barWidth, 1]} />
                    <meshBasicMaterial color={hovered ? "#00ffff" : "#ffffff"} transparent opacity={0.3} />
                </mesh>
            ))}
        </group>
    );
}
