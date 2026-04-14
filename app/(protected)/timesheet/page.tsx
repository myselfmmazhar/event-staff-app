'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type React from 'react';
import { trpc } from '@/lib/client/trpc';
import {
    TimesheetHeader,
    TimesheetFilters,
    EventGroupTable,
    TimesheetSummaryTable,
    TimesheetTableRow,
    ConfirmDialog,
    TimesheetClientSummaryTable,
    TimesheetTalentSummaryTable,
    TimesheetEventSummaryCards,
    TimesheetDetailToolbar,
} from '@/components/timesheet';
import { useTableResize } from '@/hooks/use-table-resize';
import { TableColumnResizeHandle } from '@/components/common/table-column-resize-handle';
import { cn } from '@/lib/utils';
import { CallTimeExportDropdown } from '@/components/events/call-time-export-dropdown';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeftIcon, CheckIcon, CloseIcon, EditIcon, MoreVerticalIcon, CheckCircleIcon, ChevronUpIcon, ChevronDownIcon, ChevronsUpDownIcon } from '@/components/ui/icons';
import type { SortField, SortOrder, StaffingFilter, EventGroup, CallTimeRow, TimesheetTab, ClientGroup, TalentGroup } from '@/components/timesheet/types';
import { TalentContactPopover } from '@/components/timesheet/talent-contact-popover';
import { calcTotalBill, calcTotalInvoice, toNumber, calcScheduledHours, calcClockedHours, formatDate } from '@/components/timesheet/helpers';
import { parseISO } from 'date-fns';
import { CallTimeFormModal } from '@/components/call-times/call-time-form-modal';
import { EventFormModal } from '@/components/events/event-form-modal';
import { AmountType, EventStatus, SkillLevel, StaffRating, RateType } from '@prisma/client';
import type { CreateCallTimeInput, UpdateCallTimeInput } from '@/lib/schemas/call-time.schema';
import type { CreateEventInput, UpdateEventInput } from '@/lib/schemas/event.schema';
import { isDateNullOrUBD } from '@/lib/utils/date-formatter';

/**
 * Sort key for task summary rows — must match Date/Time shown in TimesheetSummaryTable (event start),
 * not only min(callTime.startDate), which can disagree (e.g. event 1992 vs assignments in 2026).
 */
function getEventGroupListSortTime(group: EventGroup): number {
    const ev = group.callTimes[0]?.event;
    const eventStart = ev?.startDate;
    if (eventStart != null && !isDateNullOrUBD(eventStart)) {
        const t = new Date(eventStart).getTime();
        if (!Number.isNaN(t)) return t;
    }
    const callTimes = group.callTimes
        .map((ct) => ct.startDate)
        .filter((d): d is string | Date => d != null && !isDateNullOrUBD(d))
        .map((d) => new Date(d).getTime())
        .filter((t) => !Number.isNaN(t));
    if (callTimes.length === 0) return Number.MAX_SAFE_INTEGER;
    return Math.min(...callTimes);
}

