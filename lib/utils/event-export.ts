/**
 * Event Export Utilities
 *
 * Provides functions for exporting events to CSV and Excel formats.
 * Mirrors the pattern established in event-template-export.ts
 */

import { format } from 'date-fns';
import { generateCSV, downloadCSVFile, generateExportFilename } from './csv-export';
import { generateExcel, downloadExcelFile } from './excel-export';
import type { RequestMethod, EventStatus } from '@prisma/client';

/**
 * Event data structure for export
 */
export interface EventExport {
  id: string;
  eventId: string;
  title: string;
  description?: string | null;
  requirements?: string | null;
  privateComments?: string | null;
  status: EventStatus;
  client?: { businessName: string } | null;
  venueName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: number | null;
  longitude?: number | null;
  startDate: Date;
  endDate: Date;
  startTime?: string | null;
  endTime?: string | null;
  timezone: string;
  requestMethod?: RequestMethod | null;
  requestorName?: string | null;
  requestorPhone?: string | null;
  requestorEmail?: string | null;
  poNumber?: string | null;
  preEventInstructions?: string | null;
  meetingPoint?: string | null;
  onsitePocName?: string | null;
  onsitePocPhone?: string | null;
  onsitePocEmail?: string | null;
  fileLinks?: Array<{ name: string; link: string }> | null;
  eventDocuments?: Array<{ name: string; url: string; type?: string; size?: number }> | null;
  customFields?: Array<{ label: string; value: string }> | null;
  createdAt: Date;
}

/**
 * Export column headers (32 columns)
 */
export const EVENT_EXPORT_HEADERS = [
  'Event ID',
  'Title',
  'Description',
  'Status',
  'Requirements',
  'Private Comments',
  'Client',
  'Venue Name',
  'Address',
  'City',
  'State',
  'ZIP Code',
  'Latitude',
  'Longitude',
  'Start Date',
  'End Date',
  'Start Time',
  'End Time',
  'Timezone',
  'Request Method',
  'Requestor Name',
  'Requestor Phone',
  'Requestor Email',
  'PO Number',
  'Pre-Event Instructions',
  'Meeting Point',
  'Onsite POC Name',
  'Onsite POC Phone',
  'Onsite POC Email',
  'File Links',
  'Event Documents',
  'Custom Fields',
  'Created At',
];

/**
 * Column indices for Excel formatting (0-indexed)
 */
const DATE_COLUMNS = [14, 15, 32]; // Start Date, End Date, Created At (shifted by 1)
const NUMBER_COLUMNS = [12, 13]; // Latitude, Longitude

/**
 * Request method display labels
 */
const REQUEST_METHOD_LABELS: Record<RequestMethod, string> = {
  EMAIL: 'Email',
  TEXT_SMS: 'Text/SMS',
  PHONE_CALL: 'Phone Call',
};

/**
 * Status display labels
 */
const STATUS_LABELS: Record<EventStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

/**
 * Formats a date for export (YYYY-MM-DD format for import compatibility)
 */
function formatDate(date: Date | null | undefined): string {
  if (!date) return '';
  try {
    return format(new Date(date), 'yyyy-MM-dd');
  } catch {
    return '';
  }
}

/**
 * Serializes JSON array to string for export
 */
function serializeJsonArray(arr: unknown[] | null | undefined): string {
  if (!arr || arr.length === 0) return '';
  try {
    return JSON.stringify(arr);
  } catch {
    return '';
  }
}

/**
 * Converts an event to an export row
 */
