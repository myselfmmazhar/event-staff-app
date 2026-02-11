/**
 * Event Import Utilities
 *
 * Provides functions for parsing and validating imported event data
 * from CSV and Excel files.
 */

import * as XLSX from 'xlsx';
import { importEventRowSchema, type ImportEventRow } from '@/lib/schemas/event-import.schema';
import type { CreateEventInput } from '@/lib/schemas/event.schema';
import type { RequestMethod, EventStatus } from '@prisma/client';

/**
 * Column mapping interface
 */
export interface ColumnMapping {
  sourceColumn: string;
  targetField: string; // Event field name or 'skip'
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
  data: ImportEventRow | null;
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
 * Available event fields for column mapping
 * Grouped for better UI organization
 */
export const EVENT_FIELDS = [
  { value: 'skip', label: 'Skip (do not import)', group: 'Other' },
  // Event ID (for upsert matching)
  { value: 'eventId', label: 'Event ID (for updates)', group: 'Other' },
  // Required fields
  { value: 'title', label: 'Title *', required: true, group: 'Required' },
  { value: 'venueName', label: 'Venue Name *', required: true, group: 'Required' },
  { value: 'address', label: 'Address *', required: true, group: 'Required' },
  { value: 'city', label: 'City *', required: true, group: 'Required' },
  { value: 'state', label: 'State *', required: true, group: 'Required' },
  { value: 'zipCode', label: 'ZIP Code *', required: true, group: 'Required' },
  { value: 'startDate', label: 'Start Date *', required: true, group: 'Required' },
  { value: 'endDate', label: 'End Date *', required: true, group: 'Required' },
  { value: 'timezone', label: 'Timezone *', required: true, group: 'Required' },
  // Event Info
  { value: 'description', label: 'Description', group: 'Event Info' },
  { value: 'status', label: 'Status', group: 'Event Info' },
  { value: 'requirements', label: 'Requirements', group: 'Event Info' },
  { value: 'privateComments', label: 'Private Comments', group: 'Event Info' },
  // Client & Venue
  { value: 'clientName', label: 'Client', group: 'Client & Venue' },
  { value: 'latitude', label: 'Latitude', group: 'Client & Venue' },
  { value: 'longitude', label: 'Longitude', group: 'Client & Venue' },
  // Date & Time
  { value: 'startTime', label: 'Start Time', group: 'Date & Time' },
  { value: 'endTime', label: 'End Time', group: 'Date & Time' },
  // Request Info
  { value: 'requestMethod', label: 'Request Method', group: 'Request Info' },
  { value: 'requestorName', label: 'Requestor Name', group: 'Request Info' },
  { value: 'requestorPhone', label: 'Requestor Phone', group: 'Request Info' },
  { value: 'requestorEmail', label: 'Requestor Email', group: 'Request Info' },
  { value: 'poNumber', label: 'PO Number', group: 'Request Info' },
  // Onsite Contact
  { value: 'preEventInstructions', label: 'Pre-Event Instructions', group: 'Onsite Contact' },
  { value: 'meetingPoint', label: 'Meeting Point', group: 'Onsite Contact' },
  { value: 'onsitePocName', label: 'Onsite POC Name', group: 'Onsite Contact' },
  { value: 'onsitePocPhone', label: 'Onsite POC Phone', group: 'Onsite Contact' },
  { value: 'onsitePocEmail', label: 'Onsite POC Email', group: 'Onsite Contact' },
  // JSON fields
  { value: 'fileLinks', label: 'File Links (JSON)', group: 'Other' },
  { value: 'eventDocuments', label: 'Event Documents (JSON)', group: 'Other' },
  { value: 'customFields', label: 'Custom Fields (JSON)', group: 'Other' },
];

/**
 * Common column name variations for auto-detection
 */
const COLUMN_NAME_MAP: Record<string, string> = {
  // Event ID (used for upsert matching)
  'event id': 'eventId',
  'event_id': 'eventId',
  'eventid': 'eventId',
  'id': 'eventId',

  // Title
  'title': 'title',
  'event title': 'title',
  'event_title': 'title',
  'eventtitle': 'title',
  'name': 'title',
  'event name': 'title',

  // Description
  'description': 'description',
  'event description': 'description',
  'event_description': 'description',
  'eventdescription': 'description',

  // Status
  'status': 'status',
  'event status': 'status',

  // Requirements
  'requirements': 'requirements',
  'dress code': 'requirements',
  'dresscode': 'requirements',

  // Private Comments
  'private comments': 'privateComments',
  'private_comments': 'privateComments',
  'privatecomments': 'privateComments',
  'internal notes': 'privateComments',
  'notes': 'privateComments',

  // Client
  'client': 'clientName',
  'client name': 'clientName',
  'client_name': 'clientName',
  'clientname': 'clientName',
  'business name': 'clientName',

  // Venue
  'venue name': 'venueName',
  'venue_name': 'venueName',
  'venuename': 'venueName',
  'venue': 'venueName',
  'location': 'venueName',

  // Address
  'address': 'address',
  'street address': 'address',
  'street': 'address',

  // City
  'city': 'city',

  // State
  'state': 'state',
  'province': 'state',

  // ZIP
  'zip code': 'zipCode',
  'zip_code': 'zipCode',
  'zipcode': 'zipCode',
  'zip': 'zipCode',
  'postal code': 'zipCode',
  'postal_code': 'zipCode',

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
  'event date': 'startDate',
  'date': 'startDate',
  'end date': 'endDate',
  'end_date': 'endDate',
  'enddate': 'endDate',

  // Times
  'start time': 'startTime',
  'start_time': 'startTime',
  'starttime': 'startTime',
  'time': 'startTime',
  'end time': 'endTime',
  'end_time': 'endTime',
  'endtime': 'endTime',

  // Timezone
  'timezone': 'timezone',
  'time zone': 'timezone',
  'time_zone': 'timezone',
  'tz': 'timezone',

  // Request Method
  'request method': 'requestMethod',
  'request_method': 'requestMethod',
  'requestmethod': 'requestMethod',

  // Requestor
  'requestor name': 'requestorName',
  'requestor_name': 'requestorName',
  'requestorname': 'requestorName',
  'requester name': 'requestorName',
  'requestor phone': 'requestorPhone',
  'requestor_phone': 'requestorPhone',
  'requestorphone': 'requestorPhone',
  'requester phone': 'requestorPhone',
  'requestor email': 'requestorEmail',
  'requestor_email': 'requestorEmail',
  'requestoremail': 'requestorEmail',
  'requester email': 'requestorEmail',

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
  'instructions': 'preEventInstructions',

  // Meeting Point
  'meeting point': 'meetingPoint',
  'meeting_point': 'meetingPoint',
  'meetingpoint': 'meetingPoint',

  // Onsite POC
  'onsite poc name': 'onsitePocName',
  'onsite_poc_name': 'onsitePocName',
  'onsitepocname': 'onsitePocName',
  'poc name': 'onsitePocName',
  'contact name': 'onsitePocName',
  'onsite poc phone': 'onsitePocPhone',
  'onsite_poc_phone': 'onsitePocPhone',
  'onsitepocphone': 'onsitePocPhone',
  'poc phone': 'onsitePocPhone',
  'contact phone': 'onsitePocPhone',
  'onsite poc email': 'onsitePocEmail',
  'onsite_poc_email': 'onsitePocEmail',
  'onsitepocemail': 'onsitePocEmail',
  'poc email': 'onsitePocEmail',
  'contact email': 'onsitePocEmail',

  // JSON fields
  'file links': 'fileLinks',
  'file_links': 'fileLinks',
  'filelinks': 'fileLinks',
  'event documents': 'eventDocuments',
  'event_documents': 'eventDocuments',
  'eventdocuments': 'eventDocuments',
  'documents': 'eventDocuments',
  // Custom fields
  'custom fields': 'customFields',
  'custom_fields': 'customFields',
  'customfields': 'customFields',

  // Created At (skip - read-only)
  'created at': 'skip',
  'created_at': 'skip',
  'createdat': 'skip',
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

    // Convert to JSON with headers
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

  // Check required fields before parsing
  const requiredFields = ['title', 'venueName', 'address', 'city', 'state', 'zipCode', 'startDate', 'endDate', 'timezone'];
  for (const field of requiredFields) {
    if (!row[field] || String(row[field]).trim() === '') {
      errors.push(`${field} is required`);
    }
  }

  if (errors.length > 0) {
    return { rowIndex, valid: false, errors, warnings, data: null };
  }

  // Parse row with Zod schema
  try {
    const result = importEventRowSchema.safeParse(row);

    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push(`${issue.path.join('.')}: ${issue.message}`);
      }
      return { rowIndex, valid: false, errors, warnings, data: null };
    }

