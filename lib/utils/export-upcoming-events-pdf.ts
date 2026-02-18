/**
 * PDF Export for Upcoming Events
 *
 * Formats upcoming events data into professional PDF cards (one event per page).
 * Uses enhanced styling with colors, boxes, and visual hierarchy.
 * Reuses formatters from CSV/Excel exports for data consistency.
 */

import { EventStatus } from '@prisma/client';
import { format } from 'date-fns';
import { PDFDocument, downloadPDFFile } from './pdf-export';
import { generateExportFilename } from './csv-export';
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
 * Check if date is null or UBD (epoch date from superjson bug)
 */
function isDateUBD(date: Date | null): boolean {
  if (!date) return true;
  const d = new Date(date);
  return d.getFullYear() === 1970;
}

/**
 * Formats a date consistently (reused from CSV/Excel)
 * Returns "UBD" for null or epoch dates
 */
function formatDate(date: Date | null): string {
  if (isDateUBD(date)) return 'UBD';
  return format(new Date(date!), 'MMM d, yyyy');
}

/**
 * Formats date and time together
 */
function formatDateTime(date: Date | null, time: string | null): string {
  const dateStr = formatDate(date);
  if (dateStr === 'UBD') return time ? `UBD ${time}` : 'UBD';
  return time ? `${dateStr} ${time}` : `${dateStr} (TBD)`;
}

/**
 * Formats call times as array of strings for bullet list
 */
function formatCallTimesForPDF(callTimes: MockCallTime[]): string[] {
  return callTimes.map(
    (ct) => `${ct.positionName} (${ct.startTime}-${ct.endTime})`
  );
}

/**
 * Calculates total positions needed (reused from CSV/Excel)
 */
function calculateTotalPositions(callTimes: MockCallTime[]): number {
  return callTimes.reduce((sum, ct) => sum + ct.staffNeeded, 0);
}

/**
 * Calculates total positions filled (reused from CSV/Excel)
 */
function calculatePositionsFilled(callTimes: MockCallTime[]): number {
  return callTimes.reduce((sum, ct) => sum + ct.staffAssigned, 0);
}

/**
 * Formats event status for display (reused from CSV/Excel)
 */
function formatStatus(status: EventStatus): string {
  return status.replace(/_/g, ' ');
}

/**
 * Gets status color for visual indicators
 */
function getStatusColor(status: EventStatus): 'primary' | 'success' | 'warning' {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'DRAFT':
    case 'CANCELLED':
      return 'warning';
    default:
      return 'primary';
  }
}

/**
 * Renders a single event as a professional card on a PDF page
 */
function renderEventCard(pdf: PDFDocument, event: UpcomingEvent, isFirstEvent: boolean): void {
  // Add new page for each event (except the first one which uses the initial page)
  if (!isFirstEvent) {
    pdf.addNewPage();
  }

  // Get mock data for this event
  const callTimes = getMockCallTimesForEvent(event.id);
  const workShifts = getMockWorkShiftsForEvent(event.id);
  const availability = getMockAvailabilityForEvent(event.id);

  // EVENT INFORMATION Section
  pdf.addSection('EVENT INFORMATION');
  pdf.addField('Event ID', event.eventId);
  pdf.addField('Title', event.title, { highlight: true });
  pdf.addField('Client', event.client?.businessName || 'N/A');
  pdf.addField('Status', formatStatus(event.status));
  pdf.addSpacing(3);

  // VENUE & LOCATION Section
  pdf.addSection('VENUE & LOCATION');
  pdf.addField('Venue', event.venueName);
  pdf.addField('City', event.city);
  pdf.addField('State', event.state);
  pdf.addSpacing(3);

  // SCHEDULE Section
  pdf.addSection('SCHEDULE');
  pdf.addField('Start', formatDateTime(event.startDate, event.startTime));
  pdf.addField('End', formatDateTime(event.endDate, event.endTime));
  pdf.addSpacing(3);

  // CALL TIMES Section
  pdf.addSection('CALL TIMES');
  const callTimesList = formatCallTimesForPDF(callTimes);
  if (callTimesList.length > 0) {
    pdf.addBulletList(callTimesList);
  } else {
    pdf.addField('Call Times', 'No call times scheduled');
  }
  pdf.addSpacing(3);

  // STAFFING Section with Stats Grid
  pdf.addSection('STAFFING');
  const totalPositions = calculateTotalPositions(callTimes);
  const positionsFilled = calculatePositionsFilled(callTimes);
  pdf.addStatsGrid([
    { label: 'Total Positions', value: totalPositions, color: 'primary' },
    { label: 'Positions Filled', value: positionsFilled, color: 'success' },
  ]);
  pdf.addSpacing(3);

  // WORK SHIFTS Section with Stats Grid
  pdf.addSection('WORK SHIFTS');
  pdf.addStatsGrid([
    { label: 'Sent', value: workShifts.sent, color: 'primary' },
    { label: 'Confirmed', value: workShifts.confirmed, color: 'success' },
    { label: 'Queued to Send', value: workShifts.queuedToSend, color: 'warning' },
  ]);
  pdf.addSpacing(3);

  // AVAILABILITY REQUESTS Section with Stats Grid
  pdf.addSection('AVAILABILITY REQUESTS');
  pdf.addStatsGrid([
    { label: 'Sent', value: availability.sent, color: 'primary' },
    { label: 'Answered', value: availability.answered, color: 'success' },
    { label: 'Available', value: availability.available, color: 'success' },
    { label: 'Created', value: availability.created, color: 'primary' },
  ]);
}

/**
 * Exports upcoming events to PDF and triggers download
 * @param events - Array of upcoming events
 * @throws Error if export fails
 */
export function exportUpcomingEventsToPDF(events: UpcomingEvent[]): void {
  try {
    // Handle empty data
    if (events.length === 0) {
      throw new Error('No events to export');
    }

    // Create PDF document
    const pdf = new PDFDocument();

    // Add document header on first page
    pdf.addDocumentHeader('Upcoming Events Report', true);

    // Render each event as a card
    events.forEach((event, index) => {
      renderEventCard(pdf, event, index === 0);
    });

    // Finalize PDF with page numbers
    pdf.finalize(events.length);

    // Generate filename with current date (matches CSV/Excel pattern)
    const filename = generateExportFilename('upcoming-events', 'pdf');

    // Trigger download
    downloadPDFFile(pdf.getDocument(), filename);
  } catch (error) {
    console.error('Failed to export events to PDF:', error);
    throw error;
  }
}
