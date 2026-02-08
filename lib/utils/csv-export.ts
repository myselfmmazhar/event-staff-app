/**
 * Generic CSV Export Utilities
 *
 * Reusable functions for generating and downloading CSV files from data.
 * Handles proper CSV escaping and browser download triggering.
 */

/**
 * Escapes a CSV field value according to RFC 4180
 * - Wraps in quotes if contains: comma, quote, or newline
 * - Escapes quotes by doubling them
 * - Handles null/undefined as empty string
 */
export function escapeCSVField(field: string | number | null | undefined): string {
  // Handle null/undefined
  if (field === null || field === undefined) {
    return '';
  }

  // Convert to string
  const value = String(field);

  // Check if field needs to be quoted
  const needsQuotes = value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r');

  if (needsQuotes) {
    // Escape quotes by doubling them
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return value;
}

/**
 * Generates CSV content from data rows
 * @param headers - Array of column headers
 * @param rows - Array of data rows (each row is an array of values)
 * @returns CSV content as string
 */
export function generateCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
  // Create header row
  const headerRow = headers.map(escapeCSVField).join(',');

  // Create data rows
  const dataRows = rows.map(row =>
    row.map(escapeCSVField).join(',')
  );

  // Combine header and data rows
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Triggers browser download of CSV file
 * @param content - CSV content string
 * @param filename - Desired filename (should end with .csv)
 */
export function downloadCSVFile(content: string, filename: string): void {
  try {
    // Create blob with UTF-8 BOM for proper Excel encoding
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });

    // Create temporary download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up object URL
    setTimeout(() => URL.revokeObjectURL(url), 100);
  } catch (error) {
    console.error('Failed to download CSV:', error);
    throw new Error('Failed to download CSV file');
  }
}

/**
 * Generates a timestamped filename for exports
 * @param prefix - Filename prefix (e.g., 'upcoming-events')
 * @param extension - File extension (default: 'csv')
 * @returns Filename with current date (e.g., 'upcoming-events-2024-11-28.csv')
 */
export function generateExportFilename(prefix: string, extension: string = 'csv'): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${prefix}-${year}-${month}-${day}.${extension}`;
}
