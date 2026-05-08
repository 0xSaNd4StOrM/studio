import { z } from 'zod';

const DEFAULT_OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_OPENROUTER_FREE_MODELS = [
  'openai/gpt-oss-120b:free',
];

type OpenRouterRole = 'system' | 'user' | 'assistant';

type OpenRouterMessage = {
  role: OpenRouterRole;
  content: string;
};

type OpenRouterTextPart = {
  type?: string;
  text?: string;
};

type OpenRouterConfig = {
  apiKey: string;
  baseUrl: string;
  freeModels: string[];
  referer?: string;
  appName?: string;
};

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string | OpenRouterTextPart[];
    };
  }>;
  error?: {
    message?: string;
  };
};

type OpenRouterRequestOptions = {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json_object';
};

type ModelAttemptFailure = {
  model: string;
  reason: string;
};

export type OpenRouterTextGenerationOptions = {
  userPrompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  models?: string[];
};

export type OpenRouterStructuredGenerationOptions<TSchema extends z.ZodTypeAny> =
  OpenRouterTextGenerationOptions & {
    schema: TSchema;
  };

function parseModelList(rawModels: string | undefined): string[] {
  if (!rawModels) {
    return [];
  }

  return rawModels
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function resolveBaseUrl(rawBaseUrl: string | undefined): string {
  const trimmed = rawBaseUrl?.trim();

  if (!trimmed) {
    return DEFAULT_OPENROUTER_BASE_URL;
  }

  return trimmed.replace(/\/+$/, '');
}

function resolveEndpoint(baseUrl: string): string {
  if (baseUrl.endsWith('/chat/completions')) {
    return baseUrl;
  }

  return `${baseUrl}/chat/completions`;
}

function getOpenRouterConfig(): OpenRouterConfig {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is required for AI generation.');
  }

  const configuredModels = parseModelList(process.env.OPENROUTER_FREE_MODELS);

  return {
    apiKey,
    baseUrl: resolveBaseUrl(process.env.OPENROUTER_BASE_URL),
    freeModels:
      configuredModels.length > 0 ? configuredModels : [...DEFAULT_OPENROUTER_FREE_MODELS],
    referer: process.env.OPENROUTER_HTTP_REFERER?.trim(),
    appName: process.env.OPENROUTER_APP_NAME?.trim(),
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
}

function normalizeModelList(
  explicitModels: string[] | undefined,
  fallbackModels: string[]
): string[] {
  const sourceModels =
    explicitModels && explicitModels.length > 0 ? explicitModels : fallbackModels;

  const uniqueModels = Array.from(
    new Set(sourceModels.map((model) => model.trim()).filter((model) => model.length > 0))
  );

  if (uniqueModels.length === 0) {
    throw new Error(
      'No OpenRouter models configured. Set OPENROUTER_FREE_MODELS or pass models explicitly.'
    );
  }

  return uniqueModels;
}

function buildMessages(userPrompt: string, systemPrompt?: string): OpenRouterMessage[] {
  const prompt = userPrompt.trim();

  if (!prompt) {
    throw new Error('User prompt is required.');
  }

  const messages: OpenRouterMessage[] = [];

  if (systemPrompt?.trim()) {
    messages.push({
      role: 'system',
      content: systemPrompt.trim(),
    });
  }

  messages.push({
    role: 'user',
    content: prompt,
  });

  return messages;
}

function extractApiErrorMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  const payloadRecord = payload as Record<string, unknown>;
  const error = payloadRecord.error;

  if (error && typeof error === 'object') {
    const message = (error as Record<string, unknown>).message;

    if (typeof message === 'string' && message.trim()) {
      return message.trim();
    }
  }

  const message = payloadRecord.message;

  if (typeof message === 'string' && message.trim()) {
    return message.trim();
  }

  return undefined;
}

function extractMessageContent(responsePayload: OpenRouterResponse): string {
  const content = responsePayload.choices?.[0]?.message?.content;

  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item?.text === 'string' ? item.text : ''))
      .filter((item) => item.length > 0)
      .join('\n')
      .trim();
  }

  return '';
}

