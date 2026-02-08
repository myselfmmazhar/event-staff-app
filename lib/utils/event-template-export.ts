/**
 * Event Template Export Utilities
 *
 * Provides functions for exporting event templates to CSV and Excel formats.
 * Follows the established patterns in export-upcoming-events-*.ts
 */

import { format } from 'date-fns';
import { generateCSV, downloadCSVFile, generateExportFilename } from './csv-export';
import { generateExcel, downloadExcelFile } from './excel-export';
import type { RequestMethod } from '@prisma/client';

/**
 * Event template data structure for export
 */
export interface EventTemplateExport {
  id: string;
  name: string;
  description?: string | null;
  title?: string | null;
  eventDescription?: string | null;
  requirements?: string | null;
  privateComments?: string | null;
  client?: { businessName: string } | null;
  venueName?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  startDate?: Date | null;
  endDate?: Date | null;
  startTime?: string | null;
  endTime?: string | null;
  timezone?: string | null;
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
}

/**
 * Export column headers (31 columns)
 */
export const TEMPLATE_EXPORT_HEADERS = [
  'Template Name',
  'Description',
  'Event Title',
  'Event Description',
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
];

/**
 * Column indices for Excel formatting
 */
const DATE_COLUMNS = [14, 15]; // Start Date, End Date
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
 * Converts an event template to an export row
 */
export function templateToExportRow(template: EventTemplateExport): (string | number | null)[] {
  return [
    template.name,
    template.description || '',
    template.title || '',
    template.eventDescription || '',
    template.requirements || '',
    template.privateComments || '',
    template.client?.businessName || '',
    template.venueName || '',
    template.address || '',
    template.city || '',
    template.state || '',
    template.zipCode || '',
    template.latitude ?? '',
    template.longitude ?? '',
    formatDate(template.startDate),
    formatDate(template.endDate),
    template.startTime || '',
    template.endTime || '',
    template.timezone || '',
    template.requestMethod ? REQUEST_METHOD_LABELS[template.requestMethod] : '',
    template.requestorName || '',
    template.requestorPhone || '',
    template.requestorEmail || '',
    template.poNumber || '',
    template.preEventInstructions || '',
    template.meetingPoint || '',
    template.onsitePocName || '',
    template.onsitePocPhone || '',
    template.onsitePocEmail || '',
    serializeJsonArray(template.fileLinks),
    serializeJsonArray(template.eventDocuments),
  ];
}

/**
 * Exports event templates to CSV and triggers download
 * @param templates - Array of event templates to export
 * @throws Error if export fails
 */
export function exportTemplatesCSV(templates: EventTemplateExport[]): void {
  try {
    if (templates.length === 0) {
      throw new Error('No templates to export');
    }

    const rows = templates.map(templateToExportRow);
    const csvContent = generateCSV(TEMPLATE_EXPORT_HEADERS, rows);
    const filename = generateExportFilename('event-templates');
    downloadCSVFile(csvContent, filename);
  } catch (error) {
    console.error('Failed to export templates to CSV:', error);
    throw error;
  }
}

/**
 * Exports event templates to Excel and triggers download
 * @param templates - Array of event templates to export
 * @throws Error if export fails
 */
export function exportTemplatesExcel(templates: EventTemplateExport[]): void {
  try {
    if (templates.length === 0) {
      throw new Error('No templates to export');
    }

    const rows = templates.map(templateToExportRow);
    const workbook = generateExcel(TEMPLATE_EXPORT_HEADERS, rows, {
      sheetName: 'Event Templates',
      dateColumns: DATE_COLUMNS,
      numberColumns: NUMBER_COLUMNS,
      freezeHeader: true,
      autoSizeColumns: true,
    });

    const filename = generateExportFilename('event-templates', 'xlsx');
    downloadExcelFile(workbook, filename);
  } catch (error) {
    console.error('Failed to export templates to Excel:', error);
    throw error;
  }
}

/**
 * Downloads a sample template file (empty with headers only)
 * @param format - 'csv' or 'xlsx'
 */
export function downloadSampleTemplate(format: 'csv' | 'xlsx' = 'csv'): void {
  try {
    // Create one example row with placeholder values
    const exampleRow: (string | number | null)[] = [
      'Example Template Name',
      'Template description',
      'Event Title',
      'Event description text',
      'Business casual',
      'Internal notes',
      'Client Business Name',
      'Venue Name',
      '123 Main St',
      'City',
      'State',
      '12345',
      '',
      '',
      '2025-01-15',
      '2025-01-15',
      '09:00',
      '17:00',
      'America/New_York',
      'Email',
      'John Smith',
      '555-123-4567',
      'john@example.com',
      'PO-12345',
      'Pre-event instructions here',
      'Main entrance',
      'Jane Doe',
      '555-987-6543',
      'jane@example.com',
      '',
      '',
    ];

    if (format === 'xlsx') {
      const workbook = generateExcel(TEMPLATE_EXPORT_HEADERS, [exampleRow], {
        sheetName: 'Event Templates',
        dateColumns: DATE_COLUMNS,
        numberColumns: NUMBER_COLUMNS,
        freezeHeader: true,
        autoSizeColumns: true,
      });
      downloadExcelFile(workbook, 'event-template-sample.xlsx');
    } else {
      const csvContent = generateCSV(TEMPLATE_EXPORT_HEADERS, [exampleRow]);
      downloadCSVFile(csvContent, 'event-template-sample.csv');
    }
  } catch (error) {
    console.error('Failed to download sample template:', error);
    throw error;
  }
}
