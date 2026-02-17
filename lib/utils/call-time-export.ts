/**
 * Call Time Export Utilities
 *
 * Provides functions for exporting call-time / Time Manager data to CSV and Excel formats.
 * Mirrors the pattern established in event-export.ts
 */

import { format } from 'date-fns';
import { generateCSV, downloadCSVFile, generateExportFilename } from './csv-export';
import { generateExcel, downloadExcelFile } from './excel-export';
import type { RateType } from '@prisma/client';
import { RATE_TYPE_LABELS } from '@/lib/schemas/call-time.schema';

/* ──────────────────────────── Types ──────────────────────────── */

/**
 * Call time data structure for export
 */
export interface CallTimeExport {
    id: string;
    callTimeId: string;
    startDate: Date | string | null;
    startTime: string | null;
    endDate: Date | string | null;
    endTime: string | null;
    numberOfStaffRequired: number;
    skillLevel: string;
    payRate: number | { toNumber?: () => number } | string;
    payRateType: string;
    billRate: number | { toNumber?: () => number } | string;
    billRateType: string;
    notes: string | null;
    confirmedCount: number;
    needsStaff: boolean;
    service: { id: string; title: string } | null;
    event: {
        id: string;
        eventId: string;
        title: string;
        venueName: string | null;
        city: string | null;
        state: string | null;
        poNumber: string | null;
        startDate: Date | string | null;
        startTime: string | null;
        endDate: Date | string | null;
        endTime: string | null;
        client: { id: string; businessName: string } | null;
    };
    invitations: Array<{
        id: string;
        status: string;
        isConfirmed: boolean;
        staff: { id: string; firstName: string; lastName: string };
    }>;
}

/* ──────────────────────────── Headers ──────────────────────────── */

/**
 * Export column headers (19 columns)
 */
export const CALL_TIME_EXPORT_HEADERS = [
    'Event Title',
    'Event ID',
    'Dept/Position',
    'PO',
    'Client',
    'Start Date',
    'End Date',
    'Start Time',
    'End Time',
    'Pay Rate',
    'Bill Rate',
    'Skill Level',
    'Staff Required',
    'Staff Confirmed',
    'Staffing Status',
    'Venue',
    'City',
    'State',
    'Notes',
];

/**
 * Column indices for Excel formatting (0-indexed)
 */
const DATE_COLUMNS = [5, 6]; // Start Date, End Date
const NUMBER_COLUMNS = [12, 13]; // Staff Required, Staff Confirmed

/* ──────────────────────────── Helpers ──────────────────────────── */

const SKILL_LABELS: Record<string, string> = {
    BEGINNER: 'Beginner',
    INTERMEDIATE: 'Intermediate',
    ADVANCED: 'Advanced',
};

/**
 * Safely converts Prisma Decimal / string / number to a plain number
 */
function toNumber(val: number | { toNumber?: () => number } | string | null): number {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return parseFloat(val) || 0;
    if (typeof val === 'object' && 'toNumber' in val && val.toNumber) return val.toNumber();
    return 0;
}

/**
 * Formats a date for export (YYYY-MM-DD for import compatibility)
 */
function formatDate(date: Date | string | null | undefined): string {
    if (!date) return '';
    try {
        const d = typeof date === 'string' ? new Date(date) : date;
        return format(d, 'yyyy-MM-dd');
    } catch {
        return '';
    }
}

/**
 * Formats a rate value with its type label
 */
function formatRate(rate: CallTimeExport['payRate'], rateType: string): string {
    const num = toNumber(rate);
    if (!num) return '';
    const label = RATE_TYPE_LABELS[rateType as RateType] || rateType;
    return `$${num.toFixed(2)} ${label}`;
}

/* ──────────────────────── Row Builder ──────────────────────── */

/**
 * Converts a call time record to a flat export row
 */
export function callTimeToExportRow(ct: CallTimeExport): (string | number | null)[] {
    return [
        ct.event.title,
        ct.event.eventId,
        ct.service?.title || '',
        ct.event.poNumber || '',
        ct.event.client?.businessName || '',
        formatDate(ct.startDate),
        formatDate(ct.endDate || ct.event.endDate),
        ct.startTime || '',
        ct.endTime || '',
        formatRate(ct.payRate, ct.payRateType),
        formatRate(ct.billRate, ct.billRateType),
        SKILL_LABELS[ct.skillLevel] || ct.skillLevel,
        ct.numberOfStaffRequired,
        ct.confirmedCount,
        ct.needsStaff ? 'Needs Staff' : 'Fully Staffed',
        ct.event.venueName || '',
        ct.event.city || '',
        ct.event.state || '',
        ct.notes || '',
    ];
}

/* ──────────────────────── CSV Export ──────────────────────── */

/**
 * Exports call times to CSV and triggers download
 * @param callTimes - Array of call times to export
 * @throws Error if export fails
 */
export function exportCallTimesCSV(callTimes: CallTimeExport[]): void {
    try {
        if (callTimes.length === 0) {
            throw new Error('No data to export');
        }

        const rows = callTimes.map(callTimeToExportRow);
        const csvContent = generateCSV(CALL_TIME_EXPORT_HEADERS, rows);
        const filename = generateExportFilename('time-manager');
        downloadCSVFile(csvContent, filename);
    } catch (error) {
        console.error('Failed to export call times to CSV:', error);
        throw error;
    }
}

/* ──────────────────────── Excel Export ──────────────────────── */

/**
 * Exports call times to Excel and triggers download
 * @param callTimes - Array of call times to export
 * @throws Error if export fails
 */
export function exportCallTimesExcel(callTimes: CallTimeExport[]): void {
    try {
        if (callTimes.length === 0) {
            throw new Error('No data to export');
        }

        const rows = callTimes.map(callTimeToExportRow);
        const workbook = generateExcel(CALL_TIME_EXPORT_HEADERS, rows, {
            sheetName: 'Time Manager',
            dateColumns: DATE_COLUMNS,
            numberColumns: NUMBER_COLUMNS,
            freezeHeader: true,
            autoSizeColumns: true,
        });

        const filename = generateExportFilename('time-manager', 'xlsx');
        downloadExcelFile(workbook, filename);
    } catch (error) {
        console.error('Failed to export call times to Excel:', error);
        throw error;
    }
}
