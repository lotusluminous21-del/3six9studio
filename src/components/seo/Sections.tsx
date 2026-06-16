import { business } from '@/lib/businessInfo';
import type { SiteContent } from '@/content';
import { ROUTES, type Locale } from '@/lib/seo';

/**
 * Server-rendered, semantic marketing sections. These ship in the initial HTML
 * so Googlebot, JS-less AI crawlers and screen readers all read identical
 * content. No 'use client' — pure server components.
 */

export function Hero({ content, locale }: { content: SiteContent; locale: Locale }) {
    return (
        <header className="seo-hero">
            <p className="seo-eyebrow">{content.brandTagline}</p>
            <h1>{content.hero.h1}</h1>
            <p className="seo-lede">{content.hero.h2}</p>
            <p>{content.hero.body}</p>
            <p className="seo-cta-row">
                <a className="seo-cta" href={ROUTES.services[locale]}>{content.hero.ctaServices}</a>
                <a className="seo-cta seo-cta-secondary" href={ROUTES.contact[locale]}>{content.hero.ctaContact}</a>
            </p>
        </header>
    );
}

export function ServicesSection({ content }: { content: SiteContent }) {
    return (
        <section className="seo-services" aria-labelledby="services-heading">
            <h2 id="services-heading">{content.locale === 'el' ? 'Τι κάνουμε' : 'What we do'}</h2>
            <p className="seo-intro">{content.intro}</p>
            <div className="seo-service-grid">
                {content.services.map((s) => (
                    <article key={s.slug} id={s.slug} className="seo-service">
                        <h3>{s.name}</h3>
                        <p className="seo-tagline">{s.tagline}</p>
                        <p>{s.description}</p>
                        <p className="seo-ideal-label">{content.locale === 'el' ? 'Ιδανικό για:' : 'Ideal for:'}</p>
                        <ul>
                            {s.idealFor.map((it) => (
                                <li key={it}>{it}</li>
                            ))}
                        </ul>
                    </article>
                ))}
            </div>
        </section>
    );
}

export function WhyUs({ content }: { content: SiteContent }) {
    return (
        <section className="seo-why" aria-labelledby="why-heading">
            <h2 id="why-heading">{content.whyUs.title}</h2>
            <ul className="seo-why-list">
                {content.whyUs.points.map((p) => (
                    <li key={p}>{p}</li>
                ))}
            </ul>
        </section>
    );
}

export function ComparisonTable({ content }: { content: SiteContent }) {
    return (
        <section className="seo-comparison" aria-labelledby="comparison-heading">
            <h2 id="comparison-heading">{content.comparison.title}</h2>
            <table>
                <thead>
                    <tr>
                        <th scope="col">{content.locale === 'el' ? '' : ''}</th>
                        <th scope="col">{content.comparison.aiLabel}</th>
                        <th scope="col">{content.comparison.traditionalLabel}</th>
                    </tr>
                </thead>
                <tbody>
                    {content.comparison.rows.map((r) => (
                        <tr key={r.label}>
                            <th scope="row">{r.label}</th>
                            <td>{r.ai}</td>
                            <td>{r.traditional}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
    );
}

export function FaqSection({ content }: { content: SiteContent }) {
    return (
        <section className="seo-faq" aria-labelledby="faq-heading">
            <h2 id="faq-heading">{content.faq.title}</h2>
            <div className="seo-faq-list">
                {content.faq.items.map((item, i) => (
                    <details key={i} className="seo-faq-item">
                        <summary>{item.q}</summary>
                        <p>{item.a}</p>
                    </details>
                ))}
            </div>
        </section>
    );
}

export function Glossary({ content }: { content: SiteContent }) {
    return (
        <section className="seo-glossary" aria-labelledby="glossary-heading">
            <h2 id="glossary-heading">{content.glossary.title}</h2>
            <dl>
                {content.glossary.items.map((g) => (
                    <div key={g.term} className="seo-glossary-item">
                        <dt>{g.term}</dt>
                        <dd>{g.definition}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}

export function ContactDetails({ content }: { content: SiteContent }) {
    return (
        <>
            <ul className="seo-contact-list">
                <li>
                    <span className="seo-contact-label">Email</span>
                    <a href={business.emailHref}>{business.email}</a>
                </li>
                <li>
                    <span className="seo-contact-label">{content.locale === 'el' ? 'Τηλέφωνο' : 'Phone'}</span>
                    <a href={business.phoneHref}>{business.phone}</a>
                </li>
                <li>
                    <span className="seo-contact-label">Instagram</span>
                    <a href={business.instagram} target="_blank" rel="noopener noreferrer">{business.instagramHandle}</a>
                </li>
            </ul>
            <p className="seo-nap">
                <strong>{content.contact.basedInLabel}:</strong> {business.address.locality}, {content.locale === 'el' ? 'Ελλάδα' : 'Greece'}
                {' · '}
                <strong>{content.contact.areaServedLabel}:</strong>{' '}
                {content.locale === 'el' ? 'Ελλάδα, Κύπρος, Ευρώπη' : 'Greece, Cyprus, Europe'}
            </p>
        </>
    );
}

export function ContactSection({ content }: { content: SiteContent }) {
    return (
        <section className="seo-contact" aria-labelledby="contact-heading">
            <h2 id="contact-heading">{content.contact.title}</h2>
            <p>{content.contact.intro}</p>
            <ContactDetails content={content} />
        </section>
    );
}
