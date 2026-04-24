'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { localeLoaders } from '@/locales';
import type { TranslationMap } from '@/locales';
import { createClient } from '@/lib/supabase/client';

export type AdminLanguage = string;

interface AdminLanguageContextType {
  adminLanguage: AdminLanguage;
  setAdminLanguage: (lang: AdminLanguage) => void;
  t: (key: string) => string;
}

const STORAGE_KEY = 'admin-language';

const AdminLanguageContext = createContext<AdminLanguageContextType | undefined>(undefined);

// Module-level locale cache to avoid re-fetching
const loadedLocales: Record<string, Partial<TranslationMap>> = {};

async function loadLocale(lang: AdminLanguage): Promise<Partial<TranslationMap>> {
  if (loadedLocales[lang]) return loadedLocales[lang];
  const loader = localeLoaders[lang];
  if (!loader) return {};
  const mod = await loader();
  loadedLocales[lang] = mod.default ?? (mod as unknown as Partial<TranslationMap>);
  return loadedLocales[lang];
}

export function AdminLanguageProvider({
  children,
  defaultAdminLanguage = 'en',
}: {
  children: React.ReactNode;
  defaultAdminLanguage?: string;
}) {
  const [adminLanguage, setAdminLanguageState] = useState<AdminLanguage>(defaultAdminLanguage);
  const [translations, setTranslations] = useState<Partial<TranslationMap>>({});
  const [fallback, setFallback] = useState<Partial<TranslationMap>>({});

  // Load English as fallback first
  useEffect(() => {
    loadLocale('en').then((en) => {
      setFallback(en);
      setTranslations((prev) => (Object.keys(prev).length === 0 ? en : prev));
    });
  }, []);

  // Restore admin language from localStorage, preferring saved over server default
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && localeLoaders[saved]) {
      setAdminLanguageState(saved);
    }
  }, []);

  // Load locale file whenever admin language changes
  useEffect(() => {
    loadLocale(adminLanguage).then(setTranslations);
    localStorage.setItem(STORAGE_KEY, adminLanguage);
  }, [adminLanguage]);

  const setAdminLanguage = useCallback((lang: AdminLanguage) => {
    if (!localeLoaders[lang]) {
      console.warn(`[admin-i18n] Unknown locale "${lang}".`);
      return;
    }
    setAdminLanguageState(lang);

    // Persist to Supabase in the background (non-blocking)
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      // Fetch current settings then patch adminLanguage
      supabase
        .from('agency_settings')
        .select('data')
        .single()
        .then(({ data: row }) => {
          if (!row) return;
          const next = { ...(row.data as Record<string, unknown>), adminLanguage: lang };
          supabase.from('agency_settings').update({ data: next }).eq('agency_id', user.id);
        });
    });
  }, []);

  const t = useCallback(
    (key: string): string =>
      (translations as Record<string, string>)[key] ??
      (fallback as Record<string, string>)[key] ??
      key,
    [translations, fallback]
  );

  return (
    <AdminLanguageContext.Provider value={{ adminLanguage, setAdminLanguage, t }}>
      {children}
    </AdminLanguageContext.Provider>
  );
}

export function useAdminLanguage(): AdminLanguageContextType {
  const ctx = useContext(AdminLanguageContext);
  if (!ctx) {
    throw new Error('useAdminLanguage must be used within <AdminLanguageProvider>');
  }
  return ctx;
}
