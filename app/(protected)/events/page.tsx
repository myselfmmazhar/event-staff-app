'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlusIcon } from '@/components/ui/icons';
import { DeleteEventModal } from '@/components/events/delete-event-modal';
import { ViewEventModal } from '@/components/events/view-event-modal';
import { Pagination } from '@/components/common/pagination';
import { ActiveFilters } from '@/components/common/active-filters';
import { EventFilters } from '@/components/events/event-filters';
import { EventFormModal } from '@/components/events/event-form-modal';
import { EventSearch } from '@/components/events/event-search';
import { EventTable } from '@/components/events/event-table';
import { PageLabelsModal } from '@/components/common/page-labels-modal';
import { trpc } from '@/lib/client/trpc';
import { EventStatus } from '@prisma/client';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, type ComponentProps } from 'react';
import type { CreateEventInput, UpdateEventInput, FileLink, EventDocument } from '@/lib/schemas/event.schema';
import { useEventsFilters, type EventSortBy, type SortOrder } from '@/store/events-filters.store';
import { useUrlSync } from '@/lib/hooks/useUrlSync';
import { useCrudMutations } from '@/lib/hooks/useCrudMutations';
import { useTerminology } from '@/lib/hooks/use-terminology';
import { useEventsPageLabels } from '@/lib/hooks/use-labels';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/server/routers/_app';
import { EventsMapView } from '@/components/events/events-map-view';
import { Map, TableIcon } from 'lucide-react';

type RouterOutputs = inferRouterOutputs<AppRouter>;
type EventsQueryOutput = RouterOutputs['event']['getAll'];
type EventListItem = EventsQueryOutput['data'][number] & {
  dailyDigestMode?: boolean | null;
  requireStaff?: boolean | null;
};
type EventTableEvent = ComponentProps<typeof EventTable>['events'][number];
type EventFormData = NonNullable<ComponentProps<typeof EventFormModal>['event']>;

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

function parseStatusParam(value: string | null): EventStatus | 'ALL' {
  if (value && EVENT_STATUS_SET.has(value as EventStatus)) {
    return value as EventStatus;
  }
  return 'ALL';
}

