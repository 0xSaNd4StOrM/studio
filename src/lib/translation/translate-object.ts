/**
 * Deep-clone an object, translate a declarative list of text fields via Lingva,
 * and return the result. Designed to batch all strings into a single
 * `lingvaTranslateMany` call per invocation so identical strings across
 * different fields share cache hits.
 *
 * Supported path syntax:
 *   - `'title'`                        → top-level string field
 *   - `'nested.title'`                 → dotted path on object sub-fields
 *   - `'items[]'`                      → array of strings (or `{ value: string }` items)
 *   - `'items[].name'`                 → map over array, translate `.name` of each
 *   - `'a.b[].c.d'`                    → deep, multi-hop paths allowed
 */

import { lingvaTranslateMany } from './lingva';

// ---- Generic deep clone (structuredClone w/ fallback) --------------------
function deepClone<T>(value: T): T {
  // structuredClone is available in Node 20+ (the repo's minimum version).
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
      // fall through
    }
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

// ---- Collection / assignment helpers -------------------------------------

type StringSlot = {
  get: () => string;
  set: (v: string) => void;
};

/**
 * Walk the path and collect every translatable string slot reachable from `root`.
 * Silently skips any missing/wrong-typed segments.
 */
function collectSlots(root: unknown, path: string): StringSlot[] {
  const slots: StringSlot[] = [];
  const segments = parsePath(path);
  walk(root, segments, 0, slots);
  return slots;
}

type Segment = { kind: 'key'; key: string } | { kind: 'arrayItems' }; // '[]'

function parsePath(path: string): Segment[] {
  const out: Segment[] = [];
  // Split on dots but preserve [] suffixes attached to keys.
  // e.g. 'itinerary[].activity' → ['itinerary[]', 'activity']
  const parts = path.split('.');
  for (const raw of parts) {
    let name = raw;
    while (name.endsWith('[]')) {
      name = name.slice(0, -2);
      if (name.length > 0) {
        out.push({ kind: 'key', key: name });
        name = '';
      }
      out.push({ kind: 'arrayItems' });
    }
    if (name.length > 0) out.push({ kind: 'key', key: name });
  }
  return out;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function walk(node: unknown, segs: Segment[], i: number, slots: StringSlot[]): void {
  if (node === null || node === undefined) return;

  if (i >= segs.length) {
    // Terminal: node is the slot value's parent? No — we should have been
    // invoked from the parent assignment step. This branch means the path
    // resolved to a non-string terminal — nothing to do.
    return;
  }

  const seg = segs[i];
  const isLast = i === segs.length - 1;

  if (seg.kind === 'arrayItems') {
    if (!Array.isArray(node)) return;
    for (let idx = 0; idx < node.length; idx += 1) {
      const item = node[idx];
      if (isLast) {
        // Terminal array: translate each item (string, or `{ value: string }`).
        if (typeof item === 'string') {
          const arr = node as unknown[];
          slots.push({
            get: () => arr[idx] as string,
            set: (v) => {
              arr[idx] = v;
            },
          });
        } else if (isObject(item) && typeof item.value === 'string') {
          const obj = item as Record<string, unknown>;
          slots.push({
            get: () => obj.value as string,
            set: (v) => {
              obj.value = v;
            },
          });
        }
      } else {
        walk(item, segs, i + 1, slots);
      }
    }
    return;
  }

  // seg.kind === 'key'
  if (!isObject(node)) return;
  const obj = node;
  if (isLast) {
    const current = obj[seg.key];
    if (typeof current === 'string') {
      slots.push({
        get: () => obj[seg.key] as string,
        set: (v) => {
          obj[seg.key] = v;
        },
      });
    }
    // If the terminal field is an array/object, we silently skip — caller
    // should have used `[]` / dotted path syntax.
    return;
  }
  walk(obj[seg.key], segs, i + 1, slots);
}

// ---- Public API -----------------------------------------------------------

export async function translateObject<T extends object>(
  obj: T,
  fields: readonly (keyof T | string)[],
  targetLang: string,
  sourceLang: string = 'en'
): Promise<T> {
  if (!obj || targetLang === sourceLang) return obj;

  const clone = deepClone(obj);
  const slots: StringSlot[] = [];
  for (const field of fields) {
    const path = String(field);
    for (const s of collectSlots(clone, path)) slots.push(s);
  }

  if (slots.length === 0) return clone;

  const originals = slots.map((s) => s.get());
  const translated = await lingvaTranslateMany(originals, targetLang, sourceLang);
  for (let i = 0; i < slots.length; i += 1) {
    if (typeof translated[i] === 'string') slots[i].set(translated[i]);
  }
  return clone;
}

export async function translateObjects<T extends object>(
  objs: T[],
  fields: readonly (keyof T | string)[],
  targetLang: string,
  sourceLang: string = 'en'
): Promise<T[]> {
  if (!Array.isArray(objs) || objs.length === 0) return objs;
  if (targetLang === sourceLang) return objs;

  const clones = objs.map((o) => deepClone(o));
  const slots: StringSlot[] = [];
  for (const clone of clones) {
    for (const field of fields) {
      const path = String(field);
      for (const s of collectSlots(clone as object, path)) slots.push(s);
    }
  }

  if (slots.length === 0) return clones;

  const originals = slots.map((s) => s.get());
  const translated = await lingvaTranslateMany(originals, targetLang, sourceLang);
  for (let i = 0; i < slots.length; i += 1) {
    if (typeof translated[i] === 'string') slots[i].set(translated[i]);
  }
  return clones;
}

// ---- Optional self-test (behind env flag; not run in CI) -----------------
if (process.env.TRANSLATE_SELF_TEST) {
  const sample = {
    name: 'Hello',
    highlights: ['one', { value: 'two' }],
    itinerary: [{ day: 1, activity: 'Walk' }],
    packages: [{ name: 'Basic', description: 'Cheap' }],
    nested: { a: { b: 'deep' } },
  };
  const segs = parsePath('itinerary[].activity');
  console.assert(segs.length === 3, 'parsePath itinerary[].activity');
  const slots = collectSlots(sample, 'highlights[]');
  console.assert(slots.length === 2, 'highlights[] should yield 2 slots (string + {value})');
  const slotsPkg = collectSlots(sample, 'packages[].name');
  console.assert(slotsPkg.length === 1, 'packages[].name should yield 1 slot');
  const slotsDeep = collectSlots(sample, 'nested.a.b');
  console.assert(slotsDeep.length === 1, 'nested.a.b should yield 1 slot');
}
