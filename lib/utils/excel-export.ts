/**
 * Generic Excel Export Utilities
 *
 * Reusable functions for generating and downloading Excel files from data.
 * Uses SheetJS (xlsx) library for Excel generation.
 */

import * as XLSX from 'xlsx';

/**
 * Column styling configuration
 */
interface ColumnStyle {
  width?: number;
  format?: string;
}

/**
 * Excel generation options
 */
interface ExcelOptions {
  sheetName?: string;
  dateColumns?: number[];
  numberColumns?: number[];
  freezeHeader?: boolean;
  autoSizeColumns?: boolean;
}

/**
 * Generates an Excel workbook from headers and data rows
 * @param headers - Array of column headers
 * @param rows - Array of data rows (each row is an array of values)
 * @param options - Optional configuration for Excel generation
 * @returns Excel workbook object
 */
export function generateExcel(
  headers: string[],
  rows: (string | number | null | undefined)[][],
  options: ExcelOptions = {}
): XLSX.WorkBook {
  const {
    sheetName = 'Sheet1',
    dateColumns = [],
    numberColumns = [],
    freezeHeader = true,
    autoSizeColumns = true,
  } = options;

  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Convert headers and rows to array-of-arrays format
  const data = [headers, ...rows];

  // Create worksheet from data
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Apply header styling
  styleHeaders(worksheet, headers.length);

  // Freeze header row if requested
  if (freezeHeader) {
    freezeHeaderRow(worksheet);
  }

  // Auto-size columns if requested
  if (autoSizeColumns) {
    autoSizeColumns_(worksheet, data);
  }

  // Format date columns
  if (dateColumns.length > 0) {
    formatDateColumns(worksheet, dateColumns, rows.length);
  }

  // Format number columns
  if (numberColumns.length > 0) {
    formatNumberColumns(worksheet, numberColumns, rows.length);
  }

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  return workbook;
}

/**
 * Applies bold text and gray background to header row
 * @param worksheet - Excel worksheet
 * @param headerCount - Number of header columns
 */
function styleHeaders(worksheet: XLSX.WorkSheet, headerCount: number): void {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

  for (let col = range.s.c; col <= Math.min(range.e.c, headerCount - 1); col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    const cell = worksheet[cellAddress];

    if (cell) {
      // Apply styling
      cell.s = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'F3F4F6' } },
        alignment: { vertical: 'center', horizontal: 'left' },
        border: {
          top: { style: 'thin', color: { rgb: 'D1D5DB' } },
          bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
          left: { style: 'thin', color: { rgb: 'D1D5DB' } },
          right: { style: 'thin', color: { rgb: 'D1D5DB' } },
        },
      };
    }
  }
}

/**
 * Auto-sizes columns based on content
 * @param worksheet - Excel worksheet
 * @param data - Array of arrays containing all data (headers + rows)
 */
type CellValue = string | number | boolean | null | undefined;

function autoSizeColumns_(worksheet: XLSX.WorkSheet, data: CellValue[][]): void {
  const maxWidth = 50; // Maximum column width in characters
  const minWidth = 10; // Minimum column width in characters

  // Calculate max width for each column
  const columnWidths: number[] = [];

  data.forEach((row) => {
    row.forEach((cell, colIndex) => {
      const cellValue = cell != null ? String(cell) : '';
      const cellWidth = cellValue.length;

      if (!columnWidths[colIndex] || cellWidth > columnWidths[colIndex]) {
        columnWidths[colIndex] = Math.min(Math.max(cellWidth, minWidth), maxWidth);
      }
    });
  });

  // Apply column widths
  worksheet['!cols'] = columnWidths.map((width) => ({ wch: width }));
}

/**
 * Freezes the header row for scrolling
 * @param worksheet - Excel worksheet
 */
function freezeHeaderRow(worksheet: XLSX.WorkSheet): void {
  worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };
}

/**
 * Applies Excel date format to specified columns
 * @param worksheet - Excel worksheet
 * @param columnIndices - Array of column indices to format as dates (0-indexed)
 * @param rowCount - Number of data rows (excluding header)
 */
function formatDateColumns(
  worksheet: XLSX.WorkSheet,
  columnIndices: number[],
  rowCount: number
): void {
  const dateFormat = 'mmm d, yyyy'; // Matches formatDate() output

  columnIndices.forEach((colIndex) => {
    for (let row = 1; row <= rowCount; row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: colIndex });
      const cell = worksheet[cellAddress];

      if (cell && cell.v) {
        // Apply date format
        cell.z = dateFormat;
        cell.t = 's'; // Keep as string type since we're already formatting dates
      }
    }
  });
}

/**
 * Applies number format to specified columns
 * @param worksheet - Excel worksheet
 * @param columnIndices - Array of column indices to format as numbers (0-indexed)
 * @param rowCount - Number of data rows (excluding header)
 */
function formatNumberColumns(
  worksheet: XLSX.WorkSheet,
  columnIndices: number[],
  rowCount: number
): void {
  const numberFormat = '#,##0'; // Thousands separator, no decimals

  columnIndices.forEach((colIndex) => {
    for (let row = 1; row <= rowCount; row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: colIndex });
      const cell = worksheet[cellAddress];

      if (cell && typeof cell.v === 'number') {
        // Apply number format
        cell.z = numberFormat;
        cell.t = 'n'; // Number type
      }
    }
  });
}

/**
 * Triggers browser download of Excel file
 * @param workbook - Excel workbook
 * @param filename - Desired filename (should end with .xlsx)
 */
export function downloadExcelFile(workbook: XLSX.WorkBook, filename: string): void {
  try {
    // Generate Excel file buffer
    XLSX.writeFile(workbook, filename, {
      bookType: 'xlsx',
      type: 'binary',
    });
  } catch (error) {
    console.error('Failed to download Excel:', error);
    throw new Error('Failed to download Excel file');
  }
}
