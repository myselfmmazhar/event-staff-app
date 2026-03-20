'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { format, parseISO } from 'date-fns';
import type { ClientGroup } from './types';
import { 
    calcOvertimeCost, 
    calcOvertimePrice, 
    calcClockedHours, 
    calcScheduledHours, 
    toNumber, 
    fmtCurrency,
    calcTotalBill,
    calcTotalInvoice 
} from './helpers';

interface TimesheetClientSummaryTableProps {
    clientGroups: ClientGroup[];
    onClientClick: (clientId: string) => void;
}

export function TimesheetClientSummaryTable({ clientGroups, onClientClick }: TimesheetClientSummaryTableProps) {
    const formatDate = (date: Date | string | null) => {
        if (!date) return 'TBD';
        const d = typeof date === 'string' ? parseISO(date) : date;
        return format(d, 'MMM d, yyyy');
    };

    return (
        <Card className="overflow-hidden border border-border shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 border-b border-border">
                        <tr>
                            <th className="px-4 py-3 font-semibold text-foreground">Date Range</th>
                            <th className="px-4 py-3 font-semibold text-foreground">Client Name</th>
                            <th className="px-4 py-3 font-semibold text-foreground text-center">Open Tasks</th>
                            <th className="px-4 py-3 font-semibold text-foreground">Status</th>
                            <th className="px-4 py-3 font-semibold text-foreground text-right">Total Bill</th>
                            <th className="px-4 py-3 font-semibold text-foreground text-right">Total Inv</th>
                            <th className="px-4 py-3 font-semibold text-foreground text-right">Profit</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                        {clientGroups.map((group) => {
                            let minDate: any = null;
                            let maxDate: any = null;
                            let completedCount = 0;

                            group.callTimes.forEach(ct => {
                                if (ct.startDate) {
                                    const d = typeof ct.startDate === 'string' ? parseISO(ct.startDate) : ct.startDate;
                                    if (!minDate || d < minDate) minDate = d;
                                    if (!maxDate || d > maxDate) maxDate = d;
                                }
                                if (ct.timeEntry?.clockIn && ct.timeEntry?.clockOut) {
                                    completedCount++;
                                }
                            });

                            const totalBill = group.callTimes.reduce((acc, ct) => acc + calcTotalBill(ct.timeEntry, ct, !!ct.minimum, !!ct.commission), 0);
                            const totalInvoice = group.callTimes.reduce((acc, ct) => acc + calcTotalInvoice(ct.timeEntry, ct, !!ct.minimum, !!ct.commission), 0);
                            const profit = totalInvoice - totalBill;

                            return (
                                <tr key={group.clientId} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-4 py-4 text-muted-foreground whitespace-nowrap text-xs font-medium">
                                        <span className="text-foreground">
                                            {minDate ? formatDate(minDate) : 'TBD'} 
                                            {maxDate && minDate?.getTime() !== maxDate.getTime() ? ` - ${formatDate(maxDate)}` : ''}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4">
                                        <button
                                            onClick={() => onClientClick(group.clientId)}
                                            className="font-medium text-primary hover:underline text-left"
                                        >
                                            {group.clientName}
                                        </button>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <Badge variant="secondary">
                                            {group.callTimes.length}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-4">
                                        {completedCount === group.callTimes.length && group.callTimes.length > 0 ? (
                                            <Badge variant="success" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Completed</Badge>
                                        ) : (
                                            <Badge variant="warning" className="bg-amber-500/10 text-amber-600 border-amber-500/20">In Progress</Badge>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 text-right tabular-nums font-medium text-red-600">
                                        {fmtCurrency(totalBill)}
                                    </td>
                                    <td className="px-4 py-4 text-right tabular-nums font-medium text-emerald-600">
                                        {fmtCurrency(totalInvoice)}
                                    </td>
                                    <td className={`px-4 py-4 text-right tabular-nums font-bold ${profit >= 0 ? 'text-blue-600' : 'text-red-700'}`}>
                                        {fmtCurrency(profit)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}