    const data = result.data;

    // Validate end date is not before start date
    if (data.endDate < data.startDate) {
      errors.push('End date cannot be before start date');
      return { rowIndex, valid: false, errors, warnings, data: null };
    }

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
 * Event import input (extends CreateEventInput with optional eventId for upsert matching)
 */
export type EventImportInput = CreateEventInput & {
  eventId?: string | null;
};

/**
 * Convert validated row to EventImportInput
 */
export function mapRowToCreateInput(
  row: ImportEventRow,
  clientMap: Map<string, string>
): EventImportInput {
  // Look up client ID
  let clientId: string | undefined = undefined;
  if (row.clientName) {
    clientId = clientMap.get(row.clientName.toLowerCase());
  }

  return {
    eventId: nullToUndefined(row.eventId), // Include eventId for upsert matching
    title: row.title,
    description: nullToUndefined(row.description),
    requirements: nullToUndefined(row.requirements),
    privateComments: nullToUndefined(row.privateComments),
    status: row.status as EventStatus,
    clientId: clientId || undefined,
    venueName: row.venueName,
    address: row.address,
    city: row.city,
    state: row.state,
    zipCode: row.zipCode,
    latitude: nullToUndefined(row.latitude),
    longitude: nullToUndefined(row.longitude),
    startDate: row.startDate,
    endDate: row.endDate,
    startTime: nullToUndefined(row.startTime),
    endTime: nullToUndefined(row.endTime),
    timezone: row.timezone,
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
    customFields: nullToUndefined(row.customFields) as Array<{ label: string; value: string }> | undefined,
  };
}
