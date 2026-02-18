'use client';

import { Button, LinkButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeftIcon, RefreshCwIcon } from '@/components/ui/icons';
import { DeleteEventModal } from '@/components/events/delete-event-modal';
import { RestoreEventModal } from '@/components/events/restore-event-modal';
import { ViewEventModal } from '@/components/events/view-event-modal';
import { ArchivedEventTable } from '@/components/events/archived-event-table';
import { Pagination } from '@/components/common/pagination';
import { ActiveFilters } from '@/components/common/active-filters';
import { EventFilters } from '@/components/events/event-filters';
import { EventSearch } from '@/components/events/event-search';
import { trpc } from '@/lib/client/trpc';
import { EventStatus } from '@prisma/client';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import { useEventsFilters, type EventSortBy, type SortOrder } from '@/store/events-filters.store';
import { useUrlSync } from '@/lib/hooks/useUrlSync';
import { useCrudMutations } from '@/lib/hooks/useCrudMutations';
import { useTerminology } from '@/lib/hooks/use-terminology';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/server/routers/_app';

type RouterOutputs = inferRouterOutputs<AppRouter>;
type ArchivedEventsQueryOutput = RouterOutputs['event']['getArchived'];
type ArchivedEventListItem = ArchivedEventsQueryOutput['data'][number];
type ArchivedTableEvent = ComponentProps<typeof ArchivedEventTable>['events'][number];

const EVENT_SORT_FIELDS: EventSortBy[] = [
  'createdAt',
  'updatedAt',
  'startDate',
  'endDate',
  'title',
  'eventId',
  'venueName',
  'status',
];

const EVENT_SORT_FIELD_SET = new Set<EventSortBy>(EVENT_SORT_FIELDS);
const EVENT_STATUS_SET = new Set<EventStatus>(Object.values(EventStatus));

