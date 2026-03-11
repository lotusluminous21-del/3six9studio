'use client';

import { useEffect, useState, useRef } from 'react';
import { useProgress } from '@react-three/drei';
import { useAppStore } from '../store/appStore';
import { useAudioStore } from '../store/audioStore';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoadingScreen() {
    const { progress, active, loaded, item } = useProgress();
    const { isLoaded, setIsLoaded, isEntered, enter, categoriesLoaded } = useAppStore();
    const setPlaying = useAudioStore((state) => state.setPlaying);
    const [minTimeElapsed, setMinTimeElapsed] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [displayProgress, setDisplayProgress] = useState(0);
    const targetProgress = useRef(0);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Ensure the loading screen shows for at least a minimum time (e.g. 1.5s) to avoid unseemly flashing
    useEffect(() => {
        const timer = setTimeout(() => {
            setMinTimeElapsed(true);
        }, 1500);
        return () => clearTimeout(timer);
    }, []);

    // Smooth, monotonic progress display that maps the two loading waves seamlessly
    useEffect(() => {
        // Wave 1: Hardcoded assets. Wave 2: Dynamically fetched gallery textures.
        // Prevent progressing past 75% until wave 2 metadata is fetched (categoriesLoaded)
        let intendedProgress = progress;
        if (!categoriesLoaded) {
            intendedProgress = Math.min(progress, 75);
        }
        
        // Ensure progress never jumps backwards
        targetProgress.current = Math.max(targetProgress.current, intendedProgress);
    }, [progress, categoriesLoaded]);

    // Animate displayProgress towards targetProgress
    useEffect(() => {
        let frameId: number;
        const animate = () => {
            setDisplayProgress(prev => {
                const step = (targetProgress.current - prev) * 0.08;
                if (Math.abs(step) < 0.1) return targetProgress.current;
                return prev + step;
            });
            frameId = requestAnimationFrame(animate);
        };
        frameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameId);
    }, []);

    useEffect(() => {
        // Consider it loaded when the visible progress hits 100%, min time has passed, and data is ready
        if (displayProgress >= 99.9 && minTimeElapsed && categoriesLoaded) {
            setIsLoaded(true);
        }
    }, [displayProgress, minTimeElapsed, categoriesLoaded, setIsLoaded]);

    if (!mounted) return null;

    return (
        <AnimatePresence>
            {!isEntered && (
                <motion.div
                    className={`loading-overlay ${isLoaded ? 'loaded' : ''}`}
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 1.5, ease: 'easeInOut' } }}
                >
                    <div className="loading-content">
                        {/* Minimalist Logo / Indicator */}
                        <div className="indicator-container">
                            <div className="indicator-track"></div>
                            <motion.div
                                className="indicator-progress"
                                style={{
                                    clipPath: `polygon(0 0, 100% 0, 100% ${displayProgress}%, 0 ${displayProgress}%)`,
                                }}
                                animate={{
                                    scale: isLoaded ? 1.1 : 1,
                                    opacity: isLoaded ? 0 : 1
                                }}
                                transition={{ duration: 0.5 }}
                            ></motion.div>
                            {isLoaded && (
                                <motion.div 
                                    className="pulse-container"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 1 }}
                                >
                                    <div className="pulse-dot"></div>
                                </motion.div>
                            )}
                        </div>

                        {/* Status Text & Enter Button */}
                        <div className="action-container">
                            <AnimatePresence mode="wait">
                                {!isLoaded ? (
                                    <motion.div
                                        key="loading"
                                        className="status-text"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.5 }}
                                    >
                                        <span>Initializing Memory</span>
                                        <span className="status-percent">{Math.round(displayProgress)}%</span>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="enter"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.5, delay: 0.2 }}
                                    >
                                        <button
                                            onClick={() => {
                                                enter(performance.now() / 1000); // Pass time in seconds
                                                setPlaying(true);
                                            }}
                                            className="enter-btn"
                                        >
                                            Enter
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <style jsx global>{`
                        .loading-overlay {
                            position: fixed;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            z-index: 50;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            background-color: rgba(2, 3, 5, 1);
                            color: white;
                            transition: background-color 1.5s ease;
                            pointer-events: auto;
                        }
                        .loading-overlay.loaded {
                            background-color: rgba(2, 3, 5, 0.8);
                            backdrop-filter: blur(4px);
                        }
                        
                        .loading-content {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            gap: 2rem;
                            max-width: 24rem;
                            width: 100%;
                            padding: 0 1.5rem;
                        }

                        .indicator-container {
                            position: relative;
                            width: 4rem;
                            height: 4rem;
                        }

                        .indicator-track {
                            position: absolute;
                            inset: 0;
                            border: 1px solid rgba(255, 255, 255, 0.2);
                            border-radius: 50%;
                        }

                        .indicator-progress {
                            position: absolute;
                            inset: 0;
                            border: 1px solid rgba(255, 255, 255, 0.8);
                            border-radius: 50%;
                        }

                        .pulse-container {
                            position: absolute;
                            inset: 0;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                        }

                        .pulse-dot {
                            width: 0.5rem;
                            height: 0.5rem;
                            background-color: white;
                            border-radius: 50%;
                            box-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
                        }

                        .action-container {
                            height: 3rem;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        }

                        .status-text {
                            font-size: 0.875rem;
                            letter-spacing: 0.2em;
                            font-weight: 300;
                            color: rgba(255, 255, 255, 0.5);
                            text-transform: uppercase;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            gap: 0.5rem;
                        }

                        .status-percent {
                            color: rgba(255, 255, 255, 0.3);
                            font-size: 0.75rem;
                        }

                        .enter-btn {
                            background: transparent;
                            font-size: 0.875rem;
                            letter-spacing: 0.3em;
                            font-weight: 500;
                            color: white;
                            text-transform: uppercase;
                            border: 1px solid rgba(255, 255, 255, 0.3);
                            padding: 0.75rem 2rem;
                            border-radius: 9999px;
                            transition: all 0.3s ease;
                            cursor: pointer;
                        }

                        .enter-btn:hover {
                            background-color: rgba(255, 255, 255, 0.1);
                            border-color: rgba(255, 255, 255, 0.8);
                        }

                        @keyframes pulse {
                            0%, 100% { opacity: 1; }
                            50% { opacity: .5; }
                        }
                    `}</style>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
