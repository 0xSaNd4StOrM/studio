export type SkillCategory = 'persona' | 'sales' | 'service' | 'specialty';
export type SkillReviewStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export type SkillToolName =
  | 'searchTours'
  | 'getTourDetails'
  | 'getPrice'
  | 'checkAvailability'
  | 'proposeDiscount'
  | 'addToCart'
  | 'reviseItinerary'
  | 'handoffToHuman'
  | 'listSkills'
  | 'linkToTour'
  | 'lookupBookings'
  | 'getBookingPaymentStatus'
  | 'createPaymentLink';

export type SkillUiHints = {
  icon?: string;
  color?: string;
  badge?: string;
};

export type Skill = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: SkillCategory;
  systemPromptFragment: string;
  toolsAllowed: SkillToolName[];
  uiHints: SkillUiHints;
  isPublic: boolean;
  createdByAgencyId: string | null;
  reviewStatus: SkillReviewStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AgencySkill = {
  id: string;
  agencyId: string;
  skillId: string;
  isEnabled: boolean;
  customConfig: Record<string, unknown>;
  installedAt: string;
};

export type InstalledSkill = AgencySkill & {
  skill: Skill;
};
