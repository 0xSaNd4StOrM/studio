/**
 * Server-side admin translation helper.
 *
 * Usage in server components:
 *   const t = getAdminT(agencySettings?.data?.adminLanguage ?? 'en');
 *   <CardTitle>{t('admin.totalRevenue')}</CardTitle>
 *
 * All locale JSON files are statically imported so the bundler can tree-shake
 * unused strings and avoid any runtime dynamic import issues.
 */

import en from '@/locales/en.json';
import ar from '@/locales/ar.json';
import fr from '@/locales/fr.json';
import de from '@/locales/de.json';
import es from '@/locales/es.json';

type LocaleMap = Record<string, string>;

const locales: Record<string, LocaleMap> = {
  en: en as unknown as LocaleMap,
  ar: ar as unknown as LocaleMap,
  fr: fr as unknown as LocaleMap,
  de: de as unknown as LocaleMap,
  es: es as unknown as LocaleMap,
};

/**
 * Returns a synchronous `t(key)` function for the given language code.
 * Falls back to English when the key is missing in the target locale.
 */
export function getAdminT(lang = 'en'): (key: string) => string {
  const translations = locales[lang] ?? locales['en'];
  const fallback = locales['en'];
  return (key: string) => translations[key] ?? fallback[key] ?? key;
}
