/**
 * Event Template Import Utilities
 *
 * Provides functions for parsing and validating imported event template data
 * from CSV and Excel files.
 */

import * as XLSX from 'xlsx';
import { importTemplateRowSchema, type ImportTemplateRow } from '@/lib/schemas/event-template-import.schema';
import { TEMPLATE_EXPORT_HEADERS } from './event-template-export';
import type { CreateEventTemplateInput } from '@/lib/schemas/event-template.schema';
import type { RequestMethod } from '@prisma/client';

/**
 * Column mapping interface
 */
export interface ColumnMapping {
  sourceColumn: string;
  targetField: string; // Template field name or 'skip'
}

/**
 * Parsed row from import file
 */
export interface ParsedRow {
  [key: string]: string | number | null | undefined;
}

/**
 * Row validation result
 */
export interface RowValidationResult {
  rowIndex: number;
  valid: boolean;
  errors: string[];
  warnings: string[];
  data: ImportTemplateRow | null;
}

/**
 * File parse result
 */
export interface ParseResult {
  success: boolean;
  headers: string[];
  rows: ParsedRow[];
  error?: string;
}

/**
 * Available template fields for column mapping
 */
export const TEMPLATE_FIELDS = [
  { value: 'skip', label: 'Skip (do not import)' },
  { value: 'name', label: 'Template Name *', required: true },
  { value: 'description', label: 'Description' },
  { value: 'title', label: 'Event Title' },
  { value: 'eventDescription', label: 'Event Description' },
  { value: 'requirements', label: 'Requirements' },
  { value: 'privateComments', label: 'Private Comments' },
  { value: 'clientName', label: 'Client' },
  { value: 'venueName', label: 'Venue Name' },
  { value: 'address', label: 'Address' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State' },
  { value: 'zipCode', label: 'ZIP Code' },
  { value: 'latitude', label: 'Latitude' },
  { value: 'longitude', label: 'Longitude' },
  { value: 'startDate', label: 'Start Date' },
  { value: 'endDate', label: 'End Date' },
  { value: 'startTime', label: 'Start Time' },
  { value: 'endTime', label: 'End Time' },
  { value: 'timezone', label: 'Timezone' },
  { value: 'requestMethod', label: 'Request Method' },
  { value: 'requestorName', label: 'Requestor Name' },
  { value: 'requestorPhone', label: 'Requestor Phone' },
  { value: 'requestorEmail', label: 'Requestor Email' },
  { value: 'poNumber', label: 'PO Number' },
  { value: 'preEventInstructions', label: 'Pre-Event Instructions' },
  { value: 'meetingPoint', label: 'Meeting Point' },
  { value: 'onsitePocName', label: 'Onsite POC Name' },
  { value: 'onsitePocPhone', label: 'Onsite POC Phone' },
  { value: 'onsitePocEmail', label: 'Onsite POC Email' },
  { value: 'fileLinks', label: 'File Links (JSON)' },
  { value: 'eventDocuments', label: 'Event Documents (JSON)' },
];

/**
 * Common column name variations for auto-detection
 */
const COLUMN_NAME_MAP: Record<string, string> = {
  // Template Name
  'template name': 'name',
  'template_name': 'name',
  'templatename': 'name',
  'name': 'name',

  // Description
  'description': 'description',
  'template description': 'description',

  // Event Title
  'event title': 'title',
  'event_title': 'title',
  'title': 'title',

  // Event Description
  'event description': 'eventDescription',
  'event_description': 'eventDescription',
  'eventdescription': 'eventDescription',

  // Requirements
  'requirements': 'requirements',
  'dress code': 'requirements',
  'dresscode': 'requirements',

  // Private Comments
  'private comments': 'privateComments',
  'private_comments': 'privateComments',
  'privatecomments': 'privateComments',
  'internal notes': 'privateComments',

  // Client
  'client': 'clientName',
  'client name': 'clientName',
  'client_name': 'clientName',
  'clientname': 'clientName',

  // Venue
  'venue name': 'venueName',
  'venue_name': 'venueName',
  'venuename': 'venueName',
  'venue': 'venueName',

  // Address
  'address': 'address',
  'street address': 'address',

  // City
  'city': 'city',

  // State
  'state': 'state',

  // ZIP
  'zip code': 'zipCode',
  'zip_code': 'zipCode',
  'zipcode': 'zipCode',
  'zip': 'zipCode',
  'postal code': 'zipCode',

  // Coordinates
  'latitude': 'latitude',
  'lat': 'latitude',
  'longitude': 'longitude',
  'lon': 'longitude',
  'lng': 'longitude',

  // Dates
  'start date': 'startDate',
  'start_date': 'startDate',
  'startdate': 'startDate',
  'end date': 'endDate',
  'end_date': 'endDate',
  'enddate': 'endDate',

  // Times
  'start time': 'startTime',
  'start_time': 'startTime',
  'starttime': 'startTime',
  'end time': 'endTime',
  'end_time': 'endTime',
  'endtime': 'endTime',

  // Timezone
  'timezone': 'timezone',
  'time zone': 'timezone',
  'tz': 'timezone',

  // Request Method
  'request method': 'requestMethod',
  'request_method': 'requestMethod',
  'requestmethod': 'requestMethod',

  // Requestor
  'requestor name': 'requestorName',
  'requestor_name': 'requestorName',
  'requestorname': 'requestorName',
  'requestor phone': 'requestorPhone',
  'requestor_phone': 'requestorPhone',
  'requestorphone': 'requestorPhone',
  'requestor email': 'requestorEmail',
  'requestor_email': 'requestorEmail',
  'requestoremail': 'requestorEmail',

  // PO Number
  'po number': 'poNumber',
  'po_number': 'poNumber',
  'ponumber': 'poNumber',
  'po #': 'poNumber',
  'po': 'poNumber',

  // Pre-Event Instructions
  'pre-event instructions': 'preEventInstructions',
  'pre event instructions': 'preEventInstructions',
  'preevent instructions': 'preEventInstructions',
  'pre_event_instructions': 'preEventInstructions',

  // Meeting Point
  'meeting point': 'meetingPoint',
  'meeting_point': 'meetingPoint',
  'meetingpoint': 'meetingPoint',

  // Onsite POC
  'onsite poc name': 'onsitePocName',
  'onsite_poc_name': 'onsitePocName',
  'onsitepocname': 'onsitePocName',
  'poc name': 'onsitePocName',
  'onsite poc phone': 'onsitePocPhone',
  'onsite_poc_phone': 'onsitePocPhone',
  'onsitepocphone': 'onsitePocPhone',
  'poc phone': 'onsitePocPhone',
  'onsite poc email': 'onsitePocEmail',
  'onsite_poc_email': 'onsitePocEmail',
  'onsitepocemail': 'onsitePocEmail',
  'poc email': 'onsitePocEmail',

  // JSON fields
  'file links': 'fileLinks',
  'file_links': 'fileLinks',
  'filelinks': 'fileLinks',
  'event documents': 'eventDocuments',
  'event_documents': 'eventDocuments',
  'eventdocuments': 'eventDocuments',
};

/**
 * Parse an import file (CSV or Excel)
 */
export async function parseImportFile(file: File): Promise<ParseResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { success: false, headers: [], rows: [], error: 'No sheets found in file' };
    }

    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      return { success: false, headers: [], rows: [], error: 'Could not read worksheet' };
    }

    // Convert to JSON with headers - when header: 1, returns array of arrays
    type RowArray = (string | number | null | undefined)[];
    const data = XLSX.utils.sheet_to_json<RowArray>(worksheet, { header: 1, defval: '' });

    if (data.length === 0) {
      return { success: false, headers: [], rows: [], error: 'File is empty' };
    }

    // First row is headers
    const headerRow = data[0];
    if (!headerRow) {
      return { success: false, headers: [], rows: [], error: 'File is empty' };
    }
    const headers = headerRow.map((h) => String(h ?? '').trim());

    // Rest are data rows
    const rows: ParsedRow[] = [];
    for (let i = 1; i < data.length; i++) {
      const rowData = data[i];

      // Skip empty rows
      if (!rowData || rowData.every((cell) => cell === '' || cell === null || cell === undefined)) {
        continue;
      }

      const row: ParsedRow = {};
      headers.forEach((header, colIndex) => {
        row[header] = rowData[colIndex];
      });
      rows.push(row);
    }

    return { success: true, headers, rows };
  } catch (error) {
    console.error('Failed to parse import file:', error);
    return {
      success: false,
      headers: [],
      rows: [],
      error: error instanceof Error ? error.message : 'Failed to parse file',
    };
  }
}

