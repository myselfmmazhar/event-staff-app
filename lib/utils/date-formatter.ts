import { format } from 'date-fns';

/**
 * Check if a date value should be treated as null/UBD.
 * superjson may deserialize null dates as epoch (1970-01-01) dates,
 * so we check for that case as well as actual null/undefined.
 */
export function isDateNullOrUBD(date: Date | string | null | undefined): boolean {
  if (date === null || date === undefined) return true;
  // Check if it's the epoch date (superjson bug workaround)
  const dateObj = new Date(date);
  if (dateObj.getFullYear() === 1970) {
    return true;
  }
  return false;
}

/**
 * Format a date to a short format (e.g., "Jan 15, 2025")
 * Returns "UBD" if date is null, undefined, or epoch (superjson bug)
 */
export function formatDateShort(date: Date | string | null | undefined): string {
  if (isDateNullOrUBD(date)) return 'UBD';
  return new Date(date!).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date with weekday (e.g., "Mon, Jan 15, 2025")
 * Returns "UBD" if date is null, undefined, or epoch (superjson bug)
 */
export function formatDateWithWeekday(date: Date | string | null | undefined): string {
  if (isDateNullOrUBD(date)) return 'UBD';
  return new Date(date!).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date to a long format (e.g., "Monday, January 15, 2025")
 * Returns "UBD" if date is null, undefined, or epoch (superjson bug)
 */
export function formatDateLong(date: Date | string | null | undefined): string {
  if (isDateNullOrUBD(date)) return 'UBD';
  return format(new Date(date!), 'EEEE, MMMM d, yyyy');
}

/**
 * Format a time string (HH:mm) to 12-hour format (e.g., "2:30 PM")
 * Returns "TBD" if time is null or undefined
 */
export function formatTime(time: string | null | undefined): string {
  if (!time) return 'TBD';

  const [hours, minutes] = time.split(':');
  if (!hours || !minutes) return 'TBD';
  const hour = Number.parseInt(hours, 10);

  if (Number.isNaN(hour)) return 'TBD';

  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const ampm = hour >= 12 ? 'PM' : 'AM';

  return `${hour12}:${minutes} ${ampm}`;
}

/**
 * Format date and time together
 * @param date - The date (can be null/undefined for UBD)
 * @param time - Optional time string (HH:mm)
 * @param options - Formatting options
 * @returns Formatted date and time string
 *
 * @example
 * formatDateTime(new Date(), '14:30')
 * // Returns: "Jan 15, 2025 2:30 PM"
 *
 * formatDateTime(new Date(), null)
 * // Returns: "Jan 15, 2025 - TBD"
 *
 * formatDateTime(null, '14:30')
 * // Returns: "UBD 2:30 PM"
 *
 * formatDateTime(new Date(), '14:30', { dateFormat: 'long' })
 * // Returns: "Monday, January 15, 2025 at 2:30 PM"
 */
export function formatDateTime(
  date: Date | string | null | undefined,
  time?: string | null,
  options?: {
    dateFormat?: 'short' | 'long' | 'withWeekday';
    separator?: string;
  }
): string {
  const { dateFormat = 'short', separator = ' ' } = options || {};

  let dateStr: string;
  switch (dateFormat) {
    case 'long':
      dateStr = formatDateLong(date);
      break;
    case 'withWeekday':
      dateStr = formatDateWithWeekday(date);
      break;
    default:
      dateStr = formatDateShort(date);
  }

  const timeStr = formatTime(time);

  // If both are UBD/TBD
  if (dateStr === 'UBD' && timeStr === 'TBD') {
    return 'UBD';
  }

  if (timeStr === 'TBD') {
    return `${dateStr} - TBD`;
  }

  const timeSeparator = dateFormat === 'long' ? ' at ' : separator;
  return `${dateStr}${timeSeparator}${timeStr}`;
}

/**
 * Format a date range
 * @param startDate - Start date
 * @param endDate - End date
 * @param options - Formatting options
 * @returns Formatted date range string
 *
 * @example
 * // Same day
 * formatDateRange(new Date('2025-01-15'), new Date('2025-01-15'))
 * // Returns: "Jan 15, 2025"
 *
 * // Different days
 * formatDateRange(new Date('2025-01-15'), new Date('2025-01-17'))
 * // Returns: "Jan 15, 2025 - Jan 17, 2025"
 *
 * // UBD dates
 * formatDateRange(null, null)
 * // Returns: "UBD"
 */
export function formatDateRange(
  startDate: Date | string | null | undefined,
  endDate: Date | string | null | undefined,
  options?: { dateFormat?: 'short' | 'long' | 'withWeekday' }
): string {
  const { dateFormat = 'short' } = options || {};

  const startIsUBD = isDateNullOrUBD(startDate);
  const endIsUBD = isDateNullOrUBD(endDate);

  // If both are UBD, return single UBD
  if (startIsUBD && endIsUBD) {
    return 'UBD';
  }

  let formatFn: (date: Date | string | null | undefined) => string;
  switch (dateFormat) {
    case 'long':
      formatFn = formatDateLong;
      break;
    case 'withWeekday':
      formatFn = formatDateWithWeekday;
      break;
    default:
      formatFn = formatDateShort;
  }

  // If only one is UBD, show the known date with UBD
  if (startIsUBD) {
    return `UBD - ${formatFn(endDate)}`;
  }
  if (endIsUBD) {
    return `${formatFn(startDate)} - UBD`;
  }

  const sameDay = isSameDay(startDate, endDate);
  if (sameDay) {
    return formatFn(startDate);
  }

  return `${formatFn(startDate)} - ${formatFn(endDate)}`;
}

/**
 * Format a time range
 * @param startTime - Start time (HH:mm)
 * @param endTime - End time (HH:mm)
 * @returns Formatted time range string (e.g., "2:30 PM - 6:00 PM")
 */
export function formatTimeRange(
  startTime: string | null | undefined,
  endTime: string | null | undefined
): string {
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

/**
 * Check if two dates are the same day
 * Returns false if either date is null/UBD
 */
export function isSameDay(date1: Date | string | null | undefined, date2: Date | string | null | undefined): boolean {
  if (isDateNullOrUBD(date1) || isDateNullOrUBD(date2)) return false;
  return new Date(date1!).toDateString() === new Date(date2!).toDateString();
}

/**
 * Format a full date-time range for events
 * @example
 * // Same day event
 * formatEventDateTimeRange(startDate, endDate, '09:00', '17:00')
 * // Returns: "Jan 15, 2025 | 9:00 AM - 5:00 PM"
 *
 * // Multi-day event
 * formatEventDateTimeRange(startDate, endDate, '09:00', '17:00')
 * // Returns: "Jan 15, 2025 9:00 AM - Jan 17, 2025 5:00 PM"
 *
 * // UBD dates
 * formatEventDateTimeRange(null, null, null, null)
 * // Returns: "UBD"
 */
export function formatEventDateTimeRange(
  startDate: Date | string | null | undefined,
  endDate: Date | string | null | undefined,
  startTime: string | null | undefined,
  endTime: string | null | undefined
): string {
  const startDateUBD = isDateNullOrUBD(startDate);
  const endDateUBD = isDateNullOrUBD(endDate);

  // If both dates are UBD
  if (startDateUBD && endDateUBD) {
    const timeRange = formatTimeRange(startTime, endTime);
    if (timeRange === 'TBD - TBD') {
      return 'UBD';
    }
    return `UBD | ${timeRange}`;
  }

  const sameDay = isSameDay(startDate, endDate);

  if (sameDay) {
    const dateStr = formatDateShort(startDate);
    const timeRange = formatTimeRange(startTime, endTime);
    return `${dateStr} | ${timeRange}`;
  }

  const startStr = formatDateTime(startDate, startTime);
  const endStr = formatDateTime(endDate, endTime);
  return `${startStr} - ${endStr}`;
}
