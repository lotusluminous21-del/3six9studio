import { getContent } from '@/content';
import JsonLd from '@/components/JsonLd';
import ContentShell from './ContentShell';
import {
    ServicesSection,
    WhyUs,
    ComparisonTable,
    FaqSection,
    Glossary,
    ContactDetails,
} from './Sections';
import type { Locale } from '@/lib/seo';

/**
 * Full, visible /services page (and its /en twin). All copy is server-rendered.
 */
export function ServicesPage({ locale }: { locale: Locale }) {
    const content = getContent(locale);
    return (
        <>
            <ContentShell content={content} locale={locale} page="services">
                <header className="seo-hero">
                    <p className="seo-eyebrow">{content.brandTagline}</p>
                    <h1>{content.meta.servicesTitle}</h1>
                    <p className="seo-lede">{content.hero.h2}</p>
                </header>
                <ServicesSection content={content} />
                <ComparisonTable content={content} />
                <WhyUs content={content} />
                <FaqSection content={content} />
                <Glossary content={content} />
            </ContentShell>
            <JsonLd locale={locale} page="services" />
        </>
    );
}

/**
 * Full, visible /contact page (and its /en twin).
 */
export function ContactPage({ locale }: { locale: Locale }) {
    const content = getContent(locale);
    return (
        <>
            <ContentShell content={content} locale={locale} page="contact">
                <header className="seo-hero">
                    <p className="seo-eyebrow">{content.brandTagline}</p>
                    <h1>{content.contact.title}</h1>
                    <p className="seo-lede">{content.contact.intro}</p>
                    <p className="seo-response-note">{content.contact.responseNote}</p>
                </header>
                <section className="seo-contact" aria-label={content.contact.title}>
                    <ContactDetails content={content} />
                </section>
            </ContentShell>
            <JsonLd locale={locale} page="contact" />
        </>
    );
}
