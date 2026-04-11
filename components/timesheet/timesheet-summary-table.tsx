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
import { MapPinIcon, UploadIcon, ChevronDownIcon, ChevronUpIcon, ChevronsUpDownIcon, EditIcon } from '@/components/ui/icons';
import { useToast } from '@/components/ui/use-toast';

interface TimesheetSummaryTableProps {
    eventGroups: EventGroup[];
    onEventClick: (eventId: string) => void;
    sortBy?: SortField;
    sortOrder?: SortOrder;
    onSort?: (field: SortField) => void;
    subTab?: 'all' | 'bill' | 'invoice' | 'commission';
    onEditEvent?: (eventId: string) => void;
}

export function TimesheetSummaryTable({ eventGroups, onEventClick, sortBy, sortOrder, onSort, subTab, onEditEvent }: TimesheetSummaryTableProps) {
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

    const effectiveSubTab = subTab ?? 'all';
    const showNetIncomeColumn = effectiveSubTab !== 'all';

    const summaryColumns: Array<{
        id: string;
        label: string;
        align?: 'text-center' | 'text-right';
    }> = [
        { id: 'startDate', label: 'Date / Time' },
        { id: 'event', label: 'Task' },
        { id: 'client', label: subTab === 'bill' ? 'Talent' : 'Client' },
        { id: 'location', label: 'Location' },
        { id: 'assignments', label: 'Assignments', align: 'text-center' },
        { id: 'status', label: 'Status', align: 'text-center' },
        { id: 'invoice', label: 'Total Invoice', align: 'text-right' },
        { id: 'bill', label: 'Total Bill', align: 'text-right' },
        ...(showNetIncomeColumn ? [{ id: 'netIncome', label: 'Net Income', align: 'text-right' as const }] : []),
    ];

    return (
        <Card className="overflow-hidden border border-border shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/30 border-b border-border">
                        <tr>
                            {summaryColumns.map((col) => (
                                <th
                                    key={col.id}
                                    className={`px-4 py-4 font-semibold text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors ${col.align || ''}`}
                                    onClick={() => onSort?.(col.id as SortField)}
                                >
                                    <div className={`flex items-center gap-1 ${col.align === 'text-right' ? 'justify-end' : col.align === 'text-center' ? 'justify-center' : ''}`}>
                                        {col.label}
                                        {sortBy === col.id
                                            ? (sortOrder === 'asc' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />)
                                            : <ChevronsUpDownIcon className="h-4 w-4 opacity-50" />}
                                    </div>
                                </th>
                            ))}
                            <th className="px-4 py-4 font-semibold text-slate-600 text-right pr-6">Upload</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {eventGroups.map((group) => {
                            const firstRow = group.callTimes[0];
                            const event = firstRow?.event;

                            const groupDates = group.callTimes.flatMap((ct) => {
                                if (!ct.startDate) return [];
                                return [typeof ct.startDate === 'string' ? parseISO(ct.startDate) : ct.startDate];
                            });

                            const eventDate = event?.startDate;
                            const eventEndDate = event?.endDate;

                            const totalBill = group.callTimes.reduce((acc, ct) => {
                                const hasActualShift = !!(ct.timeEntry?.clockIn && ct.timeEntry?.clockOut);
                                const basis = hasActualShift ? 'ACTUAL' : 'SCHEDULED';
                                return acc + calcTotalBill(ct.timeEntry, ct, !!ct.commission, basis, !!ct.applyMinimum);
                            }, 0);
                            const totalInvoice = group.callTimes.reduce((acc, ct) => {
                                const hasActualShift = !!(ct.timeEntry?.clockIn && ct.timeEntry?.clockOut);
                                const basis = hasActualShift ? 'ACTUAL' : 'SCHEDULED';
                                return acc + calcTotalInvoice(ct.timeEntry, ct, !!ct.commission, basis, !!ct.applyMinimum);
                            }, 0);
                            const profit = totalInvoice - totalBill;

                            const completedCount = group.callTimes.filter(ct => ct.timeEntry?.clockIn && ct.timeEntry?.clockOut).length;

                            return (
                                <tr
                                    key={group.eventId}
                                    className="hover:bg-slate-50/50 transition-colors group"
                                >
                                    <td className="px-4 py-5 text-slate-900 whitespace-nowrap align-top">
                                        <div className="flex flex-col leading-tight">
                                            <span className="font-bold">
                                                {eventDate ? formatDate(eventDate) : 'TBD'}
                                                {event?.startTime ? ` • ${formatTime(event.startTime)}` : ''}
                                                {(eventEndDate || event?.endTime) ? ' -' : ''}
                                            </span>
                                            {(eventEndDate || event?.endTime) && (
                                                <span className="font-bold">
                                                    {formatDate(eventEndDate || eventDate || null)} {event?.endTime ? `• ${formatTime(event.endTime)}` : ''}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-5 align-top">
                                        <button
                                            onClick={() => onEventClick(group.eventId)}
                                            className="font-bold text-foreground hover:underline text-left text-sm"
                                        >
                                            {group.eventTitle}
                                        </button>
                                        <div className="text-[10px] text-slate-400 mt-0.5">#{group.eventDisplayId}</div>
                                    </td>
                                    <td className="px-4 py-5 text-slate-500 align-top font-medium">
                                        {subTab === 'bill'
                                            ? (firstRow?.staff ? `${firstRow.staff.firstName} ${firstRow.staff.lastName}` : 'Multiple Talent')
                                            : (group.clientName || 'No Client')}
                                    </td>
                                    <td className="px-4 py-5 align-top">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-800">
                                                {group.venueName || '—'}
                                            </span>
                                            {(group.city || group.state) && (
                                                <span className="text-[11px] text-slate-400">
                                                    {[group.city, group.state].filter(Boolean).join(', ')}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-5 text-center align-top">
                                        <div className="flex justify-center">
                                            <Badge variant="secondary" className="font-bold px-2.5 py-0.5 pointer-events-none text-xs border border-border">
                                                {group.callTimes.length}
                                            </Badge>
                                        </div>
                                    </td>
                                    <td className="px-4 py-5 text-center align-top">
                                        <div className="flex justify-center">
                                            {event?.status === 'COMPLETED' ? (
                                                <Badge variant="secondary" className="font-bold px-3 py-1 pointer-events-none text-xs border border-border">Completed</Badge>
                                            ) : event?.status === 'IN_PROGRESS' || (completedCount > 0 && completedCount < group.callTimes.length) ? (
                                                <Badge variant="secondary" className="font-bold px-3 py-1 pointer-events-none text-xs border border-border">In Progress</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-muted-foreground font-bold px-3 py-1 pointer-events-none text-xs">Pending</Badge>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-5 text-right tabular-nums align-top font-bold text-slate-900">
                                        {fmtCurrency(totalInvoice)}
                                    </td>
                                    <td className="px-4 py-5 text-right tabular-nums align-top font-bold text-foreground">
                                        {fmtCurrency(totalBill)}
                                    </td>
                                    {showNetIncomeColumn && (
                                        <td className="px-4 py-5 text-right tabular-nums align-top font-bold text-foreground">
                                            {fmtCurrency(profit)}
                                        </td>
                                    )}
                                    <td className="px-4 py-5 text-right align-top pr-6">
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
                                            className="p-1.5 text-slate-300 hover:text-primary transition-colors"
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
