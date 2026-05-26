import { z } from 'zod';

// Minimal zod → JSON Schema (OpenAI tool-call shape) converter. Handles
// only the constructs we need for the chat tool registry:
//   - z.object({ ... })
//   - z.string() / .min/.max / .url / .uuid / .describe
//   - z.number() / .int / .min/.max
//   - z.boolean()
//   - z.array(inner) / .min/.max
//   - z.enum([...])
//   - z.optional / .nullable / .default
//   - .describe(text)
// Anything more exotic isn't used by our tools.
//
// We intentionally avoid the `zod-to-json-schema` npm package to keep the
// dependency footprint small — these are hand-written tool schemas, the
// conversion needs are narrow.

type JsonSchema = Record<string, unknown>;

export function zodToJsonSchema(schema: z.ZodTypeAny): JsonSchema {
  const description: string | undefined = schema.description;
  const result = convert(schema);
  if (description && !result.description) result.description = description;
  return result;
}

function convert(schema: z.ZodTypeAny): JsonSchema {
  const def = schema._def as { typeName?: string };
  switch (def.typeName) {
    case 'ZodString':
      return convertString(schema as z.ZodString);
    case 'ZodNumber':
      return convertNumber(schema as z.ZodNumber);
    case 'ZodBoolean':
      return { type: 'boolean' };
    case 'ZodArray':
      return convertArray(schema as z.ZodArray<z.ZodTypeAny>);
    case 'ZodObject':
      return convertObject(schema as z.ZodObject<z.ZodRawShape>);
    case 'ZodEnum':
      return convertEnum(schema as z.ZodEnum<[string, ...string[]]>);
    case 'ZodOptional':
    case 'ZodNullable':
      return convert((schema as z.ZodOptional<z.ZodTypeAny>).unwrap());
    case 'ZodDefault':
      return convert((schema as z.ZodDefault<z.ZodTypeAny>).removeDefault());
    case 'ZodEffects':
      return convert((schema as z.ZodEffects<z.ZodTypeAny>).innerType());
    default:
      // Unknown shape — emit a permissive object so the LLM still gets
      // something callable. Hand-written tools should never hit this.
      return { type: 'object' };
  }
}

function convertString(schema: z.ZodString): JsonSchema {
  const out: JsonSchema = { type: 'string' };
  for (const check of schema._def.checks) {
    if (check.kind === 'min') out.minLength = check.value;
    if (check.kind === 'max') out.maxLength = check.value;
    if (check.kind === 'uuid') out.format = 'uuid';
    if (check.kind === 'email') out.format = 'email';
    if (check.kind === 'url') out.format = 'uri';
  }
  if (schema.description) out.description = schema.description;
  return out;
}

function convertNumber(schema: z.ZodNumber): JsonSchema {
  const out: JsonSchema = { type: 'number' };
  for (const check of schema._def.checks) {
    if (check.kind === 'int') out.type = 'integer';
    if (check.kind === 'min') out.minimum = check.value;
    if (check.kind === 'max') out.maximum = check.value;
  }
  if (schema.description) out.description = schema.description;
  return out;
}

function convertArray(schema: z.ZodArray<z.ZodTypeAny>): JsonSchema {
  const out: JsonSchema = {
    type: 'array',
    items: convert(schema._def.type),
  };
  if (schema._def.minLength?.value !== undefined) out.minItems = schema._def.minLength.value;
  if (schema._def.maxLength?.value !== undefined) out.maxItems = schema._def.maxLength.value;
  if (schema.description) out.description = schema.description;
  return out;
}

function convertObject(schema: z.ZodObject<z.ZodRawShape>): JsonSchema {
  const shape = schema._def.shape();
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];
  for (const [key, value] of Object.entries(shape)) {
    const child = value as z.ZodTypeAny;
    properties[key] = convert(child);
    const typeName = (child._def as { typeName?: string }).typeName;
    const isOptional = typeName === 'ZodOptional' || typeName === 'ZodDefault';
    if (!isOptional) required.push(key);
  }
  const out: JsonSchema = {
    type: 'object',
    properties,
  };
  if (required.length > 0) out.required = required;
  if (schema.description) out.description = schema.description;
  return out;
}

function convertEnum(schema: z.ZodEnum<[string, ...string[]]>): JsonSchema {
  return {
    type: 'string',
    enum: schema._def.values,
    ...(schema.description ? { description: schema.description } : {}),
  };
}
