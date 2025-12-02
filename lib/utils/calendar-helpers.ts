import {
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isWithinInterval,
  format,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { EventStatus } from '@prisma/client';

export type ViewMode = 'month' | 'week' | 'day' | 'list';

export interface CalendarEvent {
  id: string;
  eventId: string;
  title: string;
  startDate: Date;
  startTime: string | null;
  endDate: Date;
  endTime: string | null;
  status: EventStatus;
  timezone: string;
  venueName: string;
  client?: {
    businessName: string;
  } | null;
}

/**
 * Generate a month grid (6 weeks of days = 42 days total)
 * Includes overflow days from previous/next months
 */
export function generateMonthGrid(year: number, month: number): Date[][] {
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = endOfMonth(firstDayOfMonth);

  // Get the first day of the first week (might be from previous month)
  const startDate = startOfWeek(firstDayOfMonth, { weekStartsOn: 0 }); // Sunday
  // Get the last day of the last week (might be from next month)
  const endDate = endOfWeek(lastDayOfMonth, { weekStartsOn: 0 });

  // Generate all days
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  // Group into weeks (7 days each)
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return weeks;
}

/**
 * Generate a week grid (7 days for the week containing the date)
 */
export function generateWeekGrid(date: Date): Date[] {
  const weekStart = startOfWeek(date, { weekStartsOn: 0 }); // Sunday
  const weekEnd = endOfWeek(date, { weekStartsOn: 0 }); // Saturday

  return eachDayOfInterval({ start: weekStart, end: weekEnd });
}

/**
 * Filter events that occur on a specific date
 * Handles multi-day events correctly
 */
export function getEventsForDay(events: CalendarEvent[], date: Date): CalendarEvent[] {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  return events.filter((event) => {
    const eventStart = startOfDay(new Date(event.startDate));
    const eventEnd = endOfDay(new Date(event.endDate));

    // Event occurs on this day if it overlaps with this day
    return (
      isWithinInterval(dayStart, { start: eventStart, end: eventEnd }) ||
      isWithinInterval(dayEnd, { start: eventStart, end: eventEnd }) ||
      (eventStart <= dayStart && eventEnd >= dayEnd)
    );
  });
}

/**
 * Filter events that occur during a week
 * Returns events grouped by day
 */
export function getEventsForWeek(
  events: CalendarEvent[],
  weekStart: Date
): Map<string, CalendarEvent[]> {
  const weekDays = generateWeekGrid(weekStart);
  const eventsByDay = new Map<string, CalendarEvent[]>();

  weekDays.forEach((day) => {
    const dayKey = format(day, 'yyyy-MM-dd');
    eventsByDay.set(dayKey, getEventsForDay(events, day));
  });

  return eventsByDay;
}

/**
 * Filter events within date range
 * Sort chronologically
 */
export function getEventsForRange(
  events: CalendarEvent[],
  start: Date,
  end: Date
): CalendarEvent[] {
  const filteredEvents = events.filter((event) => {
    const eventStart = new Date(event.startDate);
    const eventEnd = new Date(event.endDate);

    // Event overlaps with range if:
    // - Event starts before or on range end AND
    // - Event ends on or after range start
    return eventStart <= end && eventEnd >= start;
  });

  // Sort by start date, then by start time
  return filteredEvents.sort((a, b) => {
    const dateCompare = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    if (dateCompare !== 0) return dateCompare;

    // If same start date, sort by time
    if (a.startTime && b.startTime) {
      return a.startTime.localeCompare(b.startTime);
    }
    return 0;
  });
}

/**
 * Calculate which columns an event spans in a week
 * Returns start and end column numbers (0-6 for Sun-Sat)
 */
export function getEventSpan(
  event: CalendarEvent,
  weekStartDate: Date
): { startCol: number; endCol: number; daysInWeek: number } {
  const weekDays = generateWeekGrid(weekStartDate);
  const eventStart = startOfDay(new Date(event.startDate));
  const eventEnd = endOfDay(new Date(event.endDate));

  let startCol = -1;
  let endCol = -1;

  weekDays.forEach((day, index) => {
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);

    // Check if event occurs on this day
    const eventOccursOnDay =
      isWithinInterval(dayStart, { start: eventStart, end: eventEnd }) ||
      isWithinInterval(dayEnd, { start: eventStart, end: eventEnd }) ||
      (eventStart <= dayStart && eventEnd >= dayEnd);

    if (eventOccursOnDay) {
      if (startCol === -1) startCol = index;
      endCol = index;
    }
  });

  const daysInWeek = startCol !== -1 && endCol !== -1 ? endCol - startCol + 1 : 1;

  return {
    startCol: startCol === -1 ? 0 : startCol,
    endCol: endCol === -1 ? 0 : endCol,
    daysInWeek,
  };
}

/**
 * Convert time string "14:30" to "2:30 PM"
 * Handle "TBD" gracefully
 */
