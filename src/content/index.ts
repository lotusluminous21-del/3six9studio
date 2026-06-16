import type { Locale } from '@/lib/seo';
import type { SiteContent } from './types';
import { el } from './site.el';
import { en } from './site.en';

const CONTENT: Record<Locale, SiteContent> = { el, en };

export function getContent(locale: Locale): SiteContent {
    return CONTENT[locale] ?? el;
}

export type { SiteContent } from './types';