function parseNumberParam(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseStatusesParam(value: string | null): EventStatus[] {
  if (!value) return [];
  const statuses = value.split(',').filter((s) => EVENT_STATUS_SET.has(s as EventStatus));
  return statuses as EventStatus[];
}

function parseClientIdsParam(value: string | null): string[] {
  if (!value) return [];
  return value.split(',').filter((id) => id && id !== 'ALL' && id !== 'all');
}

function parseSortByParam(value: string | null): EventSortBy {
  if (value && EVENT_SORT_FIELD_SET.has(value as EventSortBy)) {
    return value as EventSortBy;
  }
  return 'createdAt';
}

function parseSortOrderParam(value: string | null): SortOrder {
  return value === 'asc' ? 'asc' : 'desc';
}

export default function ArchivedEventsPage() {
  const searchParams = useSearchParams();
  const { terminology } = useTerminology();

  const filters = useEventsFilters();
  const { handleSuccess, handleError, deleteMutationOptions } = useCrudMutations();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const clearSelection = () => setSelectedIds(new Set());

  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedViewEventId, setSelectedViewEventId] = useState<string | null>(null);

  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [restoreTargets, setRestoreTargets] = useState<Array<{ id: string; title: string; eventId: string }>>([]);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string; eventId: string } | null>(null);

  useEffect(() => {
    const page = parseNumberParam(searchParams.get('page'), 1);
    const limit = parseNumberParam(searchParams.get('limit'), 10);
    const search = searchParams.get('search') || '';
    const statuses = parseStatusesParam(searchParams.get('selectedStatuses') ?? searchParams.get('statuses'));
    const clientIds = parseClientIdsParam(searchParams.get('selectedClientIds') ?? searchParams.get('clientIds'));
    const sortBy = parseSortByParam(searchParams.get('sortBy'));
    const sortOrder = parseSortOrderParam(searchParams.get('sortOrder'));
    const startDateFrom = searchParams.get('startDateFrom') || null;
    const startDateTo = searchParams.get('startDateTo') || null;

    filters.setLimit(limit);
    filters.setSearch(search);
    filters.setSelectedStatuses(statuses);
    filters.setSelectedClientIds(clientIds);
    filters.setSortBy(sortBy);
    filters.setSortOrder(sortOrder);
    filters.setStartDateFrom(startDateFrom);
    filters.setStartDateTo(startDateTo);
    filters.setPage(page);
  }, []); // Only run on mount

  useUrlSync(filters, {
    keys: ['page', 'limit', 'search', 'selectedStatuses', 'selectedClientIds', 'sortBy', 'sortOrder', 'startDateFrom', 'startDateTo'],
  });

  const { data, isLoading, refetch } = trpc.event.getArchived.useQuery({
    page: filters.page,
    limit: filters.limit,
    search: filters.search || undefined,
    statuses: filters.selectedStatuses.length > 0 ? filters.selectedStatuses : undefined,
    clientIds: filters.selectedClientIds.length > 0 ? filters.selectedClientIds : undefined,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    startDateFrom: filters.startDateFrom ? new Date(filters.startDateFrom) : undefined,
    startDateTo: filters.startDateTo ? new Date(filters.startDateTo) : undefined,
  });

  const { data: archivedCount, refetch: refetchArchivedCount } = trpc.event.getArchivedCount.useQuery();

  const events = data?.data ?? [];
  const totalPages = data ? Math.ceil(data.meta.total / filters.limit) : 0;

  const restoreManyMutation = trpc.event.restoreMany.useMutation({
    onSuccess: (result) => {
      const count = result.count ?? restoreTargets.length;
      const message =
        count === 1
          ? `${terminology.event.singular} restored successfully`
          : `${count} ${terminology.event.plural} restored successfully`;
      handleSuccess(message);
      setIsRestoreOpen(false);
      setRestoreTargets([]);
      clearSelection();
      refetch();
      refetchArchivedCount();
    },
    onError: handleError,
  });

  const deleteMutation = trpc.event.delete.useMutation(
    deleteMutationOptions(`${terminology.event.singular} deleted successfully`, {
      onSuccess: () => {
        setIsDeleteOpen(false);
        setDeleteTarget(null);
        clearSelection();
        refetch();
        refetchArchivedCount();
      },
    })
  );

  const getEventDetails = (id: string): ArchivedEventListItem | undefined =>
    events.find((evt) => evt.id === id);

  const handleViewEvent = (event: ArchivedEventListItem) => {
    setSelectedViewEventId(event.id);
    setIsViewOpen(true);
  };

  const handleRestoreEvent = (event: ArchivedEventListItem) => {
    setRestoreTargets([{ id: event.id, title: event.title, eventId: event.eventId }]);
    setIsRestoreOpen(true);
  };

  const handleRestoreSelected = () => {
    const targets = events
      .filter((event) => selectedIds.has(event.id))
      .map((event) => ({ id: event.id, title: event.title, eventId: event.eventId }));

    if (targets.length === 0) return;
    setRestoreTargets(targets);
    setIsRestoreOpen(true);
  };

  const handleRestoreConfirm = () => {
    if (restoreTargets.length === 0) return;
    restoreManyMutation.mutate({ ids: restoreTargets.map((e) => e.id) });
  };

  const handleDeleteEvent = (event: ArchivedEventListItem) => {
    setDeleteTarget({ id: event.id, title: event.title, eventId: event.eventId });
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate({ id: deleteTarget.id });
  };

  const handleViewEventFromTable = (event: ArchivedTableEvent) => {
    const eventDetails = getEventDetails(event.id);
    if (eventDetails) {
      handleViewEvent(eventDetails);
    }
  };

  const handleRestoreEventFromTable = (event: ArchivedTableEvent) => {
    const eventDetails = getEventDetails(event.id);
    if (eventDetails) {
      handleRestoreEvent(eventDetails);
    }
  };

  const handleDeleteEventFromTable = (event: ArchivedTableEvent) => {
    const eventDetails = getEventDetails(event.id);
    if (eventDetails) {
      handleDeleteEvent(eventDetails);
    }
  };

  const handleSort = (field: 'createdAt' | 'updatedAt' | 'startDate' | 'endDate' | 'title' | 'eventId' | 'venueName' | 'status') => {
    if (filters.sortBy === field) {
      filters.setSortOrder(filters.sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      filters.setSortBy(field);
      filters.setSortOrder('desc');
    }
  };

  const STATUS_LABELS: Record<EventStatus, string> = {
    DRAFT: 'Draft',
    ASSIGNED: 'Assigned',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  };

  const activeFilters: Array<{ key: string; label: string; value: string; onRemove: () => void }> = [];

  if (filters.search) {
    activeFilters.push({
      key: 'search',
      label: 'Search',
      value: filters.search,
      onRemove: () => filters.setSearch(''),
    });
  }

  if (filters.selectedStatuses.length > 0) {
    const statusLabels = filters.selectedStatuses.map((s) => STATUS_LABELS[s]).join(', ');
    activeFilters.push({
      key: 'statuses',
      label: 'Status',
      value: filters.selectedStatuses.length === 1 ? statusLabels : `${filters.selectedStatuses.length} selected`,
      onRemove: () => filters.setSelectedStatuses([]),
    });
  }

  if (filters.selectedClientIds.length > 0) {
    activeFilters.push({
      key: 'clients',
      label: 'Client',
      value: filters.selectedClientIds.length === 1 ? 'Selected' : `${filters.selectedClientIds.length} selected`,
      onRemove: () => filters.setSelectedClientIds([]),
    });
  }

  if (filters.startDateFrom) {
    activeFilters.push({
      key: 'startDateFrom',
      label: 'Date From',
      value: filters.startDateFrom,
      onRemove: () => filters.setStartDateFrom(null),
    });
  }

  if (filters.startDateTo) {
    activeFilters.push({
      key: 'startDateTo',
      label: 'Date To',
      value: filters.startDateTo,
      onRemove: () => filters.setStartDateTo(null),
    });
  }

  const archivedTitle = useMemo(() => {
    if (typeof archivedCount !== 'number') return `Archived ${terminology.event.plural}`;
    return `Archived ${terminology.event.plural} (${archivedCount})`;
  }, [archivedCount, terminology.event.plural]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{archivedTitle}</h1>
          <p className="text-muted-foreground mt-1">
            Restore or permanently delete archived {terminology.event.lowerPlural}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LinkButton href={`/${terminology.event.route}`} variant="outline">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to {terminology.event.plural}
          </LinkButton>
        </div>
      </div>

      <Card className="p-6 overflow-visible relative z-20">
        <div className="space-y-4">
          <EventSearch
            value={filters.search}
            onChange={filters.setSearch}
            placeholder={`Search archived ${terminology.event.lowerPlural}...`}
          />
          <EventFilters />
          <ActiveFilters filters={activeFilters} />
        </div>
      </Card>

      {selectedIds.size > 0 && (
        <Card className="p-3 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">
              {selectedIds.size} archived {terminology.event.lower}{selectedIds.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRestoreSelected}>
                <RefreshCwIcon className="h-4 w-4 mr-2" />
                Restore selected
              </Button>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                Clear selection
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="relative z-10">
          <ArchivedEventTable
            events={events}
            isLoading={isLoading}
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder}
            onView={handleViewEventFromTable}
            onRestore={handleRestoreEventFromTable}
            onDelete={handleDeleteEventFromTable}
            onSort={handleSort}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />

          {data && data.meta.total > 0 && (
            <div className="mt-6">
              <Pagination
                currentPage={filters.page}
                totalPages={totalPages}
                totalItems={data.meta.total}
                itemsPerPage={filters.limit}
                onPageChange={filters.setPage}
                onItemsPerPageChange={filters.setLimit}
              />
            </div>
          )}
        </div>
      </Card>

      <ViewEventModal
        eventId={selectedViewEventId}
        open={isViewOpen}
        readOnly
        onClose={() => {
          setIsViewOpen(false);
          setSelectedViewEventId(null);
        }}
      />

      <RestoreEventModal
        events={restoreTargets}
        open={isRestoreOpen}
        onClose={() => {
          setIsRestoreOpen(false);
          setRestoreTargets([]);
        }}
        onConfirm={handleRestoreConfirm}
        isRestoring={restoreManyMutation.isPending}
      />

      <DeleteEventModal
        events={deleteTarget ? [deleteTarget] : []}
        open={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