function parseClientIdParam(value: string | null): string | 'ALL' {
  if (!value) return 'ALL';
  return value === 'ALL' || value === 'all' ? 'ALL' : value;
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

function mapEventToFormEvent(event: EventListItem): EventFormData {
  const normalizedFileLinks: FileLink[] | null = Array.isArray(event.fileLinks)
    ? (event.fileLinks as FileLink[])
    : null;

  const normalizedEventDocuments: EventDocument[] | null = Array.isArray(event.eventDocuments)
    ? (event.eventDocuments as EventDocument[])
    : null;

  return {
    ...event,
    fileLinks: normalizedFileLinks,
    eventDocuments: normalizedEventDocuments,
    dailyDigestMode: event.dailyDigestMode ?? false,
    requireStaff: event.requireStaff ?? false,
  };
}

export default function EventsPage() {
  const searchParams = useSearchParams();
  const { terminology } = useTerminology();
  const eventsLabels = useEventsPageLabels();

  // Use filters store
  const filters = useEventsFilters();

  // Use CRUD mutations hook
  const { backendErrors, setBackendErrors, createMutationOptions, updateMutationOptions, deleteMutationOptions } = useCrudMutations();

  // Local modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventFormData | null>(null);
  const [selectedViewEventId, setSelectedViewEventId] = useState<string | null>(null);

  // View toggle state (table or map)
  const [viewMode, setViewMode] = useState<'table' | 'map'>('table');

  // Initialize store from URL params on mount
  useEffect(() => {
    const page = parseNumberParam(searchParams.get('page'), 1);
    const limit = parseNumberParam(searchParams.get('limit'), 10);
    const search = searchParams.get('search') || '';
    const status = parseStatusParam(searchParams.get('status'));
    const clientId = parseClientIdParam(searchParams.get('clientId'));
    const sortBy = parseSortByParam(searchParams.get('sortBy'));
    const sortOrder = parseSortOrderParam(searchParams.get('sortOrder'));

    filters.setPage(page);
    filters.setLimit(limit);
    filters.setSearch(search);
    filters.setSelectedStatus(status);
    filters.setSelectedClientId(clientId);
    filters.setSortBy(sortBy);
    filters.setSortOrder(sortOrder);
  }, []); // Only run on mount

  // Handle create query parameter
  useEffect(() => {
    const createParam = searchParams.get('create');
    if (createParam === 'true') {
      handleCreateEvent();
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams]);

  // Sync store with URL
  useUrlSync(filters, {
    keys: ['page', 'limit', 'search', 'selectedStatus', 'selectedClientId', 'sortBy', 'sortOrder'],
  });

  // tRPC queries
  const { data, isLoading, refetch } = trpc.event.getAll.useQuery({
    page: filters.page,
    limit: filters.limit,
    search: filters.search || undefined,
    status: filters.selectedStatus === 'ALL' ? undefined : filters.selectedStatus,
    clientId: filters.selectedClientId === 'ALL' ? undefined : filters.selectedClientId,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  });
  const events = data?.data ?? [];

  // tRPC mutations with standardized error handling
  const createMutation = trpc.event.create.useMutation(
    createMutationOptions(`${terminology.event.singular} created successfully`, {
      onSuccess: () => {
        setIsFormOpen(false);
        // Clear filters to show the newly created event
        filters.setSelectedStatus('ALL');
        filters.setSearch('');
        filters.setPage(1);
        refetch();
      },
    })
  );

  const updateMutation = trpc.event.update.useMutation(
    updateMutationOptions(`${terminology.event.singular} updated successfully`, {
      onSuccess: () => {
        setIsFormOpen(false);
        setSelectedEvent(null);
        refetch();
      },
    })
  );

  const deleteMutation = trpc.event.delete.useMutation(
    deleteMutationOptions(`${terminology.event.singular} deleted successfully`, {
      onSuccess: () => {
        setIsDeleteOpen(false);
        setSelectedEvent(null);
        refetch();
      },
    })
  );

  // Handlers
  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setBackendErrors([]);
    setIsFormOpen(true);
  };

  const getEventDetails = (id: string): EventListItem | undefined =>
    events.find((evt) => evt.id === id);

  const handleViewEvent = (event: EventListItem) => {
    setSelectedViewEventId(event.id);
    setIsViewOpen(true);
  };

  const handleEditEvent = (event: EventListItem) => {
    setSelectedEvent(mapEventToFormEvent(event));
    setBackendErrors([]);
    setIsFormOpen(true);
  };

  const handleEditFromView = (event: EventListItem) => {
    // Close view dialog and open edit form
    setIsViewOpen(false);
    setSelectedViewEventId(null);
    setSelectedEvent(mapEventToFormEvent(event));
    setBackendErrors([]);
    setIsFormOpen(true);
  };

  const handleDeleteEvent = (event: EventListItem) => {
    setSelectedEvent(mapEventToFormEvent(event));
    setIsDeleteOpen(true);
  };

  const handleViewEventFromTable = (event: EventTableEvent) => {
    const eventDetails = getEventDetails(event.id);
    if (eventDetails) {
      handleViewEvent(eventDetails);
    }
  };

  const handleEditEventFromTable = (event: EventTableEvent) => {
    const eventDetails = getEventDetails(event.id);
    if (eventDetails) {
      handleEditEvent(eventDetails);
    }
  };

  const handleDeleteEventFromTable = (event: EventTableEvent) => {
    const eventDetails = getEventDetails(event.id);
    if (eventDetails) {
      handleDeleteEvent(eventDetails);
    }
  };

  const handleFormSubmit = (data: CreateEventInput | Omit<UpdateEventInput, 'id'>) => {
    if (selectedEvent) {
      updateMutation.mutate({ id: selectedEvent.id, ...data });
    } else {
      createMutation.mutate(data as CreateEventInput);
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedEvent) {
      deleteMutation.mutate({ id: selectedEvent.id });
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

  const totalPages = data ? Math.ceil(data.meta.total / filters.limit) : 0;

  // Build active filters array
  const STATUS_LABELS: Record<EventStatus, string> = {
    DRAFT: 'Draft',
    PUBLISHED: 'Published',
    CONFIRMED: 'Confirmed',
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

  if (filters.selectedStatus !== 'ALL') {
    activeFilters.push({
      key: 'status',
      label: 'Status',
      value: STATUS_LABELS[filters.selectedStatus],
      onRemove: () => filters.setSelectedStatus('ALL'),
    });
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{eventsLabels.pageTitle}</h1>
          <p className="text-muted-foreground mt-1">
            {eventsLabels.pageSubtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PageLabelsModal
            page="events"
            sections={[
              {
                id: 'page',
                title: 'Page Labels',
                description: 'Customize heading and button text',
                prefix: 'page',
                labels: [
                  { key: 'pageTitle', label: 'Page Title', defaultLabel: `${terminology.event.plural}` },
                  { key: 'pageSubtitle', label: 'Page Subtitle', defaultLabel: `Manage ${terminology.event.lowerPlural} and schedules` },
                  { key: 'addButton', label: 'Add Button', defaultLabel: `New ${terminology.event.singular}` },
                  { key: 'searchPlaceholder', label: 'Search Placeholder', defaultLabel: `Search by title, venue, city, or ${terminology.event.lower} ID...` },
                ],
              },
              {
                id: 'filters',
                title: 'Filter Labels',
                description: 'Customize filter names',
                prefix: 'filters',
                labels: [
                  { key: 'title', label: 'Filters Heading', defaultLabel: 'Filters' },
                  { key: 'status', label: 'Status Filter', defaultLabel: 'Status' },
                  { key: 'client', label: 'Client Filter', defaultLabel: 'Client' },
                ],
              },
              {
                id: 'columns',
                title: 'Table Columns',
                description: 'Customize table column headers',
                prefix: 'columns',
                labels: [
                  { key: 'eventId', label: 'Task ID', defaultLabel: `${terminology.event.singular} ID` },
                  { key: 'title', label: 'Title', defaultLabel: 'Title' },
                  { key: 'venue', label: 'Venue', defaultLabel: 'Venue' },
                  { key: 'startDate', label: 'Start Date', defaultLabel: 'Start Date' },
                  { key: 'status', label: 'Status', defaultLabel: 'Status' },
                  { key: 'client', label: 'Client', defaultLabel: 'Client' },
                  { key: 'actions', label: 'Actions', defaultLabel: 'Actions' },
                ],
              },
            ]}
            buttonVariant="outline"
          />
          <Button onClick={handleCreateEvent}>
            <PlusIcon className="h-5 w-5 mr-2" />
            {eventsLabels.addButton}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="relative z-10 space-y-4">
          <EventSearch
            value={filters.search}
            onChange={filters.setSearch}
            placeholder={eventsLabels.searchPlaceholder}
          />
          <EventFilters />
          <ActiveFilters filters={activeFilters} />
        </div>
      </Card>

      {/* View Mode Toggle */}
      <div className="flex justify-end gap-2 mb-4">
        <Button
          variant={viewMode === 'table' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('table')}
          className="gap-2"
        >
          <TableIcon size={16} />
          Table View
        </Button>
        <Button
          variant={viewMode === 'map' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('map')}
          className="gap-2"
        >
          <Map size={16} />
          Map View
        </Button>
      </div>

      {/* Events Table */}
      {viewMode === 'table' && (
        <Card className="p-6">
          <div className="relative z-10">
            <EventTable
              events={events}
              isLoading={isLoading}
              sortBy={filters.sortBy}
              sortOrder={filters.sortOrder}
              onView={handleViewEventFromTable}
              onEdit={handleEditEventFromTable}
              onDelete={handleDeleteEventFromTable}
              onSort={handleSort}
          />

          {/* Pagination */}
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
      )}

      {/* Events Map View */}
      {viewMode === 'map' && (
        <EventsMapView
          status={filters.selectedStatus !== 'ALL' ? filters.selectedStatus : undefined}
          clientId={filters.selectedClientId !== 'ALL' ? filters.selectedClientId : undefined}
          search={filters.search || undefined}
          onViewEvent={(id) => {
            const eventDetails = getEventDetails(id);
            if (eventDetails) {
              handleViewEvent(eventDetails);
            }
          }}
          onEditEvent={(id) => {
            const eventDetails = getEventDetails(id);
            if (eventDetails) {
              handleEditEvent(eventDetails);
            }
          }}
        />
      )}

      {/* Form Modal */}
      <EventFormModal
        event={selectedEvent}
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedEvent(null);
          setBackendErrors([]);
        }}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        backendErrors={backendErrors}
      />

      {/* View Modal */}
      <ViewEventModal
        eventId={selectedViewEventId}
        open={isViewOpen}
        onClose={() => {
          setIsViewOpen(false);
          setSelectedViewEventId(null);
        }}
        onEdit={handleEditFromView}
      />

      {/* Delete Modal */}
      <DeleteEventModal
        event={selectedEvent}
        open={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setSelectedEvent(null);
        }}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
