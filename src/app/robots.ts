import type { MetadataRoute } from 'next';
import { BASE_URL } from '@/lib/seo';

/**
 * Crawl policy (decision: allow search/citation + user-fetch bots; disallow AI
 * *training* crawlers).
 *
 * - Default `*` group allows the whole public site, so the citation/search bots
 *   that drive AI answers — OAI-SearchBot, ChatGPT-User, Claude-SearchBot,
 *   Claude-User, PerplexityBot, Perplexity-User, Bingbot, Googlebot, Applebot —
 *   are all allowed and the studio stays visible in ChatGPT/Perplexity/Claude/
 *   Gemini answers.
 * - The training crawlers below get their own group disallowing the whole site,
 *   so the brand still appears in AI answers but its content is not used to
 *   train future base models. (Bytespider ignores robots.txt; a WAF block is the
 *   only reliable control if its crawl volume ever becomes a problem.)
 */
const TRAINING_BOTS = [
    'GPTBot',
    'ClaudeBot',
    'Google-Extended',
    'Applebot-Extended',
    'CCBot',
    'Amazonbot',
    'Meta-ExternalAgent',
    'meta-externalagent',
    'Bytespider',
    'anthropic-ai',
];

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            { userAgent: '*', allow: '/', disallow: ['/admin', '/api'] },
            ...TRAINING_BOTS.map((userAgent) => ({ userAgent, disallow: '/' })),
        ],
        sitemap: `${BASE_URL}/sitemap.xml`,
        host: BASE_URL,
    };
}
