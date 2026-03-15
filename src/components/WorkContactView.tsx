import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, Film, Package, Music } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import './WorkContactView.css';

export default function WorkContactView() {
    const isWorkContactOpen = useAppStore((state) => state.isWorkContactOpen);
    const setIsWorkContactOpen = useAppStore((state) => state.setIsWorkContactOpen);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isWorkContactOpen && e.key === 'Escape') {
                setIsWorkContactOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isWorkContactOpen, setIsWorkContactOpen]);

    if (!isWorkContactOpen) return null;

    return (
        <AnimatePresence>
            {isWorkContactOpen && (
                <motion.div
                    initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                    animate={{ opacity: 1, backdropFilter: "blur(20px)" }}
                    exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="wcv-overlay"
                    onWheel={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                >
                    <div className="wcv-header">
                        <motion.button
                            initial={{ scale: 0, rotate: -90 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 20 }}
                            onClick={() => setIsWorkContactOpen(false)}
                            className="wcv-close-btn"
                        >
                            <X size={24} />
                        </motion.button>
                    </div>

                    <div className="wcv-content">
                        {/* WORK SECTION */}
                        <motion.div
                            className="wcv-section wcv-work"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            <h2 className="wcv-title">Our Services</h2>

                            <div className="wcv-services-grid">
                                <div className="wcv-service-category">
                                    <h3 className="wcv-category-title">
                                        <ImageIcon className="wcv-category-icon" size={20} />
                                        Static Image AI
                                    </h3>
                                    <ul className="wcv-service-list">
                                        <li>
                                            <h4>Single Concept (1-2 Final Images)</h4>
                                            <p>Ideal for a social media post or a banner.</p>
                                        </li>
                                        <li>
                                            <h4>Social Media Package (5-8 Images)</h4>
                                            <p>Cohesive style, ideal for a month's campaigns.</p>
                                        </li>
                                        <li>
                                            <h4>Complex Product Placement (8-12 Images)</h4>
                                            <p>Placement of a real product inside a complex AI environment.</p>
                                        </li>
                                        <li>
                                            <h4>Logo Creation</h4>
                                            <p>Unique, scalable, AI-generated logo design tailored to your brand identity.</p>
                                        </li>
                                    </ul>
                                </div>

                                <div className="wcv-service-category">
                                    <h3 className="wcv-category-title">
                                        <Film className="wcv-category-icon" size={20} />
                                        AI Video Services
                                    </h3>
                                    <ul className="wcv-service-list">
                                        <li>
                                            <h4>Short Video / Reel (10-15 seconds)</h4>
                                            <p>Includes AI generated footage, basic editing, and copyright-free music.</p>
                                        </li>
                                        <li>
                                            <h4>Full Commercial (30-45 seconds)</h4>
                                            <p>Includes script/prompt writing, multiple AI shots, AI voiceover, and addition of logo/texts.</p>
                                        </li>
                                        <li>
                                            <h4>Full Commercial - Art Project (0:30-1+ min)</h4>
                                            <p>Requires high consistency in characters and complex editing.</p>
                                        </li>
                                    </ul>
                                </div>

                                <div className="wcv-service-category">
                                    <h3 className="wcv-category-title">
                                        <Music className="wcv-category-icon" size={20} />
                                        AI Music Creation
                                    </h3>
                                    <ul className="wcv-service-list">
                                        <li>
                                            <h4>Short Form Audio (30 seconds)</h4>
                                            <p>Custom music tracks ideal for short videos.</p>
                                        </li>
                                        <li>
                                            <h4>Song Remix</h4>
                                            <p>Creative AI-driven remixing and reimagining of existing audio.</p>
                                        </li>
                                        <li>
                                            <h4>Full Song Synthesis (Ghost Writing)</h4>
                                            <p>Complete new track generation with unique melodies and structures.</p>
                                        </li>
                                        <li>
                                            <h4>Audio Stems</h4>
                                            <p>High-quality individual track elements (vocals, drums, bass, instruments) for your own mixing and production.</p>
                                        </li>
                                    </ul>
                                </div>

                                <div className="wcv-service-category">
                                    <h3 className="wcv-category-title">
                                        <Package className="wcv-category-icon" size={20} />
                                        Packages
                                    </h3>
                                    <ul className="wcv-service-list">
                                        <li>
                                            <h4>Starter AI</h4>
                                            <p>4 AI Photos & 1 AI Reel (15 sec) per month.</p>
                                        </li>
                                        <li>
                                            <h4>Pro AI</h4>
                                            <p>10 AI Photos & 3 AI Reels (15 sec) per month.</p>
                                        </li>
                                        <li>
                                            <h4>Full Campaign</h4>
                                            <p>Commercial (30-60s), 5 variations for stories, 10 static visuals (one-off).</p>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <p className="wcv-note">* All bundles include 2 complimentary revision rounds to guarantee perfect alignment with your vision.</p>
                        </motion.div>

                        {/* CONTACT SECTION */}
                        <motion.div
                            className="wcv-section wcv-contact"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                        >
                            <h2 className="wcv-title">Start Your Project</h2>
                            <p className="wcv-contact-subtitle">Get in touch with us to discuss your next big idea.</p>

                            <div className="wcv-contact-details">
                                <a href="tel:+306979019842" className="wcv-contact-item">
                                    <span className="wcv-contact-label">PHONE</span>
                                    <span className="wcv-contact-value">+30 6979019842</span>
                                </a>
                                <a href="mailto:3six9studio@proton.me" className="wcv-contact-item">
                                    <span className="wcv-contact-label">EMAIL</span>
                                    <span className="wcv-contact-value">3six9studio@proton.me</span>
                                </a>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
