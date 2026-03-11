import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Volume2 } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { useAudioStore } from '@/store/audioStore';
import './ProjectExpandedView.css';

// Helper component for Videos
const VideoPlayer = ({ url }: { url: string }) => {
    return (
        <video
            src={url}
            controls
            autoPlay
            playsInline
            loop
            className="pev-media-video"
        />
    );
};

// Helper component for Images
const ImagePlayer = ({ url }: { url: string }) => {
    return (
        <img
            src={url}
            alt="Gallery Image"
            className="pev-media-image"
            draggable={false}
        />
    );
};

// Helper component for Audio
const AudioPlayer = ({ url, title }: { url: string; title: string }) => {
    return (
        <div className="pev-audio-container">
            <Volume2 className="pev-audio-icon" />
            <h3 className="pev-audio-title">{title}</h3>
            <audio
                src={url}
                controls
                autoPlay
                className="pev-audio-player"
            />
        </div>
    );
};

export default function ProjectExpandedView() {
    const { selectedProject, setSelectedProject } = useAppStore();
    const setDucked = useAudioStore((state) => state.setDucked);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Reset index when a new project is selected
    useEffect(() => {
        if (selectedProject) {
            setCurrentIndex(0);
        }
    }, [selectedProject]);

    // Handle audio ducking based on current media type
    useEffect(() => {
        if (!selectedProject || !selectedProject.gallery || selectedProject.gallery.length === 0) return;
        const currentItem = selectedProject.gallery[currentIndex];
        
        // Duck the main track if video or audio is playing
        if (currentItem && (currentItem.type === 'video' || currentItem.type === 'audio')) {
            setDucked(true);
        } else {
            setDucked(false);
        }

        // Clean up when unmounting
        return () => {
            setDucked(false);
        };
    }, [selectedProject, currentIndex, setDucked]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!selectedProject || !selectedProject.gallery) return;
            
            if (e.key === 'Escape') handleClose();
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedProject, currentIndex]);

    if (!selectedProject || !selectedProject.gallery || selectedProject.gallery.length === 0) return null;

    const gallery = selectedProject.gallery;
    const currentItem = gallery[currentIndex];
    const isSingleItem = gallery.length === 1;

    const handleClose = () => {
        setSelectedProject(null);
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % gallery.length);
    };

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev - 1 + gallery.length) % gallery.length);
    };

    return (
        <AnimatePresence>
            {selectedProject && (
                <motion.div
                    initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                    animate={{ opacity: 1, backdropFilter: "blur(20px)" }}
                    exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="pev-overlay"
                >
                    {/* Header Controls */}
                    <div className="pev-header">
                        <motion.div 
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="pev-title-container"
                        >
                            <h2 className="pev-title">{selectedProject.title}</h2>
                            <p className="pev-subtitle">{selectedProject.subtitle}</p>
                        </motion.div>

                        <motion.button
                            initial={{ scale: 0, rotate: -90 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 20 }}
                            onClick={handleClose}
                            className="pev-close-btn"
                        >
                            <X size={24} />
                        </motion.button>
                    </div>

                    {/* Main Media Container */}
                    <div className="pev-main">
                        
                        {/* Navigation Arrows */}
                        {!isSingleItem && (
                            <>
                                <motion.button
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    onClick={handlePrev}
                                    className="pev-nav-btn pev-nav-left"
                                >
                                    <ChevronLeft size={32} />
                                </motion.button>

                                <motion.button
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    onClick={handleNext}
                                    className="pev-nav-btn pev-nav-right"
                                >
                                    <ChevronRight size={32} />
                                </motion.button>
                            </>
                        )}

                        {/* Media Player Switcher */}
                        <div className="pev-media-wrapper">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentIndex}
                                    initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                                    exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
                                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                    className="pev-media-wrapper"
                                >
                                    {currentItem.type === 'video' && <VideoPlayer url={currentItem.url} />}
                                    {currentItem.type === 'image' && <ImagePlayer url={currentItem.url} />}
                                    {currentItem.type === 'audio' && <AudioPlayer url={currentItem.url} title={currentItem.url.split('/').pop()?.split('.')[0] || 'Unknown Track'} />}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Bottom Pagination */}
                    {!isSingleItem && (
                        <div className="pev-pagination">
                            {gallery.map((_: any, idx: number) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentIndex(idx)}
                                    className={`pev-dot ${idx === currentIndex ? 'active' : ''}`}
                                    aria-label={`Go to item ${idx + 1}`}
                                />
                            ))}
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
