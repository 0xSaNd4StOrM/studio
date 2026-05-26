import { z } from 'zod';
import {
  COPILOT_REQUEST_HEADERS,
  clearCopilotBearerCache,
  getCopilotEndpointForAgency,
} from '@/lib/ai/copilot-auth';
import { getCurrentAgency } from '@/lib/supabase/agencies';
import {
  type AiFeature,
  modelsForFeature,
  resolveModelForAgency,
} from '@/lib/ai/models';

type CopilotRole = 'system' | 'user' | 'assistant';

type CopilotMessage = {
  role: CopilotRole;
  content: string;
};

type CopilotResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  error?: { message?: string };
};

type ModelAttemptFailure = {
  model: string;
  reason: string;
};

export interface CopilotTextOptions {
  agencyId?: string;
  feature: AiFeature;
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  models?: string[];
}

export interface CopilotStructuredOptions<TSchema extends z.ZodTypeAny>
  extends CopilotTextOptions {
  schema: TSchema;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function buildMessages(userPrompt: string, systemPrompt?: string): CopilotMessage[] {
  const prompt = userPrompt.trim();
  if (!prompt) {
    throw new Error('User prompt is required.');
  }
  const messages: CopilotMessage[] = [];
  if (systemPrompt?.trim()) {
    messages.push({ role: 'system', content: systemPrompt.trim() });
  }
  messages.push({ role: 'user', content: prompt });
  return messages;
}

function extractMessageContent(payload: CopilotResponse): string {
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item?.text === 'string' ? item.text : ''))
      .filter((s) => s.length > 0)
      .join('\n')
      .trim();
  }
  return '';
}

function extractApiErrorMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const record = payload as Record<string, unknown>;
  const err = record.error;
  if (err && typeof err === 'object') {
    const m = (err as Record<string, unknown>).message;
    if (typeof m === 'string' && m.trim()) return m.trim();
  }
  const m = record.message;
  if (typeof m === 'string' && m.trim()) return m.trim();
  return undefined;
}

function parseJsonFromModelText(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Model response was empty.');
  const candidates: string[] = [trimmed];
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(fenced[1].trim());
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }
  for (const c of candidates) {
    try {
      return JSON.parse(c);
    } catch {
      // try next
    }
  }
  throw new Error('Model response was not valid JSON.');
}

function formatZodError(error: z.ZodError): string {
  return error.issues
    .slice(0, 5)
    .map((i) => `${i.path.join('.') || 'root'}: ${i.message}`)
    .join('; ');
}

function formatFailures(failures: ModelAttemptFailure[]): string {
  if (failures.length === 0) return 'No failure details available.';
  return failures.map((f) => `${f.model}: ${f.reason}`).join(' | ');
}

async function resolveAgencyId(agencyId?: string): Promise<string> {
  if (agencyId) return agencyId;
  const agency = await getCurrentAgency();
  if (!agency) {
    throw new Error('No agency context available for Copilot call.');
  }
  if (!agency.aiEnabled) {
    throw new Error('AI is not enabled for this agency. Connect GitHub Copilot in settings.');
  }
  return agency.id;
}

async function resolveModels(
  agencyId: string,
  feature: AiFeature,
  override?: string[]
): Promise<string[]> {
  if (override && override.length > 0) {
    const unique = Array.from(new Set(override.map((m) => m.trim()).filter(Boolean)));
    if (unique.length > 0) return unique;
  }
  const agency = await getCurrentAgency();
  const chosen =
    agency && agency.id === agencyId ? resolveModelForAgency(agency, feature) : undefined;
  return modelsForFeature(feature, chosen);
}

async function requestCopilotCompletion(
  agencyId: string,
  body: {
    model: string;
    messages: CopilotMessage[];
    temperature?: number;
    max_tokens?: number;
    response_format?: { type: 'json_object' };
  }
): Promise<string> {
  const endpoint = await getCopilotEndpointForAgency(agencyId);
  let response: Response;
  try {
    response = await fetch(`${endpoint.apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${endpoint.bearer}`,
        'Content-Type': 'application/json',
        ...COPILOT_REQUEST_HEADERS,
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new Error(`Network error calling Copilot: ${getErrorMessage(error)}`);
  }

  const rawBody = await response.text();
  let payload: unknown = {};
  if (rawBody.trim()) {
    try {
      payload = JSON.parse(rawBody);
    } catch {
      payload = { message: rawBody.trim() };
    }
  }

  if (response.status === 401 || response.status === 403) {
    // Bearer might be stale even though cache says fresh — drop it so the next
    // call re-exchanges. Surface a clear error.
    clearCopilotBearerCache(agencyId);
    const reason = extractApiErrorMessage(payload) ?? `HTTP ${response.status}`;
    throw new Error(`Copilot auth rejected (${body.model}) - ${reason}`);
  }

  if (!response.ok) {
    const reason = extractApiErrorMessage(payload) ?? `HTTP ${response.status}`;
    throw new Error(`Copilot request failed (${body.model}) - ${reason}`);
  }

  const apiError = extractApiErrorMessage(payload);
  if (apiError) {
    throw new Error(`Copilot error (${body.model}) - ${apiError}`);
  }

  const content = extractMessageContent(payload as CopilotResponse);
  if (!content) {
    throw new Error(`Copilot returned empty content (${body.model}).`);
  }
  return content;
}

export async function generateTextWithCopilot(
  options: CopilotTextOptions
): Promise<string> {
  const agencyId = await resolveAgencyId(options.agencyId);
  const models = await resolveModels(agencyId, options.feature, options.models);
  const messages = buildMessages(options.userPrompt, options.systemPrompt);
  const failures: ModelAttemptFailure[] = [];

  for (const model of models) {
    try {
      return await requestCopilotCompletion(agencyId, {
        model,
        messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
      });
    } catch (error) {
      failures.push({ model, reason: getErrorMessage(error) });
    }
  }

  throw new Error(`Copilot text generation failed for all models. ${formatFailures(failures)}`);
}

export async function generateStructuredWithCopilot<TSchema extends z.ZodTypeAny>(
  options: CopilotStructuredOptions<TSchema>
): Promise<z.infer<TSchema>> {
  const agencyId = await resolveAgencyId(options.agencyId);
  const models = await resolveModels(agencyId, options.feature, options.models);
  const messages = buildMessages(options.userPrompt, options.systemPrompt);
  const failures: ModelAttemptFailure[] = [];

  for (const model of models) {
    try {
      const completion = await requestCopilotCompletion(agencyId, {
        model,
        messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        response_format: { type: 'json_object' },
      });
      const parsed = parseJsonFromModelText(completion);
      const result = options.schema.safeParse(parsed);
      if (!result.success) {
        failures.push({
          model,
          reason: `Schema validation failed - ${formatZodError(result.error)}`,
        });
        continue;
      }
      return result.data;
    } catch (error) {
      failures.push({ model, reason: getErrorMessage(error) });
    }
  }

  throw new Error(
    `Copilot structured generation failed for all models. ${formatFailures(failures)}`
  );
}
