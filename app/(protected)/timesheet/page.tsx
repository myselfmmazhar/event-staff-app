'use client';

import { useState, useMemo } from 'react';
import { trpc } from '@/lib/client/trpc';
import { 
    TimesheetHeader, 
    TimesheetFilters, 
    EventGroupTable 
} from '@/components/timesheet';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import type { SortField, SortOrder, StaffingFilter, EventGroup, CallTimeRow } from '@/components/timesheet/types';

export default function TimeManagerPage() {
    const { toast } = useToast();
    const router = useRouter();
    const utils = trpc.useUtils();

    // ── Filters & Sort State ──
    const [search, setSearch] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [staffingFilter, setStaffingFilter] = useState<StaffingFilter>('all');
    const [sortBy, setSortBy] = useState<SortField>('startDate');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

    // ── Row State ──
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

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
        setSelectedRows((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleSelectAll = (ids: string[]) => {
        const allInIdsSelected = ids.every((id) => selectedRows.has(id));
        setSelectedRows((prev) => {
            const next = new Set(prev);
            ids.forEach((id) => (allInIdsSelected ? next.delete(id) : next.add(id)));
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

    const handleSaveTimeEntry = (invitationId: string, clockIn: string | null, clockOut: string | null, breakMins: number) => {
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
        });
    };

    const handleGenerateInvoices = () => {
        if (selectedRows.size === 0) return;
        generateInvoicesMutation.mutate({ invitationIds: Array.from(selectedRows) });
    };

    // ── Data Transformation (Assignments -> Grouped rows for components) ──
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

            // In this specific page, each assignment IS a row.
            // We map invitation data onto the CallTimeRow structure.
            const row: CallTimeRow = {
                ...inv.callTime, // Base shift data
                id: inv.id, // THE ROW ID IS THE INVITATION ID
                staff: inv.staff,
                timeEntry: inv.timeEntry,
                invitations: [inv], // Self-reference for the group count
            };
            
            groupsMap.get(eid)!.callTimes.push(row);
        });

        // Simple sorting for now
        return Array.from(groupsMap.values()).sort((a, b) => a.eventTitle.localeCompare(b.eventTitle));
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
                />

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

                {isLoading ? (
                    <div className="h-48 flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/20">
                        <span className="text-sm text-muted-foreground animate-pulse">Loading data...</span>
                    </div>
                ) : assignments.length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 gap-2">
                        <span className="text-sm font-semibold text-foreground">No records found</span>
                        <p className="text-xs text-muted-foreground">Try adjusting your filters or inviting staff in the Events module.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {eventGroups.map((group) => (
                            <EventGroupTable
                                key={group.eventId}
                                group={group}
                                isCollapsed={collapsedGroups.has(group.eventId)}
                                onToggleGroup={toggleGroup}
                                expandedRows={expandedRows}
                                selectedRows={selectedRows}
                                onToggleExpand={toggleExpand}
                                onToggleSelect={toggleSelect}
                                onToggleSelectAll={toggleSelectAll}
                                onViewEvent={(id) => router.push(`/projects/${id}`)}
                                sortBy={sortBy}
                                sortOrder={sortOrder}
                                onSort={handleSort}
                                onSaveTimeEntry={handleSaveTimeEntry}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
