import { buildGraph } from '@/lib/schema';
import type { Locale, RouteKey } from '@/lib/seo';

/**
 * Server component that renders the page's Schema.org @graph as a single
 * <script type="application/ld+json"> in the initial HTML. This is one of the
 * few things non-JS AI crawlers can parse on a JS-heavy site, so it ships
 * server-side (never injected client-side). Follows the official Next.js
 * pattern — no client-side de-dup wrapper.
 */
export default function JsonLd({ locale, page }: { locale: Locale; page: RouteKey }) {
    const graph = buildGraph(locale, page);
    return (
        <script
            type="application/ld+json"
            // Escape `<` to avoid breaking out of the script context.
            dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, '\\u003c') }}
        />
    );
}
