import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, Film, Package, Music, Briefcase, type LucideIcon } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import {
    getServiceCategories, getServiceItems, getWorkContactConfig,
    type ServiceCategory, type ServiceItem, type WorkContactConfig
} from '@/lib/firestore';
import './WorkContactView.css';

// ─── Icon Map ────────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
    image: ImageIcon,
    film: Film,
    music: Music,
    package: Package,
    briefcase: Briefcase,
};

function getIcon(name: string): LucideIcon {
    return ICON_MAP[name] || Package;
}

// ─── Data types ──────────────────────────────────────────────────────────────────

interface CategoryWithItems extends ServiceCategory {
    items: ServiceItem[];
}

// ─── Default fallback data ───────────────────────────────────────────────────────

const FALLBACK_CONFIG: WorkContactConfig = {
    sectionTitle: 'Our Services',
    footerNote: '* All bundles include 2 complimentary revision rounds to guarantee perfect alignment with your vision.',
    contactTitle: 'Start Your Project',
    contactSubtitle: 'Get in touch with us to discuss your next big idea.',
    contacts: [
        { label: 'PHONE', value: '+30 6979019842', href: 'tel:+306979019842', type: 'phone' },
        { label: 'EMAIL', value: '3six9studio@proton.me', href: 'mailto:3six9studio@proton.me', type: 'email' },
        { label: 'INSTAGRAM', value: '@3six9.studio', href: 'https://www.instagram.com/3six9.studio/', type: 'social' },
    ],
};

// ═════════════════════════════════════════════════════════════════════════════════

export default function WorkContactView() {
    const isWorkContactOpen = useAppStore((state) => state.isWorkContactOpen);
    const setIsWorkContactOpen = useAppStore((state) => state.setIsWorkContactOpen);

    const [categories, setCategories] = useState<CategoryWithItems[]>([]);
    const [config, setConfig] = useState<WorkContactConfig>(FALLBACK_CONFIG);
    const [loading, setLoading] = useState(true);

    // Fetch data from Firestore
    useEffect(() => {
        if (!isWorkContactOpen) return;

        let cancelled = false;

        async function fetchData() {
            setLoading(true);
            try {
                const [cats, wcConfig] = await Promise.all([
                    getServiceCategories(),
                    getWorkContactConfig(),
                ]);

                if (cancelled) return;

                // Only show visible categories
                const visibleCats = cats.filter(c => c.visible !== false);

                // Fetch items for each category in parallel
                const catsWithItems: CategoryWithItems[] = await Promise.all(
                    visibleCats.map(async (cat) => {
                        const items = await getServiceItems(cat.id!);
                        return { ...cat, items };
                    })
                );

                if (cancelled) return;

                if (catsWithItems.length > 0) {
                    setCategories(catsWithItems);
                }
                if (wcConfig) {
                    setConfig(wcConfig);
                }
            } catch (err) {
                console.error('Failed to load work-contact data:', err);
                // Fallback to defaults — they're already in state
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchData();
        return () => { cancelled = true; };
    }, [isWorkContactOpen]);

    // Escape key
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
                            <h2 className="wcv-title">{config.sectionTitle}</h2>

                            {loading ? (
                                <div className="wcv-loading-skeleton">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="wcv-skeleton-card" />
                                    ))}
                                </div>
                            ) : (
                                <div className="wcv-services-grid">
                                    {categories.map((cat, idx) => {
                                        const Icon = getIcon(cat.icon);
                                        return (
                                            <div key={cat.id || idx} className="wcv-service-category">
                                                <h3 className="wcv-category-title">
                                                    <Icon className="wcv-category-icon" size={20} />
                                                    {cat.title}
                                                </h3>
                                                <ul className="wcv-service-list">
                                                    {cat.items.map((item, jdx) => (
                                                        <li key={item.id || jdx}>
                                                            <h4>
                                                                {item.title}
                                                                {item.pricing && (
                                                                    <span className="wcv-pricing-tag">
                                                                        {item.pricing}
                                                                    </span>
                                                                )}
                                                            </h4>
                                                            <p>{item.description}</p>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {config.footerNote && (
                                <p className="wcv-note">{config.footerNote}</p>
                            )}
                        </motion.div>

                        {/* CONTACT SECTION */}
                        <motion.div
                            className="wcv-section wcv-contact"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                        >
                            <h2 className="wcv-title">{config.contactTitle}</h2>
                            <p className="wcv-contact-subtitle">{config.contactSubtitle}</p>

                            <div className="wcv-contact-details">
                                {config.contacts.map((entry, idx) => (
                                    <a
                                        key={idx}
                                        href={entry.href}
                                        className="wcv-contact-item"
                                        {...(entry.type === 'social' || entry.type === 'link'
                                            ? { target: '_blank', rel: 'noopener noreferrer' }
                                            : {}
                                        )}
                                    >
                                        <span className="wcv-contact-label">{entry.label}</span>
                                        <span className="wcv-contact-value">{entry.value}</span>
                                    </a>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
