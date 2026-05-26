// Tokenises a chat message into renderable pieces. The chat UI walks the
// token list and emits <a> for `link` and <span> for `text` so visitors
// see short, friendly labels — not raw 200-character URLs.
//
// Supports:
//   - Markdown links: `[label](https://example.com)`
//   - Bare URLs:      `https://example.com/path`
//   - WhatsApp:       `wa.me/201005580389` (scheme optional)
//   - Phone:          `tel:+201005580389`
//   - Email:          `mailto:hi@example.com`
//
// Anything else falls through as plain text. Newlines stay inside `text`
// tokens because the parent bubble keeps `whitespace-pre-wrap`.

export type ChatToken =
  | { type: 'text'; value: string }
  | { type: 'link'; href: string; label: string };

// Markdown link: [label](url). Be permissive about what the LLM emits:
//   - The label may span lines or contain weird whitespace
//   - There may be whitespace between `]` and `(`
//   - The URL may be wrapped in `<...>` (a markdown extension)
//   - Relative URLs (starting with `/`) are accepted
// `[\s\S]+?` makes label match across newlines (lazy), and `\s*` between
// the bracket and paren lets us catch `]\n(` cases produced by chat models.
const MD_LINK_RE = /\[([\s\S]+?)\]\s*\(\s*<?([^\s<>)]+)>?\s*\)/g;

// Bare URL families. Each must be at a word boundary so we don't gobble
// the middle of an email address that already matched mailto:.
const BARE_URL_RE =
  /(\bhttps?:\/\/[^\s<>"')\]]+|\bwa\.me\/[\w+\-]+|\btel:\+?[\d\s\-()]+|\bmailto:[^\s<>"')\]]+)/g;

// Strip trailing punctuation that almost certainly isn't part of the URL.
// "look at https://example.com/page." → URL is everything before the dot.
const TRAILING_PUNCT_RE = /[.,!?;:]+$/;

const ALLOWED_SCHEMES = new Set(['http:', 'https:', 'tel:', 'mailto:']);

type Match = { start: number; end: number; href: string; label: string };

/**
 * Normalise a raw href and produce a safe, schemed URL.
 * Returns null if the URL uses a disallowed scheme (javascript:, data:, …).
 *
 * Also strips angle brackets `<...>` that some models wrap URLs in.
 */
function normaliseHref(raw: string): string | null {
  let trimmed = raw.trim().replace(TRAILING_PUNCT_RE, '');
  // Strip angle-bracket wrappers (a markdown extension for URLs with spaces
  // or parens — but our URLs never need it, and the brackets break clicks).
  while (trimmed.startsWith('<') && trimmed.endsWith('>')) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  // Leading `<` only (unbalanced) — also strip.
  if (trimmed.startsWith('<')) trimmed = trimmed.slice(1).trim();
  if (trimmed.endsWith('>')) trimmed = trimmed.slice(0, -1).trim();

  if (!trimmed) return null;

  // Relative URLs are common (`/tours/<slug>`, `/booking/<token>`). These
  // resolve against the current origin in the browser and are safe.
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }

  // wa.me/<number> with no scheme → upgrade to https.
  if (/^wa\.me\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  if (/^tel:/i.test(trimmed)) {
    // tel: URLs can contain spaces; strip whitespace inside the scheme tail.
    const tail = trimmed.slice(4).replace(/\s+/g, '');
    return `tel:${tail}`;
  }

  if (/^mailto:/i.test(trimmed)) return trimmed;

  // Otherwise must have an http(s) scheme.
  try {
    const parsed = new URL(trimmed);
    if (!ALLOWED_SCHEMES.has(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Friendly label for a bare URL when the user didn't provide one.
 */
function labelForBare(href: string, original: string): string {
  if (href.startsWith('mailto:')) return 'Email';
  if (href.startsWith('tel:')) return 'Call';
  if (href.startsWith('/booking/')) return 'View booking →';
  if (href.startsWith('/tours/')) return 'View tour →';
  if (href.startsWith('/')) return 'Open link →';
  try {
    const parsed = new URL(href);
    const host = parsed.host.replace(/^www\./, '');
    if (host === 'wa.me') return 'WhatsApp →';
    if (host.includes('kashier')) return 'Pay now →';
    return host || original;
  } catch {
    return original;
  }
}

export function tokenizeChatMessage(input: string): ChatToken[] {
  if (!input) return [];

  const matches: Match[] = [];

  // 1. Markdown links first — they're the most explicit signal.
  MD_LINK_RE.lastIndex = 0;
  for (const m of input.matchAll(MD_LINK_RE)) {
    if (m.index === undefined) continue;
    const href = normaliseHref(m[2]);
    if (!href) continue;
    // Collapse any whitespace (incl. newlines) the model put inside the
    // label into a single space — labels render on one line in the UI.
    const rawLabel = m[1].replace(/\s+/g, ' ').trim();
    matches.push({
      start: m.index,
      end: m.index + m[0].length,
      href,
      label: rawLabel || labelForBare(href, m[2]),
    });
  }

  // 2. Bare URLs — but only in regions NOT already covered by a markdown link.
  BARE_URL_RE.lastIndex = 0;
  for (const m of input.matchAll(BARE_URL_RE)) {
    if (m.index === undefined) continue;
    const overlaps = matches.some(
      (existing) => m.index! < existing.end && m.index! + m[0].length > existing.start
    );
    if (overlaps) continue;

    // For bare URLs we trim trailing punctuation off the matched range.
    const rawWithoutPunct = m[0].replace(TRAILING_PUNCT_RE, '');
    const href = normaliseHref(rawWithoutPunct);
    if (!href) continue;
    matches.push({
      start: m.index,
      end: m.index + rawWithoutPunct.length,
      href,
      label: labelForBare(href, rawWithoutPunct),
    });
  }

  if (matches.length === 0) {
    return [{ type: 'text', value: input }];
  }

  matches.sort((a, b) => a.start - b.start);

  const tokens: ChatToken[] = [];
  let cursor = 0;
  for (const match of matches) {
    if (match.start > cursor) {
      tokens.push({ type: 'text', value: input.slice(cursor, match.start) });
    }
    tokens.push({ type: 'link', href: match.href, label: match.label });
    cursor = match.end;
  }
  if (cursor < input.length) {
    tokens.push({ type: 'text', value: input.slice(cursor) });
  }

  return tokens;
}
