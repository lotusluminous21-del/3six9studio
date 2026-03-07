'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';
import gsap from 'gsap';

// New Component for Performance: Only plays video when visible in the gallery
function GalleryVideo({ url }: { url: string }) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (videoRef.current) {
                    if (entry.isIntersecting) {
                        // Play when visible
                        videoRef.current.play().catch(e => console.warn("Gallery video play failed", e));
                    } else {
                        // Pause actively decoding video frames to save CPU
                        videoRef.current.pause();
                    }
                }
            },
            { threshold: 0.5 } // Play when at least 50% visible (handles videos wider than screen)
        );

        if (videoRef.current) {
            observer.observe(videoRef.current);
        }

        return () => observer.disconnect();
    }, []);

    return (
        <video 
            ref={videoRef}
            src={url} 
            loop 
            muted 
            playsInline 
            preload="metadata"
            className="gallery-media"
        />
    );
}

export default function ProjectExpandedView() {
    const { selectedProject, setSelectedProject } = useAppStore();
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    
    // We keep a local copy of the project data so we can animate out smoothly before making it null
    const [projectData, setProjectData] = useState<any>(null);

    const activeProject = selectedProject || projectData;

    useEffect(() => {
        if (selectedProject) {
            setProjectData(selectedProject);
            setIsVisible(true);
            
            // GSAP Entrance Animation
            // Since activeProject is truthy, the refs have been attached in the commit phase prior to this useEffect
            if (containerRef.current && contentRef.current) {
                gsap.fromTo(containerRef.current, 
                    { opacity: 0, backdropFilter: 'blur(0px)' }, 
                    { opacity: 1, backdropFilter: 'blur(30px)', duration: 0.8, ease: 'power3.out' }
                );

                gsap.fromTo(contentRef.current, 
                    { y: 50, opacity: 0, scale: 0.95 }, 
                    { y: 0, opacity: 1, scale: 1, duration: 0.8, delay: 0.2, ease: 'power4.out' }
                );
            }
        } else if (projectData && !selectedProject) {
            // GSAP Exit Animation
            if (containerRef.current && contentRef.current) {
                gsap.to(containerRef.current, {
                    opacity: 0, 
                    backdropFilter: 'blur(0px)',
                    duration: 0.6, 
                    ease: 'power3.inOut',
                    onComplete: () => {
                        setIsVisible(false);
                        setProjectData(null);
                    }
                });
                gsap.to(contentRef.current, {
                    y: 30,
                    opacity: 0,
                    scale: 0.95,
                    duration: 0.4,
                    ease: 'power3.in'
                });
            } else {
                setIsVisible(false);
                setProjectData(null);
            }
        }
    }, [selectedProject, projectData]); // Added projectData safely into deps

    // Wait until activeProject exists to render layout
    if (!activeProject) return null;

    const handleClose = () => {
        setSelectedProject(null);
    };

    return (
        <div 
            ref={containerRef}
            className="project-overlay pointer-events-auto"
            style={{ opacity: 0 }}
        >
            <div 
                ref={contentRef}
                className="project-content"
                style={{ opacity: 0 }}
            >
                {/* Header */}
                <div className="project-header">
                    <div>
                        <h2 className="project-title">
                            {activeProject?.title}
                        </h2>
                        <p className="project-subtitle">
                            {activeProject?.subtitle}
                        </p>
                    </div>

                    <button 
                        onClick={handleClose}
                        className="close-btn"
                        aria-label="Close Project"
                    >
                        <div className="close-icon-line line-1"></div>
                        <div className="close-icon-line line-2"></div>
                    </button>
                </div>

                {/* Gallery Area */}
                <div className="project-gallery hide-scrollbars">
                    {activeProject?.gallery?.map((item: any, i: number) => (
                        <div key={i} className="gallery-item">
                            {item.type === 'video' ? (
                                <GalleryVideo url={item.url} />
                            ) : item.type === 'audio' ? (
                                <div className="audio-wrapper flex flex-col items-center justify-center w-full h-full min-w-[300px] md:min-w-[50vw]">
                                    <div className="audio-visualizer-mockup w-32 h-32 rounded-full border border-white/20 flex items-center justify-center mb-8 bg-white/5 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                                        <div className="text-white/50 text-4xl animate-pulse">♫</div>
                                    </div>
                                    <audio 
                                        src={item.url} 
                                        controls 
                                        className="w-full max-w-sm rounded"
                                    />
                                    <p className="text-white/50 mt-6 text-xs font-['Michroma'] truncate max-w-sm text-center tracking-widest uppercase px-4">
                                        {item.url.split('/').pop()}
                                    </p>
                                </div>
                            ) : (
                                <img 
                                    src={item.url} 
                                    alt={`${activeProject?.title} Image ${i + 1}`}
                                    className="gallery-media"
                                    loading="lazy"
                                />
                            )}
                            {/* Stylish gradient overlay */}
                            <div className="gallery-gradient"></div>
                        </div>
                    ))}
                </div>
                
                {/* Scroll Indicator (Optional Polish) */}
                {activeProject?.gallery?.length > 1 && (
                    <div className="swipe-indicator">
                        <span>Swipe to explore</span>
                        <div className="swipe-line"></div>
                    </div>
                )}
            </div>
            
            {/* Custom Styles for scoping safely without Tailwind */}
            <style jsx>{`
                .project-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    z-index: 50;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background-color: rgba(5, 7, 10, 0.85);
                    backdrop-filter: blur(20px);
                    overflow: hidden;
                }

                .project-content {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    max-width: 100vw;
                    padding: 2rem 1rem;
                    display: flex;
                    flex-direction: column;
                }
                
                @media (min-width: 768px) {
                    .project-content {
                        padding: 3rem 4rem;
                    }
                }

                .project-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                    flex-shrink: 0;
                }

                .project-title {
                    font-size: 1.5rem;
                    font-weight: bold;
                    color: white;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    font-family: 'Michroma', sans-serif;
                    margin: 0;
                }
                
                @media (min-width: 768px) {
                    .project-title {
                        font-size: 2.5rem;
                    }
                }

                .project-subtitle {
                    color: rgba(255,255,255,0.6);
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    font-size: 0.75rem;
                    font-family: 'Michroma', sans-serif;
                    margin-top: 0.5rem;
                }

                .close-btn {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    width: 3rem;
                    height: 3rem;
                    border-radius: 50%;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    background: rgba(0, 0, 0, 0.4);
                    backdrop-filter: blur(8px);
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .close-btn:hover {
                    border-color: rgba(255, 255, 255, 0.8);
                    background: rgba(255, 255, 255, 0.15);
                    transform: scale(1.05);
                }

                .close-icon-line {
                    width: 1.25rem;
                    height: 2px;
                    background-color: white;
                    transition: all 0.3s ease;
                }

                .line-1 {
                    transform: rotate(45deg) translateY(1px);
                }

                .line-2 {
                    transform: rotate(-45deg) translateY(-1px);
                }

                .project-gallery {
                    flex: 1;
                    display: flex;
                    gap: 5vw;
                    overflow-x: auto;
                    overflow-y: hidden;
                    padding: 0 5vw;
                    scroll-padding: 0 5vw;
                    scroll-snap-type: x mandatory;
                    align-items: center;
                    justify-content: flex-start;
                    /* Fixed height relative to viewport to ensure it always fits the screen */
                    height: 50vh;
                    margin-top: auto;
                    margin-bottom: auto;
                }

                .gallery-item {
                    position: relative;
                    /* Fill the gallery height completely */
                    height: 100%;
                    /* Width expands based on content aspect ratio */
                    width: auto;
                    flex: 0 0 auto;
                    scroll-snap-align: center;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                @media (min-width: 768px) {
                    .project-gallery {
                        height: 65vh;
                        gap: 12vw;
                    }
                }

                .gallery-media {
                    /* The key to no-crop: Force 100% height and let width be auto */
                    height: 100% !important;
                    width: auto !important;
                    /* Never stretch, just fit the physical space */
                    object-fit: contain;
                    display: block;
                    border-radius: 8px;
                    box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.7);
                    /* Prevents any potential flex stretching */
                    max-width: none;
                }

                @media (max-width: 767px) {
                    .gallery-media {
                        /* On mobile, remove width capping to allow horizontal videos to fill height without cropping */
                    }
                }

                .gallery-gradient {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 20%);
                    pointer-events: none;
                }

                .swipe-indicator {
                    position: absolute;
                    bottom: 1.5rem;
                    left: 50%;
                    transform: translateX(-50%);
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    opacity: 0.6;
                    text-transform: uppercase;
                    font-size: 0.75rem;
                    letter-spacing: 0.15em;
                    color: white;
                    font-family: 'Michroma', sans-serif;
                }

                .swipe-line {
                    width: 4rem;
                    height: 1px;
                    background: linear-gradient(to right, white, transparent);
                }

                .hide-scrollbars::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbars {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}
