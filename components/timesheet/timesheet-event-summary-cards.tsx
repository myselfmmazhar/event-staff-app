'use client';

import { useMemo } from 'react';
import type { CallTimeRow } from './types';
import { calcTotalBill, calcTotalInvoice, fmtCurrency } from './helpers';

type TimesheetEventSummaryCardsProps = {
    rows: CallTimeRow[];
    subTab?: string;
};

export function TimesheetEventSummaryCards({ rows, subTab }: TimesheetEventSummaryCardsProps) {
    const { totalInvoice, totalBill, approvedShifts, openShifts } = useMemo(() => {
        let inv = 0;
        let bill = 0;
        let approved = 0;
        let open = 0;
        for (const ct of rows) {
            const te = ct.timeEntry;
            const commission = !!ct.commission;
            const min = !!ct.applyMinimum;
            inv += calcTotalInvoice(te, ct, commission, 'ACTUAL', min);
            bill += calcTotalBill(te, ct, commission, 'ACTUAL', min);

            const rating = ct.invitations?.[0]?.internalReviewRating ?? null;
            if (rating === 'MET_EXPECTATIONS') approved += 1;
            if (!ct.staff || ct.needsStaff) open += 1;
        }
        return { totalInvoice: inv, totalBill: bill, approvedShifts: approved, openShifts: open };
    }, [rows]);

    const net = totalInvoice - totalBill;

    const isInvoice = subTab === 'invoice';

    const items = [
        { label: isInvoice ? 'Total Approve Invoice amount' : 'Total Invoice', value: fmtCurrency(totalInvoice) },
        { label: isInvoice ? 'Total Approve Bill amount' : 'Total Bill', value: fmtCurrency(totalBill) },
        { label: isInvoice ? 'Approve Net Income' : 'Net Income', value: fmtCurrency(net) },
        { label: isInvoice ? 'Total Approve Shifts' : 'Total Shifts', value: String(isInvoice ? approvedShifts : openShifts) },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {items.map((item) => (
                <div
                    key={item.label}
                    className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm"
                >
                    <div className="text-xs font-medium text-muted-foreground mb-1.5">{item.label}</div>
                    <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">{item.value}</div>
                </div>
            ))}
        </div>
    );
}