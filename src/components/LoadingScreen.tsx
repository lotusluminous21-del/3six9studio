'use client';

import { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';
import { useAppStore } from '../store/appStore';
import { useAudioStore } from '../store/audioStore';

export default function LoadingScreen() {
    const { progress, active, loaded, item } = useProgress();
    const { isLoaded, setIsLoaded, isEntered, enter } = useAppStore();
    const setPlaying = useAudioStore((state) => state.setPlaying);
    const [minTimeElapsed, setMinTimeElapsed] = useState(false);
    const [mounted, setMounted] = useState(false);

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

    useEffect(() => {
        // Consider it loaded when drei's progress is 100% and min time has passed
        if (progress === 100 && minTimeElapsed) {
            setIsLoaded(true);
        }
    }, [progress, minTimeElapsed, setIsLoaded]);

    const [visible, setVisible] = useState(true);

    useEffect(() => {
        if (isEntered) {
            const timer = setTimeout(() => setVisible(false), 1500);
            return () => clearTimeout(timer);
        }
    }, [isEntered]);

    if (!visible || !mounted) return null;

    return (
        <div className={`loading-overlay ${isLoaded ? 'loaded' : ''} ${isEntered ? 'entered' : ''}`}>
            <div className="loading-content">
                {/* Minimalist Logo / Indicator */}
                <div className="indicator-container">
                    <div className="indicator-track"></div>
                    <div
                        className="indicator-progress"
                        style={{
                            clipPath: `polygon(0 0, 100% 0, 100% ${progress}%, 0 ${progress}%)`,
                            transform: `scale(${isLoaded ? 1.1 : 1})`,
                            opacity: isLoaded ? 0 : 1
                        }}
                    ></div>
                    {isLoaded && (
                        <div className="pulse-container">
                            <div className="pulse-dot"></div>
                        </div>
                    )}
                </div>

                {/* Status Text & Enter Button */}
                <div className="action-container">
                    {!isLoaded ? (
                        <div className="status-text">
                            <span>Initializing Memory</span>
                            <span className="status-percent">{Math.round(progress)}%</span>
                        </div>
                    ) : (
                        <button
                            onClick={() => {
                                enter(performance.now() / 1000); // Pass time in seconds
                                setPlaying(true);
                            }}
                            className="enter-btn"
                        >
                            Enter
                        </button>
                    )}
                </div>
            </div>

            <style jsx>{`
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
                    transition: opacity 1.5s ease-in-out, background-color 1.5s ease;
                    pointer-events: auto;
                }
                .loading-overlay.loaded {
                    background-color: rgba(2, 3, 5, 0.8);
                    backdrop-filter: blur(4px);
                }
                .loading-overlay.entered {
                    opacity: 0;
                    pointer-events: none;
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
                    transition: transform 0.3s ease-out;
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
        </div>
    );
}
