/**
 * Excel Export for Upcoming Events
 *
 * Formats upcoming events data (including mock call times, work shifts, and availability)
 * into Excel format with styling for download.
 * Reuses formatters from CSV export for data consistency.
 */

import { EventStatus } from '@prisma/client';
import { generateExcel, downloadExcelFile } from './excel-export';
import { generateExportFilename } from './csv-export';
import {
  getMockCallTimesForEvent,
  getMockWorkShiftsForEvent,
  getMockAvailabilityForEvent,
  type MockCallTime,
} from '@/lib/mock-data/dashboard-mock';

// Import reusable formatters from CSV export
import { format } from 'date-fns';

interface UpcomingEvent {
  id: string;
  eventId: string;
  title: string;
  venueName: string;
  city: string;
  state: string;
  startDate: Date | null;
  startTime: string | null;
  endDate: Date | null;
  endTime: string | null;
  status: EventStatus;
  client?: {
    businessName: string;
  } | null;
}

/**
 * Excel Column Headers (same 19 columns as CSV)
 */
const EXCEL_HEADERS = [
  'Event ID',
  'Event Title',
  'Client',
  'Venue',
  'City',
  'State',
  'Start Date',
  'Start Time',
  'End Date',
  'End Time',
  'Status',
  'Call Times',
  'Total Positions',
  'Positions Filled',
  'Work Shifts Sent',
  'Work Shifts Confirmed',
  'Work Shifts Queued',
  'Availability Answered',
  'Availability Sent',
];

/**
 * Column indices for formatting
 */
const DATE_COLUMNS = [6, 8]; // Start Date, End Date
const NUMBER_COLUMNS = [12, 13, 14, 15, 16, 17, 18]; // Position counts, work shifts, availability

/**
 * Check if date is null or UBD (epoch date from superjson bug)
 */
function isDateUBD(date: Date | null): boolean {
  if (!date) return true;
  const d = new Date(date);
  return d.getFullYear() === 1970;
}

/**
 * Formats a date consistently for Excel (reused from CSV)
 * Returns "UBD" for null or epoch dates
 */
function formatDate(date: Date | null): string {
  if (isDateUBD(date)) return 'UBD';
  return format(new Date(date!), 'MMM d, yyyy');
}

/**
 * Formats call times into a readable summary string (reused from CSV)
 * Example: "Weight Rail (1pm-6pm); Lighting Tech (12pm-7pm)"
 */
function formatCallTimesSummary(callTimes: MockCallTime[]): string {
  if (callTimes.length === 0) return '';

  return callTimes
    .map(ct => `${ct.positionName} (${ct.startTime}-${ct.endTime})`)
    .join('; ');
}

/**
 * Calculates total positions needed across all call times (reused from CSV)
 */
function calculateTotalPositions(callTimes: MockCallTime[]): number {
  return callTimes.reduce((sum, ct) => sum + ct.staffNeeded, 0);
}

/**
 * Calculates total positions filled across all call times (reused from CSV)
 */
function calculatePositionsFilled(callTimes: MockCallTime[]): number {
  return callTimes.reduce((sum, ct) => sum + ct.staffAssigned, 0);
}

/**
 * Formats event status for display (reused from CSV)
 */
function formatStatus(status: EventStatus): string {
  return status.replace(/_/g, ' ');
}

/**
 * Converts an event into an Excel row (same logic as CSV)
 */
function eventToExcelRow(event: UpcomingEvent): (string | number)[] {
  // Get mock data for this event
  const callTimes = getMockCallTimesForEvent(event.id);
  const workShifts = getMockWorkShiftsForEvent(event.id);
  const availability = getMockAvailabilityForEvent(event.id);

  return [
    event.eventId,
    event.title,
    event.client?.businessName || '',
    event.venueName,
    event.city,
    event.state,
    formatDate(event.startDate),
    event.startTime || 'TBD',
    formatDate(event.endDate),
    event.endTime || 'TBD',
    formatStatus(event.status),
    formatCallTimesSummary(callTimes),
    calculateTotalPositions(callTimes),
    calculatePositionsFilled(callTimes),
    workShifts.sent,
    workShifts.confirmed,
    workShifts.queuedToSend,
    availability.answered,
    availability.sent,
  ];
}

/**
 * Exports upcoming events to Excel and triggers download
 * @param events - Array of upcoming events
 * @throws Error if export fails
 */
export function exportUpcomingEventsToExcel(events: UpcomingEvent[]): void {
  try {
    // Handle empty data
    if (events.length === 0) {
      throw new Error('No events to export');
    }

    // Convert events to Excel rows
    const rows = events.map(eventToExcelRow);

    // Generate Excel workbook with styling
    const workbook = generateExcel(EXCEL_HEADERS, rows, {
      sheetName: 'Upcoming Events',
      dateColumns: DATE_COLUMNS,
      numberColumns: NUMBER_COLUMNS,
      freezeHeader: true,
      autoSizeColumns: true,
    });

    // Generate filename with current date (matches CSV pattern)
    const filename = generateExportFilename('upcoming-events', 'xlsx');

    // Trigger download
    downloadExcelFile(workbook, filename);
  } catch (error) {
    console.error('Failed to export events to Excel:', error);
    throw error;
  }
}
