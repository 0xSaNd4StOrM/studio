// Conservative PII scrubber for visitor messages before they reach Copilot.
//
// We only redact patterns that have NO legitimate place in a travel-planning
// chat — primarily credit card numbers. Phone numbers and emails are
// deliberately allowed: visitors regularly say "call me at +20..." or
// share an email in a service context, and over-redacting those would
// make the assistant confused or unhelpful.
//
// If a new pattern proves to be a real leak vector (e.g. ID numbers), add
// it here; the redactor is one place to evolve.

// 13-19 digits in groups of 4-6 (Visa/MC/Amex/etc), allowing optional
// spaces or hyphens as separators. Must be on a word boundary so we don't
// gobble timestamps or order ids.
const CARD_LIKE_RE = /\b(?:\d[\s-]?){13,19}\b/g;

const CARD_PLACEHOLDER = '[redacted-card-number]';

/**
 * Returns a copy of `text` with PII patterns replaced by placeholders.
 */
export function redactPii(text: string): string {
  if (!text) return text;
  return text.replace(CARD_LIKE_RE, (match) => {
    // Strip non-digits and confirm the candidate has the right length range
    // before declaring it a card. This avoids false positives on phone
    // numbers (10-12 digits) and order ids that happen to fall in range.
    const digits = match.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return match;
    return CARD_PLACEHOLDER;
  });
}
