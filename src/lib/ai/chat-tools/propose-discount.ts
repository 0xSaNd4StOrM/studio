import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getAgencyAiConfig } from '@/lib/supabase/agency-ai-config';
import type { ChatTool } from './types';
import { zodToJsonSchema } from './zod-to-schema';

const parameters = z.object({
  tourId: z
    .string()
    .uuid()
    .optional()
    .describe('UUID of the tour the discount applies to (optional — codes work cart-wide).'),
  requestedPct: z
    .number()
    .int()
    .min(1)
    .max(100)
    .describe('Discount percentage you are proposing.'),
  reason: z
    .string()
    .min(5)
    .max(300)
    .describe(
      "One-sentence rationale (visitor's hesitation, large group, return customer, etc.). Stored in the negotiation audit."
    ),
});

type ProposeDiscountArgs = z.infer<typeof parameters>;

function mintCode(): string {
  // Short, capitalised, human-readable code prefixed with CHAT- so audit
  // queries can spot AI-minted promotions at a glance.
  const buf = randomBytes(4).toString('hex').toUpperCase();
  return `CHAT-${buf}`;
}

export const proposeDiscountTool: ChatTool = {
  name: 'proposeDiscount',
  description:
    "Propose a percentage discount for the visitor. The platform enforces the agency's maximum cap — if your `requestedPct` exceeds it, the tool refuses with `capPct` set, and you should counter with a smaller offer. On success, the tool mints a single-use promo code (24h TTL) that the visitor can redeem at checkout.",
  parameters,
  jsonSchema: zodToJsonSchema(parameters),
  async handler(rawArgs, ctx) {
    const args: ProposeDiscountArgs = parameters.parse(rawArgs);

    const config = await getAgencyAiConfig(ctx.agencyId);
    if (!config.allowDiscounts) {
      return {
        result: {
          ok: false,
          reason: 'agency_disallows_discounts',
          hint: 'This agency does not authorise AI-led discounts. Politely decline and offer to connect a human.',
        },
      };
    }
    if (args.requestedPct > config.maxDiscountPct) {
      return {
        result: {
          ok: false,
          reason: 'exceeds_cap',
          capPct: config.maxDiscountPct,
          hint: `The maximum discount you may offer is ${config.maxDiscountPct}%. Counter at or below that.`,
        },
      };
    }

    const supabase = createServiceRoleClient();
    const code = mintCode();
    const nowIso = new Date().toISOString();
    const expiresIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data: promoRow, error: promoError } = await supabase
      .from('promo_codes')
      .insert({
        agency_id: ctx.agencyId,
        code,
        type: 'percentage',
        value: args.requestedPct,
        min_order_amount: null,
        max_discount_amount: null,
        starts_at: nowIso,
        expires_at: expiresIso,
        usage_limit: 1,
        is_active: true,
      })
      .select('id')
      .single();

    if (promoError || !promoRow) {
      return {
        result: {
          ok: false,
          reason: 'promo_mint_failed',
          message: promoError?.message ?? 'unknown error',
        },
      };
    }

    const { error: auditError } = await supabase.from('chat_negotiation_audits').insert({
      session_id: ctx.sessionId,
      agency_id: ctx.agencyId,
      tour_id: args.tourId ?? null,
      requested_pct: args.requestedPct,
      cap_pct: config.maxDiscountPct,
      granted_pct: args.requestedPct,
      promo_code_id: (promoRow as { id: string }).id,
      reason: args.reason,
    });
    if (auditError) {
      // Non-fatal: the promo is already valid; we just lose the audit row.
      console.error('chat_negotiation_audits insert failed:', auditError.message);
    }

    return {
      result: {
        ok: true,
        code,
        percentOff: args.requestedPct,
        expiresAt: expiresIso,
      },
      clientHint: {
        type: 'apply_promo',
        code,
        percentOff: args.requestedPct,
      },
    };
  },
};
