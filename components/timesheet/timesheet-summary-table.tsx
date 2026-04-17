'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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
import { useTableResize } from '@/hooks/use-table-resize';
import { TableColumnResizeHandle } from '@/components/common/table-column-resize-handle';
import { cn } from '@/lib/utils';
import { UploadIcon, ChevronDownIcon, ChevronUpIcon, ChevronRightIcon, ChevronsUpDownIcon, EditIcon, EyeIcon, UsersIcon, ClockIcon } from '@/components/ui/icons';
import { ActionDropdown, type ActionItem } from '@/components/common/action-dropdown';
import { useToast } from '@/components/ui/use-toast';
import { TIMESHEET_SUMMARY_TABLE_RESIZE_DEFAULTS } from '@/lib/timesheet/drilldown-column-order';

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
    const { onMouseDown, getTableStyle } = useTableResize('timesheet-summary', TIMESHEET_SUMMARY_TABLE_RESIZE_DEFAULTS);
    const { toast } = useToast();
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const handleToggleExpand = (eventId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedRows((prev) => {
            const next = new Set(prev);
            next.has(eventId) ? next.delete(eventId) : next.add(eventId);
            return next;
        });
    };

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
        widthKey: string;
        label: string;
        align?: 'text-center' | 'text-right';
    }> = [
        { id: 'startDate', widthKey: 'date', label: 'Date / Time' },
        { id: 'event', widthKey: 'task', label: 'Task' },
        { id: 'client', widthKey: 'client', label: subTab === 'bill' ? 'Talent' : 'Client' },
        { id: 'location', widthKey: 'location', label: 'Location' },
        { id: 'assignments', widthKey: 'assignments', label: subTab === 'invoice' ? 'Total Approve Shifts' : 'Assignments', align: 'text-center' },
        { id: 'status', widthKey: 'status', label: 'Status', align: 'text-center' },
        { id: 'invoice', widthKey: 'totalInvoice', label: subTab === 'invoice' ? 'Total Approve Invoice amount' : 'Total Invoice', align: 'text-right' },
        { id: 'bill', widthKey: 'totalBill', label: subTab === 'invoice' ? 'Total Approve Bill amount' : 'Total Bill', align: 'text-right' },
        ...(showNetIncomeColumn ? [{ id: 'netIncome', widthKey: 'netIncome', label: subTab === 'invoice' ? 'Approve Net Income' : 'Net Income', align: 'text-right' as const }] : []),
    ];

    // summaryColumns already includes the conditional netIncome column; +3 for expand, action, upload
    const totalCols = summaryColumns.length + 3;

    return (
        <Card className="overflow-hidden border border-border shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left table-fixed" style={getTableStyle()}>
                    <thead className="bg-slate-50 border-b border-border">
                        <tr>
                            <th className="w-10 min-w-10 max-w-10 px-2 py-4" />
                            <th className="w-16 min-w-16 max-w-16 px-4 py-4 font-semibold text-slate-600 text-center">Action</th>
                            {summaryColumns.map((col) => (
                                <th
                                    key={col.id}
                                    className={cn(
                                        "relative group px-4 py-4 font-semibold text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors truncate",
                                        col.align || ''
                                    )}
                                    style={{ width: `var(--col-${col.widthKey})` }}
                                    onClick={() => onSort?.(col.id as SortField)}
                                >
                                    <div className={`flex items-center gap-1 ${col.align === 'text-right' ? 'justify-end' : col.align === 'text-center' ? 'justify-center' : ''}`}>
                                        {col.label}
                                        {sortBy === col.id
                                            ? (sortOrder === 'asc' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />)
                                            : <ChevronsUpDownIcon className="h-4 w-4 opacity-50" />}
                                    </div>
                                    <TableColumnResizeHandle onMouseDown={(e) => onMouseDown(col.widthKey, e)} />
                                </th>
                            ))}
                            <th className="px-4 py-4 font-semibold text-slate-600 text-right pr-6">Upload</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {eventGroups.map((group) => {
                            const firstRow = group.callTimes[0];
                            const event = firstRow?.event;
                            const actions: ActionItem[] = [
                                {
                                    label: 'View',
                                    icon: <EyeIcon className="h-3.5 w-3.5" />,
                                    onClick: () => onEventClick(group.eventId),
                                },
                                {
                                    label: 'Edit',
                                    icon: <EditIcon className="h-3.5 w-3.5" />,
                                    onClick: () => onEditEvent?.(group.eventId),
                                    disabled: !onEditEvent,
                                },
                            ];

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
                            const isExpanded = expandedRows.has(group.eventId);

                            // Group callTimes by callTimeId to get unique positions
                            const positionMap = new Map<string, { title: string; required: number; talents: Array<{ name: string; isConfirmed: boolean; reviewRating: string | null }> }>();
                            group.callTimes.forEach((ct) => {
                                const key = ct.callTimeId;
                                if (!positionMap.has(key)) {
                                    positionMap.set(key, {
                                        title: ct.service?.title || 'Unspecified Position',
                                        required: ct.numberOfStaffRequired,
                                        talents: [],
                                    });
                                }
                                if (ct.staff) {
                                    positionMap.get(key)!.talents.push({
                                        name: `${ct.staff.firstName} ${ct.staff.lastName}`,
                                        isConfirmed: !!ct.invitations[0]?.isConfirmed,
                                        reviewRating: ct.invitations[0]?.internalReviewRating ?? null,
                                    });
                                }
                            });
                            const positions = Array.from(positionMap.values());

                            // Recent activity: rows that have time entry clock data
                            const recentActivity = group.callTimes
                                .filter((ct) => ct.timeEntry?.clockIn || ct.timeEntry?.clockOut)
                                .slice(0, 5);

                            return (
                                <>
                                <tr
                                    key={group.eventId}
                                    className="hover:bg-slate-50/50 transition-colors group"
                                >
                                    <td className="w-10 min-w-10 max-w-10 px-2 py-5 text-center align-top">
                                        <button
                                            type="button"
                                            onClick={(e) => handleToggleExpand(group.eventId, e)}
                                            className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-muted transition-colors"
                                        >
                                            {isExpanded
                                                ? <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                                                : <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
                                            }
                                        </button>
                                    </td>
                                    <td className="w-16 min-w-16 max-w-16 px-4 py-5 text-center align-top">
                                        <ActionDropdown actions={actions} align="start" />
                                    </td>
                                    <td className="px-4 py-5 text-slate-900 whitespace-nowrap align-top truncate" style={{ width: 'var(--col-date)' }}>
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
                                    <td className="px-4 py-5 align-top truncate" style={{ width: 'var(--col-task)' }}>
                                        <button
                                            onClick={() => onEventClick(group.eventId)}
                                            className="font-bold text-blue-600 hover:text-blue-700 hover:underline text-left text-sm"
                                        >
                                            {group.eventTitle}
                                        </button>
                                        <div className="text-[10px] text-slate-400 mt-0.5">#{group.eventDisplayId}</div>
                                    </td>
                                    <td className="px-4 py-5 text-slate-500 align-top font-medium truncate" style={{ width: 'var(--col-client)' }}>
                                        {subTab === 'bill'
                                            ? (firstRow?.staff ? `${firstRow.staff.firstName} ${firstRow.staff.lastName}` : 'Multiple Talent')
                                            : (group.clientName || 'No Client')}
                                    </td>
                                    <td className="px-4 py-5 align-top truncate" style={{ width: 'var(--col-location)' }}>
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
                                    <td className="px-4 py-5 text-center align-top truncate" style={{ width: 'var(--col-assignments)' }}>
                                        <div className="flex justify-center">
                                            <Badge variant="secondary" className="font-bold px-2.5 py-0.5 pointer-events-none text-xs border border-border">
                                                {group.callTimes.length}
                                            </Badge>
                                        </div>
                                    </td>
                                    <td className="px-4 py-5 text-center align-top truncate" style={{ width: 'var(--col-status)' }}>
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
                                    <td className="px-4 py-5 text-right tabular-nums align-top font-bold text-slate-900 truncate" style={{ width: 'var(--col-totalInvoice)' }}>
                                        {fmtCurrency(totalInvoice)}
                                    </td>
                                    <td className="px-4 py-5 text-right tabular-nums align-top font-bold text-foreground truncate" style={{ width: 'var(--col-totalBill)' }}>
                                        {fmtCurrency(totalBill)}
                                    </td>
                                    {showNetIncomeColumn && (
                                        <td className="px-4 py-5 text-right tabular-nums align-top font-bold text-foreground truncate" style={{ width: 'var(--col-netIncome)' }}>
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
                                {isExpanded && (
                                    <tr key={`${group.eventId}-expanded`} className="bg-slate-50/70 border-b border-slate-100">
                                        <td colSpan={totalCols} className="px-6 py-4">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                                {/* Positions & Assigned Talents */}
                                                <div className="md:col-span-2">
                                                    <div className="flex items-center gap-2 mb-2.5">
                                                        <UsersIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                                            Total Positions ({positions.length})
                                                        </span>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {positions.map((pos, idx) => (
                                                            <div key={idx} className="rounded-md border border-border bg-white px-3 py-2.5 flex flex-wrap items-start gap-3">
                                                                <div className="min-w-[120px]">
                                                                    <p className="text-xs font-semibold text-foreground">{pos.title}</p>
                                                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                                                        {pos.talents.length}/{pos.required} filled
                                                                    </p>
                                                                </div>
                                                                <div className="flex flex-wrap gap-1.5 flex-1">
                                                                    {pos.talents.length === 0 ? (
                                                                        <span className="text-xs text-muted-foreground italic">No talent assigned</span>
                                                                    ) : (
                                                                        pos.talents.map((t, ti) => (
                                                                            <span
                                                                                key={ti}
                                                                                className={cn(
                                                                                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border',
                                                                                    t.reviewRating === 'MET_EXPECTATIONS'
                                                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                                        : t.reviewRating === 'DID_NOT_MEET' || t.reviewRating === 'NO_CALL_NO_SHOW'
                                                                                        ? 'bg-red-50 text-red-700 border-red-200'
                                                                                        : t.reviewRating === 'NEEDS_IMPROVEMENT'
                                                                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                                                        : t.isConfirmed
                                                                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                                                        : 'bg-slate-50 text-slate-600 border-slate-200'
                                                                                )}
                                                                            >
                                                                                {t.name}
                                                                            </span>
                                                                        ))
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Recent Activity & Task Status */}
                                                <div className="space-y-4">
                                                    {/* Task Status */}
                                                    <div>
                                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Task Status</span>
                                                        <div className="mt-1.5">
                                                            {event?.status === 'COMPLETED' ? (
                                                                <Badge variant="secondary" className="font-bold text-xs border border-border">Completed</Badge>
                                                            ) : event?.status === 'IN_PROGRESS' || (completedCount > 0 && completedCount < group.callTimes.length) ? (
                                                                <Badge variant="secondary" className="font-bold text-xs border border-border">In Progress</Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="text-muted-foreground font-bold text-xs">Pending</Badge>
                                                            )}
                                                            <span className="ml-2 text-xs text-muted-foreground">
                                                                {completedCount}/{group.callTimes.length} shifts clocked
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Recent Activity */}
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <ClockIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent Activity</span>
                                                        </div>
                                                        {recentActivity.length === 0 ? (
                                                            <p className="text-xs text-muted-foreground italic">No clock activity yet</p>
                                                        ) : (
                                                            <div className="space-y-1.5">
                                                                {recentActivity.map((ct) => {
                                                                    const clockIn = ct.timeEntry?.clockIn;
                                                                    const clockOut = ct.timeEntry?.clockOut;
                                                                    const formatDt = (dt: Date | string | null | undefined) => {
                                                                        if (!dt) return '—';
                                                                        try {
                                                                            const d = typeof dt === 'string' ? parseISO(dt) : dt;
                                                                            return format(d, 'MM/dd HH:mm');
                                                                        } catch { return '—'; }
                                                                    };
                                                                    return (
                                                                        <div key={ct.id} className="rounded border border-border bg-white px-2.5 py-1.5 text-[11px]">
                                                                            <p className="font-semibold text-foreground">
                                                                                {ct.staff ? `${ct.staff.firstName} ${ct.staff.lastName}` : 'Unknown'}
                                                                            </p>
                                                                            <p className="text-muted-foreground mt-0.5">
                                                                                In: {formatDt(clockIn)} &nbsp;·&nbsp; Out: {formatDt(clockOut)}
                                                                            </p>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                </>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}
