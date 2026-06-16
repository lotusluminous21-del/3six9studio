import { business } from '@/lib/businessInfo';
import type { SiteContent } from '@/content';
import { ROUTES, type Locale } from '@/lib/seo';

/**
 * The homepage's server-rendered semantic layer.
 *
 * The immersive WebGL canvas is a pixel "black box" — invisible to crawlers and
 * screen readers alike. This component provides the genuine, accessibility-grade
 * text equivalent of what the experience communicates: a real H1, a concise
 * description, the service list, the service area and the contact details, with
 * links to the full /services and /contact pages.
 *
 * It is visually hidden (so the immersive experience stays pixel-identical) but
 * fully present in the DOM and the accessibility tree — this is legitimate a11y
 * content, not hidden keyword text. The substantive, fully-visible copy lives on
 * /services and /contact.
 */
export default function HomeSeoLayer({ content, locale }: { content: SiteContent; locale: Locale }) {
    return (
        <div className="sr-only">
            <h1>{content.hero.h1}</h1>
            <p>{content.hero.h2}</p>
            <p>{content.hero.body}</p>

            <h2>{content.nav.services}</h2>
            <ul>
                {content.services.map((s) => (
                    <li key={s.slug}>
                        <strong>{s.name}.</strong> {s.tagline} {s.description}
                    </li>
                ))}
            </ul>

            <h2>{content.whyUs.title}</h2>
            <ul>
                {content.whyUs.points.map((p) => (
                    <li key={p}>{p}</li>
                ))}
            </ul>

            <h2>{content.contact.title}</h2>
            <p>
                {content.contact.basedInLabel}: {business.address.locality}, {locale === 'el' ? 'Ελλάδα' : 'Greece'}.{' '}
                {content.contact.areaServedLabel}: {locale === 'el' ? 'Ελλάδα, Κύπρος, Ευρώπη' : 'Greece, Cyprus, Europe'}.
            </p>
            <p>
                Email: <a href={business.emailHref}>{business.email}</a>{' · '}
                {locale === 'el' ? 'Τηλέφωνο' : 'Phone'}: <a href={business.phoneHref}>{business.phone}</a>{' · '}
                Instagram: <a href={business.instagram}>{business.instagramHandle}</a>
            </p>

            <nav aria-label={locale === 'el' ? 'Περισσότερα' : 'More'}>
                <a href={ROUTES.services[locale]}>{content.nav.services}</a>
                {' · '}
                <a href={ROUTES.contact[locale]}>{content.nav.contact}</a>
            </nav>
        </div>
    );
}
