'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import type { ClientGroup } from './types';

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
                            <th className="px-4 py-3 font-semibold text-foreground">Client Name</th>
                            <th className="px-4 py-3 font-semibold text-foreground text-center">Open Tasks</th>
                            <th className="px-4 py-3 font-semibold text-foreground text-center">Completed</th>
                            <th className="px-4 py-3 font-semibold text-foreground">Date Range</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                        {clientGroups.map((group) => {
                            let minDate: Date | null = null;
                            let maxDate: Date | null = null;
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

                            return (
                                <tr key={group.clientId} className="hover:bg-muted/30 transition-colors">
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
                                    <td className="px-4 py-4 text-center">
                                        <Badge variant={completedCount === group.callTimes.length ? 'success' : 'outline'}>
                                            {completedCount} / {group.callTimes.length}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-4 text-muted-foreground whitespace-nowrap text-xs">
                                        {minDate ? formatDate(minDate) : 'TBD'} 
                                        {maxDate && minDate?.getTime() !== maxDate.getTime() ? ` - ${formatDate(maxDate)}` : ''}
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
