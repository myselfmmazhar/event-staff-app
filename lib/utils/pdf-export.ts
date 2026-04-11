/**
 * Generic PDF Export Utilities
 *
 * Professional PDF generation with clean, business-appropriate styling:
 * - Simple typography hierarchy for readability
 * - Minimal color usage with highlighted section headers
 * - Compact layouts for better information density
 * - Clean, professional appearance suitable for business reports
 */

import type { jsPDF } from 'jspdf';

/**
 * Dynamically import jsPDF to avoid SSR bundling issues with fflate
 */
async function getJsPDF(): Promise<typeof import('jspdf')> {
  return await import('jspdf');
}

/**
 * Simplified professional color palette
 */
const COLORS = {
  // Primary color for headers
  primary: [37, 99, 235] as [number, number, number], // Blue-600
  primaryLight: [239, 246, 255] as [number, number, number], // Blue-50

  // Text colors
  text: [0, 0, 0] as [number, number, number], // Black
  textSecondary: [75, 85, 99] as [number, number, number], // Gray-600
  textLight: [156, 163, 175] as [number, number, number], // Gray-400

  // Borders and backgrounds
  border: [209, 213, 219] as [number, number, number], // Gray-300
  borderLight: [229, 231, 235] as [number, number, number], // Gray-200
  white: [255, 255, 255] as [number, number, number],
};

/**
 * Professional PDF Document class with clean, minimal styling
 */
export class PDFDocument {
  private doc: jsPDF;
  private currentY: number;
  private readonly pageWidth: number;
  private readonly pageHeight: number;
  private readonly marginLeft: number;
  private readonly marginRight: number;
  private readonly marginTop: number;
  private readonly marginBottom: number;
  private readonly contentWidth: number;
  private totalPages: number = 0;
  private currentPage: number = 1;

  private constructor(doc: jsPDF) {
    this.doc = doc;

    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();

    // Modern margins - tighter for more content
    this.marginLeft = 12;
    this.marginRight = 12;
    this.marginTop = 12;
    this.marginBottom = 12;

    this.contentWidth = this.pageWidth - this.marginLeft - this.marginRight;
    this.currentY = this.marginTop;
  }

  static async create(): Promise<PDFDocument> {
    const { jsPDF } = await getJsPDF();
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    return new PDFDocument(doc);
  }

  /**
   * Adds simple professional header with solid color bar
   */
  addDocumentHeader(title: string, includeTimestamp: boolean = true): void {
    // Simple solid color header bar
    const headerHeight = 30;
    this.doc.setFillColor(...COLORS.primary);
    this.doc.rect(0, 0, this.pageWidth, headerHeight, 'F');

    // Title
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...COLORS.white);
    this.doc.text(title, this.marginLeft, 18);

    // Timestamp
    if (includeTimestamp) {
      const timestamp = new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      this.doc.setFontSize(9);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(...COLORS.white);
      const textWidth = this.doc.getTextWidth(`Generated: ${timestamp}`);
      this.doc.text(`Generated: ${timestamp}`, this.pageWidth - this.marginRight - textWidth, 18);
    }

