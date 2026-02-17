import { format, parseISO } from 'date-fns';
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

export function toNumber(val: number | { toNumber?: () => number } | string | null): number {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return parseFloat(val) || 0;
    if (typeof val === 'object' && 'toNumber' in val && val.toNumber) return val.toNumber();
    return 0;
}

export function formatRate(rate: CallTimeRow['payRate'], rateType: string): string {
    const num = toNumber(rate);
    if (!num) return '—';
    const label = RATE_TYPE_LABELS[rateType as RateType] || rateType;
    return `$${num.toFixed(2)} ${label}`;
}

export function getAcceptedStaff(invitations: CallTimeRow['invitations']) {
    return invitations.filter((inv) => inv.status === 'ACCEPTED');
}
