'use client';

import { useMemo } from 'react';
import type { CallTimeRow } from './types';
import { calcTotalBill, calcTotalInvoice, fmtCurrency } from './helpers';

type TimesheetEventSummaryCardsProps = {
    rows: CallTimeRow[];
    subTab?: string;
};

export function TimesheetEventSummaryCards({ rows, subTab }: TimesheetEventSummaryCardsProps) {
    const { totalInvoice, totalBill, approvedShifts, totalShifts } = useMemo(() => {
        let inv = 0;
        let bill = 0;
        let approved = 0;
        let shifts = 0;
        for (const ct of rows) {
            const te = ct.timeEntry;
            const commission = !!ct.commission;
            const min = !!ct.applyMinimum;
            inv += calcTotalInvoice(te, ct, commission, 'ACTUAL', min);
            bill += calcTotalBill(te, ct, commission, 'ACTUAL', min);
            shifts += 1;

            const rating = ct.invitations?.[0]?.internalReviewRating ?? null;
            if (rating === 'MET_EXPECTATIONS') approved += 1;
        }
        return { totalInvoice: inv, totalBill: bill, approvedShifts: approved, totalShifts: shifts };
    }, [rows]);

    const net = totalInvoice - totalBill;

    const isInvoice = subTab === 'invoice';
    const isBill = subTab === 'bill';

    const items = isInvoice
        ? [
            { label: 'Total Approve Invoice amount', value: fmtCurrency(totalInvoice) },
            { label: 'Approve Net Income', value: fmtCurrency(net) },
            { label: 'Total Approve Shifts', value: String(approvedShifts) },
        ]
        : isBill
            ? [
                { label: 'Total Approve Bill amount', value: fmtCurrency(totalBill) },
                { label: 'Net Income', value: fmtCurrency(net) },
                { label: 'Total Shifts', value: String(totalShifts) },
            ]
            : [
                { label: 'Total Invoice', value: fmtCurrency(totalInvoice) },
                { label: 'Total Bill', value: fmtCurrency(totalBill) },
                { label: 'Net Income', value: fmtCurrency(net) },
                { label: 'Total Shifts', value: String(totalShifts) },
            ];

    return (
        <div className={`grid grid-cols-2 gap-3 md:gap-4 ${items.length === 4 ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
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