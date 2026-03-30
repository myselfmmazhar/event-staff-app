'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import type { TalentGroup, SortField, SortOrder } from './types';
import { ChevronDownIcon, ChevronUpIcon } from '@/components/ui/icons';
import { 
    calcTotalBill, 
    calcTotalInvoice, 
    formatTime,
    fmtCurrency
} from './helpers';
import { TalentContactPopover } from './talent-contact-popover';

interface TimesheetTalentSummaryTableProps {
    talentGroups: TalentGroup[];
    onTalentClick: (staffId: string) => void;
    sortBy?: SortField;
    sortOrder?: SortOrder;
    onSort?: (field: SortField) => void;
}

export function TimesheetTalentSummaryTable({ talentGroups, onTalentClick, sortBy, sortOrder, onSort }: TimesheetTalentSummaryTableProps) {
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
                            {[
                                { id: 'startDate', label: 'Date / Time' },
                                { id: 'staffName', label: 'Talent' },
                                { id: 'assignments', label: 'Tasks', align: 'text-center' },
                                { id: 'status', label: 'Status' },
                            ].map((col) => (
                                <th
                                    key={col.id}
                                    className={`px-4 py-3 font-semibold text-foreground cursor-pointer hover:bg-muted transition-colors ${col.align || ''}`}
                                    onClick={() => onSort?.(col.id as SortField)}
                                >
                                    <div className={`flex items-center gap-1 ${col.align === 'text-center' ? 'justify-center' : ''}`}>
                                        {col.label}
                                        {sortBy === col.id && (
                                            sortOrder === 'asc' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />
                                        )}
                                    </div>
                                </th>
                            ))}
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
                                        <TalentContactPopover
                                            talent={firstRow?.staff || { firstName: group.staffName.split(' ')[0], lastName: group.staffName.split(' ')[1] || '' } as any}
                                            trigger={
                                                <button
                                                    className="font-medium text-primary hover:underline text-left pointer-events-auto"
                                                >
                                                    {group.staffName}
                                                </button>
                                            }
                                        />
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
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}
