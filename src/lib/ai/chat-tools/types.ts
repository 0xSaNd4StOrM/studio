import type { z } from 'zod';
import type { ChatSurface, ClientHint } from '@/types/ai-chat';
import type { SkillToolName } from '@/types/skill';

export type ToolContext = {
  agencyId: string;
  sessionId: string;
  surface: ChatSurface;
};

export type ToolHandlerResult = {
  // Returned to the LLM as the tool's output. Must be JSON-serializable.
  result: unknown;
  // Optional client-side side-effect carried alongside the assistant reply.
  clientHint?: ClientHint;
};

export type ChatTool = {
  name: SkillToolName;
  description: string;
  // Zod schema validated server-side before handler runs. We don't trust
  // the LLM to produce well-formed args.
  parameters: z.ZodTypeAny;
  // JSON-schema-shaped representation sent to the LLM via the
  // `tools` field in the chat-completions request. Built from `parameters`
  // by `zodToJsonSchema`.
  jsonSchema: Record<string, unknown>;
  handler: (args: unknown, ctx: ToolContext) => Promise<ToolHandlerResult>;
};

export type ToolCallTrace = {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result: unknown;
  error?: string;
  ms: number;
};
