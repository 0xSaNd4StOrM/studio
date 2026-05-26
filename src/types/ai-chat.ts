export type ChatSurface = 'concierge' | 'tailor-made';

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export type ChatMessage = {
  role: ChatRole;
  content: string;
  toolCalls?: ChatToolCall[];
  toolCallId?: string;
  name?: string;
};

export type ChatToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

export type ChatToolResult = {
  toolCallId: string;
  name: string;
  result: unknown;
};

export type ChatDataAccess = {
  public_catalog: boolean;
  prices: boolean;
  availability: boolean;
  admin_notes: boolean;
  review_text: boolean;
};

export type AgencyAiConfig = {
  agencyId: string;
  agentName: string;
  greeting: string;
  personaPrompt: string;
  knowledgeText: string;
  rulesText: string;
  allowNegotiation: boolean;
  allowDiscounts: boolean;
  maxDiscountPct: number;
  allowBookingCreation: boolean;
  showConciergeWidget: boolean;
  greetingDelaySeconds: number;
  dataAccess: ChatDataAccess;
  allowBookingLookup: boolean;
  allowPaymentLinks: boolean;
  updatedAt: string;
};

export type AgencyAiPublic = {
  agentName: string;
  greeting: string;
  showConciergeWidget: boolean;
  greetingDelaySeconds: number;
};

export type ChatSession = {
  id: string;
  agencyId: string;
  surface: ChatSurface;
  ipHash: string | null;
  userAgent: string | null;
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string;
};

export type ChatAuditEventType =
  | 'tool_call'
  | 'refusal'
  | 'handoff'
  | 'message_in'
  | 'message_out'
  | 'error';

export type ChatAuditEvent = {
  id: string;
  sessionId: string;
  agencyId: string;
  eventType: ChatAuditEventType;
  toolName: string | null;
  args: Record<string, unknown> | null;
  resultSummary: string | null;
  createdAt: string;
};

export type ChatNegotiationAudit = {
  id: string;
  sessionId: string;
  agencyId: string;
  tourId: string | null;
  requestedPct: number;
  capPct: number;
  grantedPct: number | null;
  promoCodeId: string | null;
  reason: string | null;
  createdAt: string;
};

// Hint emitted by a tool that the client should act on. These never
// pollute the conversation transcript — they ride alongside the
// assistant message and trigger UI side-effects (highlight tour,
// open cart, etc).
export type ClientHint =
  | { type: 'highlight_tour'; tourId: string; slug: string }
  | { type: 'apply_promo'; code: string; percentOff: number }
  | {
      type: 'add_to_cart';
      tourId: string;
      packageId?: string;
      packageName?: string;
      adults: number;
      children: number;
      date?: string;
      // Full Tour object for the client-side useCart() to consume. Embedded
      // here so the widget doesn't have to round-trip to Supabase.
      tour: unknown;
    }
  | { type: 'replace_itinerary'; itinerary: unknown }
  | { type: 'handoff_whatsapp'; phone: string; message: string }
  | {
      type: 'apply_payment';
      bookingId: string;
      paymentUrl: string;
      total: number;
      currency: string;
    }
  | {
      type: 'view_booking';
      bookingId: string;
      shareUrl: string;
      status: 'Confirmed' | 'Pending' | 'Cancelled';
      total: number;
      currency: string;
    };

// Wire-format events emitted by the streaming /api/chat/* SSE endpoints.
// The client consumes these to update the chat UI in real time.
export type ChatStreamEvent =
  | { type: 'session'; sessionId: string }
  | { type: 'tool_call'; name: string }
  | { type: 'tool_result'; name: string; ok: boolean }
  | { type: 'delta'; chunk: string }
  | { type: 'client_hint'; hint: ClientHint }
  | { type: 'done'; model: string }
  | { type: 'error'; message: string };
