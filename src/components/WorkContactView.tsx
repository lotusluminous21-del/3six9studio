import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, Film } from 'lucide-react';
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
                                            <h4>Single Concept</h4>
                                            <p>Ideal for impactful social media posts or hero banners. Focuses on 1-2 highly refined final images.</p>
                                        </li>
                                        <li>
                                            <h4>Social Media Package</h4>
                                            <p>A cohesive set of 5-8 images tailored for a month-long brand campaign, maintaining consistent style and tone.</p>
                                        </li>
                                        <li>
                                            <h4>Complex Product Placement</h4>
                                            <p>Seamless integration of real-world products using advanced AI environments, mapped perfectly across 8-12 stunning high-end scenes.</p>
                                        </li>
                                    </ul>
                                </div>

                                <div className="wcv-service-category">
                                    <h3 className="wcv-category-title">
                                        <Film className="wcv-category-icon" size={20} />
                                        AI Video Production
                                    </h3>
                                    <ul className="wcv-service-list">
                                        <li>
                                            <h4>Short Video / Reel</h4>
                                            <p>High-retention 10-15s clips featuring AI-generated cinematic footage, dynamic editing, and immersive royalty-free audio.</p>
                                        </li>
                                        <li>
                                            <h4>Complete Commercial</h4>
                                            <p>A comprehensive 30-45s visual journey. Includes full script & prompt writing, multiple curated AI shots, professional AI voiceover, and custom brand integration.</p>
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
                                <a href="tel:+306984209171" className="wcv-contact-item">
                                    <span className="wcv-contact-label">PHONE</span>
                                    <span className="wcv-contact-value">+30 698 420 9171</span>
                                </a>
                                <a href="mailto:info@3six9studio.gr" className="wcv-contact-item">
                                    <span className="wcv-contact-label">EMAIL</span>
                                    <span className="wcv-contact-value">info@3six9studio.gr</span>
                                </a>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