export function eventToExportRow(event: EventExport): (string | number | null)[] {
  return [
    event.eventId,
    event.title,
    event.description || '',
    STATUS_LABELS[event.status] || event.status,
    event.requirements || '',
    event.privateComments || '',
    event.client?.businessName || '',
    event.venueName,
    event.address,
    event.city,
    event.state,
    event.zipCode,
    event.latitude ?? '',
    event.longitude ?? '',
    formatDate(event.startDate),
    formatDate(event.endDate),
    event.startTime || '',
    event.endTime || '',
    event.timezone,
    event.requestMethod ? REQUEST_METHOD_LABELS[event.requestMethod] : '',
    event.requestorName || '',
    event.requestorPhone || '',
    event.requestorEmail || '',
    event.poNumber || '',
    event.preEventInstructions || '',
    event.meetingPoint || '',
    event.onsitePocName || '',
    event.onsitePocPhone || '',
    event.onsitePocEmail || '',
    serializeJsonArray(event.fileLinks),
    serializeJsonArray(event.eventDocuments),
    serializeJsonArray(event.customFields),
    formatDate(event.createdAt),
  ];
}

/**
 * Exports events to CSV and triggers download
 * @param events - Array of events to export
 * @throws Error if export fails
 */
export function exportEventsCSV(events: EventExport[]): void {
  try {
    if (events.length === 0) {
      throw new Error('No events to export');
    }

    const rows = events.map(eventToExportRow);
    const csvContent = generateCSV(EVENT_EXPORT_HEADERS, rows);
    const filename = generateExportFilename('events');
    downloadCSVFile(csvContent, filename);
  } catch (error) {
    console.error('Failed to export events to CSV:', error);
    throw error;
  }
}

/**
 * Exports events to Excel and triggers download
 * @param events - Array of events to export
 * @throws Error if export fails
 */
export function exportEventsExcel(events: EventExport[]): void {
  try {
    if (events.length === 0) {
      throw new Error('No events to export');
    }

    const rows = events.map(eventToExportRow);
    const workbook = generateExcel(EVENT_EXPORT_HEADERS, rows, {
      sheetName: 'Events',
      dateColumns: DATE_COLUMNS,
      numberColumns: NUMBER_COLUMNS,
      freezeHeader: true,
      autoSizeColumns: true,
    });

    const filename = generateExportFilename('events', 'xlsx');
    downloadExcelFile(workbook, filename);
  } catch (error) {
    console.error('Failed to export events to Excel:', error);
    throw error;
  }
}

/**
 * Downloads a sample event import template file
 * @param fileFormat - 'csv' or 'xlsx'
 */
export function downloadSampleEventTemplate(fileFormat: 'csv' | 'xlsx' = 'csv'): void {
  try {
    // Create one example row with placeholder values
    // Event ID is blank since it's auto-generated on import
    const exampleRow: (string | number | null)[] = [
      '', // Event ID - leave blank, auto-generated
      'Annual Company Conference',
      'Annual company-wide conference event',
      'Draft',
      'Business casual dress code',
      'Internal notes here',
      'Acme Corporation',
      'Grand Ballroom',
      '123 Main Street',
      'New York',
      'NY',
      '10001',
      '', // Latitude - optional
      '', // Longitude - optional
      '2025-06-15',
      '2025-06-15',
      '09:00',
      '17:00',
      'America/New_York',
      'Email',
      'John Smith',
      '555-123-4567',
      'john@example.com',
      'PO-12345',
      'Please arrive 30 minutes early for setup',
      'Main lobby entrance',
      'Jane Doe',
      '555-987-6543',
      'jane@example.com',
      '', // File Links - JSON array
      '', // Event Documents - JSON array
      '', // Custom Fields - JSON array
      '', // Created At - read-only
    ];

    // Headers for import (exclude read-only fields for clarity)
    const importHeaders = EVENT_EXPORT_HEADERS;

    if (fileFormat === 'xlsx') {
      const workbook = generateExcel(importHeaders, [exampleRow], {
        sheetName: 'Events',
        dateColumns: DATE_COLUMNS,
        numberColumns: NUMBER_COLUMNS,
        freezeHeader: true,
        autoSizeColumns: true,
      });
      downloadExcelFile(workbook, 'event-import-sample.xlsx');
    } else {
      const csvContent = generateCSV(importHeaders, [exampleRow]);
      downloadCSVFile(csvContent, 'event-import-sample.csv');
    }
  } catch (error) {
    console.error('Failed to download sample template:', error);
    throw error;
  }
}