/**
 * Auto-detect column mappings based on header names
 */
export function autoDetectColumnMapping(headers: string[]): ColumnMapping[] {
  return headers.map((header) => {
    const normalized = header.toLowerCase().trim();
    const targetField = COLUMN_NAME_MAP[normalized] || 'skip';
    return { sourceColumn: header, targetField };
  });
}

/**
 * Apply column mapping to parsed rows
 */
export function applyColumnMapping(rows: ParsedRow[], mapping: ColumnMapping[]): ParsedRow[] {
  return rows.map((row) => {
    const mapped: ParsedRow = {};
    for (const { sourceColumn, targetField } of mapping) {
      if (targetField !== 'skip' && row[sourceColumn] !== undefined) {
        mapped[targetField] = row[sourceColumn];
      }
    }
    return mapped;
  });
}

/**
 * Validate a single row
 */
export function validateRow(
  row: ParsedRow,
  rowIndex: number,
  clientMap: Map<string, string>
): RowValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required field
  if (!row.name || String(row.name).trim() === '') {
    errors.push('Template name is required');
    return { rowIndex, valid: false, errors, warnings, data: null };
  }

  // Parse row with Zod schema
  try {
    const result = importTemplateRowSchema.safeParse(row);

    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push(`${issue.path.join('.')}: ${issue.message}`);
      }
      return { rowIndex, valid: false, errors, warnings, data: null };
    }

    const data = result.data;

    // Check client matching
    if (data.clientName) {
      const clientId = clientMap.get(data.clientName.toLowerCase());
      if (!clientId) {
        warnings.push(`Client "${data.clientName}" not found`);
      }
    }

    return { rowIndex, valid: true, errors, warnings, data };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Validation failed');
    return { rowIndex, valid: false, errors, warnings, data: null };
  }
}

