import { format } from 'date-fns';

/**
 * Format a date to a short format (e.g., "Jan 15, 2025")
 */
export function formatDateShort(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date with weekday (e.g., "Mon, Jan 15, 2025")
 */
export function formatDateWithWeekday(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date to a long format (e.g., "Monday, January 15, 2025")
 */
export function formatDateLong(date: Date | string): string {
  return format(new Date(date), 'EEEE, MMMM d, yyyy');
}

/**
 * Format a time string (HH:mm) to 12-hour format (e.g., "2:30 PM")
 * Returns "TBD" if time is null or undefined
 */
export function formatTime(time: string | null | undefined): string {
  if (!time) return 'TBD';

  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);

  if (isNaN(hour)) return 'TBD';

  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const ampm = hour >= 12 ? 'PM' : 'AM';

  return `${hour12}:${minutes} ${ampm}`;
}

/**
 * Format date and time together
 * @param date - The date
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
 * formatDateTime(new Date(), '14:30', { dateFormat: 'long' })
 * // Returns: "Monday, January 15, 2025 at 2:30 PM"
 */
export function formatDateTime(
  date: Date | string,
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
 */
export function formatDateRange(
  startDate: Date | string,
  endDate: Date | string,
  options?: { dateFormat?: 'short' | 'long' | 'withWeekday' }
): string {
  const { dateFormat = 'short' } = options || {};

  const start = new Date(startDate);
  const end = new Date(endDate);

  const isSameDay = start.toDateString() === end.toDateString();

  let formatFn: (date: Date | string) => string;
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

  if (isSameDay) {
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
 */
export function isSameDay(date1: Date | string, date2: Date | string): boolean {
  return new Date(date1).toDateString() === new Date(date2).toDateString();
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
 */
export function formatEventDateTimeRange(
  startDate: Date | string,
  endDate: Date | string,
  startTime: string | null | undefined,
  endTime: string | null | undefined
): string {
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
