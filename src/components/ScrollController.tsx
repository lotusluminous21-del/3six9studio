'use client';

import { useFrame } from '@react-three/fiber';
import { useScroll } from '@react-three/drei';
import { useScrollStore } from '../store/glitchStore';
import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import * as THREE from 'three';

export default function ScrollController() {
    const scroll = useScroll();
    const scrollToIndex = useScrollStore(s => s.scrollToIndex);
    const setScrollToIndex = useScrollStore(s => s.setScrollToIndex);
    const categories = useAppStore(s => s.categories);
    const freezeScene = useAppStore(s => Boolean(s.selectedProject) || s.isWorkContactOpen);
    const resumeGraceFramesRef = useRef(0);
    const stabilizedProgressRef = useRef(0);
    const hasInitProgressRef = useRef(false);
    const pageHiddenRef = useRef(false);

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

    useEffect(() => {
        if (freezeScene) {
            useScrollStore.setState({ scrollVelocity: 0 });
            resumeGraceFramesRef.current = 0;
            return;
        }

        // Let ScrollControls settle after overlays close before trusting delta again.
        resumeGraceFramesRef.current = 24;
        useScrollStore.setState({ scrollVelocity: 0 });
    }, [freezeScene]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            const hidden = document.visibilityState !== 'visible';
            pageHiddenRef.current = hidden;

            if (hidden) {
                useScrollStore.setState({ scrollVelocity: 0 });
                return;
            }

            // When returning to the tab, reset stabilization baseline and grace frames.
            stabilizedProgressRef.current = scroll.offset;
            resumeGraceFramesRef.current = 30;
            useScrollStore.setState({
                scrollVelocity: 0,
                currentScrollProgress: stabilizedProgressRef.current
            });
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [scroll]);

    useFrame((state, delta) => {
        const rawOffset = scroll.offset;

        if (!hasInitProgressRef.current) {
            stabilizedProgressRef.current = rawOffset;
            hasInitProgressRef.current = true;
        }

        if (freezeScene || pageHiddenRef.current) {
            useScrollStore.setState({
                scrollVelocity: 0,
                currentScrollProgress: stabilizedProgressRef.current
            });
            return;
        }

        // Smooth and cap progress changes so unfreezing cannot produce
        // sudden camera/card rotational bursts from raw scroll offset jumps.
        const maxStepPerFrame = resumeGraceFramesRef.current > 0 ? 0.004 : 0.02;
        const progressDiff = rawOffset - stabilizedProgressRef.current;
        const progressStep = THREE.MathUtils.clamp(progressDiff, -maxStepPerFrame, maxStepPerFrame);
        stabilizedProgressRef.current += progressStep;

        // Clamp velocity to prevent extreme visual glitches and overdraw performance hits during abrupt jumps
        const velocity = Math.abs(scroll.delta) / Math.max(delta, 0.001);
        const clampedVelocity = Math.min(velocity, 2.0);
        const safeVelocity = resumeGraceFramesRef.current > 0 ? 0 : clampedVelocity;

        if (resumeGraceFramesRef.current > 0) {
            resumeGraceFramesRef.current -= 1;
        }

        useScrollStore.setState({
            scrollVelocity: safeVelocity,
            currentScrollProgress: stabilizedProgressRef.current
        });

        // Total number of items = 2 + categories.length. 
        const maxIndex = 1 + categories.length;
        const indexFloat = maxIndex > 0 ? stabilizedProgressRef.current * maxIndex : 0;

        // Match the spacing and twist of the sequence exactly
        // ySpacing = 4.5, twistRate = -(Math.PI * 2) / 9, groupY = -5
        const currentY = -5 - (indexFloat * 4.5);
        const currentAngle = indexFloat * (-(Math.PI * 2) / 9);

        const camRadius = 20;
        const camX = Math.cos(currentAngle) * camRadius;
        const camZ = -10 + Math.sin(currentAngle) * camRadius;

        state.camera.position.set(camX, currentY, camZ);
        state.camera.lookAt(0, currentY, -10);
    });

    return null;
}
