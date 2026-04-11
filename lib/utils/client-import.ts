/**
 * Client Import Utilities
 *
 * Provides functions for parsing and validating imported client data
 * from CSV and Excel files.
 */

import * as XLSX from 'xlsx';
import { importClientRowSchema, type ImportClientRow } from '@/lib/schemas/client-import.schema';
import type { CreateClientInput } from '@/lib/schemas/client.schema';

/**
 * Column mapping interface
 */
export interface ColumnMapping {
  sourceColumn: string;
  targetField: string; // Client field name or 'skip'
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
  data: ImportClientRow | null;
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
 * Available client fields for column mapping
 * Grouped for better UI organization
 */
export const CLIENT_FIELDS = [
  { value: 'skip', label: 'Skip (do not import)', group: 'Other' },
  // Required fields
  { value: 'businessName', label: 'Business Name *', required: true, group: 'Required' },
  { value: 'firstName', label: 'First Name *', required: true, group: 'Required' },
  { value: 'lastName', label: 'Last Name *', required: true, group: 'Required' },
  { value: 'email', label: 'Email * (used for updates)', required: true, group: 'Required' },
  { value: 'cellPhone', label: 'Cell Phone *', required: true, group: 'Required' },
  { value: 'city', label: 'City *', required: true, group: 'Required' },
  { value: 'state', label: 'State *', required: true, group: 'Required' },
  { value: 'zipCode', label: 'ZIP Code *', required: true, group: 'Required' },
  // Optional fields
  { value: 'businessPhone', label: 'Business Phone', group: 'Optional' },
  { value: 'details', label: 'Details', group: 'Optional' },
  { value: 'businessAddress', label: 'Business Address', group: 'Optional' },
  { value: 'ccEmail', label: 'CC Email', group: 'Optional' },
  { value: 'billingFirstName', label: 'Billing First Name', group: 'Optional' },
  { value: 'billingLastName', label: 'Billing Last Name', group: 'Optional' },
  { value: 'billingEmail', label: 'Billing Email', group: 'Optional' },
  { value: 'billingPhone', label: 'Billing Phone', group: 'Optional' },
];

/**
 * Common column name variations for auto-detection
 */
const COLUMN_NAME_MAP: Record<string, string> = {
  // Client ID (skip - read-only)
  'client id': 'skip',
  'client_id': 'skip',
  'clientid': 'skip',
  'id': 'skip',

  // Business name
  'business name': 'businessName',
  'business_name': 'businessName',
  'businessname': 'businessName',
  'company': 'businessName',
  'company name': 'businessName',
  'company_name': 'businessName',
  'organization': 'businessName',
  'organisation': 'businessName',
  'client': 'businessName',
  'client name': 'businessName',
  'client_name': 'businessName',

  // First name
  'first name': 'firstName',
  'first_name': 'firstName',
  'firstname': 'firstName',
  'first': 'firstName',
  'given name': 'firstName',
  'given_name': 'firstName',
  'contact first name': 'firstName',
  'contact_first_name': 'firstName',

  // Last name
  'last name': 'lastName',
  'last_name': 'lastName',
  'lastname': 'lastName',
  'last': 'lastName',
  'surname': 'lastName',
  'family name': 'lastName',
  'family_name': 'lastName',
  'contact last name': 'lastName',
  'contact_last_name': 'lastName',

  // Email
  'email': 'email',
  'email address': 'email',
  'email_address': 'email',
  'e-mail': 'email',
  'primary email': 'email',
  'primary_email': 'email',
  'contact email': 'email',
  'contact_email': 'email',

  // Cell phone (required)
  'cell phone': 'cellPhone',
  'cell_phone': 'cellPhone',
  'cellphone': 'cellPhone',
  'mobile': 'cellPhone',
  'mobile phone': 'cellPhone',
  'mobile_phone': 'cellPhone',
  'phone': 'cellPhone',
  'phone number': 'cellPhone',
  'phone_number': 'cellPhone',
  'primary phone': 'cellPhone',
  'primary_phone': 'cellPhone',

  // Business phone
  'business phone': 'businessPhone',
  'business_phone': 'businessPhone',
  'office phone': 'businessPhone',
  'office_phone': 'businessPhone',
  'work phone': 'businessPhone',
  'work_phone': 'businessPhone',
  'company phone': 'businessPhone',
  'company_phone': 'businessPhone',

  // Details
  'details': 'details',
  'notes': 'details',
  'note': 'details',
  'description': 'details',
  'comments': 'details',

  // Business address
  'business address': 'businessAddress',
  'business_address': 'businessAddress',
  'address': 'businessAddress',
  'street address': 'businessAddress',
  'street_address': 'businessAddress',
  'street': 'businessAddress',

  // City/state/zip
  'city': 'city',
  'town': 'city',
  'state': 'state',
  'province': 'state',
  'region': 'state',
  'zip code': 'zipCode',
  'zip_code': 'zipCode',
  'zipcode': 'zipCode',
  'zip': 'zipCode',
  'postal code': 'zipCode',
  'postal_code': 'zipCode',
  'postcode': 'zipCode',

  // CC email
  'cc email': 'ccEmail',
  'cc_email': 'ccEmail',
  'ccemail': 'ccEmail',
  'copy email': 'ccEmail',
  'copy_email': 'ccEmail',

  // Billing contact
  'billing first name': 'billingFirstName',
  'billing_first_name': 'billingFirstName',
  'billingfirstname': 'billingFirstName',
  'billing last name': 'billingLastName',
  'billing_last_name': 'billingLastName',
  'billinglastname': 'billingLastName',
  'billing email': 'billingEmail',
  'billing_email': 'billingEmail',
  'billingemail': 'billingEmail',
  'billing phone': 'billingPhone',
  'billing_phone': 'billingPhone',
  'billingphone': 'billingPhone',

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
export function validateRow(row: ParsedRow, rowIndex: number): RowValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields before parsing
  const requiredFields = [
    'businessName',
    'firstName',
    'lastName',
    'email',
    'cellPhone',
    'city',
    'state',
    'zipCode',
  ];

  for (const field of requiredFields) {
    if (!row[field] || String(row[field]).trim() === '') {
      errors.push(`${field} is required`);
    }
  }

  if (errors.length > 0) {
    return { rowIndex, valid: false, errors, warnings, data: null };
  }

  try {
    const result = importClientRowSchema.safeParse(row);

    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push(`${issue.path.join('.')}: ${issue.message}`);
      }
      return { rowIndex, valid: false, errors, warnings, data: null };
    }

    return { rowIndex, valid: true, errors, warnings, data: result.data };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Validation failed');
    return { rowIndex, valid: false, errors, warnings, data: null };
  }
}

/**
 * Convert null to undefined helper
 */
function nullToUndefined<T>(value: T | null | undefined): T | undefined {
  return value === null || value === undefined ? undefined : value;
}

/**
 * Client import input (CreateClientInput without hasLoginAccess)
 */
export type ClientImportInput = Omit<CreateClientInput, 'hasLoginAccess'>;

/**
 * Convert validated row to ClientImportInput
 */
export function mapRowToCreateInput(row: ImportClientRow): ClientImportInput {
  return {
    businessName: row.businessName,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    cellPhone: row.cellPhone,
    city: row.city,
    state: row.state,
    zipCode: row.zipCode,

    businessPhone: nullToUndefined(row.businessPhone),
    details: nullToUndefined(row.details),
    businessAddress: nullToUndefined(row.businessAddress),
    ccEmail: nullToUndefined(row.ccEmail),
    billingFirstName: nullToUndefined(row.billingFirstName),
    billingLastName: nullToUndefined(row.billingLastName),
    billingEmail: nullToUndefined(row.billingEmail),
    billingPhone: nullToUndefined(row.billingPhone),
  };
}
