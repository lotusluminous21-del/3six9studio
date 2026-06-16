import type { SiteContent } from './types';

/**
 * English marketing copy (the /en route). Native English, mirroring the Greek
 * structure 1:1. FAQ answers are answer-first for LLM extraction.
 */
export const en: SiteContent = {
    locale: 'en',
    brandTagline: 'AI product video & photography studio',
    hero: {
        h1: 'AI video & photography for your products',
        h2: 'Professional product content — no studio, no photographer, ready in 48 hours.',
        body: '3six9studio creates product videos and photography with artificial intelligence, for e-commerce stores and businesses that want striking visuals without the cost and delay of a traditional shoot. One image or a hundred — we deliver fast, at consistent quality. Based in Drama, Greece; serving Greece, Cyprus and Europe.',
        ctaServices: 'See our services',
        ctaContact: 'Request a quote',
    },
    intro: 'At 3six9studio we create professional product content with artificial intelligence — faster, more affordable and at greater scale than a traditional production. We work with e-commerce stores, brands and franchise networks across Greece, Cyprus and Europe.',
    services: [
        {
            slug: 'ai-product-video',
            name: 'AI product videos',
            tagline: 'Videos for your products, with no shoot.',
            description: 'Send us the product or just its photos, we design the concept and deliver the final video in 48–72 hours — ready to post, in vertical, square or landscape format.',
            idealFor: ['Instagram & TikTok', 'YouTube ads', 'E-commerce product pages', 'Seasonal campaigns'],
        },
        {
            slug: 'ai-product-photography',
            name: 'AI product photography',
            tagline: 'Professional product images with no photographer or studio.',
            description: 'We create lifestyle shots, white-background images and catalog visuals — in any setting you need, at high resolution, print-ready or web-optimized.',
            idealFor: ['E-commerce listings', 'Printed catalogs', 'Social media', 'Business presentations'],
        },
        {
            slug: 'branded-campaigns',
            name: 'Branded campaigns',
            tagline: 'Complete campaign assets, created with AI.',
            description: 'From idea to final asset: teasers, brand films, animated logos and seasonal content for brands that want to stand out.',
            idealFor: ['Brand launches', 'Seasonal campaigns', 'Franchise recruitment material', 'Trade-show videos'],
        },
        {
            slug: 'bulk-content',
            name: 'Bulk content production',
            tagline: 'From 20 to 100+ assets with a unified look.',
            description: 'We work at scale, with consistent quality and a unified look across everything. Ideal for large e-commerce catalogs, franchise networks or multi-SKU brands.',
            idealFor: ['Large e-commerce catalogs', 'Franchise networks', 'Multi-SKU brands'],
        },
    ],
    whyUs: {
        title: 'Why work with us',
        points: [
            'Delivery in 48–72 hours',
            'From one image to hundreds — at consistent quality',
            'Specialized in cosmetics, haircare, beauty and lifestyle products',
            'Trusted by brands in Greece, Cyprus and Germany',
            'Every asset is created with AI — photorealistic results',
        ],
    },
    comparison: {
        title: 'AI compared to a traditional production',
        aiLabel: 'With 3six9studio (AI)',
        traditionalLabel: 'Traditional production',
        rows: [
            { label: 'Turnaround', ai: '48–72 hours', traditional: '2–4 weeks' },
            { label: 'Studio & photographer', ai: 'Not needed', traditional: 'Required' },
            { label: 'Scale', ai: 'From 1 to 100+ assets, same look', traditional: 'Limited per shoot' },
            { label: 'Cost', ai: 'Significantly lower', traditional: 'High (setup, crew)' },
            { label: 'Revisions', ai: 'Fast, with no re-shoot', traditional: 'Expensive, needs a re-shoot' },
        ],
    },
    faq: {
        title: 'Frequently asked questions',
        items: [
            {
                q: 'How much does AI product photography cost?',
                a: 'Pricing depends on the number and type of assets and your project’s needs. Tell us what you need and you’ll get a personalized quote, usually the same day. AI product photography costs significantly less than a traditional shoot because there is no studio, photographer or setup.',
            },
            {
                q: 'How fast will my content be ready?',
                a: 'We deliver individual assets in 48–72 hours. For larger projects we agree on a realistic timeline together.',
            },
            {
                q: 'Do I need to send the physical product?',
                a: 'No, not in most cases. Clear, high-resolution photos of the product are usually enough; if a project needs more, we’ll discuss it.',
            },
            {
                q: 'Is AI content suitable for e-commerce and Instagram?',
                a: 'Yes, absolutely. We deliver content in the right dimensions and formats for each platform — vertical videos for Reels and TikTok, and high-resolution images for e-commerce and print.',
            },
            {
                q: 'Can I see a sample before I commit?',
                a: 'Of course. Send us one of your products and we’ll create a sample so you can see the result before we proceed.',
            },
            {
                q: 'Where are you based and which areas do you serve?',
                a: 'We are based in Drama, Greece, and serve all of Greece, Cyprus and Europe, with brand partnerships in Germany too. The entire collaboration is handled remotely.',
            },
        ],
    },
    glossary: {
        title: 'Terms we use',
        items: [
            { term: 'AI product photography', definition: 'A photorealistic product image created with artificial intelligence, without a physical photo shoot.' },
            { term: 'AI product video', definition: 'A product advertising video produced with AI, with no shoot or film crew.' },
            { term: 'Branded content', definition: 'Material tailored to a brand’s identity: teasers, brand films, animated logos and seasonal content.' },
            { term: 'Bulk production', definition: 'Creating dozens or hundreds of assets with a single, consistent look across everything.' },
        ],
    },
    contact: {
        title: 'Let’s talk about your product',
        intro: 'Whether you have a specific project in mind or just want to see if we’re a fit — send us a message. We respond within 24 hours and can prepare a free sample for you.',
        basedInLabel: 'Based in',
        areaServedLabel: 'Serving',
        responseNote: 'We respond within 24 hours.',
    },
    nav: {
        home: 'Home',
        services: 'Services',
        contact: 'Contact',
        backToExperience: 'Back to the experience',
    },
    meta: {
        homeTitle: 'AI Product Video & Photography | 3six9studio',
        homeDescription: 'We create AI product videos and photography for e-commerce stores and brands. Ready in 48 hours, no studio. Based in Drama, Greece — serving Greece, Cyprus & Europe.',
        servicesTitle: 'Services: AI Product Photography & Video',
        servicesDescription: 'Product photos for e-commerce, ad videos for Instagram & TikTok, branded content and bulk production. Made with AI, delivered in 48–72 hours.',
        contactTitle: 'Contact — Request a Quote',
        contactDescription: 'Request a quote for AI product video and photography. We respond within 24 hours. Serving Greece, Cyprus & Europe.',
    },
    lastUpdated: '2026-06-16',
};
