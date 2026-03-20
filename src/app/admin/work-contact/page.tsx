'use client';

import { useEffect, useState } from 'react';
import { useAdminStore } from '@/store/adminStore';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import {
    Briefcase, Plus, Trash2, Edit3, Save, X, ChevronDown, ChevronRight,
    Eye, EyeOff, GripVertical, Phone, Mail, Instagram, Link as LinkIcon,
    Image as ImageIcon, Film, Music, Package, DollarSign, Database
} from 'lucide-react';
import type { ServiceCategory, ServiceItem, ContactEntry, WorkContactConfig } from '@/lib/firestore';

// ─── Icon Map ────────────────────────────────────────────────────────────────────

const ICON_OPTIONS = [
    { value: 'image', label: 'Image', Component: ImageIcon },
    { value: 'film', label: 'Film', Component: Film },
    { value: 'music', label: 'Music', Component: Music },
    { value: 'package', label: 'Package', Component: Package },
    { value: 'briefcase', label: 'Briefcase', Component: Briefcase },
] as const;

function getIconComponent(name: string) {
    const entry = ICON_OPTIONS.find(o => o.value === name);
    return entry ? entry.Component : Package;
}

const CONTACT_TYPE_ICONS: Record<string, React.ElementType> = {
    phone: Phone, email: Mail, social: Instagram, link: LinkIcon,
};

// ─── Component ───────────────────────────────────────────────────────────────────

export default function WorkContactPage() {
    const [activeTab, setActiveTab] = useState<'services' | 'contact'>('services');

    // Store
    const serviceCategories = useAdminStore(s => s.serviceCategories);
    const serviceCategoriesLoading = useAdminStore(s => s.serviceCategoriesLoading);
    const fetchServiceCategories = useAdminStore(s => s.fetchServiceCategories);
    const addServiceCat = useAdminStore(s => s.addServiceCat);
    const editServiceCat = useAdminStore(s => s.editServiceCat);
    const removeServiceCat = useAdminStore(s => s.removeServiceCat);

    const serviceItems = useAdminStore(s => s.serviceItems);
    const serviceItemsLoading = useAdminStore(s => s.serviceItemsLoading);
    const selectedCategoryId = useAdminStore(s => s.selectedCategoryId);
    const fetchServiceItemsForCat = useAdminStore(s => s.fetchServiceItemsForCat);
    const addSvcItem = useAdminStore(s => s.addSvcItem);
    const editSvcItem = useAdminStore(s => s.editSvcItem);
    const removeSvcItem = useAdminStore(s => s.removeSvcItem);

    const wcConfig = useAdminStore(s => s.wcConfig);
    const wcConfigLoading = useAdminStore(s => s.wcConfigLoading);
    const fetchWCConfig = useAdminStore(s => s.fetchWCConfig);
    const updateWCConfig = useAdminStore(s => s.updateWCConfig);

    const operationInProgress = useAdminStore(s => s.operationInProgress);
    const seedWCData = useAdminStore(s => s.seedWCData);

    const [seedConfirm, setSeedConfirm] = useState(false);

    useEffect(() => {
        fetchServiceCategories();
        fetchWCConfig();
    }, [fetchServiceCategories, fetchWCConfig]);

    return (
        <>
            <div className="admin-topbar">
                <h1 className="admin-topbar-title">Work & Contact</h1>
                <div className="admin-topbar-actions">
                    {serviceCategories.length === 0 && !serviceCategoriesLoading && (
                        <button
                            className="admin-btn admin-btn-ghost"
                            onClick={() => setSeedConfirm(true)}
                            disabled={!!operationInProgress}
                        >
                            <Database size={14} />
                            Seed Default Data
                        </button>
                    )}
                </div>
            </div>

            <div style={{ padding: '28px' }}>
                {/* Tabs */}
                <div className="admin-tabs">
                    <button
                        className={`admin-tab ${activeTab === 'services' ? 'active' : ''}`}
                        onClick={() => setActiveTab('services')}
                    >
                        <Briefcase size={14} />
                        Services
                    </button>
                    <button
                        className={`admin-tab ${activeTab === 'contact' ? 'active' : ''}`}
                        onClick={() => setActiveTab('contact')}
                    >
                        <Phone size={14} />
                        Contact Info
                    </button>
                </div>

                {activeTab === 'services' ? (
                    <ServicesTab
                        categories={serviceCategories}
                        loading={serviceCategoriesLoading}
                        items={serviceItems}
                        itemsLoading={serviceItemsLoading}
                        selectedCategoryId={selectedCategoryId}
                        onFetchItems={fetchServiceItemsForCat}
                        onAddCategory={addServiceCat}
                        onEditCategory={editServiceCat}
                        onRemoveCategory={removeServiceCat}
                        onAddItem={addSvcItem}
                        onEditItem={editSvcItem}
                        onRemoveItem={removeSvcItem}
                        operationInProgress={operationInProgress}
                        config={wcConfig}
                        onUpdateConfig={updateWCConfig}
                    />
                ) : (
                    <ContactTab
                        config={wcConfig}
                        loading={wcConfigLoading}
                        onUpdate={updateWCConfig}
                        operationInProgress={operationInProgress}
                    />
                )}
            </div>

            {/* Seed Confirm Dialog */}
            <ConfirmDialog
                open={seedConfirm}
                title="Seed Default Work-Contact Data"
                message="This will populate Firestore with the 4 default service categories (Static Image AI, AI Video, AI Music, Packages) with all their services, plus the contact info (phone, email, Instagram). Continue?"
                confirmLabel="Seed Data"
                onConfirm={async () => {
                    setSeedConfirm(false);
                    await seedWCData();
                }}
                onCancel={() => setSeedConfirm(false)}
            />
        </>
    );
}

