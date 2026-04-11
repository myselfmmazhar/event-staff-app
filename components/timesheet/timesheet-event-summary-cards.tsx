'use client';

import { useMemo } from 'react';
import type { CallTimeRow } from './types';
import { calcTotalBill, calcTotalInvoice, fmtCurrency } from './helpers';

type TimesheetEventSummaryCardsProps = {
    rows: CallTimeRow[];
};

export function TimesheetEventSummaryCards({ rows }: TimesheetEventSummaryCardsProps) {
    const { totalInvoice, totalBill, openShifts } = useMemo(() => {
        let inv = 0;
        let bill = 0;
        let open = 0;
        for (const ct of rows) {
            const te = ct.timeEntry;
            const commission = !!ct.commission;
            const min = !!ct.applyMinimum;
            inv += calcTotalInvoice(te, ct, commission, 'ACTUAL', min);
            bill += calcTotalBill(te, ct, commission, 'ACTUAL', min);
            if (!ct.staff || ct.needsStaff) open += 1;
        }
        return { totalInvoice: inv, totalBill: bill, openShifts: open };
    }, [rows]);

    const net = totalInvoice - totalBill;

    const items = [
        { label: 'Total Invoice', value: fmtCurrency(totalInvoice) },
        { label: 'Total Bill', value: fmtCurrency(totalBill) },
        { label: 'Net Income', value: fmtCurrency(net) },
        { label: 'Open Shifts', value: String(openShifts) },
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
