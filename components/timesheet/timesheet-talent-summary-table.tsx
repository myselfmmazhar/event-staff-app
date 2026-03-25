'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { format, parseISO } from 'date-fns';
import type { TalentGroup } from './types';
import { 
    calcOvertimeCost, 
    calcOvertimePrice, 
    calcClockedHours, 
    calcScheduledHours, 
    toNumber, 
    fmtCurrency,
    calcTotalBill,
    calcTotalInvoice,
    formatTime
} from './helpers';

interface TimesheetTalentSummaryTableProps {
    talentGroups: TalentGroup[];
    onTalentClick: (staffId: string) => void;
}

export function TimesheetTalentSummaryTable({ talentGroups, onTalentClick }: TimesheetTalentSummaryTableProps) {
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
                            <th className="px-4 py-3 font-semibold text-foreground">Date / Time</th>
                            <th className="px-4 py-3 font-semibold text-foreground">Talent Name</th>
                            <th className="px-4 py-3 font-semibold text-foreground text-center">Tasks</th>
                            <th className="px-4 py-3 font-semibold text-foreground">Status</th>
                            <th className="px-4 py-3 font-semibold text-foreground text-right">Total Invoice</th>
                            <th className="px-4 py-3 font-semibold text-foreground text-right">Total Bill</th>
                            <th className="px-4 py-3 font-semibold text-foreground text-right">Net Income</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                        {talentGroups.map((group) => {
                            let completedCount = 0;
                            let minDate: any = null;
                            let maxDate: any = null;
                            const firstRow = group.callTimes[0];

                            for (const ct of group.callTimes) {
                                if (ct.timeEntry?.clockIn && ct.timeEntry?.clockOut) {
                                    completedCount++;
                                }
                                if (ct.startDate) {
                                    const d = typeof ct.startDate === 'string' ? parseISO(ct.startDate) : ct.startDate;
                                    if (!minDate || d < minDate) minDate = d;
                                    if (!maxDate || d > maxDate) maxDate = d;
                                }
                            }

                            const totalBill = group.callTimes.reduce((acc, ct) => acc + calcTotalBill(ct.timeEntry, ct, !!ct.minimum, !!ct.commission), 0);
                            const totalInvoice = group.callTimes.reduce((acc, ct) => acc + calcTotalInvoice(ct.timeEntry, ct, !!ct.minimum, !!ct.commission), 0);
                            const profit = totalInvoice - totalBill;

                            const remaining = group.callTimes.length - completedCount;

                            const min = minDate;
                            const max = maxDate;

                            return (
                                <tr key={group.staffId} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-4 py-4 text-muted-foreground whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-foreground">
                                                {min ? formatDate(min) : 'TBD'}
                                                {firstRow?.startTime && ` ${formatTime(firstRow.startTime)}`}
                                            </span>
                                            {min && max && min.getTime() !== max.getTime() && (
                                                <span className="text-xs">
                                                    to {formatDate(max)}
                                                    {firstRow?.endTime && ` ${formatTime(firstRow.endTime)}`}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <button
                                            onClick={() => onTalentClick(group.staffId)}
                                            className="font-medium text-primary hover:underline text-left pointer-events-auto"
                                        >
                                            {group.staffName}
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
                                    <td className="px-4 py-4 text-right tabular-nums font-medium text-foreground">
                                        {fmtCurrency(totalInvoice)}
                                    </td>
                                    <td className="px-4 py-4 text-right tabular-nums font-medium text-red-600">
                                        {fmtCurrency(totalBill)}
                                    </td>
                                    <td className={`px-4 py-4 text-right tabular-nums font-bold ${profit >= 0 ? 'text-foreground' : 'text-red-600'}`}>
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
