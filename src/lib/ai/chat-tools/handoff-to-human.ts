import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { ChatTool } from './types';
import { zodToJsonSchema } from './zod-to-schema';

const parameters = z.object({
  reason: z
    .string()
    .min(5)
    .max(300)
    .describe('One-sentence reason for the handoff (will be included in the WhatsApp message).'),
  summary: z
    .string()
    .min(10)
    .max(800)
    .describe('Short summary of the conversation so the human teammate has context.'),
});

type HandoffArgs = z.infer<typeof parameters>;

export const handoffToHumanTool: ChatTool = {
  name: 'handoffToHuman',
  description:
    'Hand the conversation off to a human teammate on WhatsApp. Use when the visitor explicitly asks for a person, when their request is outside what tools can answer, or when negotiation requires manual judgment.',
  parameters,
  jsonSchema: zodToJsonSchema(parameters),
  async handler(rawArgs, ctx) {
    const args: HandoffArgs = parameters.parse(rawArgs);
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('agencies')
      .select('settings, name')
      .eq('id', ctx.agencyId)
      .maybeSingle();
    if (error) return { result: { error: 'database_error', message: error.message } };

    const settings = ((data?.settings ?? {}) as Record<string, unknown>) || {};
    const settingsData = (settings.data ?? settings) as Record<string, unknown>;
    const phoneRaw =
      (settingsData.phoneNumber as string | undefined) ??
      ((settingsData.contact as Record<string, unknown> | undefined)?.phone as string | undefined);

    if (!phoneRaw) {
      return {
        result: {
          ok: false,
          error: 'no_whatsapp_configured',
          message: 'The agency has not configured a WhatsApp/phone number.',
        },
      };
    }

    const phone = phoneRaw.replace(/[^\d]/g, '');
    const composedMessage = `Hi! I was chatting with ${
      (data as { name: string }).name
    }'s AI assistant.\n\nReason: ${args.reason}\n\nSummary:\n${args.summary}`;
    const link = `https://wa.me/${phone}?text=${encodeURIComponent(composedMessage)}`;

    return {
      result: {
        ok: true,
        whatsappLink: link,
        phone,
      },
      clientHint: {
        type: 'handoff_whatsapp',
        phone,
        message: composedMessage,
      },
    };
  },
};