function parseJsonFromModelText(text: string): unknown {
  const trimmed = text.trim();

  if (!trimmed) {
    throw new Error('Model response was empty.');
  }

  const candidates: string[] = [trimmed];

  const fencedJsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedJsonMatch?.[1]) {
    candidates.push(fencedJsonMatch[1].trim());
  }

  const firstBraceIndex = trimmed.indexOf('{');
  const lastBraceIndex = trimmed.lastIndexOf('}');
  if (firstBraceIndex >= 0 && lastBraceIndex > firstBraceIndex) {
    candidates.push(trimmed.slice(firstBraceIndex, lastBraceIndex + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error('Model response was not valid JSON.');
}

function formatZodError(error: z.ZodError): string {
  return error.issues
    .slice(0, 5)
    .map((issue) => {
      const path = issue.path.join('.') || 'root';
      return `${path}: ${issue.message}`;
    })
    .join('; ');
}

function formatFailures(failures: ModelAttemptFailure[]): string {
  if (failures.length === 0) {
    return 'No failure details available.';
  }

  return failures.map((failure) => `${failure.model}: ${failure.reason}`).join(' | ');
}

async function requestOpenRouterCompletion(
  config: OpenRouterConfig,
  options: OpenRouterRequestOptions
): Promise<string> {
  const endpoint = resolveEndpoint(config.baseUrl);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json',
  };

  if (config.referer) {
    headers['HTTP-Referer'] = config.referer;
  }

  if (config.appName) {
    headers['X-Title'] = config.appName;
  }

  const payload: Record<string, unknown> = {
    model: options.model,
    messages: options.messages,
  };

  if (typeof options.temperature === 'number') {
    payload.temperature = options.temperature;
  }

  if (typeof options.maxTokens === 'number') {
    payload.max_tokens = options.maxTokens;
  }

  if (options.responseFormat === 'json_object') {
    payload.response_format = { type: 'json_object' };
  }

  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new Error(`Network error calling OpenRouter: ${getErrorMessage(error)}`);
  }

  const rawBody = await response.text();

  let payloadBody: unknown = {};
  if (rawBody.trim()) {
    try {
      payloadBody = JSON.parse(rawBody);
    } catch {
      payloadBody = { message: rawBody.trim() };
    }
  }

  if (!response.ok) {
    const reason = extractApiErrorMessage(payloadBody) ?? `HTTP ${response.status}`;
    throw new Error(`OpenRouter request failed (${options.model}) - ${reason}`);
  }

  const apiErrorMessage = extractApiErrorMessage(payloadBody);
  if (apiErrorMessage) {
    throw new Error(`OpenRouter error (${options.model}) - ${apiErrorMessage}`);
  }

  const content = extractMessageContent(payloadBody as OpenRouterResponse);

  if (!content) {
    throw new Error(`OpenRouter returned empty content (${options.model}).`);
  }

  return content;
}

export async function generateTextWithOpenRouter(
  options: OpenRouterTextGenerationOptions
): Promise<string> {
  const config = getOpenRouterConfig();
  const models = normalizeModelList(options.models, config.freeModels);
  const messages = buildMessages(options.userPrompt, options.systemPrompt);
  const failures: ModelAttemptFailure[] = [];

  for (const model of models) {
    try {
      return await requestOpenRouterCompletion(config, {
        model,
        messages,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      });
    } catch (error) {
      failures.push({
        model,
        reason: getErrorMessage(error),
      });
    }
  }

  throw new Error(`OpenRouter text generation failed for all models. ${formatFailures(failures)}`);
}

export async function generateStructuredWithOpenRouter<TSchema extends z.ZodTypeAny>(
  options: OpenRouterStructuredGenerationOptions<TSchema>
): Promise<z.infer<TSchema>> {
  const config = getOpenRouterConfig();
  const models = normalizeModelList(options.models, config.freeModels);
  const messages = buildMessages(options.userPrompt, options.systemPrompt);
  const failures: ModelAttemptFailure[] = [];

  for (const model of models) {
    try {
      const completionText = await requestOpenRouterCompletion(config, {
        model,
        messages,
        responseFormat: 'json_object',
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      });

      const parsedJson = parseJsonFromModelText(completionText);
      const parsedOutput = options.schema.safeParse(parsedJson);

      if (!parsedOutput.success) {
        failures.push({
          model,
          reason: `Schema validation failed - ${formatZodError(parsedOutput.error)}`,
        });
        continue;
      }

      return parsedOutput.data;
    } catch (error) {
      failures.push({
        model,
        reason: getErrorMessage(error),
      });
    }
  }

  throw new Error(
    `OpenRouter structured generation failed for all models. ${formatFailures(failures)}`
  );
}
