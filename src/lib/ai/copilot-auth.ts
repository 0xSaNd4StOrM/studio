import { createServiceRoleClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/ai/crypto';

const VSCODE_CLIENT_ID = 'Iv1.b507a08c87ecfe98';
const COPILOT_USER_AGENT = 'GithubCopilot/1.0';
const EDITOR_VERSION = 'vscode/1.95.0';
const EDITOR_PLUGIN_VERSION = 'copilot-chat/0.20.0';
const COPILOT_INTEGRATION_ID = 'vscode-chat';

const BEARER_REFRESH_BUFFER_MS = 60_000;

export type DeviceCodeResponse = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
};

export type PollResult =
  | { status: 'success'; accessToken: string }
  | { status: 'pending' }
  | { status: 'slow_down'; interval: number }
  | { status: 'error'; code: string; description?: string };

export type CopilotBearer = {
  bearer: string;
  expiresAt: number;
  endpoints?: { api?: string };
  raw: Record<string, unknown>;
};

export async function requestDeviceCode(): Promise<DeviceCodeResponse> {
  const response = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': COPILOT_USER_AGENT,
    },
    body: JSON.stringify({
      client_id: VSCODE_CLIENT_ID,
      scope: 'read:user',
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Device code request failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as DeviceCodeResponse;
  if (!data.device_code || !data.user_code) {
    throw new Error('Device code response missing required fields.');
  }
  return data;
}

export async function pollAccessToken(deviceCode: string): Promise<PollResult> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': COPILOT_USER_AGENT,
    },
    body: JSON.stringify({
      client_id: VSCODE_CLIENT_ID,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    }),
  });

  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (typeof body.access_token === 'string' && body.access_token.length > 0) {
    return { status: 'success', accessToken: body.access_token };
  }

  const errorCode = typeof body.error === 'string' ? body.error : null;
  const description = typeof body.error_description === 'string' ? body.error_description : undefined;

  if (errorCode === 'authorization_pending') return { status: 'pending' };
  if (errorCode === 'slow_down') {
    const interval = typeof body.interval === 'number' ? body.interval : 5;
    return { status: 'slow_down', interval };
  }

  return {
    status: 'error',
    code: errorCode ?? `HTTP ${response.status}`,
    description,
  };
}

