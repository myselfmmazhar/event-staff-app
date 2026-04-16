'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronDownIcon, ChevronUpIcon, ChevronsUpDownIcon } from '@/components/ui/icons';
import { useTableResize } from '@/hooks/use-table-resize';
import { TableColumnResizeHandle } from '@/components/common/table-column-resize-handle';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import type { ClientGroup, SortField, SortOrder } from './types';
import { TIMESHEET_CLIENT_TABLE_RESIZE_DEFAULTS } from '@/lib/timesheet/drilldown-column-order';
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
    sortBy?: SortField;
    sortOrder?: SortOrder;
    onSort?: (field: SortField) => void;
}

export function TimesheetClientSummaryTable({ clientGroups, onClientClick, sortBy, sortOrder, onSort }: TimesheetClientSummaryTableProps) {
    const { columnWidths, onMouseDown, getTableStyle } = useTableResize('timesheet-clients', TIMESHEET_CLIENT_TABLE_RESIZE_DEFAULTS);
    const formatDate = (date: Date | string | null) => {
        if (!date) return 'TBD';
        const d = typeof date === 'string' ? parseISO(date) : date;
        return format(d, 'MMM d, yyyy');
    };

    return (
        <Card className="overflow-hidden border border-border shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left table-fixed" style={getTableStyle()}>
                    <thead className="bg-muted/50 border-b border-border">
                        <tr>
                            {[
                                { id: 'startDate', label: 'Date Range' },
                                { id: 'client', label: 'Client Name' },
                                { id: 'assignments', label: 'Open Tasks', align: 'text-center' },
                                { id: 'status', label: 'Status' },
                                { id: 'invoice', label: 'Total Invoice', align: 'text-right' },
                                { id: 'bill', label: 'Total Bill', align: 'text-right' },
                                { id: 'netIncome', label: 'Net Income', align: 'text-right' },
                            ].map((col) => (
                                <th
                                    key={col.id}
                                    className={cn(
                                        "relative group px-4 py-3 font-semibold text-foreground cursor-pointer hover:bg-muted transition-colors truncate",
                                        col.align || ''
                                    )}
                                    style={{ width: `var(--col-${col.id})` }}
                                    onClick={() => onSort?.(col.id as SortField)}
                                >
                                    <div className={`flex items-center gap-1 ${col.align === 'text-right' ? 'justify-end' : col.align === 'text-center' ? 'justify-center' : ''}`}>
                                        {col.label}
                                        {sortBy === col.id
                                            ? (sortOrder === 'asc' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />)
                                            : <ChevronsUpDownIcon className="h-4 w-4 opacity-50" />}
                                    </div>
                                    <TableColumnResizeHandle onMouseDown={(e) => onMouseDown(col.id, e)} />
                                </th>
                            ))}
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

                            const totalBill = group.callTimes.reduce((acc, ct) => acc + calcTotalBill(ct.timeEntry, ct, !!ct.commission, 'ACTUAL', !!ct.applyMinimum), 0);
                            const totalInvoice = group.callTimes.reduce((acc, ct) => acc + calcTotalInvoice(ct.timeEntry, ct, !!ct.commission, 'ACTUAL', !!ct.applyMinimum), 0);
                            const profit = totalInvoice - totalBill;

                            return (
                                <tr key={group.clientId} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-4 py-4 text-muted-foreground whitespace-nowrap text-sm font-bold">
                                        <div className="flex flex-col leading-tight">
                                            <span className="text-foreground">
                                                {minDate ? formatDate(minDate) : 'TBD'} 
                                                {maxDate && minDate?.getTime() !== maxDate.getTime() ? ' -' : ''}
                                            </span>
                                            {maxDate && minDate?.getTime() !== maxDate.getTime() && (
                                                <span className="text-foreground">
                                                    {formatDate(maxDate)}
                                                </span>
                                            )}
                                        </div>
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
                                        {group.callTimes.every(ct => ct.event.status === 'COMPLETED') && group.callTimes.length > 0 ? (
                                            <Badge variant="success" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Completed</Badge>
                                        ) : group.callTimes.some(ct => ct.event.status === 'IN_PROGRESS' || (ct.timeEntry?.clockIn && !ct.timeEntry?.clockOut)) ? (
                                            <Badge variant="warning" className="bg-amber-500/10 text-amber-600 border-amber-500/20">In Progress</Badge>
                                        ) : (
                                            <Badge variant="info" className="bg-blue-500/10 text-blue-600 border-blue-500/20">Assigned</Badge>
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
