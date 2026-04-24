/**
 * Server-side locale detection for dynamic translation.
 *
 * The client LanguageProvider is expected to mirror its chosen locale
 * into a cookie named `NEXT_LOCALE` with value = locale code
 * (e.g. `ar`, `fr`, `de`, `es`, `en`) set with
 * `path=/; max-age=31536000; samesite=lax`.
 *
 * Server components / server actions read this cookie to decide whether
 * to translate fetched content.
 */

import { cookies } from 'next/headers';

const SUPPORTED_LOCALES = new Set(['en', 'ar', 'fr', 'de', 'es']);
const DEFAULT_LOCALE = 'en';

export async function getServerLocale(): Promise<string> {
  try {
    const store = await cookies();
    const raw = store.get('NEXT_LOCALE')?.value;
    if (raw && SUPPORTED_LOCALES.has(raw)) return raw;
  } catch {
    // cookies() can throw if called outside a request context — fall back silently.
  }
  return DEFAULT_LOCALE;
}

export async function getPublicTargetLocale(): Promise<string> {
  return getServerLocale();
}
