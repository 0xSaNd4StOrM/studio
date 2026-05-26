export type AgencyModules = {
  tours?: boolean;
  hotels?: boolean;
  blog?: boolean;
  upsell?: boolean;
  contact?: boolean;
  reviews?: boolean;
  maintenance_mode?: boolean;
};

export type AgencySettings = {
  tier?: string;
  onboarding_dismissed?: boolean;
  modules?: AgencyModules;
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    logoUrl?: string;
  };
  contact?: {
    email?: string;
    phone?: string;
    address?: string;
  };
  social?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
};

export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'cancelled';

export type CopilotModelPreferences = Record<string, string>;

export type AgencyAiConfigPublic = {
  agentName: string;
  greeting: string;
  showConciergeWidget: boolean;
  greetingDelaySeconds: number;
};

export type Agency = {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  settings: AgencySettings;
  status: 'active' | 'suspended';
  createdAt: string;
  subscription_status?: SubscriptionStatus;
  trial_ends_at?: string | null;
  next_billing_date?: string | null;
  monthly_price?: number;
  // Copilot integration (client-safe — encrypted token is never exposed).
  aiEnabled: boolean;
  copilotUserLogin?: string | null;
  copilotPlan?: string | null;
  copilotConnectedAt?: string | null;
  copilotModelPreferences?: CopilotModelPreferences;
  // AI Concierge — only the public-safe flags surface to clients.
  aiConfigPublic?: AgencyAiConfigPublic | null;
};

export type AgencyUser = {
  id: string;
  userId: string;
  agencyId: string;
  role: 'owner' | 'admin' | 'editor';
  createdAt: string;
};