// ═════════════════════════════════════════════════════════════════════════════════
//  SERVICES TAB
// ═════════════════════════════════════════════════════════════════════════════════

interface ServicesTabProps {
    categories: ServiceCategory[];
    loading: boolean;
    items: ServiceItem[];
    itemsLoading: boolean;
    selectedCategoryId: string | null;
    onFetchItems: (catId: string) => Promise<void>;
    onAddCategory: (data: Omit<ServiceCategory, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string | null>;
    onEditCategory: (id: string, data: Partial<ServiceCategory>) => Promise<void>;
    onRemoveCategory: (id: string) => Promise<void>;
    onAddItem: (catId: string, item: Omit<ServiceItem, 'id' | 'createdAt'>) => Promise<string | null>;
    onEditItem: (catId: string, itemId: string, data: Partial<ServiceItem>) => Promise<void>;
    onRemoveItem: (catId: string, itemId: string) => Promise<void>;
    operationInProgress: string | null;
    config: WorkContactConfig | null;
    onUpdateConfig: (data: Partial<WorkContactConfig>) => Promise<void>;
}

function ServicesTab({
    categories, loading, items, itemsLoading, selectedCategoryId,
    onFetchItems, onAddCategory, onEditCategory, onRemoveCategory,
    onAddItem, onEditItem, onRemoveItem, operationInProgress,
    config, onUpdateConfig,
}: ServicesTabProps) {
    const [expandedCat, setExpandedCat] = useState<string | null>(null);
    const [showAddCat, setShowAddCat] = useState(false);
    const [editCatId, setEditCatId] = useState<string | null>(null);
    const [showAddItem, setShowAddItem] = useState(false);
    const [editItemId, setEditItemId] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'category' | 'item'; id: string; catId?: string } | null>(null);

    // Section title / footer
    const [sectionTitle, setSectionTitle] = useState(config?.sectionTitle || 'Our Services');
    const [footerNote, setFooterNote] = useState(config?.footerNote || '');
    const [titleDirty, setTitleDirty] = useState(false);