export function formatEventTime(time: string | null): string {
  if (!time || time === 'TBD') {
    return 'TBD';
  }

  try {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  } catch {
    return time;
  }
}

/**
 * Check if event occurs on specific date
 * Handle multi-day event logic
 */
export function isEventOnDay(event: CalendarEvent, date: Date): boolean {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  const eventStart = startOfDay(new Date(event.startDate));
  const eventEnd = endOfDay(new Date(event.endDate));

  return (
    isWithinInterval(dayStart, { start: eventStart, end: eventEnd }) ||
    isWithinInterval(dayEnd, { start: eventStart, end: eventEnd }) ||
    (eventStart <= dayStart && eventEnd >= dayEnd)
  );
}

/**
 * Group events by date for list view
 * Returns Map<dateString, Event[]>
 */
export function groupEventsByDate(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const grouped = new Map<string, CalendarEvent[]>();

  events.forEach((event) => {
    const dateKey = format(new Date(event.startDate), 'yyyy-MM-dd');

    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }

    grouped.get(dateKey)!.push(event);
  });

  // Sort events within each day by time
  grouped.forEach((dayEvents) => {
    dayEvents.sort((a, b) => {
      if (a.startTime && b.startTime) {
        return a.startTime.localeCompare(b.startTime);
      }
      return 0;
    });
  });

  return grouped;
}

/**
 * Get navigation period display string based on view mode
 * Examples: "December 2025", "Dec 8-14, 2025", "Monday, Dec 8, 2025"
 */
