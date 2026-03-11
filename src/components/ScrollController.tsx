'use client';

import { useFrame } from '@react-three/fiber';
import { useScroll } from '@react-three/drei';
import { useScrollStore } from '../store/glitchStore';
import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import * as THREE from 'three';

export default function ScrollController() {
    const scroll = useScroll();
    const scrollToIndex = useScrollStore(s => s.scrollToIndex);
    const setScrollToIndex = useScrollStore(s => s.setScrollToIndex);
    const categories = useAppStore(s => s.categories);

    useEffect(() => {
        if (scrollToIndex !== null) {
            // maxIndex depends on the number of categories. 2 fixed items (logo, text) + categories
            const maxIndex = 1 + categories.length; // 0-indexed, so Logo is 0, Text is 1, first category is 2. Length 6 -> maxIndex = 7
            // Calculate the percentage offset
            const targetOffset = maxIndex > 0 ? scrollToIndex / maxIndex : 0;
            
            // The scroll height is stored in scroll.el.scrollHeight
            const targetScrollTop = targetOffset * (scroll.el.scrollHeight - scroll.el.clientHeight);
            
            scroll.el.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
            
            // clear it after a short delay so user can scroll again
            setTimeout(() => setScrollToIndex(null), 100);
        }
    }, [scrollToIndex, scroll.el, categories.length, setScrollToIndex]);

    useFrame((state, delta) => {
        const offset = scroll.offset;

        // Clamp velocity to prevent extreme visual glitches and overdraw performance hits during abrupt jumps
        const velocity = Math.abs(scroll.delta) / Math.max(delta, 0.001);
        const clampedVelocity = Math.min(velocity, 2.0);

        useScrollStore.setState({
            scrollVelocity: clampedVelocity,
            currentScrollProgress: offset
        });

        // Total number of items = 2 + categories.length. 
        const maxIndex = 1 + categories.length;
        const indexFloat = maxIndex > 0 ? offset * maxIndex : 0;

        // Match the spacing and twist of the sequence exactly
        // ySpacing = 4.5, twistRate = (Math.PI * 2) / 9, groupY = -5
        const currentY = -5 - (indexFloat * 4.5);
        const currentAngle = indexFloat * ((Math.PI * 2) / 9);

        const camRadius = 20;
        const camX = Math.cos(currentAngle) * camRadius;
        const camZ = -10 + Math.sin(currentAngle) * camRadius;

        state.camera.position.set(camX, currentY, camZ);
        state.camera.lookAt(0, currentY, -10);
    });

    return null;
}
