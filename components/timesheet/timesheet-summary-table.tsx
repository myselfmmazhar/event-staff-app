'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { format, parseISO } from 'date-fns';
import type { EventGroup, SortField, SortOrder } from './types';
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
import { MapPinIcon, UploadIcon, ChevronDownIcon, ChevronUpIcon } from '@/components/ui/icons';
import { useToast } from '@/components/ui/use-toast';

interface TimesheetSummaryTableProps {
    eventGroups: EventGroup[];
    onEventClick: (eventId: string) => void;
    sortBy?: SortField;
    sortOrder?: SortOrder;
    onSort?: (field: SortField) => void;
    subTab?: 'all' | 'bill' | 'invoice' | 'commission';
}

export function TimesheetSummaryTable({ eventGroups, onEventClick, sortBy, sortOrder, onSort, subTab }: TimesheetSummaryTableProps) {
    const { toast } = useToast();

    const handleUpload = async (file: File, eventTitle: string) => {
        const uploadToast = toast({
            title: 'Uploading...',
            description: `Uploading ${file.name} for ${eventTitle}`,
            type: 'info'
        });

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error('Upload failed');

            const data = await res.json();

            uploadToast.dismiss();
            toast({
                title: 'Upload Successful',
                description: `${file.name} has been uploaded.`,
                variant: 'success'
            });
        } catch (error) {
            uploadToast.dismiss();
            toast({
                title: 'Upload Failed',
                description: 'There was an error uploading your file.',
                variant: 'destructive'
            });
        }
    };

    const formatDate = (date: Date | string | null) => {
        if (!date) return 'TBD';
        const d = typeof date === 'string' ? parseISO(date) : date;
        return format(d, 'MMM d, yyyy (EEE)');
    };

    // Remove local formatTime since it's now imported

    return (
        <Card className="overflow-hidden border border-border shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 border-b border-border">
                        <tr>
                            {[
                                { id: 'startDate', label: 'Date / Time' },
                                { id: 'event', label: 'Task' },
                                { id: 'client', label: subTab === 'bill' ? 'Talent' : 'Client' },
                                { id: 'location', label: 'Location', align: 'text-center' },
                                { id: 'assignments', label: 'Assignments', align: 'text-center' },
                                { id: 'status', label: 'Status' },
                                { id: 'invoice', label: 'Total Invoice', align: 'text-right' },
                                { id: 'bill', label: 'Total Bill', align: 'text-right' },
                                { id: 'netIncome', label: 'Net Income', align: 'text-right' },
                            ].map((col) => (
                                <th
                                    key={col.id}
                                    className={`px-4 py-3 font-semibold text-foreground cursor-pointer hover:bg-muted transition-colors ${col.align || ''}`}
                                    onClick={() => onSort?.(col.id as SortField)}
                                >
                                    <div className={`flex items-center gap-1 ${col.align === 'text-right' ? 'justify-end' : col.align === 'text-center' ? 'justify-center' : ''}`}>
                                        {col.label}
                                        {sortBy === col.id && (
                                            sortOrder === 'asc' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />
                                        )}
                                    </div>
                                </th>
                            ))}
                            <th className="px-4 py-3 font-semibold text-foreground text-center">Upload</th>
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

                            const totalBill = group.callTimes.reduce((acc, ct) => acc + calcTotalBill(ct.timeEntry, ct, !!ct.commission), 0);
                            const totalInvoice = group.callTimes.reduce((acc, ct) => acc + calcTotalInvoice(ct.timeEntry, ct, !!ct.commission), 0);
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
                                                {firstRow?.startTime && ` ${formatTime(firstRow.startTime)}`}
                                            </span>
                                            {maxDate && (minDate?.getTime() !== maxDate.getTime()) && (
                                                <span className="text-xs">
                                                    to {formatDate(maxDate)}
                                                    {firstRow?.endTime && ` ${formatTime(firstRow.endTime)}`}
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
                                        {subTab === 'bill' 
                                            ? (firstRow?.staff ? `${firstRow.staff.firstName} ${firstRow.staff.lastName}` : 'No Staff')
                                            : (event?.client?.businessName || 'No Client')}
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <div className="text-sm text-muted-foreground">
                                            <div className="font-medium text-foreground">{event?.venueName || '—'}</div>
                                            {(event?.city || event?.state) && (
                                                <div className="text-xs opacity-75">
                                                    {[event?.city, event?.state].filter(Boolean).join(', ')}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <Badge variant="secondary">
                                            {group.callTimes.length}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-4">
                                        {event?.status === 'COMPLETED' ? (
                                            <Badge variant="success" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Completed</Badge>
                                        ) : event?.status === 'IN_PROGRESS' || (completedCount > 0 && completedCount < group.callTimes.length) ? (
                                            <Badge variant="warning" className="bg-amber-500/10 text-amber-600 border-amber-500/20">In Progress</Badge>
                                        ) : event?.status === 'CANCELLED' ? (
                                            <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-500/20">Cancelled</Badge>
                                        ) : event?.status === 'ASSIGNED' ? (
                                            <Badge variant="info" className="bg-blue-500/10 text-blue-600 border-blue-500/20">Assigned</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-muted-foreground border-border">Draft</Badge>
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
                                    <td className="px-4 py-4 text-center">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const input = document.createElement('input');
                                                input.type = 'file';
                                                input.onchange = (ev: any) => {
                                                    const file = ev.target.files?.[0];
                                                    if (file) handleUpload(file, group.eventTitle);
                                                };
                                                input.click();
                                            }}
                                            className="p-1.5 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-primary"
                                            title="Upload document"
                                        >
                                            <UploadIcon className="h-4 w-4" />
                                        </button>
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
