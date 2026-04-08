import { format, parseISO, differenceInMinutes } from 'date-fns';
import { RATE_TYPE_LABELS } from '@/lib/schemas/call-time.schema';
import type { RateType } from '@prisma/client';
import type { CallTimeRow } from './types';

/* ──────────────────────────── Helpers ──────────────────────────── */

export function formatDate(date: Date | string | null): string {
    if (!date) return '—';
    try {
        return format(typeof date === 'string' ? parseISO(date) : date, 'MM/dd/yyyy');
    } catch {
        return '—';
    }
}

export function formatTime(time: string | null): string {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    if (h === undefined || m === undefined) return time;
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function formatTimeRange(start: string | null, end: string | null): string {
    if (!start && !end) return '—';
    return `${formatTime(start)} – ${formatTime(end)}`;
}

export function combineDateTime(date: Date | string | null, time: string | null): Date | null {
    if (!date) return null;
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!time) return d;
    const [h, m] = time.split(':').map(Number);
    const result = new Date(d);
    result.setHours(h ?? 0, m ?? 0, 0, 0);
    return result;
}

export function hoursFromMinutes(mins: number): number {
    return Math.round((mins / 60) * 100) / 100;
}

export function calcScheduledHours(ct: CallTimeRow): number {
    if (ct.mergedRows && ct.mergedRows.length > 0) {
        return ct.mergedRows.reduce((sum, row) => sum + calcScheduledHours(row), 0);
    }
    const start = combineDateTime(ct.startDate, ct.startTime);
    const end = combineDateTime(ct.endDate ?? ct.startDate, ct.endTime);
    if (!start || !end || end <= start) return 0;
    const hours = hoursFromMinutes(differenceInMinutes(end, start));
    
    return hours;
}

export function calcClockedHours(timeEntry: CallTimeRow['timeEntry']): number {
    if (!timeEntry?.clockIn || !timeEntry?.clockOut) return 0;
    const ci = new Date(timeEntry.clockIn);
    const co = new Date(timeEntry.clockOut);
    const rawMins = differenceInMinutes(co, ci);
    const breakMins = timeEntry.breakMinutes ?? 0;
    return hoursFromMinutes(Math.max(0, rawMins - breakMins));
}

export function toNumber(val: number | { toNumber?: () => number } | string | null | undefined): number {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return parseFloat(val) || 0;
    if (typeof val === 'object' && 'toNumber' in val && val.toNumber) return val.toNumber();
    return 0;
}

export function calcScheduledCost(ct: CallTimeRow): number {
    if (ct.mergedRows && ct.mergedRows.length > 0) {
        return ct.mergedRows.reduce((sum, row) => sum + calcScheduledCost(row), 0);
    }
    const rate = toNumber(ct.payRate);
    const type = ct.payRateType as RateType;
    const hours = calcScheduledHours(ct); // Already accounts for quantity if unassigned
    let total = type === 'PER_HOUR' ? hours * rate : rate;

    return total;
}


export function calcOvertimeHours(timeEntry: CallTimeRow['timeEntry'], ct: CallTimeRow): number {
    if (!ct.approveOvertime || !timeEntry?.clockIn || !timeEntry?.clockOut) return 0;
    const clocked = calcClockedHours(timeEntry);
    const scheduled = calcScheduledHours(ct);
    return Math.max(0, clocked - scheduled);
}

export function calcOvertimeCost(timeEntry: CallTimeRow['timeEntry'], ct: CallTimeRow): number {
    if (timeEntry?.overtimeCost !== undefined && timeEntry?.overtimeCost !== null) {
        return toNumber(timeEntry.overtimeCost);
    }
    const otHours = calcOvertimeHours(timeEntry, ct);
    if (otHours <= 0) return 0;

    const rate = toNumber(ct.payRate);
    const otRate = toNumber(ct.overtimeRate);
    const otType = ct.overtimeRateType;

    if (otType === 'MULTIPLIER') {
        return otHours * (rate * (otRate || 1.5));
    } else if (otType === 'FIXED') {
        return otHours * otRate;
    }
    return 0;
}

export function calcOvertimePrice(timeEntry: CallTimeRow['timeEntry'], ct: CallTimeRow): number {
    if (timeEntry?.overtimePrice !== undefined && timeEntry?.overtimePrice !== null) {
        return toNumber(timeEntry.overtimePrice);
    }
    const otHours = calcOvertimeHours(timeEntry, ct);
    if (otHours <= 0) return 0;

    const billRate = toNumber(ct.billRate);
    const otRate = toNumber(ct.overtimeRate);
    const otType = ct.overtimeRateType;

    if (otType === 'MULTIPLIER') {
        return otHours * (billRate * (otRate || 1.5));
    } else if (otType === 'FIXED') {
        return otHours * otRate;
    }
    return 0;
}

export function calcBillAmount(ct: CallTimeRow): number {
    if (ct.mergedRows && ct.mergedRows.length > 0) {
        return ct.mergedRows.reduce((sum, row) => sum + calcBillAmount(row), 0);
    }
    const billRate = toNumber(ct.billRate);
    const type = ct.billRateType as RateType;
    const hours = calcScheduledHours(ct); // Already accounts for quantity if unassigned
    let total = type === 'PER_HOUR' ? hours * billRate : billRate;

    return total;
}

export function calcClockedCost(timeEntry: CallTimeRow['timeEntry'], ct: CallTimeRow): number {
    if (timeEntry?.shiftCost !== undefined && timeEntry?.shiftCost !== null) {
        return toNumber(timeEntry.shiftCost);
    }
    const rate = toNumber(ct.payRate);
    const type = ct.payRateType as RateType;
    const hours = calcClockedHours(timeEntry);
    return type === 'PER_HOUR' ? hours * rate : rate;
}

