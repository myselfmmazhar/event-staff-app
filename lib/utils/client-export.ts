/**
 * Client Export Utilities
 *
 * Provides functions for exporting clients to CSV and Excel formats.
 * Mirrors the pattern established in event-export.ts
 */

import { format } from 'date-fns';
import { generateCSV, downloadCSVFile, generateExportFilename } from './csv-export';
import { generateExcel, downloadExcelFile } from './excel-export';

/**
 * Client data structure for export
 */
export interface ClientExport {
  id: string;
  clientId: string;
  businessName: string;
  firstName: string;
  lastName: string;
  email: string;
  cellPhone: string;
  businessPhone?: string | null;
  details?: string | null;
  businessAddress?: string | null;
  city: string;
  state: string;
  zipCode: string;
  ccEmail?: string | null;
  billingFirstName?: string | null;
  billingLastName?: string | null;
  billingEmail?: string | null;
  billingPhone?: string | null;
  createdAt: Date;
}

/**
 * Export column headers (18 columns)
 * Excludes: hasLoginAccess, userId, invitationToken, invitationExpiresAt (security/managed fields)
 */
export const CLIENT_EXPORT_HEADERS = [
  'Client ID',
  'Business Name',
  'First Name',
  'Last Name',
  'Email',
  'Cell Phone',
  'Business Phone',
  'Details',
  'Business Address',
  'City',
  'State',
  'ZIP Code',
  'CC Email',
  'Billing First Name',
  'Billing Last Name',
  'Billing Email',
  'Billing Phone',
  'Created At',
];

/**
 * Column indices for Excel formatting (0-indexed)
 */
const DATE_COLUMNS = [17]; // Created At

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
 * Converts a client to an export row
 */
export function clientToExportRow(client: ClientExport): (string | number | null)[] {
  return [
    client.clientId,
    client.businessName,
    client.firstName,
    client.lastName,
    client.email,
    client.cellPhone,
    client.businessPhone || '',
    client.details || '',
    client.businessAddress || '',
    client.city,
    client.state,
    client.zipCode,
    client.ccEmail || '',
    client.billingFirstName || '',
    client.billingLastName || '',
    client.billingEmail || '',
    client.billingPhone || '',
    formatDate(client.createdAt),
  ];
}

/**
 * Exports clients to CSV and triggers download
 * @param clients - Array of clients to export
 * @throws Error if export fails
 */
export function exportClientsCSV(clients: ClientExport[]): void {
  try {
    if (clients.length === 0) {
      throw new Error('No clients to export');
    }

    const rows = clients.map(clientToExportRow);
    const csvContent = generateCSV(CLIENT_EXPORT_HEADERS, rows);
    const filename = generateExportFilename('clients');
    downloadCSVFile(csvContent, filename);
  } catch (error) {
    console.error('Failed to export clients to CSV:', error);
    throw error;
  }
}

/**
 * Exports clients to Excel and triggers download
 * @param clients - Array of clients to export
 * @throws Error if export fails
 */
export function exportClientsExcel(clients: ClientExport[]): void {
  try {
    if (clients.length === 0) {
      throw new Error('No clients to export');
    }

    const rows = clients.map(clientToExportRow);
    const workbook = generateExcel(CLIENT_EXPORT_HEADERS, rows, {
      sheetName: 'Clients',
      dateColumns: DATE_COLUMNS,
      freezeHeader: true,
      autoSizeColumns: true,
    });

    const filename = generateExportFilename('clients', 'xlsx');
    downloadExcelFile(workbook, filename);
  } catch (error) {
    console.error('Failed to export clients to Excel:', error);
    throw error;
  }
}

/**
 * Downloads a sample client import template file
 * @param fileFormat - 'csv' or 'xlsx'
 */
export function downloadSampleClientTemplate(fileFormat: 'csv' | 'xlsx' = 'csv'): void {
  try {
    // Create one example row with placeholder values
    // Client ID is read-only (auto-generated), leave blank for import
    const exampleRow: (string | number | null)[] = [
      '', // Client ID - leave blank, auto-generated
      'Acme Corporation',
      'John',
      'Smith',
      'john.smith@acme.com',
      '555-123-4567',
      '555-123-4568', // Business Phone - optional
      'Premium client, preferred vendor', // Details - optional
      '123 Business Ave, Suite 100', // Business Address - optional
      'New York',
      'NY',
      '10001',
      'accounting@acme.com', // CC Email - optional
      'Jane', // Billing First Name - optional
      'Doe', // Billing Last Name - optional
      'billing@acme.com', // Billing Email - optional
      '555-123-4569', // Billing Phone - optional
      '', // Created At - read-only
    ];

    // Headers for import
    const importHeaders = CLIENT_EXPORT_HEADERS;

    if (fileFormat === 'xlsx') {
      const workbook = generateExcel(importHeaders, [exampleRow], {
        sheetName: 'Clients',
        dateColumns: DATE_COLUMNS,
        freezeHeader: true,
        autoSizeColumns: true,
      });
      downloadExcelFile(workbook, 'client-import-sample.xlsx');
    } else {
      const csvContent = generateCSV(importHeaders, [exampleRow]);
      downloadCSVFile(csvContent, 'client-import-sample.csv');
    }
  } catch (error) {
    console.error('Failed to download sample template:', error);
    throw error;
  }
}