export function getNavigationPeriod(date: Date, viewMode: ViewMode): string {
  switch (viewMode) {
    case 'month':
      return format(date, 'MMMM yyyy');

    case 'week': {
      const weekStart = startOfWeek(date, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(date, { weekStartsOn: 0 });

      // If week spans two months, show both
      if (weekStart.getMonth() !== weekEnd.getMonth()) {
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
      }

      return `${format(weekStart, 'MMM d')}-${format(weekEnd, 'd, yyyy')}`;
    }

    case 'day':
      return format(date, 'EEEE, MMM d, yyyy');

    case 'list':
      return format(date, 'MMMM yyyy');

    default:
      return format(date, 'MMMM yyyy');
  }
}

/**
 * Format date and time for display
 */
export function formatEventDateTime(
  date: Date,
  time: string | null,
  timezone: string
): string {
  const dateStr = format(new Date(date), 'MMM d, yyyy');

  if (!time || time === 'TBD') {
    return `${dateStr} - TBD`;
  }

  const formattedTime = formatEventTime(time);
  return `${dateStr} at ${formattedTime} ${timezone}`;
}

/**
 * Check if a date is in the current month
 */
export function isInCurrentMonth(date: Date, currentMonth: Date): boolean {
  return date.getMonth() === currentMonth.getMonth() && date.getFullYear() === currentMonth.getFullYear();
}

/**
 * Check if date is today
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

export interface EventLayout {
  event: CalendarEvent;
  colStart: number; // 0-6
  colSpan: number; // 1-7
  row: number; // vertical slot index
  isContinuesBefore: boolean; // starts before this week
  isContinuesAfter: boolean; // ends after this week
}

/**
 * Calculate layout for events in a week
 * Assigns vertical slots to avoid overlaps
 */
export function getEventLayout(events: CalendarEvent[], weekStart: Date): EventLayout[] {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
  const weekDays = generateWeekGrid(weekStart);

  // Filter events that overlap with this week
  const weekEvents = events.filter(event => {
    const eventStart = startOfDay(new Date(event.startDate));
    const eventEnd = endOfDay(new Date(event.endDate));
    return (eventStart <= weekEnd && eventEnd >= weekStart);
  });

  // Sort events:
  // 1. Multi-day events first (longer duration first)
  // 2. Then by start time
  weekEvents.sort((a, b) => {
    const aStart = startOfDay(new Date(a.startDate));
    const aEnd = endOfDay(new Date(a.endDate));
    const bStart = startOfDay(new Date(b.startDate));
    const bEnd = endOfDay(new Date(b.endDate));

    const aDuration = aEnd.getTime() - aStart.getTime();
    const bDuration = bEnd.getTime() - bStart.getTime();

    if (aDuration !== bDuration) return bDuration - aDuration; // Longest first

    return aStart.getTime() - bStart.getTime();
  });

  const layout: EventLayout[] = [];
  const slots: boolean[][] = Array(7).fill(null).map(() => []); // 7 days, dynamic rows

  weekEvents.forEach(event => {
    const eventStart = startOfDay(new Date(event.startDate));
    const eventEnd = endOfDay(new Date(event.endDate));

    // Calculate column span
    let colStart = 0;
    let colEnd = 6;

    // Find start column
    for (let i = 0; i < 7; i++) {
      const day = weekDays[i];
      if (isSameDay(day, eventStart) || (i === 0 && eventStart < day)) {
        colStart = i;
        break;
      }
    }

    // Find end column
    for (let i = colStart; i < 7; i++) {
      const day = weekDays[i];
      if (isSameDay(day, eventEnd)) {
        colEnd = i;
        break;
      }
    }

    // Adjust for events starting before or ending after this week
    if (eventStart < weekDays[0]) colStart = 0;
    if (eventEnd > weekDays[6]) colEnd = 6;

    const colSpan = colEnd - colStart + 1;

    // Find first available row
    let row = 0;
    let foundRow = false;

    while (!foundRow) {
      let rowAvailable = true;
      for (let i = colStart; i <= colEnd; i++) {
        if (slots[i][row]) {
          rowAvailable = false;
          break;
        }
      }

      if (rowAvailable) {
        foundRow = true;
        // Mark slots as occupied
        for (let i = colStart; i <= colEnd; i++) {
          slots[i][row] = true;
        }
      } else {
        row++;
      }
    }

    layout.push({
      event,
      colStart,
      colSpan,
      row,
      isContinuesBefore: eventStart < weekDays[0],
      isContinuesAfter: eventEnd > weekDays[6],
    });
  });

  return layout;
}

/**
 * Calculate layout for all events across entire month
 * Ensures consistent row slots when events span multiple weeks
 */
export function getMonthEventLayout(
  events: CalendarEvent[],
  monthGrid: Date[][]
): Map<number, EventLayout[]> {
  // Track global row assignments for each event
  const eventRowAssignments = new Map<string, number>();

  // Map to store layouts for each week
  const weekLayoutsMap = new Map<number, EventLayout[]>();

  for (let weekIndex = 0; weekIndex < monthGrid.length; weekIndex++) {
    const weekDays = monthGrid[weekIndex];
    const weekStart = startOfDay(weekDays[0]);
    const weekEnd = endOfDay(weekDays[6]);

    // Filter events for this week
    const weekEvents = events.filter((event) => {
      const eventStart = startOfDay(new Date(event.startDate));
      const eventEnd = endOfDay(new Date(event.endDate));
      return eventStart <= weekEnd && eventEnd >= weekStart;
    });

    // Sort events: multi-day first (longer duration), then by start time
    weekEvents.sort((a, b) => {
      const aStart = startOfDay(new Date(a.startDate));
      const aEnd = endOfDay(new Date(a.endDate));
      const bStart = startOfDay(new Date(b.startDate));
      const bEnd = endOfDay(new Date(b.endDate));

      const aDuration = aEnd.getTime() - aStart.getTime();
      const bDuration = bEnd.getTime() - bStart.getTime();

      if (aDuration !== bDuration) return bDuration - aDuration;
      return aStart.getTime() - bStart.getTime();
    });

    const layouts: EventLayout[] = [];
    const slots: boolean[][] = Array(7)
      .fill(null)
      .map(() => []);

    weekEvents.forEach((event) => {
      const eventStart = startOfDay(new Date(event.startDate));
      const eventEnd = endOfDay(new Date(event.endDate));

      // Calculate column span
      let colStart = 0;
      let colEnd = 6;

      // Find start column
      for (let i = 0; i < 7; i++) {
        const day = weekDays[i];
        if (isSameDay(day, eventStart) || (i === 0 && eventStart < day)) {
          colStart = i;
          break;
        }
      }

      // Find end column
      for (let i = colStart; i < 7; i++) {
        const day = weekDays[i];
        if (isSameDay(day, eventEnd)) {
          colEnd = i;
          break;
        }
      }

      // Adjust for events starting before or ending after this week
      if (eventStart < weekDays[0]) colStart = 0;
      if (eventEnd > weekDays[6]) colEnd = 6;

      const colSpan = colEnd - colStart + 1;

      // KEY: Check if event already has a global row assignment
      let row: number;
      if (eventRowAssignments.has(event.id)) {
        // Reuse the same row slot
        row = eventRowAssignments.get(event.id)!;

        // Ensure slots array is large enough
        for (let i = colStart; i <= colEnd; i++) {
          while (slots[i].length <= row) {
            slots[i].push(false);
          }
          slots[i][row] = true;
        }
      } else {
        // Find first available row
        row = 0;
        let foundRow = false;

        while (!foundRow) {
          let rowAvailable = true;
          for (let i = colStart; i <= colEnd; i++) {
            if (slots[i][row]) {
              rowAvailable = false;
              break;
            }
          }

          if (rowAvailable) {
            foundRow = true;
            for (let i = colStart; i <= colEnd; i++) {
              slots[i][row] = true;
            }
          } else {
            row++;
          }
        }

        // Store the row assignment for future weeks
        eventRowAssignments.set(event.id, row);
      }

      layouts.push({
        event,
        colStart,
        colSpan,
        row,
        isContinuesBefore: eventStart < weekDays[0],
        isContinuesAfter: eventEnd > weekDays[6],
      });
    });

    weekLayoutsMap.set(weekIndex, layouts);
  }

  return weekLayoutsMap;
}