/**
 * Convert null to undefined helper
 */
function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

/**
 * Convert validated row to CreateEventTemplateInput
 */
export function mapRowToCreateInput(
  row: ImportTemplateRow,
  clientMap: Map<string, string>
): CreateEventTemplateInput {
  // Look up client ID
  let clientId: string | undefined = undefined;
  if (row.clientName) {
    clientId = clientMap.get(row.clientName.toLowerCase());
  }

  return {
    name: row.name,
    description: nullToUndefined(row.description),
    title: nullToUndefined(row.title),
    eventDescription: nullToUndefined(row.eventDescription),
    requirements: nullToUndefined(row.requirements),
    privateComments: nullToUndefined(row.privateComments),
    clientId: clientId || undefined,
    venueName: nullToUndefined(row.venueName),
    address: nullToUndefined(row.address),
    addressLine2: undefined,
    city: nullToUndefined(row.city),
    state: nullToUndefined(row.state),
    zipCode: nullToUndefined(row.zipCode),
    latitude: nullToUndefined(row.latitude),
    longitude: nullToUndefined(row.longitude),
    startDate: nullToUndefined(row.startDate),
    endDate: nullToUndefined(row.endDate),
    startTime: nullToUndefined(row.startTime),
    endTime: nullToUndefined(row.endTime),
    timezone: nullToUndefined(row.timezone),
    requestMethod: nullToUndefined(row.requestMethod) as RequestMethod | undefined,
    requestorName: nullToUndefined(row.requestorName),
    requestorPhone: nullToUndefined(row.requestorPhone),
    requestorEmail: nullToUndefined(row.requestorEmail),
    poNumber: nullToUndefined(row.poNumber),
    preEventInstructions: nullToUndefined(row.preEventInstructions),
    meetingPoint: nullToUndefined(row.meetingPoint),
    onsitePocName: nullToUndefined(row.onsitePocName),
    onsitePocPhone: nullToUndefined(row.onsitePocPhone),
    onsitePocEmail: nullToUndefined(row.onsitePocEmail),
    fileLinks: nullToUndefined(row.fileLinks) as Array<{ name: string; link: string }> | undefined,
    eventDocuments: nullToUndefined(row.eventDocuments) as Array<{ name: string; url: string; type?: string; size?: number }> | undefined,
  };
}