    useEffect(() => {
        if (config) {
            setSectionTitle(config.sectionTitle || 'Our Services');
            setFooterNote(config.footerNote || '');
        }
    }, [config]);

    const handleExpandCat = (catId: string) => {
        if (expandedCat === catId) {
            setExpandedCat(null);
        } else {
            setExpandedCat(catId);
            onFetchItems(catId);
        }
    };

    const handleSaveTitles = async () => {
        await onUpdateConfig({ sectionTitle, footerNote });
        setTitleDirty(false);
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: 40 }}>
                <div className="admin-spinner" style={{ margin: '0 auto' }} />
            </div>
        );
    }

    return (
        <>
            {/* Section Title & Footer Note */}
            <div className="admin-card" style={{ marginBottom: 20 }}>
                <div className="admin-card-header">
                    <div className="admin-card-title">Page Settings</div>
                    {titleDirty && (
                        <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={handleSaveTitles}>
                            <Save size={12} /> Save
                        </button>
                    )}
                </div>
                <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
                    <div>
                        <label className="admin-label">Services Section Title</label>
                        <input
                            className="admin-input"
                            value={sectionTitle}
                            onChange={e => { setSectionTitle(e.target.value); setTitleDirty(true); }}
                        />
                    </div>
                    <div>
                        <label className="admin-label">Footer Note</label>
                        <textarea
                            className="admin-input"
                            rows={2}
                            value={footerNote}
                            onChange={e => { setFooterNote(e.target.value); setTitleDirty(true); }}
                        />
                    </div>
                </div>
            </div>

            {/* Categories Header */}
            <div className="admin-card" style={{ marginBottom: 20 }}>
                <div className="admin-card-header">
                    <div>
                        <div className="admin-card-title">Service Categories</div>
                        <div className="admin-card-subtitle">{categories.length} categories</div>
                    </div>
                    <button
                        className="admin-btn admin-btn-primary admin-btn-sm"
                        onClick={() => setShowAddCat(true)}
                        disabled={!!operationInProgress}
                    >
                        <Plus size={14} /> Add Category
                    </button>
                </div>

                {/* Add Category Form */}
                {showAddCat && (
                    <CategoryForm
                        onSave={async (data) => {
                            await onAddCategory({ ...data, order: categories.length, visible: true });
                            setShowAddCat(false);
                        }}
                        onCancel={() => setShowAddCat(false)}
                    />
                )}

                {/* Category List */}
                {categories.length === 0 ? (
                    <div className="admin-empty">
                        <Briefcase />
                        <h3>No service categories yet</h3>
                        <p>Click &quot;Add Category&quot; to create your first service category.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                        {categories.map(cat => {
                            const Icon = getIconComponent(cat.icon);
                            const isExpanded = expandedCat === cat.id;
                            return (
                                <div key={cat.id} className="admin-wc-category">
                                    <div
                                        className="admin-wc-category-header"
                                        onClick={() => handleExpandCat(cat.id!)}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                            <Icon size={18} style={{ color: 'var(--admin-accent)' }} />
                                            <div>
                                                <div style={{ fontWeight: 500, fontSize: 14 }}>{cat.title}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <button
                                                className="admin-btn admin-btn-ghost admin-btn-sm"
                                                title={cat.visible ? 'Visible' : 'Hidden'}
                                                onClick={(e) => { e.stopPropagation(); onEditCategory(cat.id!, { visible: !cat.visible }); }}
                                            >
                                                {cat.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                                            </button>
                                            <button
                                                className="admin-btn admin-btn-ghost admin-btn-sm"
                                                onClick={(e) => { e.stopPropagation(); setEditCatId(cat.id!); }}
                                            >
                                                <Edit3 size={14} />
                                            </button>
                                            <button
                                                className="admin-btn admin-btn-ghost admin-btn-sm"
                                                onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'category', id: cat.id! }); }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Edit Category inline */}
                                    {editCatId === cat.id && (
                                        <div style={{ padding: '0 16px 16px' }}>
                                            <CategoryForm
                                                initial={cat}
                                                onSave={async (data) => {
                                                    await onEditCategory(cat.id!, data);
                                                    setEditCatId(null);
                                                }}
                                                onCancel={() => setEditCatId(null)}
                                            />
                                        </div>
                                    )}

                                    {/* Expanded: service items */}
                                    {isExpanded && editCatId !== cat.id && (
                                        <div className="admin-wc-items-panel">
                                            {itemsLoading && selectedCategoryId === cat.id ? (
                                                <div style={{ textAlign: 'center', padding: 16 }}>
                                                    <div className="admin-spinner" style={{ margin: '0 auto', width: 20, height: 20 }} />
                                                </div>
                                            ) : (
                                                <>
                                                    {items.length === 0 && selectedCategoryId === cat.id ? (
                                                        <div style={{ color: 'var(--admin-text-muted)', fontSize: 13, padding: '8px 16px' }}>
                                                            No services in this category yet.
                                                        </div>
                                                    ) : selectedCategoryId === cat.id && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 8px' }}>
                                                            {items.map(item => (
                                                                <div key={item.id} className="admin-wc-item-row">
                                                                    {editItemId === item.id ? (
                                                                        <ServiceItemForm
                                                                            initial={item}
                                                                            onSave={async (data) => {
                                                                                await onEditItem(cat.id!, item.id!, data);
                                                                                setEditItemId(null);
                                                                            }}
                                                                            onCancel={() => setEditItemId(null)}
                                                                        />
                                                                    ) : (
                                                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1 }}>
                                                                            <div style={{ flex: 1 }}>
                                                                                <div style={{ fontWeight: 500, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                                    {item.title}
                                                                                    {item.pricing && (
                                                                                        <span className="admin-wc-pricing-badge">
                                                                                            <DollarSign size={10} />
                                                                                            {item.pricing}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)', marginTop: 2 }}>
                                                                                    {item.description}
                                                                                </div>
                                                                            </div>
                                                                            <div style={{ display: 'flex', gap: 4 }}>
                                                                                <button
                                                                                    className="admin-btn admin-btn-ghost admin-btn-sm"
                                                                                    onClick={() => setEditItemId(item.id!)}
                                                                                >
                                                                                    <Edit3 size={12} />
                                                                                </button>
                                                                                <button
                                                                                    className="admin-btn admin-btn-ghost admin-btn-sm"
                                                                                    onClick={() => setDeleteConfirm({ type: 'item', id: item.id!, catId: cat.id! })}
                                                                                >
                                                                                    <Trash2 size={12} />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Add item */}
                                                    {showAddItem && expandedCat === cat.id ? (
                                                        <div style={{ padding: '8px' }}>
                                                            <ServiceItemForm
                                                                onSave={async (data) => {
                                                                    await onAddItem(cat.id!, { ...data, order: items.length });
                                                                    setShowAddItem(false);
                                                                }}
                                                                onCancel={() => setShowAddItem(false)}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <button
                                                            className="admin-btn admin-btn-ghost admin-btn-sm"
                                                            onClick={() => setShowAddItem(true)}
                                                            style={{ margin: '8px' }}
                                                        >
                                                            <Plus size={12} /> Add Service
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Delete Confirm */}
            <ConfirmDialog
                open={!!deleteConfirm}
                title={deleteConfirm?.type === 'category' ? 'Delete Category' : 'Delete Service'}
                message={
                    deleteConfirm?.type === 'category'
                        ? 'This will permanently delete this category and all its services. Continue?'
                        : 'This will permanently delete this service. Continue?'
                }
                confirmLabel="Delete"
                onConfirm={async () => {
                    if (!deleteConfirm) return;
                    if (deleteConfirm.type === 'category') {
                        await onRemoveCategory(deleteConfirm.id);
                    } else {
                        await onRemoveItem(deleteConfirm.catId!, deleteConfirm.id);
                    }
                    setDeleteConfirm(null);
                }}
                onCancel={() => setDeleteConfirm(null)}
            />
        </>
    );
}

// ─── Category Form ───────────────────────────────────────────────────────────────

function CategoryForm({
    initial,
    onSave,
    onCancel,
}: {
    initial?: Partial<ServiceCategory>;
    onSave: (data: { title: string; icon: string }) => Promise<void>;
    onCancel: () => void;
}) {
    const [title, setTitle] = useState(initial?.title || '');
    const [icon, setIcon] = useState(initial?.icon || 'package');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        await onSave({ title: title.trim(), icon });
    };

    return (
        <form onSubmit={handleSubmit} className="admin-wc-form" style={{ marginTop: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
                <div>
                    <label className="admin-label">Category Title</label>
                    <input
                        className="admin-input"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="e.g., Static Image AI"
                        autoFocus
                    />
                </div>
                <div>
                    <label className="admin-label">Icon</label>
                    <select className="admin-input" value={icon} onChange={e => setIcon(e.target.value)}>
                        {ICON_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button className="admin-btn admin-btn-primary admin-btn-sm" type="submit">
                    <Save size={12} /> {initial ? 'Update' : 'Create'}
                </button>
                <button className="admin-btn admin-btn-ghost admin-btn-sm" type="button" onClick={onCancel}>
                    <X size={12} /> Cancel
                </button>
            </div>
        </form>
    );
}

// ─── Service Item Form ──────────────────────────────────────────────────────────

function ServiceItemForm({
    initial,
    onSave,
    onCancel,
}: {
    initial?: Partial<ServiceItem>;
    onSave: (data: { title: string; description: string; pricing?: string }) => Promise<void>;
    onCancel: () => void;
}) {
    const [title, setTitle] = useState(initial?.title || '');
    const [description, setDescription] = useState(initial?.description || '');
    const [pricing, setPricing] = useState(initial?.pricing || '');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        await onSave({
            title: title.trim(),
            description: description.trim(),
            pricing: pricing.trim() || undefined,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="admin-wc-form">
            <div style={{ display: 'grid', gap: 10 }}>
                <div>
                    <label className="admin-label">Title</label>
                    <input
                        className="admin-input"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="e.g., Single Concept (1-2 Final Images)"
                        autoFocus
                    />
                </div>
                <div>
                    <label className="admin-label">Description</label>
                    <textarea
                        className="admin-input"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Brief description of this service"
                        rows={2}
                    />
                </div>
                <div>
                    <label className="admin-label">
                        Pricing <span style={{ color: 'var(--admin-text-muted)', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <input
                        className="admin-input"
                        value={pricing}
                        onChange={e => setPricing(e.target.value)}
                        placeholder="e.g., €150, From €500"
                    />
                </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button className="admin-btn admin-btn-primary admin-btn-sm" type="submit">
                    <Save size={12} /> {initial ? 'Update' : 'Add'}
                </button>
                <button className="admin-btn admin-btn-ghost admin-btn-sm" type="button" onClick={onCancel}>
                    <X size={12} /> Cancel
                </button>
            </div>
        </form>
    );
}

// ═════════════════════════════════════════════════════════════════════════════════
//  CONTACT TAB
// ═════════════════════════════════════════════════════════════════════════════════

function ContactTab({
    config,
    loading,
    onUpdate,
    operationInProgress,
}: {
    config: WorkContactConfig | null;
    loading: boolean;
    onUpdate: (data: Partial<WorkContactConfig>) => Promise<void>;
    operationInProgress: string | null;
}) {
    const [contactTitle, setContactTitle] = useState('');
    const [contactSubtitle, setContactSubtitle] = useState('');
    const [contacts, setContacts] = useState<ContactEntry[]>([]);
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        if (config) {
            setContactTitle(config.contactTitle || '');
            setContactSubtitle(config.contactSubtitle || '');
            setContacts(config.contacts || []);
        }
    }, [config]);

    const handleSave = async () => {
        await onUpdate({ contactTitle, contactSubtitle, contacts });
        setDirty(false);
    };

    const updateContact = (idx: number, field: keyof ContactEntry, value: string) => {
        const updated = [...contacts];
        updated[idx] = { ...updated[idx], [field]: value };
        setContacts(updated);
        setDirty(true);
    };

    const removeContact = (idx: number) => {
        setContacts(contacts.filter((_, i) => i !== idx));
        setDirty(true);
    };

    const addContact = () => {
        setContacts([...contacts, { label: '', value: '', href: '', type: 'link' }]);
        setDirty(true);
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: 40 }}>
                <div className="admin-spinner" style={{ margin: '0 auto' }} />
            </div>
        );
    }

    return (
        <div className="admin-card">
            <div className="admin-card-header">
                <div className="admin-card-title">Contact Information</div>
                {dirty && (
                    <button
                        className="admin-btn admin-btn-primary admin-btn-sm"
                        onClick={handleSave}
                        disabled={!!operationInProgress}
                    >
                        <Save size={12} /> Save Changes
                    </button>
                )}
            </div>

            <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
                <div>
                    <label className="admin-label">Contact Section Title</label>
                    <input
                        className="admin-input"
                        value={contactTitle}
                        onChange={e => { setContactTitle(e.target.value); setDirty(true); }}
                        placeholder="Start Your Project"
                    />
                </div>
                <div>
                    <label className="admin-label">Contact Section Subtitle</label>
                    <input
                        className="admin-input"
                        value={contactSubtitle}
                        onChange={e => { setContactSubtitle(e.target.value); setDirty(true); }}
                        placeholder="Get in touch with us..."
                    />
                </div>

                {/* Contact Entries */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <label className="admin-label" style={{ margin: 0 }}>Contact Entries</label>
                        <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={addContact}>
                            <Plus size={12} /> Add Entry
                        </button>
                    </div>

                    {contacts.length === 0 ? (
                        <div style={{ color: 'var(--admin-text-muted)', fontSize: 13, padding: 12, textAlign: 'center' }}>
                            No contact entries yet. Click &quot;Add Entry&quot; to add phone, email, etc.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {contacts.map((entry, idx) => {
                                const TypeIcon = CONTACT_TYPE_ICONS[entry.type] || LinkIcon;
                                return (
                                    <div key={idx} className="admin-wc-contact-entry">
                                        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
                                            <div>
                                                <label className="admin-label">Type</label>
                                                <select
                                                    className="admin-input"
                                                    value={entry.type}
                                                    onChange={e => updateContact(idx, 'type', e.target.value)}
                                                >
                                                    <option value="phone">Phone</option>
                                                    <option value="email">Email</option>
                                                    <option value="social">Social</option>
                                                    <option value="link">Link</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="admin-label">Label</label>
                                                <input
                                                    className="admin-input"
                                                    value={entry.label}
                                                    onChange={e => updateContact(idx, 'label', e.target.value)}
                                                    placeholder="PHONE"
                                                />
                                            </div>
                                            <div>
                                                <label className="admin-label">Display Value</label>
                                                <input
                                                    className="admin-input"
                                                    value={entry.value}
                                                    onChange={e => updateContact(idx, 'value', e.target.value)}
                                                    placeholder="+30 697..."
                                                />
                                            </div>
                                            <div>
                                                <label className="admin-label">Link / href</label>
                                                <input
                                                    className="admin-input"
                                                    value={entry.href}
                                                    onChange={e => updateContact(idx, 'href', e.target.value)}
                                                    placeholder="tel:+30..."
                                                />
                                            </div>
                                            <button
                                                className="admin-btn admin-btn-ghost admin-btn-sm"
                                                onClick={() => removeContact(idx)}
                                                style={{ marginBottom: 2 }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
