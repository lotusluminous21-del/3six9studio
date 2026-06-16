import type { ReactNode } from 'react';
import { business } from '@/lib/businessInfo';
import type { SiteContent } from '@/content';
import { ROUTES, type Locale, type RouteKey } from '@/lib/seo';

/**
 * Visible, scrollable shell for the marketing content routes (/services,
 * /contact and their /en twins). Provides a simple header (brand + nav + language
 * switch) and a footer with NAP. The `.seo-page` class restores normal page
 * scrolling (globals.css scopes the canvas's overflow:hidden away from it).
 */
export default function ContentShell({
    content,
    locale,
    page,
    children,
}: {
    content: SiteContent;
    locale: Locale;
    page: RouteKey;
    children: ReactNode;
}) {
    const altLocale: Locale = locale === 'el' ? 'en' : 'el';
    const altUrl = ROUTES[page][altLocale];
    const altLabel = altLocale === 'el' ? 'Ελληνικά' : 'English';

    return (
        <div className="seo-page">
            <header className="seo-topbar">
                <a className="seo-brand" href={ROUTES.home[locale]}>{business.name}</a>
                <nav className="seo-nav" aria-label={content.nav.services}>
                    <a href={ROUTES.home[locale]}>{content.nav.home}</a>
                    <a href={ROUTES.services[locale]}>{content.nav.services}</a>
                    <a href={ROUTES.contact[locale]}>{content.nav.contact}</a>
                    <a href={altUrl} hrefLang={altLocale} className="seo-lang">{altLabel}</a>
                </nav>
            </header>

            <main>{children}</main>

            <footer className="seo-footer">
                <p>
                    <strong>{business.name}</strong> — {content.brandTagline}.{' '}
                    {business.address.locality}, {locale === 'el' ? 'Ελλάδα' : 'Greece'}.
                </p>
                <p className="seo-footer-meta">
                    <a href={business.emailHref}>{business.email}</a>{' · '}
                    <a href={business.phoneHref}>{business.phone}</a>{' · '}
                    <a href={business.instagram} target="_blank" rel="noopener noreferrer">{business.instagramHandle}</a>
                </p>
                <p className="seo-footer-updated">
                    {locale === 'el' ? 'Τελευταία ενημέρωση' : 'Last updated'}: {content.lastUpdated}
                </p>
            </footer>
        </div>
    );
}
