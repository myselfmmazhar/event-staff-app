'use client';

import { useState, useMemo } from 'react';
import type React from 'react';
import { trpc } from '@/lib/client/trpc';
import { TimesheetHeader, TimesheetFilters, EventGroupTable, TimesheetSummaryTable, TimesheetTableRow, ConfirmDialog } from '@/components/timesheet';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeftIcon, CheckIcon, CloseIcon, MoreVerticalIcon, CheckCircleIcon } from '@/components/ui/icons';
import type { SortField, SortOrder, StaffingFilter, EventGroup, CallTimeRow, TimesheetTab, ClientGroup, TalentGroup } from '@/components/timesheet/types';
import { TimesheetClientSummaryTable, TimesheetTalentSummaryTable } from '@/components/timesheet';

export default function TimeManagerPage() {
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
    const [subTab, setSubTab] = useState<'all' | 'bill' | 'invoice'>('all');

    // ── Row State ──
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const [confirmState, setConfirmState] = useState<{
        open: boolean;
        type: 'APPROVE' | 'REJECT' | 'REVIEW' | null;
        ids: string[];
    }>({ open: false, type: null, ids: [] });

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
        const rating = inv?.internalReviewRating ?? inv?.invitations?.[0]?.internalReviewRating ?? null;
        return rating === 'DID_NOT_MEET' || rating === 'NO_CALL_NO_SHOW';
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
        otPrice?: number | null
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

    const handleApprove = (id: string) => setConfirmState({ open: true, type: 'APPROVE', ids: [id] });
    const handleReject = (id: string) => setConfirmState({ open: true, type: 'REJECT', ids: [id] });
    const handleReview = (id: string) => setConfirmState({ open: true, type: 'REVIEW', ids: [id] });

    const handleBatchApprove = () => setConfirmState({ open: true, type: 'APPROVE', ids: Array.from(selectedRows) });
    const handleBatchReject = () => setConfirmState({ open: true, type: 'REJECT', ids: Array.from(selectedRows) });
    const handleBatchReview = () => setConfirmState({ open: true, type: 'REVIEW', ids: Array.from(selectedRows) });

    const executeConfirmedAction = () => {
        const { type, ids } = confirmState;
        if (!type || ids.length === 0) return;

        reviewInvitationMutation.mutate(
            { invitationIds: ids, decision: type },
            {
                onSuccess: (res: any) => {
                    utils.timeEntry.getTimeManagerRows.invalidate();
                    if (type === 'APPROVE') {
                        generateInvoicesMutation.mutate({ invitationIds: ids });
                    } else {
                        toast({
                            title: type === 'REJECT' ? 'Rejected' : 'Reviewed',
                            description: ids.length > 1 
                                ? `Successfully processed ${ids.length} items.` 
                                : `Successfully processed the selected item.`,
                        });
                    }
                    setSelectedRows((prev) => {
                        const next = new Set(prev);
                        ids.forEach(id => next.delete(id));
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
    
    // 1. Group by Task (Event)
    const eventGroups: EventGroup[] = useMemo(() => {
        const groupsMap = new Map<string, EventGroup>();

        assignments.forEach((inv: any) => {
            const eid = inv.callTime.event.id;
            if (!groupsMap.has(eid)) {
                groupsMap.set(eid, {
                    eventId: eid,
                    eventTitle: inv.callTime.event.title,
                    eventDisplayId: inv.callTime.event.eventId,
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

        return Array.from(groupsMap.values()).sort((a, b) => a.eventTitle.localeCompare(b.eventTitle));
    }, [assignments]);

    // 2. Group by Client
    const clientGroups: ClientGroup[] = useMemo(() => {
        const groupsMap = new Map<string, ClientGroup>();

        assignments.forEach((inv: any) => {
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

        return Array.from(groupsMap.values()).sort((a, b) => a.clientName.localeCompare(b.clientName));
    }, [assignments]);

    // 3. Group by Talent (Staff)
    const talentGroups: TalentGroup[] = useMemo(() => {
        const groupsMap = new Map<string, TalentGroup>();

        assignments.forEach((inv: any) => {
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

        return Array.from(groupsMap.values()).sort((a, b) => a.staffName.localeCompare(b.staffName));
    }, [assignments]);

    return (
        <div className="flex flex-col min-h-screen">
            <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
                <TimesheetHeader
                    eventPluralLabel="Events"
                    showFilters={showFilters}
                    onToggleFilters={() => setShowFilters(!showFilters)}
                    hasActiveFilters={dateFrom || dateTo || search}
                    callTimes={assignments as any} // Header uses this for export
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
                />

                {(selectedEventId || selectedClientId || selectedStaffId) && (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setSelectedEventId(null);
                                setSelectedClientId(null);
                                setSelectedStaffId(null);
                            }}
                            className="flex items-center gap-1"
                        >
                            <ChevronLeftIcon className="h-4 w-4" />
                            Back to Summary
                        </Button>
                    </div>
                )}

                {(selectedEventId || selectedClientId || selectedStaffId) && (
                    <div className="flex items-center gap-1 border-b border-border mb-4">
                        <button
                            onClick={() => setSubTab('all')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${subTab === 'all'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setSubTab('bill')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${subTab === 'bill'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                                }`}
                        >
                            Bill
                        </button>
                        <button
                            onClick={() => setSubTab('invoice')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${subTab === 'invoice'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                                }`}
                        >
                            Invoice
                        </button>
                    </div>
                )}

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
                        totalAssignments={assignments.length}
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
                ) : assignments.length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 gap-2">
                        <span className="text-sm font-semibold text-foreground">No records found</span>
                        <p className="text-xs text-muted-foreground">Try adjusting your filters or inviting staff in the Events module.</p>
                    </div>
                ) : !selectedEventId && !selectedClientId && !selectedStaffId ? (
                    <>
                        {activeTab === 'task' && (
                            <TimesheetSummaryTable
                                eventGroups={eventGroups}
                                onEventClick={(id) => setSelectedEventId(id)}
                            />
                        )}
                        {activeTab === 'client' && (
                            <TimesheetClientSummaryTable
                                clientGroups={clientGroups}
                                onClientClick={(id) => setSelectedClientId(id)}
                            />
                        )}
                        {activeTab === 'talent' && (
                            <TimesheetTalentSummaryTable
                                talentGroups={talentGroups}
                                onTalentClick={(id) => setSelectedStaffId(id)}
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
                                <div key={group.eventId} className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
                                    <div className="px-4 py-3 bg-gradient-to-r from-muted/50 to-muted/20 border-b border-border flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="font-semibold text-lg text-foreground">{group.eventTitle}</span>
                                            <Badge variant="outline">{group.eventDisplayId}</Badge>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-border bg-muted/15">
                                                    <th className="w-8 px-2 py-2">
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
                                                    <th className="w-8 px-2 py-2" />
                                                    <th className="text-center px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Action</th>
                                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">First Name</th>
                                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Last Name</th>
                                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Position</th>
                                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Start Date</th>
                                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Start Time</th>
                                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">End Date</th>
                                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">End Time</th>
                                                    <th className="text-center px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Hrs Sched</th>
                                                    {(subTab === 'all' || subTab === 'bill') && (
                                                        <>
                                                            <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Pay Rate</th>
                                                            <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Rate Type</th>
                                                        </>
                                                    )}
                                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Clock In</th>
                                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Clock Out</th>
                                                    <th className="text-center px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Hrs Clo</th>
                                                    {(subTab === 'all' || subTab === 'bill') && (
                                                        <>
                                                            <th className="text-right px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Sched Cost</th>
                                                            <th className="text-right px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">{subTab === 'bill' ? 'Bill' : 'Clo Cost'}</th>
                                                            <th className="text-right px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">OT Cost</th>
                                                        </>
                                                    )}
                                                    <th className="text-right px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Base Bill</th>
                                                    <th className="text-right px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">OT Price</th>
                                                    <th className="text-right px-3 py-2 font-bold text-red-600 bg-red-50/5 whitespace-nowrap">Bill Amount</th>
                                                    <th className="text-right px-3 py-2 font-bold text-emerald-600 bg-emerald-50/5 whitespace-nowrap">Invoice Amount</th>
                                                    <th className="text-right px-3 py-2 font-bold text-blue-600 bg-blue-50/5 whitespace-nowrap">Gross Profit</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {group.callTimes.map((ct) => (
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
                                                        subTab={subTab}
                                                    />
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                    </div>
                ) : selectedStaffId ? (
                    <div className="space-y-4">
                        {talentGroups
                            .filter(g => g.staffId === selectedStaffId)
                            .map((group) => (
                                <div key={group.staffId} className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
                                    <div className="px-4 py-3 bg-gradient-to-r from-muted/50 to-muted/20 border-b border-border flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="font-semibold text-lg text-foreground">{group.staffName}</span>
                                            <Badge variant="outline">Assignments</Badge>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-border bg-muted/15">
                                                    <th className="w-8 px-2 py-2">
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
                                                    <th className="w-8 px-2 py-2" />
                                                    <th className="text-center px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Action</th>
                                                    <th colSpan={2} className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Event / Task</th>
                                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Position</th>
                                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Start Date</th>
                                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Start Time</th>
                                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">End Date</th>
                                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">End Time</th>
                                                    <th className="text-center px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Hrs Sched</th>
                                                    {(subTab === 'all' || subTab === 'bill') && (
                                                        <>
                                                            <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Pay Rate</th>
                                                            <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Rate Type</th>
                                                        </>
                                                    )}
                                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Clock In</th>
                                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Clock Out</th>
                                                    <th className="text-center px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Hrs Clo</th>
                                                    {(subTab === 'all' || subTab === 'bill') && (
                                                        <>
                                                            <th className="text-right px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Sched Cost</th>
                                                            <th className="text-right px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">{subTab === 'bill' ? 'Bill' : 'Clo Cost'}</th>
                                                            <th className="text-right px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">OT Cost</th>
                                                        </>
                                                    )}
                                                    <th className="text-right px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Base Bill</th>
                                                    <th className="text-right px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">OT Price</th>
                                                    <th className="text-right px-3 py-2 font-bold text-red-600 bg-red-50/5 whitespace-nowrap">Bill Amount</th>
                                                    <th className="text-right px-3 py-2 font-bold text-emerald-600 bg-emerald-50/5 whitespace-nowrap">Invoice Amount</th>
                                                    <th className="text-right px-3 py-2 font-bold text-blue-600 bg-blue-50/5 whitespace-nowrap">Gross Profit</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {group.callTimes.map((ct) => (
                                                    <TimesheetTableRow
                                                        key={ct.id}
                                                        ct={{
                                                            ...ct,
                                                            // Use event title for the name columns if possible, but TableRow expects first/last name
                                                            // Actually, TableRow might need adjustment if used for Talent view
                                                        }}
                                                        isExpanded={expandedRows.has(ct.id)}
                                                        isSelected={selectedRows.has(ct.id)}
                                                        onToggleExpand={toggleExpand}
                                                        onToggleSelect={toggleSelect}
                                                        onViewEvent={(id) => router.push(`/projects/${id}`)}
                                                        onSaveTimeEntry={handleSaveTimeEntry}
                                                        showEventName={true}
                                                        onApprove={handleApprove}
                                                        onReject={handleReject}
                                                        onReview={handleReview}
                                                        subTab={subTab}
                                                    />
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {eventGroups
                            .filter(g => g.eventId === selectedEventId)
                            .map((group) => (
                                <div key={group.eventId} className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
                                    <div className="px-4 py-3 bg-gradient-to-r from-muted/50 to-muted/20 border-b border-border flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="font-semibold text-lg text-foreground">{group.eventTitle}</span>
                                            <Badge variant="outline">{group.eventDisplayId}</Badge>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary">
                                                {group.callTimes.length} positions
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-border bg-muted/15">
                                                    <th className="w-8 px-2 py-2">
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
                                                    <th className="w-8 px-2 py-2" />
                                                    <th className="text-center px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Action</th>
                                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">First Name</th>
                                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Last Name</th>
                                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Position</th>
                                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Start Date</th>
                                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Start Time</th>
                                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">End Date</th>
                                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">End Time</th>
                                                    <th className="text-center px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Hrs Sched</th>
                                                    {(subTab === 'all' || subTab === 'bill') && (
                                                        <>
                                                            <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Pay Rate</th>
                                                            <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Rate Type</th>
                                                        </>
                                                    )}
                                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Clock In</th>
                                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Clock Out</th>
                                                    <th className="text-center px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Hrs Clo</th>
                                                    {(subTab === 'all' || subTab === 'bill') && (
                                                        <>
                                                            <th className="text-right px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Sched Cost</th>
                                                            <th className="text-right px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">{subTab === 'bill' ? 'Bill' : 'Clo Cost'}</th>
                                                            <th className="text-right px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">OT Cost</th>
                                                        </>
                                                    )}
                                                    <th className="text-right px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Base Bill</th>
                                                    <th className="text-right px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">OT Price</th>
                                                    <th className="text-right px-3 py-2 font-bold text-red-600 bg-red-50/5 whitespace-nowrap">Bill Amount</th>
                                                    <th className="text-right px-3 py-2 font-bold text-emerald-600 bg-emerald-50/5 whitespace-nowrap">Invoice Amount</th>
                                                    <th className="text-right px-3 py-2 font-bold text-blue-600 bg-blue-50/5 whitespace-nowrap">Gross Profit</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {group.callTimes.map((ct) => (
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
                                                        subTab={subTab}
                                                    />
                                                ))}
                                            </tbody>
                                        </table>
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
                        confirmState.type === 'REJECT' ? 'Reject Assignments' : 'Mark for Review'
                    }
                    description={
                        confirmState.type === 'APPROVE' 
                            ? `Are you sure you want to approve ${confirmState.ids.length} item(s)? This will make them eligible for invoicing.` :
                        confirmState.type === 'REJECT' 
                            ? `Are you sure you want to reject ${confirmState.ids.length} item(s)? This will exclude them from invoicing.` :
                            `Mark ${confirmState.ids.length} item(s) for review?`
                    }
                    confirmLabel={
                        confirmState.type === 'APPROVE' ? 'Yes, Approve' :
                        confirmState.type === 'REJECT' ? 'Yes, Reject' : 'Confirm Review'
                    }
                    variant={
                        confirmState.type === 'APPROVE' ? 'success' :
                        confirmState.type === 'REJECT' ? 'destructive' : 'info'
                    }
                    isLoading={reviewInvitationMutation.isPending}
                />
            </div>
        </div>
    );
}
