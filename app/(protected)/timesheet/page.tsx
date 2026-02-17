'use client';

import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from '@/components/ui/icons';
import { trpc } from '@/lib/client/trpc';
import { useTerminology } from '@/lib/hooks/use-terminology';
import { ViewEventModal } from '@/components/events/view-event-modal';
import {
    TimesheetHeader,
    TimesheetFilters,
    EventGroupTable,
} from '@/components/timesheet';
import type { CallTimeRow, EventGroup, SortField, SortOrder, StaffingFilter } from '@/components/timesheet';

/* ════════════════════════ Main Page ════════════════════════ */

export default function TimesheetPage() {
    const { terminology } = useTerminology();

    // Modal state
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

    // Filter & sort state
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState<SortField>('startDate');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
    const [staffingFilter, setStaffingFilter] = useState<StaffingFilter>('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Group accordion state
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

    // Inline expand state
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    // Row selection state
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

    // Fetch data
    const { data: callTimesData, isLoading } = trpc.callTime.getAll.useQuery({
        limit: 100,
        sortBy,
        sortOrder,
        search: search || undefined,
        staffingStatus: staffingFilter,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
    });

    const callTimes = (callTimesData?.data || []) as CallTimeRow[];

    // Group by event
    const eventGroups: EventGroup[] = useMemo(() => {
        const groupMap = new Map<string, EventGroup>();
        for (const ct of callTimes) {
            const key = ct.event.id;
            if (!groupMap.has(key)) {
                groupMap.set(key, {
                    eventId: ct.event.id,
                    eventTitle: ct.event.title,
                    eventDisplayId: ct.event.eventId,
                    callTimes: [],
                });
            }
            groupMap.get(key)!.callTimes.push(ct);
        }
        return Array.from(groupMap.values());
    }, [callTimes]);

    // Handlers
    const toggleGroup = useCallback((eventId: string) => {
        setCollapsedGroups((prev) => {
            const next = new Set(prev);
            next.has(eventId) ? next.delete(eventId) : next.add(eventId);
            return next;
        });
    }, []);

    const toggleExpandRow = useCallback((rowId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedRows((prev) => {
            const next = new Set(prev);
            next.has(rowId) ? next.delete(rowId) : next.add(rowId);
            return next;
        });
    }, []);

    const handleSort = useCallback((field: SortField) => {
        setSortBy((prev) => {
            if (prev === field) {
                setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
                return prev;
            }
            setSortOrder('asc');
            return field;
        });
    }, []);

    const clearFilters = useCallback(() => {
        setSearch('');
        setStaffingFilter('all');
        setDateFrom('');
        setDateTo('');
    }, []);

    const toggleSelectRow = useCallback((rowId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedRows((prev) => {
            const next = new Set(prev);
            next.has(rowId) ? next.delete(rowId) : next.add(rowId);
            return next;
        });
    }, []);

    const toggleSelectAll = useCallback((groupIds: string[]) => {
        setSelectedRows((prev) => {
            const allSelected = groupIds.every((id) => prev.has(id));
            const next = new Set(prev);
            if (allSelected) {
                groupIds.forEach((id) => next.delete(id));
            } else {
                groupIds.forEach((id) => next.add(id));
            }
            return next;
        });
    }, []);

    const selectedCallTimes = useMemo(
        () => callTimes.filter((ct) => selectedRows.has(ct.id)),
        [callTimes, selectedRows],
    );

    const hasActiveFilters = search || staffingFilter !== 'all' || dateFrom || dateTo;
    const eventPluralLabel = terminology.event.plural.toLowerCase();

    return (
        <div className="p-6 space-y-5">
            {/* ──── Header ──── */}
            <TimesheetHeader
                eventPluralLabel={eventPluralLabel}
                showFilters={showFilters}
                onToggleFilters={() => setShowFilters((f) => !f)}
                hasActiveFilters={hasActiveFilters}
                callTimes={callTimes}
                selectedCallTimes={selectedCallTimes}
                selectedCount={selectedRows.size}
            />

            {/* ──── Search + Filters ──── */}
            <TimesheetFilters
                search={search}
                onSearchChange={setSearch}
                showFilters={showFilters}
                onToggleFilters={() => setShowFilters((f) => !f)}
                dateFrom={dateFrom}
                onDateFromChange={setDateFrom}
                dateTo={dateTo}
                onDateToChange={setDateTo}
                staffingFilter={staffingFilter}
                onStaffingFilterChange={setStaffingFilter}
                hasActiveFilters={hasActiveFilters}
                onClearFilters={clearFilters}
                totalAssignments={callTimes.length}
                totalEvents={eventGroups.length}
                eventPluralLabel={eventPluralLabel}
            />

            {/* ──── Table Content ──── */}
            {isLoading ? (
                <div className="rounded-lg border border-border bg-card p-12">
                    <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                </div>
            ) : eventGroups.length === 0 ? (
                <div className="rounded-lg border border-border bg-card p-12 text-center">
                    <div className="mx-auto max-w-md space-y-4">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                            <CalendarIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h2 className="text-xl font-semibold text-foreground">No Assignments Found</h2>
                        <p className="text-muted-foreground">
                            {hasActiveFilters
                                ? 'No assignments match your filters. Try adjusting your search.'
                                : `Create an ${terminology.event.singular.toLowerCase()} with assignments to see them here.`}
                        </p>
                        {hasActiveFilters && (
                            <Button variant="outline" size="sm" onClick={clearFilters}>Clear Filters</Button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {eventGroups.map((group) => (
                        <EventGroupTable
                            key={group.eventId}
                            group={group}
                            isCollapsed={collapsedGroups.has(group.eventId)}
                            onToggleGroup={toggleGroup}
                            expandedRows={expandedRows}
                            selectedRows={selectedRows}
                            onToggleExpand={toggleExpandRow}
                            onToggleSelect={toggleSelectRow}
                            onToggleSelectAll={toggleSelectAll}
                            onViewEvent={setSelectedEventId}
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                            onSort={handleSort}
                        />
                    ))}
                </div>
            )}

            {/* Event Details Modal */}
            <ViewEventModal
                eventId={selectedEventId}
                open={!!selectedEventId}
                onClose={() => setSelectedEventId(null)}
            />
        </div>
    );
}
