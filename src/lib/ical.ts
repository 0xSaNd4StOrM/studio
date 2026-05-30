/**
 * Minimal, dependency-free iCalendar (RFC 5545) serializer + parser for
 * hotel channel sync. We only need VEVENTs with DTSTART/DTEND as all-day
 * DATE values (room stays are date-ranged, [check-in, check-out)).
 *
 * This intentionally supports just the subset Booking.com / Airbnb / Google
 * emit for availability blocks. It is not a general-purpose iCal library.
 */

export type IcalEvent = {
  /** UID of the event (stable per source booking). */
  uid: string;
  /** All-day start date `YYYY-MM-DD` (inclusive). */
  start: string;
  /** All-day end date `YYYY-MM-DD` (exclusive, per iCal DTEND for DATE values). */
  end: string;
  summary?: string;
};

const ICS_DATE_RE = /^(\d{4})(\d{2})(\d{2})/;

function toIcsDate(iso: string): string {
  // `YYYY-MM-DD` → `YYYYMMDD`
  return iso.replace(/-/g, '').slice(0, 8);
}

function fromIcsDate(value: string): string | null {
  const m = ICS_DATE_RE.exec(value.trim());
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/** Escape per RFC 5545 §3.3.11 for TEXT values. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Fold a content line at 75 octets per RFC 5545 §3.1 (continuation lines start
 * with a single space). We approximate by characters which is safe for ASCII
 * dates/identifiers; summaries are short.
 */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 74) {
    parts.push(' ' + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  if (rest.length) parts.push(' ' + rest);
  return parts.join('\r\n');
}

/**
 * Serialize events into a VCALENDAR string with CRLF line endings.
 * `dtstamp` is a fixed `YYYYMMDDТHHMMSSZ` timestamp supplied by the caller
 * (scripts in this project cannot call Date.now() at module scope safely, so
 * the route passes a request-time value).
 */
export function buildIcs(params: {
  events: IcalEvent[];
  calName: string;
  dtstamp: string;
  prodId?: string;
}): string {
  const { events, calName, dtstamp } = params;
  const prodId = params.prodId ?? '-//Tourista//Hotel Channel Sync//EN';

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${prodId}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    foldLine(`X-WR-CALNAME:${escapeText(calName)}`),
  ];

  for (const ev of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(foldLine(`UID:${ev.uid}`));
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART;VALUE=DATE:${toIcsDate(ev.start)}`);
    lines.push(`DTEND;VALUE=DATE:${toIcsDate(ev.end)}`);
    if (ev.summary) lines.push(foldLine(`SUMMARY:${escapeText(ev.summary)}`));
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

/**
 * Parse a VCALENDAR string into events. Handles line unfolding, both
 * `DTSTART;VALUE=DATE:` (all-day) and `DTSTART:YYYYMMDDТHHMMSSZ` (datetime,
 * truncated to its date). Events missing start or end are skipped.
 */
export function parseIcs(text: string): IcalEvent[] {
  // Unfold: a CRLF/LF followed by a space or tab is a continuation.
  const unfolded = text.replace(/\r?\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);

  const events: IcalEvent[] = [];
  let cur: Partial<IcalEvent> | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (line === 'BEGIN:VEVENT') {
      cur = {};
      continue;
    }
    if (line === 'END:VEVENT') {
      if (cur && cur.start && cur.end) {
        events.push({
          uid: cur.uid || `${cur.start}-${cur.end}`,
          start: cur.start,
          end: cur.end,
          summary: cur.summary,
        });
      }
      cur = null;
      continue;
    }
    if (!cur) continue;

    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const namePart = line.slice(0, colon); // may include ;params
    const value = line.slice(colon + 1);
    const name = namePart.split(';')[0].toUpperCase();

    if (name === 'UID') cur.uid = value.trim();
    else if (name === 'SUMMARY') cur.summary = value.trim();
    else if (name === 'DTSTART') {
      const d = fromIcsDate(value);
      if (d) cur.start = d;
    } else if (name === 'DTEND') {
      const d = fromIcsDate(value);
      if (d) cur.end = d;
    }
  }

  return events;
}
