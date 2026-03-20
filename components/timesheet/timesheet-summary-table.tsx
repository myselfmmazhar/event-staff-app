'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { format, parseISO } from 'date-fns';
import type { EventGroup } from './types';
import { calcOvertimeCost, calcOvertimePrice, calcClockedHours, calcScheduledHours, toNumber, fmtCurrency } from './helpers';

interface TimesheetSummaryTableProps {
    eventGroups: EventGroup[];
    onEventClick: (eventId: string) => void;
}

export function TimesheetSummaryTable({ eventGroups, onEventClick }: TimesheetSummaryTableProps) {
    const formatDate = (date: Date | string | null) => {
        if (!date) return 'TBD';
        const d = typeof date === 'string' ? parseISO(date) : date;
        return format(d, 'MMM d, yyyy (EEE)');
    };

    const formatTime = (time: string | null) => {
        if (!time) return '';
        return time;
    };

    return (
        <Card className="overflow-hidden border border-border shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 border-b border-border">
                        <tr>
                            <th className="px-4 py-3 font-semibold text-foreground">Date / Time</th>
                            <th className="px-4 py-3 font-semibold text-foreground">Task</th>
                            {/* <th className="px-4 py-3 font-semibold text-foreground">Task ID</th> */}
                            <th className="px-4 py-3 font-semibold text-foreground">Client</th>
                            <th className="px-4 py-3 font-semibold text-foreground text-center">Assignments</th>
                            <th className="px-4 py-3 font-semibold text-foreground">Status</th>
                            <th className="px-4 py-3 font-semibold text-foreground text-right">Total Bill</th>
                            <th className="px-4 py-3 font-semibold text-foreground text-right">Total Inv</th>
                            <th className="px-4 py-3 font-semibold text-foreground text-right">Profit</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                        {eventGroups.map((group) => {
                            const firstRow = group.callTimes[0];
                            const event = firstRow?.event;

                            const groupDates = group.callTimes.flatMap((ct) => {
                                if (!ct.startDate) return [];
                                return [typeof ct.startDate === 'string' ? parseISO(ct.startDate) : ct.startDate];
                            });

                            const minDate = groupDates.length > 0
                                ? new Date(Math.min(...groupDates.map((date) => date.getTime())))
                                : null;
                            const maxDate = groupDates.length > 0
                                ? new Date(Math.max(...groupDates.map((date) => date.getTime())))
                                : null;
                            const hasDateRange = !!minDate && !!maxDate && minDate.getTime() !== maxDate.getTime();

                            const totalOvertimeCost = group.callTimes.reduce((acc, ct) => acc + calcOvertimeCost(ct.timeEntry, ct), 0);
                            const totalOvertimePrice = group.callTimes.reduce((acc, ct) => acc + calcOvertimePrice(ct.timeEntry, ct), 0);

                            const totalBill = group.callTimes.reduce((acc, ct) => {
                                const base = ct.payRateType === 'PER_HOUR' ? (ct.timeEntry ? (calcClockedHours(ct.timeEntry) * toNumber(ct.payRate)) : (calcScheduledHours(ct) * toNumber(ct.payRate))) : toNumber(ct.payRate);
                                const ot = calcOvertimeCost(ct.timeEntry, ct);
                                return acc + base + ot;
                            }, 0);

                            const totalInvoice = group.callTimes.reduce((acc, ct) => {
                                const base = ct.billRateType === 'PER_HOUR' ? (ct.timeEntry ? (calcClockedHours(ct.timeEntry) * toNumber(ct.billRate)) : (calcScheduledHours(ct) * toNumber(ct.billRate))) : toNumber(ct.billRate);
                                const ot = calcOvertimePrice(ct.timeEntry, ct);
                                return acc + base + ot;
                            }, 0);

                            const profit = totalInvoice - totalBill;

                            const completedCount = group.callTimes.filter(ct => ct.timeEntry?.clockIn && ct.timeEntry?.clockOut).length;
                            const progress = group.callTimes.length > 0 ? (completedCount / group.callTimes.length) * 100 : 0;



                            return (
                                <tr
                                    key={group.eventId}
                                    className="hover:bg-muted/30 transition-colors"
                                >
                                    <td className="px-4 py-4 text-muted-foreground whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-foreground">
                                                {minDate ? formatDate(minDate) : 'TBD'}
                                                {firstRow?.startTime && ` ${firstRow.startTime}`}
                                            </span>
                                            {maxDate && (minDate?.getTime() !== maxDate.getTime()) && (
                                                <span className="text-xs">
                                                    to {formatDate(maxDate)}
                                                    {firstRow?.endTime && ` ${firstRow.endTime}`}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <button
                                            onClick={() => onEventClick(group.eventId)}
                                            className="font-medium text-primary hover:underline text-left"
                                        >
                                            {group.eventTitle}
                                        </button>
                                    </td>
                                    {/* <td className="px-4 py-4">
                                        <Badge variant="outline" className="font-mono text-xs">
                                            {group.eventDisplayId}
                                        </Badge>
                                    </td> */}
                                    <td className="px-4 py-4 text-muted-foreground">
                                        {event?.client?.businessName || 'No Client'}
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
                                    <td className="px-4 py-4 text-muted-foreground whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span>
                                                {minDate ? formatDate(minDate) : 'TBD'}
                                                {firstRow?.startTime && ` ${firstRow.startTime}`}
                                            </span>
                                            {hasDateRange && maxDate && (
                                                <span className="text-xs">
                                                    to {formatDate(maxDate)}
                                                    {firstRow?.endTime && ` ${firstRow.endTime}`}
                                                </span>
                                            )}
                                        </div>
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
