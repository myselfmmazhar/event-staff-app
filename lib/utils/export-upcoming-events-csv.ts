/**
 * CSV Export for Upcoming Events
 *
 * Formats upcoming events data (including mock call times, work shifts, and availability)
 * into CSV format for download.
 */

import { EventStatus } from '@prisma/client';
import { format } from 'date-fns';
import { generateCSV, downloadCSVFile, generateExportFilename } from './csv-export';
import {
  getMockCallTimesForEvent,
  getMockWorkShiftsForEvent,
  getMockAvailabilityForEvent,
  type MockCallTime,
} from '@/lib/mock-data/dashboard-mock';

interface UpcomingEvent {
  id: string;
  eventId: string;
  title: string;
  venueName: string;
  city: string;
  state: string;
  startDate: Date;
  startTime: string | null;
  endDate: Date;
  endTime: string | null;
  status: EventStatus;
  client?: {
    businessName: string;
  } | null;
}

/**
 * CSV Column Headers
 */
const CSV_HEADERS = [
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
 * Formats a date consistently for CSV
 */
function formatDate(date: Date): string {
  return format(new Date(date), 'MMM d, yyyy');
}

/**
 * Formats call times into a readable summary string
 * Example: "Weight Rail (1pm-6pm); Lighting Tech (12pm-7pm)"
 */
function formatCallTimesSummary(callTimes: MockCallTime[]): string {
  if (callTimes.length === 0) return '';

  return callTimes
    .map(ct => `${ct.positionName} (${ct.startTime}-${ct.endTime})`)
    .join('; ');
}

/**
 * Calculates total positions needed across all call times
 */
function calculateTotalPositions(callTimes: MockCallTime[]): number {
  return callTimes.reduce((sum, ct) => sum + ct.staffNeeded, 0);
}

/**
 * Calculates total positions filled across all call times
 */
function calculatePositionsFilled(callTimes: MockCallTime[]): number {
  return callTimes.reduce((sum, ct) => sum + ct.staffAssigned, 0);
}

/**
 * Formats event status for display
 */
function formatStatus(status: EventStatus): string {
  return status.replace(/_/g, ' ');
}

/**
 * Converts an event into a CSV row
 */
function eventToCSVRow(event: UpcomingEvent): (string | number)[] {
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
 * Exports upcoming events to CSV and triggers download
 * @param events - Array of upcoming events
 * @throws Error if export fails
 */
export function exportUpcomingEventsToCSV(events: UpcomingEvent[]): void {
  try {
    // Handle empty data
    if (events.length === 0) {
      throw new Error('No events to export');
    }

    // Convert events to CSV rows
    const rows = events.map(eventToCSVRow);

    // Generate CSV content
    const csvContent = generateCSV(CSV_HEADERS, rows);

    // Generate filename with current date
    const filename = generateExportFilename('upcoming-events');

    // Trigger download
    downloadCSVFile(csvContent, filename);
  } catch (error) {
    console.error('Failed to export events to CSV:', error);
    throw error;
  }
}