export function calcClockedPrice(timeEntry: CallTimeRow['timeEntry'], ct: CallTimeRow): number {
    if (timeEntry?.shiftPrice !== undefined && timeEntry?.shiftPrice !== null) {
        return toNumber(timeEntry.shiftPrice);
    }
    const rate = toNumber(ct.billRate);
    const type = ct.billRateType as RateType;
    const hours = calcClockedHours(timeEntry);
    return type === 'PER_HOUR' ? hours * rate : rate;
}

export function calcExpenditureCost(ct: CallTimeRow, basis: 'ACTUAL' | 'SCHEDULED' = 'ACTUAL'): number {
    if (ct.timeEntry?.travelCost !== undefined && ct.timeEntry?.travelCost !== null) {
        return toNumber(ct.timeEntry.travelCost);
    }
    if (!ct.expenditure) return 0;
    
    const amt = toNumber(ct.expenditureCost ?? ct.expenditureAmount);
    if (ct.expenditureAmountType === 'MULTIPLIER') {
        const base = basis === 'ACTUAL'
            ? calcClockedCost(ct.timeEntry, ct) + calcOvertimeCost(ct.timeEntry, ct)
            : calcScheduledCost(ct);
        return base * amt;
    }
    return amt;
}

export function calcExpenditurePrice(ct: CallTimeRow, basis: 'ACTUAL' | 'SCHEDULED' = 'ACTUAL'): number {
    if (ct.timeEntry?.travelPrice !== undefined && ct.timeEntry?.travelPrice !== null) {
        return toNumber(ct.timeEntry.travelPrice);
    }
    if (!ct.expenditure) return 0;
    
    const amt = toNumber(ct.expenditurePrice ?? ct.expenditureAmount);
    if (ct.expenditureAmountType === 'MULTIPLIER') {
        const base = basis === 'ACTUAL'
            ? calcClockedPrice(ct.timeEntry, ct) + calcOvertimePrice(ct.timeEntry, ct)
            : calcBillAmount(ct);
        return base * amt;
    }
    return amt;
}

export function calcTotalBill(timeEntry: CallTimeRow['timeEntry'], ct: CallTimeRow, isCommApplied = false, basis: 'ACTUAL' | 'SCHEDULED' = 'ACTUAL'): number {
    if (ct.mergedRows && ct.mergedRows.length > 0) {
        return ct.mergedRows.reduce((sum, row) => sum + calcTotalBill(row.timeEntry, row, isCommApplied, basis), 0);
    }
    const base = basis === 'ACTUAL' ? calcClockedCost(timeEntry, ct) : calcScheduledCost(ct);
    const ot = basis === 'ACTUAL' ? calcOvertimeCost(timeEntry, ct) : 0;
    const exp = calcExpenditureCost(ct, basis);
    let total = base + ot + exp;

    if (isCommApplied && ct.commissionAmount) {
        const comm = toNumber(ct.commissionAmount);
        if (ct.commissionAmountType === 'FIXED') {
            total += comm;
        } else if (ct.commissionAmountType === 'MULTIPLIER') {
            total += total * comm;
        }
    }

    return total;
}

export function calcTotalInvoice(timeEntry: CallTimeRow['timeEntry'], ct: CallTimeRow, isCommApplied = false, basis: 'ACTUAL' | 'SCHEDULED' = 'ACTUAL'): number {
    if (ct.mergedRows && ct.mergedRows.length > 0) {
        return ct.mergedRows.reduce((sum, row) => sum + calcTotalInvoice(row.timeEntry, row, isCommApplied, basis), 0);
    }
    const base = basis === 'ACTUAL' ? calcClockedPrice(timeEntry, ct) : calcBillAmount(ct);
    const ot = basis === 'ACTUAL' ? calcOvertimePrice(timeEntry, ct) : 0;
    const exp = calcExpenditurePrice(ct, basis);
    let total = base + ot + exp;

    if (isCommApplied && ct.commissionAmount) {
        const comm = toNumber(ct.commissionAmount);
        if (ct.commissionAmountType === 'FIXED') {
            total += comm;
        } else if (ct.commissionAmountType === 'MULTIPLIER') {
            total += total * comm;
        }
    }

    return total;
}

export function calcGrossProfit(timeEntry: CallTimeRow['timeEntry'], ct: CallTimeRow): number {
    const bill = calcTotalBill(timeEntry, ct);
    const invoice = calcTotalInvoice(timeEntry, ct);
    return invoice - bill;
}

export function formatRate(rate: CallTimeRow['payRate'], rateType: string): string {
    const num = toNumber(rate);
    if (!num) return '—';
    const label = RATE_TYPE_LABELS[rateType as RateType] || rateType;
    return `$${num.toFixed(2)} ${label}`;
}

export function fmtCurrency(n: number) {
    return `$${n.toFixed(2)}`;
}

export function fmtDateTime(d: Date | string | null): string {
    if (!d) return '—';
    try {
        return format(typeof d === 'string' ? parseISO(d) : d, 'MMM d, h:mm a');
    } catch {
        return '—';
    }
}

export function getTimeOnly(d: Date | string | null): string | null {
    if (!d) return null;
    try {
        const date = typeof d === 'string' ? parseISO(d) : d;
        return format(date, 'HH:mm');
    } catch {
        return null;
    }
}

export function toInputDatetime(d: Date | string | null): string {
    if (!d) return '';
    try {
        return format(typeof d === 'string' ? parseISO(d) : d, "yyyy-MM-dd'T'HH:mm");
    } catch {
        return '';
    }
}

export function getAcceptedStaff(invitations: CallTimeRow['invitations']) {
    return invitations.filter((inv) => inv.status === 'ACCEPTED');
}