    this.doc.setTextColor(...COLORS.text);
    this.currentY = headerHeight + 10;
  }

  /**
   * Adds simple section header with background highlight
   */
  addSection(title: string): void {
    if (this.currentY > this.pageHeight - this.marginBottom - 40) {
      this.addNewPage();
    }

    // Background highlight for section
    this.doc.setFillColor(...COLORS.primaryLight);
    this.doc.rect(this.marginLeft, this.currentY, this.contentWidth, 8, 'F');

    // Section title
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...COLORS.text);
    this.doc.text(title, this.marginLeft + 2, this.currentY + 5.5);

    this.doc.setTextColor(...COLORS.text);
    this.currentY += 12;
  }

  /**
   * Adds simple field with label-value pair
   */
  addField(label: string, value: string | number, options?: { highlight?: boolean }): void {
    if (this.currentY > this.pageHeight - this.marginBottom - 15) {
      this.addNewPage();
    }

    const lineHeight = 6;
    const startY = this.currentY;

    // Label
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...COLORS.textSecondary);
    this.doc.text(`${label}:`, this.marginLeft + 2, startY + 4);

    // Value
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...COLORS.text);
    const valueText = String(value);

    const labelWidth = this.doc.getTextWidth(`${label}: `) + 4;
    const valueX = this.marginLeft + labelWidth;
    const availableWidth = this.contentWidth - labelWidth;

    const valueLines = this.doc.splitTextToSize(valueText, availableWidth);
    this.doc.text(valueLines, valueX, startY + 4);

    // Light separator line
    this.doc.setDrawColor(...COLORS.borderLight);
    this.doc.setLineWidth(0.2);
    this.doc.line(
      this.marginLeft,
      startY + lineHeight,
      this.pageWidth - this.marginRight,
      startY + lineHeight
    );

    this.currentY += lineHeight + 0.5;
  }

  /**
   * Adds simple bullet list
   */
  addBulletList(items: string[]): void {
    if (items.length === 0) {
      return;
    }

    const startY = this.currentY;

    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...COLORS.text);

    for (const item of items) {
      if (this.currentY > this.pageHeight - this.marginBottom - 10) {
        this.addNewPage();
      }

      // Simple bullet point
      this.doc.setFillColor(...COLORS.text);
      this.doc.circle(this.marginLeft + 4, this.currentY - 0.5, 0.8, 'F');

      // Item text
      const itemX = this.marginLeft + 8;
      const availableWidth = this.contentWidth - 10;
      const itemLines = this.doc.splitTextToSize(item, availableWidth);

      this.doc.text(itemLines, itemX, this.currentY);
      this.currentY += 5;
    }

    this.currentY += 1;
    this.doc.setTextColor(...COLORS.text);
  }

  /**
   * Adds compact stats grid with simple bordered boxes
   */
  addStatsGrid(stats: Array<{ label: string; value: string | number; color?: 'primary' | 'success' | 'warning'; max?: number }>): void {
    const statsPerRow = 4;
    const boxWidth = (this.contentWidth - ((statsPerRow - 1) * 2)) / statsPerRow;
    const boxHeight = 14;

    let currentX = this.marginLeft;
    let rowY = this.currentY;

    stats.forEach((stat, index) => {
      if (index > 0 && index % statsPerRow === 0) {
        currentX = this.marginLeft;
        rowY += boxHeight + 2;

        if (rowY > this.pageHeight - this.marginBottom - 20) {
          this.addNewPage();
          rowY = this.currentY;
        }
      }

      // Simple white box with border
      this.doc.setFillColor(...COLORS.white);
      this.doc.rect(currentX, rowY, boxWidth, boxHeight, 'F');

      // Border
      this.doc.setDrawColor(...COLORS.border);
      this.doc.setLineWidth(0.3);
      this.doc.rect(currentX, rowY, boxWidth, boxHeight, 'S');

      // Label (small, uppercase)
      this.doc.setFontSize(7);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(...COLORS.textSecondary);
      const labelUpper = stat.label.toUpperCase();
      const labelWidth = this.doc.getTextWidth(labelUpper);
      this.doc.text(labelUpper, currentX + boxWidth / 2 - labelWidth / 2, rowY + 5);

      // Value (medium, bold)
      this.doc.setFontSize(14);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(...COLORS.text);
      const valueStr = String(stat.value);
      const valueWidth = this.doc.getTextWidth(valueStr);
      this.doc.text(valueStr, currentX + boxWidth / 2 - valueWidth / 2, rowY + 11);

      currentX += boxWidth + 2;
    });

    this.currentY = rowY + boxHeight + 3;
    this.doc.setTextColor(...COLORS.text);
  }

  /**
   * Adds spacing
   */
  addSpacing(amount: number = 4): void {
    this.currentY += amount;
  }

  /**
   * Adds decorative divider with modern style
   */
  addDivider(): void {
    this.doc.setDrawColor(...COLORS.borderLight);
    this.doc.setLineWidth(0.3);
    this.doc.line(
      this.marginLeft + 30,
      this.currentY,
      this.pageWidth - this.marginRight - 30,
      this.currentY
    );
    this.currentY += 4;
  }

  /**
   * Adds new page
   */
  addNewPage(): void {
    this.doc.addPage();
    this.currentPage++;
    this.currentY = this.marginTop + 8;

    // Continuation indicator
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...COLORS.textLight);
    this.doc.text('Upcoming Events Report', this.marginLeft, this.marginTop);

    // Accent line
    this.doc.setDrawColor(...COLORS.borderLight);
    this.doc.setLineWidth(0.3);
    this.doc.line(this.marginLeft, this.currentY, this.pageWidth - this.marginRight, this.currentY);

    this.doc.setTextColor(...COLORS.text);
    this.currentY = this.marginTop + 12;
  }

  /**
   * Adds simple professional footer
   */
  private addPageFooter(pageNum: number, totalPages: number): void {
    const footerY = this.pageHeight - 7;

    // Simple top line
    this.doc.setDrawColor(...COLORS.borderLight);
    this.doc.setLineWidth(0.3);
    this.doc.line(this.marginLeft, footerY - 4, this.pageWidth - this.marginRight, footerY - 4);

    // Footer content
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...COLORS.textLight);

    // Branding on left
    this.doc.text('Tripod', this.marginLeft, footerY);

    // Simple page number on right
    const pageText = `Page ${pageNum} of ${totalPages}`;
    const pageWidth = this.doc.getTextWidth(pageText);
    this.doc.text(pageText, this.pageWidth - this.marginRight - pageWidth, footerY);

    this.doc.setTextColor(...COLORS.text);
  }

  /**
   * Finalizes PDF
   */
  finalize(totalPages: number): void {
    this.totalPages = totalPages;

    const pageCount = this.doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      this.addPageFooter(i, totalPages);
    }
  }

  getDocument(): jsPDF {
    return this.doc;
  }

  getCurrentY(): number {
    return this.currentY;
  }

  resetY(): void {
    this.currentY = this.marginTop;
  }
}

/**
 * Triggers browser download
 */
export function downloadPDFFile(doc: jsPDF, filename: string): void {
  try {
    doc.save(filename);
  } catch (error) {
    console.error('Failed to download PDF:', error);
    throw new Error('Failed to download PDF file');
  }
}
