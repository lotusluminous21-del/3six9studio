/**
 * Derive human-readable, descriptive alt text from a media URL.
 *
 * The portfolio assets carry descriptive (Midjourney-style) prompt text in
 * their storage filenames. When an explicit `alt` is not set on a gallery item,
 * we clean that filename into a readable caption so images still ship with
 * meaningful alt text for accessibility and image SEO.
 */
export function deriveAlt(url: string, fallback = '3six9studio AI-generated visual'): string {
    if (!url) return fallback;
    try {
        const file = decodeURIComponent(url.split('/').pop() || '');
        let base = file.replace(/\.[a-z0-9]+$/i, '');          // drop extension
        base = base
            .replace(/_\d+$/, '')                              // drop trailing index (e.g. _3)
            .replace(/[_-]?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ' ') // drop UUIDs
            .replace(/^[a-z0-9]+[_\s]/i, '');                  // drop leading author/handle token
        let s = base
            .replace(/[_-]+/g, ' ')                            // separators -> spaces
            // strip hex-ish ids only when they contain a digit, so real words
            // made of a–f letters (e.g. "facade", "decade") are preserved
            .replace(/\b(?=[0-9a-f]*\d)[0-9a-f]{4,}\b/gi, ' ')
            .replace(/\b\d+\b/g, ' ')                          // strip stray numbers
            .replace(/\s+/g, ' ')                              // collapse whitespace
            .trim();
        if (s.length < 8) return fallback;
        return s.charAt(0).toUpperCase() + s.slice(1);
    } catch {
        return fallback;
    }
}
