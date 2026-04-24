'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { localeLoaders } from '@/locales';
import type { TranslationMap } from '@/locales';

const LOCALE_COOKIE = 'NEXT_LOCALE';

function writeLocaleCookie(lang: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${LOCALE_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
}

export type Language = string;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
}

const RTL_LANGUAGES = new Set(['ar', 'he', 'fa', 'ur']);

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Cache of already-loaded translation maps (avoids re-fetching)
const loadedLocales: Record<string, Partial<TranslationMap>> = {};

async function loadLocale(lang: Language): Promise<Partial<TranslationMap>> {
  if (loadedLocales[lang]) return loadedLocales[lang];
  const loader = localeLoaders[lang];
  if (!loader) return {};
  const mod = await loader();
  loadedLocales[lang] = mod.default ?? mod;
  return loadedLocales[lang];
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  // translations for the current language — starts populated from en.json
  const [translations, setTranslations] = useState<Partial<TranslationMap>>({});
  // fallback (English) — loaded once on mount
  const [fallback, setFallback] = useState<Partial<TranslationMap>>({});
  const router = useRouter();
  const prevLanguageRef = useRef<Language | null>(null);

  // Load English first so t() never returns bare keys
  useEffect(() => {
    loadLocale('en').then((en) => {
      setFallback(en);
      // Also use it as the active locale if language is already "en"
      setTranslations((prev) => (Object.keys(prev).length === 0 ? en : prev));
    });
  }, []);

  // Restore language preference from localStorage, and ensure NEXT_LOCALE cookie
  // is populated on first mount so server components get the right locale even
  // for returning users who had a saved preference before this change landed.
  useEffect(() => {
    const saved = localStorage.getItem('language');
    const initial = saved && localeLoaders[saved] ? saved : 'en';
    if (initial !== 'en') {
      setLanguageState(initial);
    }
    writeLocaleCookie(initial);
    prevLanguageRef.current = initial;
  }, []);

  // Load locale file whenever language changes
  useEffect(() => {
    loadLocale(language).then(setTranslations);

    localStorage.setItem('language', language);
    document.documentElement.dir = RTL_LANGUAGES.has(language) ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    writeLocaleCookie(language);

    // Only refresh server components when the user actively switches locales
    // (not on initial mount, where prevLanguageRef matches `language`).
    const prev = prevLanguageRef.current;
    if (prev !== null && prev !== language) {
      router.refresh();
    }
    prevLanguageRef.current = language;
  }, [language, router]);

  const setLanguage = useCallback((lang: Language) => {
    if (localeLoaders[lang]) {
      setLanguageState(lang);
    } else {
      console.warn(`[i18n] Unknown locale "${lang}". Add it to src/locales/index.ts.`);
    }
  }, []);

  const t = useCallback(
    (key: string): string =>
      (translations as Record<string, string>)[key] ??
      (fallback as Record<string, string>)[key] ??
      key,
    [translations, fallback]
  );

  const dir: 'ltr' | 'rtl' = RTL_LANGUAGES.has(language) ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

/**
 * List of supported languages shown in the language switcher UI.
 * Add new entries here when adding a new locale JSON file.
 */
export const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ar', name: 'العربية', flag: '🇪🇬' },
];
