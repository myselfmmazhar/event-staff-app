/**
 * Assignment Export Utilities
 *
 * Provides functions for exporting assignments (call times) to CSV and Excel formats.
 */

import { format } from 'date-fns';
import { generateCSV, downloadCSVFile, generateExportFilename } from './csv-export';
import { generateExcel, downloadExcelFile } from './excel-export';
import type { RateType } from '@prisma/client';

/**
 * Assignment data structure for export
 */
export interface AssignmentExport {
  id: string;
  callTimeId: string;
  startDate: Date | string | null;
  startTime: string | null;
  endDate: Date | string | null;
  endTime: string | null;
  numberOfStaffRequired: number;
  payRate: number | string | { toNumber?: () => number };
  payRateType: RateType;
  service: { id: string; title: string } | null;
  event: {
    id: string;
    eventId: string;
    title: string;
    venueName: string | null;
    city: string | null;
    state: string | null;
  };
  confirmedCount: number;
  needsStaff: boolean;
  invitations: Array<{
    id: string;
    status: string;
    isConfirmed: boolean;
    staff: {
      id: string;
      firstName: string;
      lastName: string;
      email?: string | null;
      phone?: string | null;
    };
  }>;
}

/**
 * Export column headers
 */
export const ASSIGNMENT_EXPORT_HEADERS = [
  'Call Time ID',
  'Event Title',
  'Event ID',
  'Event Date',
  'Start Time',
  'End Time',
  'Position/Service',
  'Venue',
  'City',
  'State',
  'Staff Required',
  'Staff Confirmed',
  'Status',
  'Pay Rate',
  'Pay Rate Type',
  'Confirmed Staff Names',
  'Staff Emails',
  'Staff Phones',
];

/**
 * Column indices for Excel formatting (0-indexed)
 */
const DATE_COLUMNS = [3]; // Event Date
const NUMBER_COLUMNS = [10, 11, 13]; // Staff Required, Staff Confirmed, Pay Rate

/**
 * Helper function to get pay rate value
 */
function getPayRateValue(payRate: AssignmentExport['payRate']): number {
  if (typeof payRate === 'number') return payRate;
  if (typeof payRate === 'string') return parseFloat(payRate);
  if (payRate && typeof payRate === 'object' && 'toNumber' in payRate && payRate.toNumber) {
    return payRate.toNumber();
  }
  return 0;
}

/**
 * Helper function to format time
 */
function formatTime(time: string | null): string {
  if (!time) return '';
  const parts = time.split(':');
  if (parts.length < 2) return '';
  const hours = parts[0] || '0';
  const minutes = parts[1] || '00';
  const hour = parseInt(hours, 10);
  if (isNaN(hour)) return '';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

/**
 * Helper function to format date for export, handling null/UBD dates
 */
function formatDateForExport(date: Date | string | null): string {
  if (!date) return 'UBD';
  const d = typeof date === 'string' ? new Date(date) : date;
  // Check for epoch date (superjson bug workaround)
  if (d.getFullYear() === 1970) return 'UBD';
  return format(d, 'EEE, MMM d, yyyy');
}

/**
 * Transform a single assignment into export row
 */
function transformAssignmentToRow(assignment: AssignmentExport): string[] {
  const confirmedStaff = assignment.invitations.filter(inv => inv.isConfirmed);
  const staffNames = confirmedStaff.map(inv => `${inv.staff.firstName} ${inv.staff.lastName}`).join(', ');
  const staffEmails = confirmedStaff.map(inv => inv.staff.email || '').filter(Boolean).join(', ');
  const staffPhones = confirmedStaff.map(inv => inv.staff.phone || '').filter(Boolean).join(', ');

  return [
    assignment.callTimeId || '',
    assignment.event.title || '',
    assignment.event.eventId || '',
    formatDateForExport(assignment.startDate),
    formatTime(assignment.startTime),
    formatTime(assignment.endTime),
    assignment.service?.title || 'No Position',
    assignment.event.venueName || '',
    assignment.event.city || '',
    assignment.event.state || '',
    assignment.numberOfStaffRequired.toString(),
    assignment.confirmedCount.toString(),
    assignment.needsStaff ? 'Needs Staff' : 'Filled',
    getPayRateValue(assignment.payRate).toFixed(2),
    assignment.payRateType || '',
    staffNames,
    staffEmails,
    staffPhones,
  ];
}

/**
 * Export assignments to CSV
 */
export function exportAssignmentsCSV(assignments: AssignmentExport[], filename?: string): void {
  const rows = assignments.map(transformAssignmentToRow);
  const csv = generateCSV(ASSIGNMENT_EXPORT_HEADERS, rows);
  const exportFilename = filename || generateExportFilename('assignments', 'csv');
  downloadCSVFile(csv, exportFilename);
}

/**
 * Export assignments to Excel with formatting
 */
export function exportAssignmentsExcel(assignments: AssignmentExport[], filename?: string): void {
  const rows = assignments.map(transformAssignmentToRow);
  const exportFilename = filename || generateExportFilename('assignments', 'xlsx');

  const workbook = generateExcel(ASSIGNMENT_EXPORT_HEADERS, rows, {
    sheetName: 'Assignments',
    dateColumns: DATE_COLUMNS,
    numberColumns: NUMBER_COLUMNS,
  });

  downloadExcelFile(workbook, exportFilename);
}