export default function TimeManagerPage() {
    const { columnWidths, onMouseDown, getTableStyle } = useTableResize('timesheet-drilldown');
    const { toast } = useToast();
    const router = useRouter();
    const utils = trpc.useUtils();

    // ── Navigation State ──
    const [activeTab, setActiveTab] = useState<TimesheetTab>('task');

    // ── Filters & Sort State ──
    const [search, setSearch] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [staffingFilter, setStaffingFilter] = useState<StaffingFilter>('all');
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<SortField>('startDate');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
    const [subTab, setSubTab] = useState<'all' | 'bill' | 'invoice' | 'commission'>('all');

    /** Event / client / talent detail table (screenshot-style toolbar + card rows) */
    const [detailSearch, setDetailSearch] = useState('');
    const [detailStatus, setDetailStatus] = useState<string>('all');
    const [detailCommission, setDetailCommission] = useState<string>('all');
    const [detailRateType, setDetailRateType] = useState<string>('all');
    const [detailVariance, setDetailVariance] = useState('all');

    // ── Row State ──
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const [confirmState, setConfirmState] = useState<{
        open: boolean;
        type: 'APPROVE' | 'REJECT' | 'REVIEW' | 'PENDING' | null;
        ids: string[];
    }>({ open: false, type: null, ids: [] });

    // ── Edit Modal State ──
    const [isEditTaskOpen, setIsEditTaskOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<CallTimeRow | null>(null);
    const [isEditEventOpen, setIsEditEventOpen] = useState(false);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);

    // ── Data Fetching (using the new Time Manager rows query) ──
    const { data: assignments = [], isLoading, refetch } = trpc.timeEntry.getTimeManagerRows.useQuery({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        search: search || undefined,
    });

    const upsertMutation = trpc.timeEntry.upsert.useMutation({
        onSuccess: () => {
            toast({ title: 'Time entry saved' });
            utils.timeEntry.getTimeManagerRows.invalidate();
        },
        onError: (e) => toast({ title: 'Error saving time entry', description: e.message, variant: 'error' }),
    });

    const generateInvoicesMutation = trpc.timeEntry.generateInvoices.useMutation({
        onSuccess: (res) => {
            toast({
                title: 'Success',
                description: `Generated ${res.count} draft invoice(s). Check the Invoices module.`
            });
            setSelectedRows(new Set());
            router.push('/invoices');
        },
        onError: (e) => toast({ title: 'Error generating invoices', description: e.message, variant: 'error' }),
    });

    const reviewInvitationMutation = trpc.timeEntry.reviewInvitation.useMutation({
        onSuccess: () => {
            utils.timeEntry.getTimeManagerRows.invalidate();
        },
        onError: (e) => toast({ title: 'Error updating row', description: e.message, variant: 'error' }),
    });

    const { data: fullEventData, isLoading: isLoadingEvent } = trpc.event.getById.useQuery(
        { id: editingEventId || '' },
        { enabled: !!editingEventId && isEditEventOpen }
    );

    const updateCallTimeMutation = trpc.callTime.update.useMutation({
        onSuccess: () => {
            toast({ title: 'Task updated successfully' });
            setIsEditTaskOpen(false);
            utils.timeEntry.getTimeManagerRows.invalidate();
        },
        onError: (e) => toast({ title: 'Error updating task', description: e.message, variant: 'error' }),
    });

    const updateEventMutation = trpc.event.update.useMutation({
        onSuccess: () => {
            toast({ title: 'Event updated successfully' });
            setIsEditEventOpen(false);
            utils.timeEntry.getTimeManagerRows.invalidate();
        },
        onError: (e) => toast({ title: 'Error updating event', description: e.message, variant: 'error' }),
    });

    // Bulk update mutations for attachments (if needed by EventFormModal)
    const bulkSyncCallTimesMutation = trpc.callTime.bulkSyncForEvent.useMutation();
    const bulkUpdateProductsMutation = trpc.eventAttachment.bulkUpdateProducts.useMutation();

    const handleEditTask = (ct: CallTimeRow) => {
        setEditingTask(ct);
        setIsEditTaskOpen(true);
    };

    const handleEditEvent = (eventId: string) => {
        setEditingEventId(eventId);
        setIsEditEventOpen(true);
    };

    // ── Helpers ──
    const toggleExpand = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedRows((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleSelect = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (isRejectedInvitation(id)) return;
        setSelectedRows((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const isRejectedInvitation = (invitationId: string) => {
        const inv = assignments.find((a: any) => a.id === invitationId);
        if (!inv || !inv.staffId) return true; // Unassigned placeholder rows are not actionable
        const rating = inv?.internalReviewRating ?? inv?.invitations?.[0]?.internalReviewRating ?? null;
        return rating === 'DID_NOT_MEET' || rating === 'NO_CALL_NO_SHOW';
    };

    const isActionableInvitation = (invitationId: string) => {
        const inv = assignments.find((a: any) => a.id === invitationId);
        return !!(inv && inv.staffId);
    };

    const toggleSelectAll = (ids: string[]) => {
        const selectableIds = ids.filter((id) => !isRejectedInvitation(id));
        const allInIdsSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedRows.has(id));
        setSelectedRows((prev) => {
            const next = new Set(prev);
            selectableIds.forEach((id) => (allInIdsSelected ? next.delete(id) : next.add(id)));
            return next;
        });
    };

    const toggleGroup = (eventId: string) => {
        setCollapsedGroups((prev) => {
            const next = new Set(prev);
            next.has(eventId) ? next.delete(eventId) : next.add(eventId);
            return next;
        });
    };

    const handleSort = (field: SortField) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    const handleSaveTimeEntry = (
        invitationId: string,
        clockIn: string | null,
        clockOut: string | null,
        breakMins: number,
        otCost?: number | null,
        otPrice?: number | null,
        notes?: string | null,
        shiftCost?: number | null,
        shiftPrice?: number | null,
        travelCost?: number | null,
        travelPrice?: number | null,
        commission?: boolean,
        applyMinimum?: boolean
    ) => {
        // Find the matching assignment to get staffId/callTimeId
        const assignment = assignments.find((a: any) => a.id === invitationId);
        if (!assignment) return;

        upsertMutation.mutate({
            invitationId,
            staffId: assignment.staffId,
            callTimeId: assignment.callTimeId,
            clockIn,
            clockOut,
            breakMinutes: breakMins,
            overtimeCost: otCost,
            overtimePrice: otPrice,
            shiftCost: shiftCost,
            shiftPrice: shiftPrice,
            travelCost: travelCost,
            travelPrice: travelPrice,
            notes: notes ?? undefined,
            commission: commission,
            applyMinimum: applyMinimum,
        });
    };

    const handleGenerateInvoices = () => {
        if (selectedRows.size === 0) return;
        generateInvoicesMutation.mutate({ invitationIds: Array.from(selectedRows) });
    };

    const handleGenerateBills = () => {
        if (selectedRows.size === 0) return;
        toast({
            title: 'Success',
            description: `Generated ${selectedRows.size} draft bill(s). Check the Finance Manager.`
        });
        setSelectedRows(new Set());
        router.push('/finance/bills');
    };

    const handleApprove = (id: string) => {
        if (!isActionableInvitation(id)) {
            toast({
                title: 'Cannot approve this row',
                description: 'This task is unassigned. Please assign a staff member first, then approve.',
                variant: 'destructive'
            });
            return;
        }
        setConfirmState({ open: true, type: 'APPROVE', ids: [id] });
    };
    const handleReject = (id: string) => {
        if (!isActionableInvitation(id)) {
            toast({
                title: 'Cannot reject this row',
                description: 'This task is unassigned. Please assign a staff member first.',
                variant: 'destructive'
            });
            return;
        }
        setConfirmState({ open: true, type: 'REJECT', ids: [id] });
    };
    const handleReview = (id: string) => {
        if (!isActionableInvitation(id)) {
            toast({
                title: 'Cannot review this row',
                description: 'This task is unassigned. Please assign a staff member first.',
                variant: 'destructive'
            });
            return;
        }
        setConfirmState({ open: true, type: 'REVIEW', ids: [id] });
    };
    const handlePending = (id: string) => {
        if (!isActionableInvitation(id)) {
            toast({
                title: 'Cannot update this row',
                description: 'This task is unassigned. Please assign a staff member first.',
                variant: 'destructive'
            });
            return;
        }
        setConfirmState({ open: true, type: 'PENDING', ids: [id] });
    };

    const handleBatchApprove = () => setConfirmState({ open: true, type: 'APPROVE', ids: Array.from(selectedRows) });
    const handleBatchReject = () => setConfirmState({ open: true, type: 'REJECT', ids: Array.from(selectedRows) });
    const handleBatchReview = () => setConfirmState({ open: true, type: 'REVIEW', ids: Array.from(selectedRows) });
    const handleBatchPending = () => setConfirmState({ open: true, type: 'PENDING', ids: Array.from(selectedRows) });

    const executeConfirmedAction = () => {
        const { type, ids } = confirmState;
        if (!type || ids.length === 0) return;
        const actionableIds = ids.filter((id) => isActionableInvitation(id));
        const skippedCount = ids.length - actionableIds.length;

        if (actionableIds.length === 0) {
            toast({
                title: 'No valid tasks selected',
                description: 'Selected rows are unassigned. Please assign staff first.',
                variant: 'destructive'
            });
            setConfirmState({ open: false, type: null, ids: [] });
            return;
        }

        reviewInvitationMutation.mutate(
            { invitationIds: actionableIds, decision: type },
            {
                onSuccess: (res: any) => {
                    utils.timeEntry.getTimeManagerRows.invalidate();
                    toast({
                        title: type === 'APPROVE' ? 'Approved' : type === 'REJECT' ? 'Rejected' : type === 'REVIEW' ? 'Reviewed' : 'Reset to Pending',
                        description: actionableIds.length > 1
                            ? `Successfully processed ${actionableIds.length} items.`
                            : `Successfully processed the selected item.`,
                    });
                    if (skippedCount > 0) {
                        toast({
                            title: 'Some rows were skipped',
                            description: `${skippedCount} unassigned row(s) were not processed.`,
                            type: 'info'
                        });
                    }
                    setSelectedRows((prev) => {
                        const next = new Set(prev);
                        actionableIds.forEach(id => next.delete(id));
                        return next;
                    });
                    setConfirmState({ open: false, type: null, ids: [] });
                },
                onError: (e: any) => {
                    toast({ title: 'Error', description: e.message, variant: 'destructive' });
                    setConfirmState(prev => ({ ...prev, open: false }));
                }
            }
        );
    };

    // ── Data Transformation (Assignments -> Grouped rows for components) ──

    const SortHeader = ({
        id,
        label,
        align = 'text-left',
        className = '',
    }: {
        id: SortField;
        label: React.ReactNode;
        align?: 'text-left' | 'text-center' | 'text-right';
        className?: string;
    }) => (
        <th
            className={`px-3 py-3 whitespace-normal cursor-pointer hover:bg-muted/30 transition-colors text-[10px] font-bold uppercase tracking-wide text-muted-foreground ${align} ${className}`}
            onClick={() => handleSort(id)}
        >
            <div className={`flex items-center gap-1 ${align === 'text-right' ? 'justify-end' : align === 'text-center' ? 'justify-center' : ''}`}>
                {label}
                {sortBy === id
                    ? (sortOrder === 'asc'
                        ? <ChevronUpIcon className="h-3.5 w-3.5 shrink-0" />
                        : <ChevronDownIcon className="h-3.5 w-3.5 shrink-0" />)
                    : <ChevronsUpDownIcon className="h-3.5 w-3.5 shrink-0 opacity-50" />}
            </div>
        </th>
    );

    const viewAssignments = useMemo(() => {
        if (subTab === 'all') return assignments;
        if (subTab === 'invoice' || subTab === 'bill') {
            return assignments.filter((inv: any) => {
                const rating = inv.internalReviewRating ?? inv.invitations?.[0]?.internalReviewRating ?? null;
                return rating === 'MET_EXPECTATIONS';
            });
        }
        if (subTab === 'commission') {
            return assignments.filter((inv: any) => !!inv.commission);
        }
        return assignments;
    }, [assignments, subTab]);

    const shouldIncludeRowForSubTab = (ct: CallTimeRow) => {
        if (subTab === 'commission') return !!ct.commission;
        if (subTab === 'invoice' || subTab === 'bill') {
            const rating = ct.invitations?.[0]?.internalReviewRating ?? null;
            return rating === 'MET_EXPECTATIONS';
        }
        return true;
    };

    useEffect(() => {
        if (!selectedEventId && !selectedClientId && !selectedStaffId) {
            setDetailSearch('');
            setDetailStatus('all');
            setDetailCommission('all');
            setDetailRateType('all');
            setDetailVariance('all');
        }
    }, [selectedEventId, selectedClientId, selectedStaffId]);

    const applyDetailToolbarFilters = useCallback(
        (rows: CallTimeRow[]) =>
            rows.filter((ct) => {
                if (detailSearch.trim()) {
                    const q = detailSearch.toLowerCase();
                    const hay = [
                        ct.staff?.firstName,
                        ct.staff?.lastName,
                        ct.service?.title,
                        ct.notes,
                        ct.event?.title,
                    ]
                        .filter(Boolean)
                        .join(' ')
                        .toLowerCase();
                    if (!hay.includes(q)) return false;
                }
                if (detailStatus !== 'all') {
                    const r = ct.invitations?.[0]?.internalReviewRating ?? null;
                    if (detailStatus === 'APPROVED' && r !== 'MET_EXPECTATIONS') return false;
                    if (detailStatus === 'REJECTED' && r !== 'DID_NOT_MEET' && r !== 'NO_CALL_NO_SHOW') return false;
                    if (detailStatus === 'REVIEW' && r !== 'NEEDS_IMPROVEMENT') return false;
                    if (detailStatus === 'PENDING') {
                        if (
                            r === 'MET_EXPECTATIONS' ||
                            r === 'NEEDS_IMPROVEMENT' ||
                            r === 'DID_NOT_MEET' ||
                            r === 'NO_CALL_NO_SHOW'
                        ) {
                            return false;
                        }
                    }
                }
                if (detailCommission !== 'all') {
                    const isComm = detailCommission === 'yes';
                    if (!!ct.commission !== isComm) return false;
                }
                if (detailRateType !== 'all' && ct.payRateType !== detailRateType) return false;
                if (detailVariance !== 'all') {
                    const hs = calcScheduledHours(ct);
                    const hc = calcClockedHours(ct.timeEntry);
                    const d = hs - hc;
                    if (detailVariance === 'zero' && Math.abs(d) >= 0.1) return false;
                    if (detailVariance === 'positive' && d <= 0.1) return false;
                    if (detailVariance === 'negative' && d >= -0.1) return false;
                }
                return true;
            }),
        [detailSearch, detailStatus, detailCommission, detailRateType, detailVariance],
    );

    const getDetailExportProps = (group: { callTimes: CallTimeRow[] }) => {
        const base = group.callTimes.filter(shouldIncludeRowForSubTab);
        const rows = subTab === 'all' ? applyDetailToolbarFilters(base) : base;
        const selected = rows.filter((ct) => selectedRows.has(ct.id));
        return {
            callTimes: rows as any,
            selectedCallTimes: selected as any,
            selectedCount: selected.length,
            disabled: rows.length === 0,
        };
    };

    // 1. Group by Task (Event)
    const eventGroups: EventGroup[] = useMemo(() => {
        const groupsMap = new Map<string, EventGroup>();

        viewAssignments.forEach((inv: any) => {
            const eid = inv.callTime.event.id;
            const event = inv.callTime.event;
            if (!groupsMap.has(eid)) {
                groupsMap.set(eid, {
                    eventId: eid,
                    eventTitle: inv.callTime.event.title,
                    eventDisplayId: inv.callTime.event.eventId,
                    clientName: event.client?.businessName,
                    venueName: event.venueName,
                    city: event.city,
                    state: event.state,
                    callTimes: [],
                });
            }

            const row: CallTimeRow = {
                ...inv.callTime,
                id: inv.id,
                staff: inv.staff,
                timeEntry: inv.timeEntry,
                invitations: [inv],
            };

            groupsMap.get(eid)!.callTimes.push(row);
        });

        const groups = Array.from(groupsMap.values());

        // Sort callTimes WITHIN each group first
        groups.forEach(g => {
            g.callTimes.sort((a, b) => {
                let comparison = 0;
                switch (sortBy) {
                    case 'staffName':
                        comparison = ((a.staff?.firstName || '') + (a.staff?.lastName || '')).localeCompare((b.staff?.firstName || '') + (b.staff?.lastName || ''));
                        break;
                    case 'startDate':
                        comparison = (a.startDate ? new Date(a.startDate).getTime() : 0) - (b.startDate ? new Date(b.startDate).getTime() : 0);
                        break;
                    case 'service':
                        comparison = (a.service?.title || '').localeCompare(b.service?.title || '');
                        break;
                    case 'status':
                        comparison = (a.invitations?.[0]?.status || '').localeCompare(b.invitations?.[0]?.status || '');
                        break;
                    case 'scheduledShift':
                        comparison = calcScheduledHours(a) - calcScheduledHours(b);
                        break;
                    case 'actualShift':
                        comparison = calcClockedHours(a.timeEntry) - calcClockedHours(b.timeEntry);
                        break;
                    case 'variance':
                        comparison = (calcClockedHours(a.timeEntry) - calcScheduledHours(a)) - (calcClockedHours(b.timeEntry) - calcScheduledHours(b));
                        break;
                    case 'cost':
                        comparison = calcTotalBill(a.timeEntry, a, !!a.commission, 'ACTUAL', !!a.applyMinimum) - calcTotalBill(b.timeEntry, b, !!b.commission, 'ACTUAL', !!b.applyMinimum);
                        break;
                    case 'price':
                        comparison = calcTotalInvoice(a.timeEntry, a, !!a.commission, 'ACTUAL', !!a.applyMinimum) - calcTotalInvoice(b.timeEntry, b, !!b.commission, 'ACTUAL', !!b.applyMinimum);
                        break;
                    case 'notes':
                        comparison = (a.notes || '').localeCompare(b.notes || '');
                        break;
                    case 'minimum':
                        comparison = (a.applyMinimum ? 1 : 0) - (b.applyMinimum ? 1 : 0);
                        if (comparison === 0) {
                            comparison = toNumber(a.minimum) - toNumber(b.minimum);
                        }
                        break;
                    case 'commission':
                        comparison = (a.commission ? 1 : 0) - (b.commission ? 1 : 0);
                        break;
                    case 'invoice':
                        comparison = calcTotalInvoice(a.timeEntry, a, !!a.commission, 'ACTUAL', !!a.applyMinimum) - calcTotalInvoice(b.timeEntry, b, !!b.commission, 'ACTUAL', !!b.applyMinimum);
                        break;
                    case 'bill':
                        comparison = calcTotalBill(a.timeEntry, a, !!a.commission, 'ACTUAL', !!a.applyMinimum) - calcTotalBill(b.timeEntry, b, !!b.commission, 'ACTUAL', !!b.applyMinimum);
                        break;
                    case 'rateType':
                        comparison = (a.payRateType || '').localeCompare(b.payRateType || '');
                        break;
                    default:
                        comparison = (a.startDate ? new Date(a.startDate).getTime() : 0) - (b.startDate ? new Date(b.startDate).getTime() : 0);
                }
                return sortOrder === 'asc' ? comparison : -comparison;
            });
        });

        // Now sort the GROUPS themselves
        return groups.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'event':
                    comparison = a.eventTitle.localeCompare(b.eventTitle);
                    break;
                case 'client':
                    comparison = (a.clientName || '').localeCompare(b.clientName || '');
                    break;
                case 'location':
                    comparison = (a.venueName || '').localeCompare(b.venueName || '');
                    break;
                case 'assignments':
                    comparison = a.callTimes.length - b.callTimes.length;
                    break;
                case 'status':
                    comparison = (a.callTimes[0]?.event?.status || '').localeCompare(b.callTimes[0]?.event?.status || '');
                    break;
                case 'invoice': {
                    const aVal = a.callTimes.reduce((acc, ct) => acc + calcTotalInvoice(ct.timeEntry, ct, !!ct.commission, 'ACTUAL', !!ct.applyMinimum), 0);
                    const bVal = b.callTimes.reduce((acc, ct) => acc + calcTotalInvoice(ct.timeEntry, ct, !!ct.commission, 'ACTUAL', !!ct.applyMinimum), 0);
                    comparison = aVal - bVal;
                    break;
                }
                case 'bill': {
                    const aVal = a.callTimes.reduce((acc, ct) => acc + calcTotalBill(ct.timeEntry, ct, !!ct.commission, 'ACTUAL', !!ct.applyMinimum), 0);
                    const bVal = b.callTimes.reduce((acc, ct) => acc + calcTotalBill(ct.timeEntry, ct, !!ct.commission, 'ACTUAL', !!ct.applyMinimum), 0);
                    comparison = aVal - bVal;
                    break;
                }
                case 'netIncome': {
                    const aInv = a.callTimes.reduce((acc, ct) => acc + calcTotalInvoice(ct.timeEntry, ct, !!ct.commission, 'ACTUAL', !!ct.applyMinimum), 0);
                    const aBill = a.callTimes.reduce((acc, ct) => acc + calcTotalBill(ct.timeEntry, ct, !!ct.commission, 'ACTUAL', !!ct.applyMinimum), 0);
                    const bInv = b.callTimes.reduce((acc, ct) => acc + calcTotalInvoice(ct.timeEntry, ct, !!ct.commission, 'ACTUAL', !!ct.applyMinimum), 0);
                    const bBill = b.callTimes.reduce((acc, ct) => acc + calcTotalBill(ct.timeEntry, ct, !!ct.commission, 'ACTUAL', !!ct.applyMinimum), 0);
                    comparison = (aInv - aBill) - (bInv - bBill);
                    break;
                }
                case 'startDate':
                default: {
                    comparison = getEventGroupListSortTime(a) - getEventGroupListSortTime(b);
                }
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });
    }, [assignments, sortBy, sortOrder]);



    // 2. Group by Task and Talent (Special for Bill subTab)
    const billGroups: EventGroup[] = useMemo(() => {
        const groupsMap = new Map<string, EventGroup>();

        viewAssignments.forEach((inv: any) => {
            const eid = inv.callTime.event.id;
            const sid = inv.staffId;
            if (!sid) return;

            const groupKey = `${eid}_${sid}`;
            if (!groupsMap.has(groupKey)) {
                const event = inv.callTime.event;
                groupsMap.set(groupKey, {
                    eventId: eid,
                    eventTitle: event.title,
                    eventDisplayId: event.eventId,
                    clientName: event.client?.businessName,
                    venueName: event.venueName,
                    city: event.city,
                    state: event.state,
                    staffId: sid,
                    callTimes: [],
                });
            }

            const row: CallTimeRow = {
                ...inv.callTime,
                id: inv.id,
                staff: inv.staff,
                timeEntry: inv.timeEntry,
                invitations: [inv],
            };
            groupsMap.get(groupKey)!.callTimes.push(row);
        });

        const groups = Array.from(groupsMap.values());

        // Internal sorting for groups (by date/time usually)
        groups.forEach(g => {
            g.callTimes.sort((a, b) => {
                return (a.startDate ? new Date(a.startDate).getTime() : 0) - (b.startDate ? new Date(b.startDate).getTime() : 0);
            });
        });

        return groups;
    }, [assignments]);

    // 3. Group by Client
    const clientGroups: ClientGroup[] = useMemo(() => {
        const groupsMap = new Map<string, ClientGroup>();

        viewAssignments.forEach((inv: any) => {
            const client = inv.callTime.event.client;
            if (!client) return;

            if (!groupsMap.has(client.id)) {
                groupsMap.set(client.id, {
                    clientId: client.id,
                    clientName: client.businessName,
                    callTimes: [],
                });
            }

            const row: CallTimeRow = {
                ...inv.callTime,
                id: inv.id,
                staff: inv.staff,
                timeEntry: inv.timeEntry,
                invitations: [inv],
            };

            groupsMap.get(client.id)!.callTimes.push(row);
        });

        const groups = Array.from(groupsMap.values());

        groups.forEach(g => {
            g.callTimes.sort((a, b) => {
                let comparison = 0;
                switch (sortBy) {
                    case 'staffName':
                        comparison = ((a.staff?.firstName || '') + (a.staff?.lastName || '')).localeCompare((b.staff?.firstName || '') + (b.staff?.lastName || ''));
                        break;
                    case 'startDate':
                        comparison = (a.startDate ? new Date(a.startDate).getTime() : 0) - (b.startDate ? new Date(b.startDate).getTime() : 0);
                        break;
                    case 'service':
                        comparison = (a.service?.title || '').localeCompare(b.service?.title || '');
                        break;
                    default:
                        comparison = (a.startDate ? new Date(a.startDate).getTime() : 0) - (b.startDate ? new Date(b.startDate).getTime() : 0);
                }
                return sortOrder === 'asc' ? comparison : -comparison;
            });
        });

        return groups.sort((a, b) => {
            let comparison = (a.clientName || '').localeCompare(b.clientName || '');
            return sortOrder === 'asc' ? comparison : -comparison;
        });
    }, [assignments, sortBy, sortOrder]);

    // 3. Group by Talent (Staff)
    const talentGroups: TalentGroup[] = useMemo(() => {
        const groupsMap = new Map<string, TalentGroup>();

        viewAssignments.forEach((inv: any) => {
            const staff = inv.staff;
            if (!staff) return;

            if (!groupsMap.has(staff.id)) {
                groupsMap.set(staff.id, {
                    staffId: staff.id,
                    staffName: `${staff.firstName} ${staff.lastName}`,
                    callTimes: [],
                });
            }

            const row: CallTimeRow = {
                ...inv.callTime,
                id: inv.id,
                staff: inv.staff,
                timeEntry: inv.timeEntry,
                invitations: [inv],
            };

            groupsMap.get(staff.id)!.callTimes.push(row);
        });

        const groups = Array.from(groupsMap.values());

        // Sort callTimes WITHIN each group
        groups.forEach(g => {
            g.callTimes.sort((a, b) => {
                let comparison = 0;
                switch (sortBy) {
                    case 'staffName':
                        comparison = ((a.staff?.firstName || '') + (a.staff?.lastName || '')).localeCompare((b.staff?.firstName || '') + (b.staff?.lastName || ''));
                        break;
                    case 'startDate':
                        comparison = (a.startDate ? new Date(a.startDate).getTime() : 0) - (b.startDate ? new Date(b.startDate).getTime() : 0);
                        break;
                    case 'service':
                        comparison = (a.service?.title || '').localeCompare(b.service?.title || '');
                        break;
                    case 'status':
                        comparison = (a.invitations?.[0]?.status || '').localeCompare(b.invitations?.[0]?.status || '');
                        break;
                    case 'scheduledShift':
                        comparison = calcScheduledHours(a) - calcScheduledHours(b);
                        break;
                    case 'actualShift':
                        comparison = calcClockedHours(a.timeEntry) - calcClockedHours(b.timeEntry);
                        break;
                    case 'variance':
                        comparison = (calcClockedHours(a.timeEntry) - calcScheduledHours(a)) - (calcClockedHours(b.timeEntry) - calcScheduledHours(b));
                        break;
                    case 'cost':
                        comparison = calcTotalBill(a.timeEntry, a, !!a.commission, 'ACTUAL', !!a.applyMinimum) - calcTotalBill(b.timeEntry, b, !!b.commission, 'ACTUAL', !!b.applyMinimum);
                        break;
                    case 'price':
                        comparison = calcTotalInvoice(a.timeEntry, a, !!a.commission, 'ACTUAL', !!a.applyMinimum) - calcTotalInvoice(b.timeEntry, b, !!b.commission, 'ACTUAL', !!b.applyMinimum);
                        break;
                    case 'notes':
                        comparison = (a.notes || '').localeCompare(b.notes || '');
                        break;
                    case 'minimum':
                        comparison = (a.applyMinimum ? 1 : 0) - (b.applyMinimum ? 1 : 0);
                        if (comparison === 0) {
                            comparison = toNumber(a.minimum) - toNumber(b.minimum);
                        }
                        break;
                    case 'commission':
                        comparison = (a.commission ? 1 : 0) - (b.commission ? 1 : 0);
                        break;
                    case 'invoice':
                        comparison = calcTotalInvoice(a.timeEntry, a, !!a.commission, 'ACTUAL', !!a.applyMinimum) - calcTotalInvoice(b.timeEntry, b, !!b.commission, 'ACTUAL', !!b.applyMinimum);
                        break;
                    case 'bill':
                        comparison = calcTotalBill(a.timeEntry, a, !!a.commission, 'ACTUAL', !!a.applyMinimum) - calcTotalBill(b.timeEntry, b, !!b.commission, 'ACTUAL', !!b.applyMinimum);
                        break;
                    case 'rateType':
                        comparison = (a.payRateType || '').localeCompare(b.payRateType || '');
                        break;
                    default:
                        comparison = (a.startDate ? new Date(a.startDate).getTime() : 0) - (b.startDate ? new Date(b.startDate).getTime() : 0);
                }
                return sortOrder === 'asc' ? comparison : -comparison;
            });
        });

        return groups.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'staffName':
                default:
                    comparison = (a.staffName || '').localeCompare(b.staffName || '');
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });
    }, [assignments, sortBy, sortOrder]);

    const isTimesheetDrillDown = Boolean(selectedEventId || selectedClientId || selectedStaffId);

    const clearTimesheetDrillDown = () => {
        setSelectedEventId(null);
        setSelectedClientId(null);
        setSelectedStaffId(null);
    };

    const detailSubTabPills = (
        <div className="flex flex-wrap items-center gap-2 py-1">
            {(['all', 'invoice', 'bill', 'commission'] as const).map((tab) => (
                <button
                    key={tab}
                    type="button"
                    onClick={() => setSubTab(tab)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${subTab === tab
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        }`}
                >
                    {tab === 'all' ? 'All' : tab === 'invoice' ? 'Invoices' : tab === 'bill' ? 'Bills' : 'Commissions'}
                </button>
            ))}
        </div>
    );

    return (
        <div className="flex flex-col min-h-screen">
            <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
                <TimesheetHeader
                    eventPluralLabel="Events"
                    showFilters={showFilters}
                    onToggleFilters={() => setShowFilters(!showFilters)}
                    hasActiveFilters={dateFrom || dateTo || search}
                    callTimes={viewAssignments as any} // Header uses this for export
                    selectedCallTimes={[]} // TODO: implement
                    selectedCount={selectedRows.size}
                    onGenerateInvoices={handleGenerateInvoices}
                    onGenerateBills={handleGenerateBills}
                    activeTab={activeTab}
                    onTabChange={(tab) => {
                        setActiveTab(tab);
                        setSelectedEventId(null); // Reset detail view when switching tabs
                        setSelectedClientId(null);
                        setSelectedStaffId(null);
                        setSubTab('all'); // Reset subTab
                    }}
                    subTab={subTab}
                    drillDown={isTimesheetDrillDown}
                />

                {!selectedEventId && !selectedClientId && !selectedStaffId && (
                    <TimesheetFilters
                        search={search}
                        onSearchChange={setSearch}
                        showFilters={showFilters}
                        onToggleFilters={() => setShowFilters(!showFilters)}
                        dateFrom={dateFrom}
                        onDateFromChange={setDateFrom}
                        dateTo={dateTo}
                        onDateToChange={setDateTo}
                        staffingFilter={staffingFilter}
                        onStaffingFilterChange={setStaffingFilter}
                        hasActiveFilters={dateFrom || dateTo || search}
                        onClearFilters={() => { setDateFrom(''); setDateTo(''); setSearch(''); }}
                        totalAssignments={viewAssignments.length}
                        totalEvents={eventGroups.length}
                        eventPluralLabel="Events"
                    />
                )}

                {/* Batch Actions Bar */}
                {selectedRows.size > 0 && (
                    <div className="mb-4 bg-primary/5 border border-primary/10 rounded-lg px-4 py-3 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-3">
                            <Badge variant="primary" className="rounded-full px-2.5 py-0.5 text-xs">
                                {selectedRows.size} selected
                            </Badge>
                            <span className="text-sm font-medium text-slate-600">
                                Apply batch actions to selected assignments
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {subTab === 'all' && (
                                <>
                                    <Button
                                        size="sm"
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                                        onClick={handleBatchApprove}
                                    >
                                        <CheckIcon className="h-3.5 w-3.5" />
                                        Approve Multiple
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-blue-200 text-blue-700 hover:bg-blue-50 gap-1.5"
                                        onClick={handleBatchReview}
                                    >
                                        <CheckCircleIcon className="h-3.5 w-3.5" />
                                        Review Multiple
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-red-200 text-red-700 hover:bg-red-50 gap-1.5"
                                        onClick={handleBatchReject}
                                    >
                                        <CloseIcon className="h-3.5 w-3.5" />
                                        Reject Multiple
                                    </Button>
                                </>
                            )}

                            {subTab === 'invoice' && (
                                <Button
                                    size="sm"
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                                    onClick={handleGenerateInvoices}
                                >
                                    <CheckCircleIcon className="h-3.5 w-3.5" />
                                    Generate Invoices
                                </Button>
                            )}

                            {subTab === 'bill' && (
                                <Button
                                    size="sm"
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                                    onClick={handleGenerateBills}
                                >
                                    <CheckCircleIcon className="h-3.5 w-3.5" />
                                    Generate Bills
                                </Button>
                            )}

                            <div className="w-px h-6 bg-slate-200 mx-1" />
                            <Button
                                size="sm"
                                variant="ghost"
                                className="text-slate-500 hover:text-slate-700"
                                onClick={() => setSelectedRows(new Set())}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}

                {isLoading ? (
                    <div className="h-48 flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/20">
                        <span className="text-sm text-muted-foreground animate-pulse">Loading data...</span>
                    </div>
                ) : viewAssignments.length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 gap-2">
                        <span className="text-sm font-semibold text-foreground">No records found</span>
                        <p className="text-xs text-muted-foreground">
                            {subTab === 'invoice' || subTab === 'bill'
                                ? 'No approved assignments found to be invoiced or billed.'
                                : 'Try adjusting your filters or inviting staff in the Events module.'}
                        </p>
                    </div>
                ) : !selectedEventId && !selectedClientId && !selectedStaffId ? (
                    <>
                        {activeTab === 'task' && (
                            <TimesheetSummaryTable
                                eventGroups={subTab === 'bill' ? billGroups : eventGroups}
                                onEventClick={(id) => setSelectedEventId(id)}
                                onEditEvent={handleEditEvent}
                                sortBy={sortBy}
                                sortOrder={sortOrder}
                                onSort={handleSort}
                                subTab={subTab}
                            />
                        )}
                        {activeTab === 'client' && (
                            <TimesheetClientSummaryTable
                                clientGroups={clientGroups}
                                onClientClick={(id) => setSelectedClientId(id)}
                                sortBy={sortBy}
                                sortOrder={sortOrder}
                                onSort={handleSort}
                            />
                        )}
                        {activeTab === 'talent' && (
                            <TimesheetTalentSummaryTable
                                talentGroups={talentGroups}
                                onTalentClick={(id) => setSelectedStaffId(id)}
                                sortBy={sortBy}
                                sortOrder={sortOrder}
                                onSort={handleSort}
                            />
                        )}
                    </>
                ) : selectedClientId ? (
                    <div className="space-y-4">
                        {eventGroups
                            .filter(g => {
                                const firstRow = g.callTimes[0];
                                return firstRow?.event?.client?.id === selectedClientId;
                            })
                            .map((group) => (
                                <div key={group.eventId} className="space-y-4">
                                    <div className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="flex flex-col gap-2 min-w-0 flex-1">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={clearTimesheetDrillDown}
                                                    className="h-8 w-fit -ml-2 px-2 text-sm font-normal text-muted-foreground hover:text-foreground"
                                                >
                                                    <ChevronLeftIcon className="h-4 w-4 mr-0.5" />
                                                    Back to Summary
                                                </Button>
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <span className="text-xl font-bold tracking-tight text-foreground">{group.eventTitle}</span>
                                                    <Badge variant="outline" className="shrink-0 text-xs font-medium">
                                                        {group.eventDisplayId}
                                                    </Badge>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                                    <span className="inline-flex text-xs font-medium rounded-md border border-border bg-muted/40 px-2.5 py-1 text-foreground">
                                                        {group.clientName || group.callTimes[0]?.event?.client?.businessName || 'No Client'}
                                                    </span>
                                                    <span className="flex flex-wrap items-center gap-1.5">
                                                        <span className="text-muted-foreground">Location:</span>
                                                        <span className="font-medium text-foreground">
                                                            {group.venueName || '—'}
                                                            {(group.city || group.state) && (
                                                                <span className="font-normal text-muted-foreground">
                                                                    {' '}
                                                                    ({[group.city, group.state].filter(Boolean).join(', ')})
                                                                </span>
                                                            )}
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0 sm:pt-1">
                                                <CallTimeExportDropdown {...getDetailExportProps(group)} />
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    className="gap-1.5 h-9 px-4 text-sm font-medium"
                                                    onClick={() => handleEditEvent(group.eventId)}
                                                >
                                                    <EditIcon className="h-3.5 w-3.5" />
                                                    Edit Tasks
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                    {detailSubTabPills}
                                    <TimesheetEventSummaryCards rows={group.callTimes.filter(shouldIncludeRowForSubTab)} subTab={subTab} />
                                    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                                        <div className="border-b border-border bg-muted/15 px-4 py-3">
                                            <TimesheetDetailToolbar
                                                search={detailSearch}
                                                onSearchChange={setDetailSearch}
                                                status={detailStatus}
                                                onStatusChange={setDetailStatus}
                                                commission={detailCommission}
                                                onCommissionChange={setDetailCommission}
                                                rateType={detailRateType}
                                                onRateTypeChange={setDetailRateType}
                                                variance={detailVariance}
                                                onVarianceChange={setDetailVariance}
                                                onCustomizeColumns={() =>
                                                    toast({
                                                        title: 'Customize columns',
                                                        description: 'Column visibility will be available in a future update.',
                                                    })
                                                }
                                                exportControl={<span className="hidden" aria-hidden />}
                                                subTab={subTab}
                                            />
                                        </div>
                                        <div className="p-4">
                                            <div className="overflow-x-auto">
                                                <table className="w-full border-separate border-spacing-y-2 text-sm text-foreground antialiased table-fixed" style={getTableStyle()}>
                                                    <thead>
                                                        <tr className="border-0 bg-transparent">
                                                            <th className="w-8 px-2 py-3 align-bottom">
                                                                {(() => {
                                                                    const groupIds = group.callTimes.map((ct) => ct.id);
                                                                    const isGroupAllSelected = groupIds.length > 0 && groupIds.every((id) => selectedRows.has(id));
                                                                    return (
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isGroupAllSelected}
                                                                            onChange={() => toggleSelectAll(groupIds)}
                                                                            className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
                                                                        />
                                                                    );
                                                                })()}
                                                            </th>
                                                            <th className="w-8 px-2 py-3 align-bottom" />
                                                            {subTab === 'commission' && (
                                                                <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                                                                    Action
                                                                </th>
                                                            )}
                                                            {subTab === 'invoice' ? (
                                                                <>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-startDate)` }}>
                                                                        <SortHeader id="startDate" label="Service Date" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('startDate', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-service)` }}>
                                                                        <SortHeader id="service" label={<>Services / <br />Products</>} className="max-w-[100px]" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('service', e)} />
                                                                    </th>
                                                                    <th className="relative group text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground whitespace-normal min-w-[500px] truncate" style={{ width: `var(--col-description)` }}>
                                                                        Invoice Description
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('description', e)} />
                                                                    </th>
                                                                    <th className="relative group text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap truncate" style={{ width: `var(--col-qty)` }}>
                                                                        Qty
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('qty', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-invoice)` }}>
                                                                        <SortHeader id="invoice" label="Total Invoice" align="text-right" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('invoice', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-bill)` }}>
                                                                        <SortHeader id="bill" label="Total Bill" align="text-right" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('bill', e)} />
                                                                    </th>
                                                                    <th className="relative group text-right px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap truncate" style={{ width: `var(--col-netIncome)` }}>
                                                                        Net Income
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('netIncome', e)} />
                                                                    </th>
                                                                </>
                                                            ) : subTab === 'commission' ? (
                                                                <>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-staffName)` }}>
                                                                        <SortHeader id="staffName" label="Team / User" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('staffName', e)} />
                                                                    </th>
                                                                    <th className="relative group text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground truncate" style={{ width: `var(--col-description)` }}>
                                                                        Invoice Description
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('description', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-price)` }}>
                                                                        <SortHeader id="price" label="Commission Price" align="text-right" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('price', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-status)` }}>
                                                                        <SortHeader id="status" label="Status" align="text-center" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('status', e)} />
                                                                    </th>
                                                                </>
                                                            ) : subTab === 'bill' ? (
                                                                <>
                                                                    <th className="relative group text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap truncate" style={{ width: `var(--col-category)` }}>
                                                                        Category
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('category', e)} />
                                                                    </th>
                                                                    <th className="relative group text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground min-w-[500px] truncate" style={{ width: `var(--col-description)` }}>
                                                                        Bill Description
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('description', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-invoice)` }}>
                                                                        <SortHeader id="invoice" label="Total Invoice" align="text-right" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('invoice', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-bill)` }}>
                                                                        <SortHeader id="bill" label="Total Bill" align="text-right" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('bill', e)} />
                                                                    </th>
                                                                    <th className="relative group text-right px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap truncate" style={{ width: `var(--col-netIncome)` }}>
                                                                        Net Income
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('netIncome', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-status)` }}>
                                                                        <SortHeader id="status" label="Status" align="text-center" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('status', e)} />
                                                                    </th>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <th className="relative group text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap truncate" style={{ width: `var(--col-action)` }}>
                                                                        Action
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('action', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-talent)` }}>
                                                                        <SortHeader id="staffName" label="Talent" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('talent', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-service)` }}>
                                                                        <SortHeader id="service" label="Services / Products" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('service', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-date)` }}>
                                                                        <SortHeader id="startDate" label="Schedule Date" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('date', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-scheduled)` }}>
                                                                        <SortHeader id="scheduledShift" label="Scheduled Shift" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('scheduled', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-actual)` }}>
                                                                        <SortHeader id="actualShift" label="Actual Shift" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('actual', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-variance)` }}>
                                                                        <SortHeader id="variance" label="Variance" align="text-center" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('variance', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-rateType)` }}>
                                                                        <SortHeader id="rateType" label="Rate Type" align="text-center" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('rateType', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-invoice)` }}>
                                                                        <SortHeader id="invoice" label="Total Invoice" align="text-right" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('invoice', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-bill)` }}>
                                                                        <SortHeader id="bill" label="Total Bill" align="text-right" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('bill', e)} />
                                                                    </th>
                                                                    <th className="relative group text-right px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap truncate" style={{ width: `var(--col-netIncome)` }}>
                                                                        Net Income
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('netIncome', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-commission)` }}>
                                                                        <SortHeader id="commission" label="Commission" align="text-center" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('commission', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-minimum)` }}>
                                                                        <SortHeader id="minimum" label="Minimum" align="text-right" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('minimum', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-status)` }}>
                                                                        <SortHeader id="status" label="Status" align="text-center" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('status', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-notes)` }}>
                                                                        <SortHeader id="notes" label="Notes" className="min-w-[250px]" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('notes', e)} />
                                                                    </th>
                                                                </>
                                                            )}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(() => {
                                                            const baseFiltered = group.callTimes.filter(shouldIncludeRowForSubTab);
                                                            const filtered = applyDetailToolbarFilters(baseFiltered);

                                                            if (subTab === 'invoice') {
                                                                return filtered.map(ct => (
                                                                    <TimesheetTableRow
                                                                        key={ct.id}
                                                                        ct={ct}
                                                                        isExpanded={expandedRows.has(ct.id)}
                                                                        isSelected={selectedRows.has(ct.id)}
                                                                        onToggleExpand={toggleExpand}
                                                                        onToggleSelect={toggleSelect}
                                                                        onViewEvent={(id) => router.push(`/projects/${id}`)}
                                                                        onSaveTimeEntry={handleSaveTimeEntry}
                                                                        onApprove={handleApprove}
                                                                        onReject={handleReject}
                                                                        onReview={handleReview}
                                                                        onPending={handlePending}
                                                                        onEditTask={handleEditTask}
                                                                        subTab={subTab}
                                                                        rowVariant="card"
                                                                    />
                                                                ));
                                                            }

                                                            return filtered.map((ct) => (
                                                                <TimesheetTableRow
                                                                    key={ct.id}
                                                                    ct={ct}
                                                                    isExpanded={expandedRows.has(ct.id)}
                                                                    isSelected={selectedRows.has(ct.id)}
                                                                    onToggleExpand={toggleExpand}
                                                                    onToggleSelect={toggleSelect}
                                                                    onViewEvent={(id) => router.push(`/projects/${id}`)}
                                                                    onSaveTimeEntry={handleSaveTimeEntry}
                                                                    onApprove={handleApprove}
                                                                    onReject={handleReject}
                                                                    onReview={handleReview}
                                                                    onPending={handlePending}
                                                                    onEditTask={handleEditTask}
                                                                    subTab={subTab}
                                                                    rowVariant="card"
                                                                />
                                                            ));
                                                        })()}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                ) : selectedStaffId ? (
                    <div className="space-y-4">
                        {talentGroups
                            .filter(g => g.staffId === selectedStaffId)
                            .map((group) => (
                                <div key={group.staffId} className="space-y-4">
                                    <div className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="flex flex-col gap-2 min-w-0 flex-1">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={clearTimesheetDrillDown}
                                                    className="h-8 w-fit -ml-2 px-2 text-sm font-normal text-muted-foreground hover:text-foreground"
                                                >
                                                    <ChevronLeftIcon className="h-4 w-4 mr-0.5" />
                                                    Back to Summary
                                                </Button>
                                                <div className="flex flex-wrap items-center gap-3 min-w-0">
                                                    <TalentContactPopover
                                                        talent={group.callTimes[0]?.staff || { firstName: group.staffName.split(' ')[0], lastName: group.staffName.split(' ')[1] || '' } as any}
                                                        trigger={
                                                            <span className="text-xl font-bold tracking-tight text-foreground cursor-pointer hover:underline">{group.staffName}</span>
                                                        }
                                                    />
                                                    {subTab === 'invoice' ? (
                                                        <Badge variant="primary" className="bg-primary/5 text-primary border-primary/10">
                                                            {group.callTimes[0]?.event?.client?.businessName || 'Multiple Clients'}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline">Assignments</Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0 sm:pt-1">
                                                <CallTimeExportDropdown {...getDetailExportProps(group)} />
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    className="gap-1.5 h-9 px-4 text-sm font-medium"
                                                    disabled={!group.callTimes.some((ct) => ct.event?.id)}
                                                    onClick={() => {
                                                        const eid = group.callTimes.find((ct) => ct.event?.id)?.event?.id;
                                                        if (eid) handleEditEvent(eid);
                                                    }}
                                                >
                                                    <EditIcon className="h-3.5 w-3.5" />
                                                    Edit Tasks
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                    {detailSubTabPills}
                                    <TimesheetEventSummaryCards rows={group.callTimes.filter(shouldIncludeRowForSubTab)} subTab={subTab} />
                                    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                                        <div className="border-b border-border bg-muted/15 px-4 py-3">
                                            <TimesheetDetailToolbar
                                                search={detailSearch}
                                                onSearchChange={setDetailSearch}
                                                status={detailStatus}
                                                onStatusChange={setDetailStatus}
                                                commission={detailCommission}
                                                onCommissionChange={setDetailCommission}
                                                rateType={detailRateType}
                                                onRateTypeChange={setDetailRateType}
                                                variance={detailVariance}
                                                onVarianceChange={setDetailVariance}
                                                onCustomizeColumns={() =>
                                                    toast({
                                                        title: 'Customize columns',
                                                        description: 'Column visibility will be available in a future update.',
                                                    })
                                                }
                                                exportControl={<span className="hidden" aria-hidden />}
                                                subTab={subTab}
                                            />
                                        </div>
                                        <div className="p-4">
                                            <div className="overflow-x-auto">
                                                <table className="w-full border-separate border-spacing-y-2 text-sm text-foreground antialiased table-fixed" style={getTableStyle()}>
                                                    <thead>
                                                        <tr className="border-0 bg-transparent">
                                                            <th className="w-8 px-2 py-3 align-bottom">
                                                                {(() => {
                                                                    const groupIds = group.callTimes.map((ct) => ct.id);
                                                                    const isGroupAllSelected = groupIds.length > 0 && groupIds.every((id) => selectedRows.has(id));
                                                                    return (
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isGroupAllSelected}
                                                                            onChange={() => toggleSelectAll(groupIds)}
                                                                            className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
                                                                        />
                                                                    );
                                                                })()}
                                                            </th>
                                                            <th className="w-8 px-2 py-3 align-bottom" />
                                                            {subTab === 'commission' && (
                                                                <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                                                                    Action
                                                                </th>
                                                            )}
                                                            {subTab === 'invoice' ? (
                                                                <>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-startDate)` }}>
                                                                        <SortHeader id="startDate" label="Service Date" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('startDate', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-service)` }}>
                                                                        <SortHeader id="service" label="Services / Products" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('service', e)} />
                                                                    </th>
                                                                    <th className="relative group text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground whitespace-normal min-w-[500px] truncate" style={{ width: `var(--col-description)` }}>
                                                                        Invoice Description
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('description', e)} />
                                                                    </th>
                                                                    <th className="relative group text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap truncate" style={{ width: `var(--col-qty)` }}>
                                                                        Qty
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('qty', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-invoice)` }}>
                                                                        <SortHeader id="invoice" label="Total Invoice" align="text-right" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('invoice', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-bill)` }}>
                                                                        <SortHeader id="bill" label="Total Bill" align="text-right" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('bill', e)} />
                                                                    </th>
                                                                    <th className="relative group text-right px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap truncate" style={{ width: `var(--col-netIncome)` }}>
                                                                        Net Income
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('netIncome', e)} />
                                                                    </th>
                                                                </>
                                                            ) : subTab === 'commission' ? (
                                                                <>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-staffName)` }}>
                                                                        <SortHeader id="staffName" label="Team / User" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('staffName', e)} />
                                                                    </th>
                                                                    <th className="relative group text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground truncate" style={{ width: `var(--col-description)` }}>
                                                                        Invoice Description
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('description', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-price)` }}>
                                                                        <SortHeader id="price" label="Commission Price" align="text-right" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('price', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-status)` }}>
                                                                        <SortHeader id="status" label="Status" align="text-center" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('status', e)} />
                                                                    </th>
                                                                </>
                                                            ) : subTab === 'bill' ? (
                                                                <>
                                                                    <th className="relative group text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap truncate" style={{ width: `var(--col-category)` }}>
                                                                        Category
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('category', e)} />
                                                                    </th>
                                                                    <th className="relative group text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground min-w-[500px] truncate" style={{ width: `var(--col-description)` }}>
                                                                        Bill Description
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('description', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-invoice)` }}>
                                                                        <SortHeader id="invoice" label="Total Invoice" align="text-right" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('invoice', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-bill)` }}>
                                                                        <SortHeader id="bill" label="Total Bill" align="text-right" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('bill', e)} />
                                                                    </th>
                                                                    <th className="relative group text-right px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap truncate" style={{ width: `var(--col-netIncome)` }}>
                                                                        Net Income
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('netIncome', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-status)` }}>
                                                                        <SortHeader id="status" label="Status" align="text-center" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('status', e)} />
                                                                    </th>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <th className="relative group text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap truncate" style={{ width: `var(--col-action)` }}>
                                                                        Action
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('action', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-talent)` }}>
                                                                        <SortHeader id="staffName" label="Talent" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('talent', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-service)` }}>
                                                                        <SortHeader id="service" label="Services / Products" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('service', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-date)` }}>
                                                                        <SortHeader id="startDate" label="Schedule Date" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('date', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-scheduled)` }}>
                                                                        <SortHeader id="scheduledShift" label="Scheduled Shift" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('scheduled', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-actual)` }}>
                                                                        <SortHeader id="actualShift" label="Actual Shift" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('actual', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-variance)` }}>
                                                                        <SortHeader id="variance" label="Variance" align="text-center" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('variance', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-rateType)` }}>
                                                                        <SortHeader id="rateType" label="Rate Type" align="text-center" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('rateType', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-invoice)` }}>
                                                                        <SortHeader id="invoice" label="Total Invoice" align="text-right" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('invoice', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-bill)` }}>
                                                                        <SortHeader id="bill" label="Total Bill" align="text-right" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('bill', e)} />
                                                                    </th>
                                                                    <th className="relative group text-right px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap truncate" style={{ width: `var(--col-netIncome)` }}>
                                                                        Net Income
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('netIncome', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-commission)` }}>
                                                                        <SortHeader id="commission" label="Commission" align="text-center" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('commission', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-minimum)` }}>
                                                                        <SortHeader id="minimum" label="Minimum" align="text-right" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('minimum', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-status)` }}>
                                                                        <SortHeader id="status" label="Status" align="text-center" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('status', e)} />
                                                                    </th>
                                                                    <th className="relative group p-0 truncate" style={{ width: `var(--col-notes)` }}>
                                                                        <SortHeader id="notes" label="Notes" className="min-w-[250px]" />
                                                                        <TableColumnResizeHandle onMouseDown={e => onMouseDown('notes', e)} />
                                                                    </th>
                                                                </>
                                                            )}
                                                            {/* <th className="text-right px-3 py-2 font-bold text-red-600 bg-red-50/5 whitespace-normal max-w-[100px]">Total Bill</th>
                                                    <th className="text-right px-3 py-2 font-bold text-foreground bg-slate-50/5 whitespace-normal max-w-[100px]">Total Invoice</th>
                                                    <th className="text-right px-3 py-2 font-bold text-foreground bg-slate-50/5 whitespace-normal max-w-[100px]">Net Income</th> */}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(() => {
                                                            const baseFiltered = group.callTimes.filter(shouldIncludeRowForSubTab);
                                                            const filtered = applyDetailToolbarFilters(baseFiltered);

                                                            if (subTab === 'invoice') {
                                                                return filtered.map(ct => (
                                                                    <TimesheetTableRow
                                                                        key={ct.id}
                                                                        ct={ct}
                                                                        isExpanded={expandedRows.has(ct.id)}
                                                                        isSelected={selectedRows.has(ct.id)}
                                                                        onToggleExpand={toggleExpand}
                                                                        onToggleSelect={toggleSelect}
                                                                        onViewEvent={(id) => router.push(`/projects/${id}`)}
                                                                        onSaveTimeEntry={handleSaveTimeEntry}
                                                                        onApprove={handleApprove}
                                                                        onReject={handleReject}
                                                                        onReview={handleReview}
                                                                        onPending={handlePending}
                                                                        onEditTask={handleEditTask}
                                                                        subTab={subTab}
                                                                        rowVariant="card"
                                                                    />
                                                                ));
                                                            }

                                                            if (subTab !== 'bill') {
                                                                return filtered.map(ct => (
                                                                    <TimesheetTableRow
                                                                        key={ct.id}
                                                                        ct={ct}
                                                                        isExpanded={expandedRows.has(ct.id)}
                                                                        isSelected={selectedRows.has(ct.id)}
                                                                        onToggleExpand={toggleExpand}
                                                                        onToggleSelect={toggleSelect}
                                                                        onViewEvent={(id) => router.push(`/projects/${id}`)}
                                                                        onSaveTimeEntry={handleSaveTimeEntry}
                                                                        onApprove={handleApprove}
                                                                        onReject={handleReject}
                                                                        onReview={handleReview}
                                                                        onPending={handlePending}
                                                                        onEditTask={handleEditTask}
                                                                        subTab={subTab}
                                                                        rowVariant="card"
                                                                    />
                                                                ));
                                                            }

                                                            // Group by event for the staff detail view (if they have multiple assignments on same event)
                                                            const eventMap = new Map<string, CallTimeRow>();
                                                            filtered.forEach(ct => {
                                                                const eid = ct.event?.id;
                                                                if (!eid) return;
                                                                if (!eventMap.has(eid)) {
                                                                    eventMap.set(eid, { ...ct, invitations: [...ct.invitations], mergedRows: [ct] });
                                                                } else {
                                                                    const existing = eventMap.get(eid)!;
                                                                    if (existing.service?.title && ct.service?.title && !existing.service.title.includes(ct.service.title)) {
                                                                        existing.service.title = `${existing.service.title} & ${ct.service.title}`;
                                                                    }
                                                                    if (ct.notes && ct.notes !== existing.notes) {
                                                                        existing.notes = existing.notes ? `${existing.notes} | ${ct.notes}` : ct.notes;
                                                                    }
                                                                    existing.invitations.push(...ct.invitations);
                                                                    if (!existing.mergedRows) existing.mergedRows = [];
                                                                    existing.mergedRows.push(ct);
                                                                }
                                                            });

                                                            return Array.from(eventMap.values()).map(ct => (
                                                                <TimesheetTableRow
                                                                    key={ct.id}
                                                                    ct={ct}
                                                                    isExpanded={expandedRows.has(ct.id)}
                                                                    isSelected={selectedRows.has(ct.id)}
                                                                    onToggleExpand={toggleExpand}
                                                                    onToggleSelect={toggleSelect}
                                                                    onViewEvent={(id) => router.push(`/projects/${id}`)}
                                                                    onSaveTimeEntry={handleSaveTimeEntry}
                                                                    onApprove={handleApprove}
                                                                    onReject={handleReject}
                                                                    onReview={handleReview}
                                                                    onPending={handlePending}
                                                                    onEditTask={handleEditTask}
                                                                    subTab={subTab}
                                                                    rowVariant="card"
                                                                />
                                                            ));
                                                        })()}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {(subTab === 'bill' ? billGroups : eventGroups)
                            .filter(g => g.eventId === selectedEventId)
                            .map((group) => (
                                <div key={group.eventId + (group.staffId ? '_' + group.staffId : '')} className="space-y-4">
                                    <div className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="flex flex-col gap-2 min-w-0 flex-1">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={clearTimesheetDrillDown}
                                                    className="h-8 w-fit -ml-2 px-2 text-sm font-normal text-muted-foreground hover:text-foreground"
                                                >
                                                    <ChevronLeftIcon className="h-4 w-4 mr-0.5" />
                                                    Back to Summary
                                                </Button>
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <span className="text-xl font-bold tracking-tight text-foreground">{group.eventTitle}</span>
                                                    <Badge variant="outline" className="shrink-0 text-xs font-medium">{group.eventDisplayId}</Badge>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                                    <span className="inline-flex text-xs font-medium rounded-md border border-border bg-muted/40 px-2.5 py-1 text-foreground">
                                                        {subTab === 'bill' ? (
                                                            group.callTimes[0]?.staff
                                                                ? `${group.callTimes[0].staff.firstName} ${group.callTimes[0].staff.lastName}`
                                                                : 'No Talent'
                                                        ) : (group.clientName || 'No Client')}
                                                    </span>
                                                    <span className="flex flex-wrap items-center gap-1.5">
                                                        <span className="text-muted-foreground">Location:</span>
                                                        <span className="font-medium text-foreground">
                                                            {group.venueName || '—'}
                                                            {(group.city || group.state) && (
                                                                <span className="font-normal text-muted-foreground">
                                                                    {' '}
                                                                    ({[group.city, group.state].filter(Boolean).join(', ')})
                                                                </span>
                                                            )}
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0 sm:pt-1">
                                                <CallTimeExportDropdown {...getDetailExportProps(group)} />
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    className="gap-1.5 h-9 px-4 text-sm font-medium"
                                                    onClick={() => handleEditEvent(group.eventId)}
                                                >
                                                    <EditIcon className="h-3.5 w-3.5" />
                                                    Edit Tasks
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                    {detailSubTabPills}
                                    <TimesheetEventSummaryCards rows={group.callTimes.filter(shouldIncludeRowForSubTab)} subTab={subTab} />
                                    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                                        <div className="border-b border-border bg-muted/15 px-4 py-3">
                                            <TimesheetDetailToolbar
                                                search={detailSearch}
                                                onSearchChange={setDetailSearch}
                                                status={detailStatus}
                                                onStatusChange={setDetailStatus}
                                                commission={detailCommission}
                                                onCommissionChange={setDetailCommission}
                                                rateType={detailRateType}
                                                onRateTypeChange={setDetailRateType}
                                                variance={detailVariance}
                                                onVarianceChange={setDetailVariance}
                                                onCustomizeColumns={() =>
                                                    toast({
                                                        title: 'Customize columns',
                                                        description: 'Column visibility will be available in a future update.',
                                                    })
                                                }
                                                exportControl={<span className="hidden" aria-hidden />}
                                                subTab={subTab}
                                            />
                                        </div>
                                        <div className="p-4">
                                            <div className="overflow-x-auto">
                                                <table className="w-full border-separate border-spacing-y-2 text-sm text-foreground antialiased">
                                                    <thead>
                                                        <tr className="border-0 bg-transparent">
                                                            <th className="w-8 px-2 py-3 align-bottom">
                                                                {(() => {
                                                                    const groupIds = group.callTimes.map((ct) => ct.id);
                                                                    const isGroupAllSelected = groupIds.length > 0 && groupIds.every((id) => selectedRows.has(id));
                                                                    return (
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isGroupAllSelected}
                                                                            onChange={() => toggleSelectAll(groupIds)}
                                                                            className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
                                                                        />
                                                                    );
                                                                })()}
                                                            </th>
                                                            <th className="w-8 px-2 py-3 align-bottom" />
                                                            {subTab === 'commission' && (
                                                                <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                                                                    Action
                                                                </th>
                                                            )}
                                                            {subTab === 'invoice' ? (
                                                                <>
                                                                    <SortHeader id="startDate" label="Service Date" />
                                                                    <SortHeader id="service" label="Services / Products" />
                                                                    <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground whitespace-normal min-w-[500px]">Description</th>
                                                                    <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap">Qty</th>
                                                                    <SortHeader id="invoice" label="Total Invoice" align="text-right" />
                                                                    <SortHeader id="bill" label="Total Bill" align="text-right" />
                                                                    <th className="text-right px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap">Net Income</th>
                                                                </>
                                                            ) : subTab === 'commission' ? (
                                                                <>
                                                                    <SortHeader id="staffName" label="Team / User" />
                                                                    <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Invoice Description</th>
                                                                    <SortHeader id="price" label="Commission Price" align="text-right" />
                                                                    <SortHeader id="status" label="Status" align="text-center" />
                                                                </>
                                                            ) : subTab === 'bill' ? (
                                                                <>
                                                                    <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap">Category</th>
                                                                    <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground min-w-[500px]">Bill Description</th>
                                                                    <SortHeader id="invoice" label="Total Invoice" align="text-right" />
                                                                    <SortHeader id="bill" label="Total Bill" align="text-right" />
                                                                    <th className="text-right px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap">Net Income</th>
                                                                    <SortHeader id="status" label="Status" align="text-center" />
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                                                                        Action
                                                                    </th>
                                                                    <SortHeader id="staffName" label="Talent" />
                                                                    <SortHeader id="service" label="Services / Products" />
                                                                    <SortHeader id="startDate" label="Schedule Date" />
                                                                    <SortHeader id="scheduledShift" label="Scheduled Shift" />
                                                                    <SortHeader id="actualShift" label="Actual Shift" />
                                                                    <SortHeader id="variance" label="Variance" align="text-center" />
                                                                    <SortHeader id="rateType" label="Rate Type" align="text-center" />
                                                                    <SortHeader id="invoice" label="Total Invoice" align="text-right" />
                                                                    <SortHeader id="bill" label="Total Bill" align="text-right" />
                                                                    <th className="text-right px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                                                                        Net Income
                                                                    </th>
                                                                    <SortHeader id="commission" label="Commission" align="text-center" />
                                                                    <SortHeader id="minimum" label="Minimum" align="text-right" />
                                                                    <SortHeader id="status" label="Status" align="text-center" />
                                                                    <SortHeader id="notes" label="Notes" className="min-w-[250px]" />
                                                                </>
                                                            )}
                                                            {/* <th className="text-right px-3 py-2 font-bold text-red-600 bg-red-50/5 whitespace-normal max-w-[100px]">Total Bill</th>
                                                    <th className="text-right px-3 py-2 font-bold text-foreground bg-slate-50/5 whitespace-normal max-w-[100px]">Total Invoice</th>
                                                    <th className="text-right px-3 py-2 font-bold text-foreground bg-slate-50/5 whitespace-normal max-w-[100px]">Net Income</th> */}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(() => {
                                                            const baseFiltered = group.callTimes.filter(shouldIncludeRowForSubTab);
                                                            const filtered = applyDetailToolbarFilters(baseFiltered);

                                                            if (subTab === 'invoice') {
                                                                const serviceMap = new Map<string, CallTimeRow>();
                                                                filtered.forEach(ct => {
                                                                    const sid = ct.service?.id || 'none';
                                                                    const sDate = formatDate(ct.startDate);
                                                                    const key = `${sDate}_${sid}_${ct.callTimeId}`;
                                                                    if (!serviceMap.has(key)) {
                                                                        serviceMap.set(key, { ...ct, mergedRows: [ct] });
                                                                    } else {
                                                                        const existing = serviceMap.get(key)!;
                                                                        if (ct.notes && !existing.notes?.includes(ct.notes)) {
                                                                            existing.notes = existing.notes ? `${existing.notes} | ${ct.notes}` : ct.notes;
                                                                        }
                                                                        if (!existing.mergedRows) existing.mergedRows = [];
                                                                        existing.mergedRows.push(ct);
                                                                    }
                                                                });
                                                                return Array.from(serviceMap.values()).map(ct => (
                                                                    <TimesheetTableRow
                                                                        key={ct.id}
                                                                        ct={ct}
                                                                        isExpanded={expandedRows.has(ct.id)}
                                                                        isSelected={selectedRows.has(ct.id)}
                                                                        onToggleExpand={toggleExpand}
                                                                        onToggleSelect={toggleSelect}
                                                                        onViewEvent={(id) => router.push(`/projects/${id}`)}
                                                                        onSaveTimeEntry={handleSaveTimeEntry}
                                                                        onApprove={handleApprove}
                                                                        onReject={handleReject}
                                                                        onReview={handleReview}
                                                                        onPending={handlePending}
                                                                        onEditTask={handleEditTask}
                                                                        subTab={subTab}
                                                                        rowVariant="card"
                                                                    />
                                                                ));
                                                            }

                                                            if (subTab !== 'bill') {
                                                                return filtered.map(ct => (
                                                                    <TimesheetTableRow
                                                                        key={ct.id}
                                                                        ct={ct}
                                                                        isExpanded={expandedRows.has(ct.id)}
                                                                        isSelected={selectedRows.has(ct.id)}
                                                                        onToggleExpand={toggleExpand}
                                                                        onToggleSelect={toggleSelect}
                                                                        onViewEvent={(id) => router.push(`/projects/${id}`)}
                                                                        onSaveTimeEntry={handleSaveTimeEntry}
                                                                        onApprove={handleApprove}
                                                                        onReject={handleReject}
                                                                        onReview={handleReview}
                                                                        onPending={handlePending}
                                                                        onEditTask={handleEditTask}
                                                                        subTab={subTab}
                                                                        rowVariant="card"
                                                                    />
                                                                ));
                                                            }

                                                            // Group by staff for the event detail view
                                                            const staffMap = new Map<string, CallTimeRow>();
                                                            filtered.forEach(ct => {
                                                                const sid = ct.staff?.id;
                                                                if (!sid) return;
                                                                if (!staffMap.has(sid)) {
                                                                    staffMap.set(sid, { ...ct, invitations: [...ct.invitations], mergedRows: [ct] });
                                                                } else {
                                                                    const existing = staffMap.get(sid)!;
                                                                    if (existing.service?.title && ct.service?.title && !existing.service.title.includes(ct.service.title)) {
                                                                        existing.service.title = `${existing.service.title} & ${ct.service.title}`;
                                                                    }
                                                                    if (ct.notes && ct.notes !== existing.notes) {
                                                                        existing.notes = existing.notes ? `${existing.notes} | ${ct.notes}` : ct.notes;
                                                                    }
                                                                    existing.invitations.push(...ct.invitations);
                                                                    if (!existing.mergedRows) existing.mergedRows = [];
                                                                    existing.mergedRows.push(ct);
                                                                }
                                                            });

                                                            return Array.from(staffMap.values()).map(ct => (
                                                                <TimesheetTableRow
                                                                    key={ct.id}
                                                                    ct={ct}
                                                                    isExpanded={expandedRows.has(ct.id)}
                                                                    isSelected={selectedRows.has(ct.id)}
                                                                    onToggleExpand={toggleExpand}
                                                                    onToggleSelect={toggleSelect}
                                                                    onViewEvent={(id) => router.push(`/projects/${id}`)}
                                                                    onSaveTimeEntry={handleSaveTimeEntry}
                                                                    onApprove={handleApprove}
                                                                    onReject={handleReject}
                                                                    onReview={handleReview}
                                                                    onPending={handlePending}
                                                                    onEditTask={handleEditTask}
                                                                    subTab={subTab}
                                                                    rowVariant="card"
                                                                />
                                                            ));
                                                        })()}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                )}

                <ConfirmDialog
                    open={confirmState.open}
                    onClose={() => setConfirmState({ open: false, type: null, ids: [] })}
                    onConfirm={executeConfirmedAction}
                    title={
                        confirmState.type === 'APPROVE' ? 'Approve Assignments' :
                            confirmState.type === 'REJECT' ? 'Reject Assignments' :
                                confirmState.type === 'REVIEW' ? 'Mark for Review' : 'Set as Pending'
                    }
                    description={
                        confirmState.type === 'APPROVE'
                            ? `Are you sure you want to approve ${confirmState.ids.length} item(s)? This will make them eligible for invoicing.` :
                            confirmState.type === 'REJECT'
                                ? `Are you sure you want to reject ${confirmState.ids.length} item(s)? This will exclude them from invoicing.` :
                                confirmState.type === 'REVIEW'
                                    ? `Mark ${confirmState.ids.length} item(s) for review?` : `Set ${confirmState.ids.length} item(s) back to pending?`
                    }
                    confirmLabel={
                        confirmState.type === 'APPROVE' ? 'Yes, Approve' :
                            confirmState.type === 'REJECT' ? 'Yes, Reject' :
                                confirmState.type === 'REVIEW' ? 'Confirm Review' : 'Yes, Set Pending'
                    }
                    variant={
                        confirmState.type === 'APPROVE' ? 'success' :
                            confirmState.type === 'REJECT' ? 'destructive' :
                                confirmState.type === 'REVIEW' ? 'info' : 'default'
                    }
                    isLoading={reviewInvitationMutation.isPending}
                />

                {/* Task Manager Edit Modal */}
                {editingTask && (
                    <CallTimeFormModal
                        open={isEditTaskOpen}
                        onClose={() => {
                            setIsEditTaskOpen(false);
                            setEditingTask(null);
                        }}
                        eventId={editingTask.event.id}
                        callTime={{
                            id: editingTask.id,
                            callTimeId: editingTask.callTimeId,
                            serviceId: editingTask.service?.id || '',
                            numberOfStaffRequired: editingTask.numberOfStaffRequired,
                            skillLevel: editingTask.skillLevel as any,
                            ratingRequired: (editingTask as any).ratingRequired ?? null,
                            startDate: editingTask.startDate ? (typeof editingTask.startDate === 'string' ? parseISO(editingTask.startDate) : editingTask.startDate) : null,
                            startTime: editingTask.startTime,
                            endDate: editingTask.endDate ? (typeof editingTask.endDate === 'string' ? parseISO(editingTask.endDate) : editingTask.endDate) : null,
                            endTime: editingTask.endTime,
                            payRate: editingTask.payRate as any,
                            payRateType: editingTask.payRateType as any,
                            billRate: editingTask.billRate as any,
                            billRateType: editingTask.billRateType as any,
                            customCost: (editingTask as any).customCost ?? null,
                            customPrice: (editingTask as any).customPrice ?? null,
                            approveOvertime: editingTask.approveOvertime ?? false,
                            overtimeRate: (editingTask.overtimeRate as any) ?? null,
                            overtimeRateType: (editingTask.overtimeRateType as any) ?? null,
                            commission: editingTask.commission ?? false,
                            commissionAmount: editingTask.commissionAmount as any,
                            commissionAmountType: editingTask.commissionAmountType as any,
                            applyMinimum: editingTask.applyMinimum ?? false,
                            minimum: editingTask.minimum as any,
                            travelInMinimum: editingTask.travelInMinimum ?? false,
                            expenditure: editingTask.expenditure ?? false,
                            expenditureCost: editingTask.expenditureCost as any,
                            expenditurePrice: editingTask.expenditurePrice as any,
                            expenditureAmountType: editingTask.expenditureAmountType as any,
                            notes: editingTask.notes,
                        }}
                        onSubmit={(data) => {
                            updateCallTimeMutation.mutate({
                                id: editingTask.id,
                                ...data as any,
                            });
                        }}
                        isSubmitting={updateCallTimeMutation.isPending}
                    />
                )}

                {/* Event Form Modal */}
                <EventFormModal
                    open={isEditEventOpen}
                    onClose={() => {
                        setIsEditEventOpen(false);
                        setEditingEventId(null);
                    }}
                    event={fullEventData ? {
                        ...fullEventData,
                        dailyDigestMode: (fullEventData as any).dailyDigestMode ?? false,
                        requireStaff: (fullEventData as any).requireStaff ?? false,
                    } as any : null}
                    onSubmit={async (data, attachments) => {
                        if (editingEventId) {
                            try {
                                await updateEventMutation.mutateAsync({ id: editingEventId, ...data as any });
                                if (attachments) {
                                    await bulkSyncCallTimesMutation.mutateAsync({
                                        eventId: editingEventId,
                                        assignments: attachments.callTimes as any,
                                    });
                                    await bulkUpdateProductsMutation.mutateAsync({
                                        eventId: editingEventId,
                                        products: attachments.products as any,
                                    });
                                }
                                utils.timeEntry.getTimeManagerRows.invalidate();
                                setIsEditEventOpen(false);
                            } catch (error) {
                                // Error handled by mutation
                            }
                        }
                    }}
                    isSubmitting={updateEventMutation.isPending || bulkSyncCallTimesMutation.isPending || bulkUpdateProductsMutation.isPending}
                />
            </div>
        </div>
    );
}