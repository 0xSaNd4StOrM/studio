'use client';

import React from 'react';
import type { AgencySettingsData } from '@/lib/supabase/agency-content';
import type { AgencyAiConfigPublic } from '@/types/agency';

export type AgencySettings = {
  data: AgencySettingsData;
  logo_url: string | null;
  aiEnabled: boolean;
  agencyId: string | null;
  aiConfigPublic: AgencyAiConfigPublic | null;
};

const SettingsContext = React.createContext<AgencySettings | null>(null);

export function SettingsProvider({
  value,
  children,
}: {
  value: AgencySettings | null;
  children: React.ReactNode;
}) {
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return React.useContext(SettingsContext);
}
