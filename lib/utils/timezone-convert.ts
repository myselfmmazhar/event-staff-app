/**
 * Wall-clock timezone conversion utilities.
 *
 * Tasks are stored as: date-only (Prisma @db.Date, midnight UTC) + "HH:mm" string,
 * which together represent a wall-clock instant in the event's timezone.
 * These helpers convert that wall-clock instant to the viewer's timezone, so a
 * 2:30 PM ET task displays as 11:30 AM PT for a viewer on the West Coast.
 */

function getOffsetMinutes(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );
  return Math.round((asUtc - date.getTime()) / 60000);
}

function wallClockToInstant(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const guessUtcMs = Date.UTC(year, month - 1, day, hour, minute);
  const offset = getOffsetMinutes(new Date(guessUtcMs), timeZone);
  return new Date(guessUtcMs - offset * 60000);
}

function readDateParts(date: Date): { y: number; m: number; d: number } {
  // Date-only Prisma columns deserialize to midnight UTC, so read UTC fields.
  return {
    y: date.getUTCFullYear(),
    m: date.getUTCMonth() + 1,
    d: date.getUTCDate(),
  };
}

function isInvalidEpochDate(d: Date): boolean {
  return d.getUTCFullYear() === 1970;
}

export interface ConvertedTime {
  date: Date | null;
  time: string | null;
}

/**
 * Convert a wall-clock (date + "HH:mm") from fromTz to toTz.
 * Returns date possibly shifted across midnight, and time as "HH:mm" (24h).
 * No-op when fromTz === toTz, when either tz is empty/null (treated as "no
 * preference — show event-local time"), or when both inputs are null.
 *
 * The empty-tz path matters for talent who haven't picked a display timezone:
 * we'd rather show them the event's wall-clock 1:00 PM than silently shift it
 * into UTC (which is what defaulting to 'UTC' did previously).
 */
export function convertWallClock(
  date: Date | string | null,
  time: string | null,
  fromTz: string | null | undefined,
  toTz: string | null | undefined,
): ConvertedTime {
  if (!date && !time) return { date: null, time: null };

  const srcTz = fromTz || '';
  const dstTz = toTz || '';

  const dateObj = date ? (typeof date === 'string' ? new Date(date) : date) : null;
  if (dateObj && isInvalidEpochDate(dateObj)) {
    return { date: dateObj, time: time ?? null };
  }

  // Prisma @db.Date columns deserialize as midnight UTC. Downstream consumers
  // (date-fns format/startOfDay/isSameDay) run in browser-local time, so a
  // midnight-UTC Date renders as the previous day for any tz west of UTC.
  // Rebuild as local-midnight so the calendar day matches in every timezone.
  const toLocalMidnight = (d: Date): Date =>
    new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

  if (!srcTz || !dstTz || srcTz === dstTz || !time || !dateObj) {
    return { date: dateObj ? toLocalMidnight(dateObj) : null, time: time ?? null };
  }

  const { y, m, d } = readDateParts(dateObj);
  const [hStr = '0', miStr = '0'] = time.split(':');
  const h = Number.parseInt(hStr, 10);
  const mi = Number.parseInt(miStr, 10);
  if (Number.isNaN(h) || Number.isNaN(mi)) {
    return { date: dateObj, time };
  }

  const instant = wallClockToInstant(y, m, d, h, mi, srcTz);

  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: dstTz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const parts = dtf.formatToParts(instant);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }

  const convertedDate = new Date(Number(map.year), Number(map.month) - 1, Number(map.day));
  const convertedTime = `${map.hour}:${map.minute}`;

  return { date: convertedDate, time: convertedTime };
}

/**
 * Resolve a wall-clock (date-only + "HH:mm") in the given timezone to its
 * absolute UTC instant. Returns null if the inputs are missing or invalid.
 */
export function resolveWallClockInstant(
  date: Date | string | null,
  time: string | null,
  timeZone: string | null | undefined,
): Date | null {
  if (!date || !time) return null;
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(dateObj.getTime()) || isInvalidEpochDate(dateObj)) return null;
  const [hStr = '0', miStr = '0'] = time.split(':');
  const h = Number.parseInt(hStr, 10);
  const mi = Number.parseInt(miStr, 10);
  if (Number.isNaN(h) || Number.isNaN(mi)) return null;
  const { y, m, d } = readDateParts(dateObj);
  return wallClockToInstant(y, m, d, h, mi, timeZone || 'UTC');
}

/**
 * Short timezone label (e.g. "EST", "PDT", "GMT+5") at the given instant.
 * Falls back to the IANA name if Intl can't produce a short form.
 */
export function shortTzLabel(timeZone: string | null | undefined, atDate: Date = new Date()): string {
  if (!timeZone) return '';
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'short',
    }).formatToParts(atDate);
    const name = parts.find((p) => p.type === 'timeZoneName')?.value;
    return name ?? timeZone;
  } catch {
    return timeZone;
  }
}