export async function exchangeForCopilotBearer(githubToken: string): Promise<CopilotBearer> {
  const response = await fetch('https://api.github.com/copilot_internal/v2/token', {
    method: 'GET',
    headers: {
      Authorization: `token ${githubToken}`,
      Accept: 'application/json',
      'User-Agent': COPILOT_USER_AGENT,
      'Editor-Version': EDITOR_VERSION,
      'Editor-Plugin-Version': EDITOR_PLUGIN_VERSION,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Copilot bearer exchange failed (${response.status}). The account may not have an active Copilot subscription. ${body}`
    );
  }

  const data = (await response.json()) as Record<string, unknown>;
  const token = typeof data.token === 'string' ? data.token : null;
  const expiresAt = typeof data.expires_at === 'number' ? data.expires_at * 1000 : null;

  if (!token || !expiresAt) {
    throw new Error('Copilot bearer response missing token/expires_at.');
  }

  const endpoints =
    typeof data.endpoints === 'object' && data.endpoints !== null
      ? (data.endpoints as { api?: string })
      : undefined;

  return { bearer: token, expiresAt, endpoints, raw: data };
}

export type GitHubUserInfo = {
  login: string;
  id: number;
  name?: string;
};

export async function fetchGitHubUser(githubToken: string): Promise<GitHubUserInfo> {
  const response = await fetch('https://api.github.com/user', {
    method: 'GET',
    headers: {
      Authorization: `token ${githubToken}`,
      Accept: 'application/json',
      'User-Agent': COPILOT_USER_AGENT,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub user fetch failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  const login = typeof data.login === 'string' ? data.login : null;
  const id = typeof data.id === 'number' ? data.id : null;
  if (!login || id === null) {
    throw new Error('GitHub user response missing login/id.');
  }
  return {
    login,
    id,
    name: typeof data.name === 'string' ? data.name : undefined,
  };
}

type CacheEntry = { bearer: string; expiresAt: number; endpoint: string };

const bearerCache = new Map<string, CacheEntry>();

export function clearCopilotBearerCache(agencyId: string): void {
  bearerCache.delete(agencyId);
}

export function clearAllCopilotBearerCaches(): void {
  bearerCache.clear();
}

async function loadEncryptedGitHubToken(agencyId: string): Promise<string | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('agencies')
    .select('copilot_github_token_encrypted')
    .eq('id', agencyId)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to load agency Copilot token: ${error.message}`);
  }
  const encrypted = (data as { copilot_github_token_encrypted: string | null } | null)
    ?.copilot_github_token_encrypted;
  return encrypted ?? null;
}

export type CopilotEndpoint = {
  bearer: string;
  apiBase: string;
  expiresAt: number;
};

export async function getCopilotEndpointForAgency(agencyId: string): Promise<CopilotEndpoint> {
  const cached = bearerCache.get(agencyId);
  const now = Date.now();
  if (cached && cached.expiresAt - BEARER_REFRESH_BUFFER_MS > now) {
    return { bearer: cached.bearer, apiBase: cached.endpoint, expiresAt: cached.expiresAt };
  }

  const encrypted = await loadEncryptedGitHubToken(agencyId);
  if (!encrypted) {
    throw new Error('Agency has not connected GitHub Copilot.');
  }
  const githubToken = decryptToken(encrypted);
  const exchange = await exchangeForCopilotBearer(githubToken);
  const apiBase = exchange.endpoints?.api?.replace(/\/+$/, '') ?? 'https://api.githubcopilot.com';

  const entry: CacheEntry = {
    bearer: exchange.bearer,
    expiresAt: exchange.expiresAt,
    endpoint: apiBase,
  };
  bearerCache.set(agencyId, entry);

  return { bearer: entry.bearer, apiBase: entry.endpoint, expiresAt: entry.expiresAt };
}

export const COPILOT_REQUEST_HEADERS = {
  'Editor-Version': EDITOR_VERSION,
  'Editor-Plugin-Version': EDITOR_PLUGIN_VERSION,
  'Copilot-Integration-Id': COPILOT_INTEGRATION_ID,
  'User-Agent': COPILOT_USER_AGENT,
} as const;

export const COPILOT_CLIENT_ID = VSCODE_CLIENT_ID;

export type CopilotModel = {
  id: string;
  name: string;
  vendor: string;
  enabled: boolean;
  chat: boolean;
};

export async function fetchCopilotModels(agencyId: string): Promise<CopilotModel[]> {
  const endpoint = await getCopilotEndpointForAgency(agencyId);
  const response = await fetch(`${endpoint.apiBase}/models`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${endpoint.bearer}`,
      Accept: 'application/json',
      ...COPILOT_REQUEST_HEADERS,
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Copilot /models failed (${response.status}): ${body}`);
  }
  const payload = (await response.json()) as { data?: unknown };
  const raw = Array.isArray(payload.data) ? payload.data : [];
  const models: CopilotModel[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const id = typeof rec.id === 'string' ? rec.id : null;
    if (!id) continue;
    const name = typeof rec.name === 'string' ? rec.name : id;
    const vendor = typeof rec.vendor === 'string' ? rec.vendor : 'unknown';
    const modelPicker = rec.model_picker_enabled;
    const enabled = modelPicker === undefined ? true : Boolean(modelPicker);
    const caps = (rec.capabilities as Record<string, unknown> | undefined) ?? {};
    const supports = (caps.supports as Record<string, unknown> | undefined) ?? {};
    const type = typeof caps.type === 'string' ? caps.type : '';
    const chat = type === 'chat' || Boolean(supports.streaming) || Boolean(supports.tool_calls);
    models.push({ id, name, vendor, enabled, chat });
  }
  return models;
}
