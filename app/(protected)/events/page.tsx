'use client';

import { Button, LinkButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlusIcon, UploadIcon, DocumentDuplicateIcon } from '@/components/ui/icons';
import { DeleteEventModal } from '@/components/events/delete-event-modal';
import { ViewEventModal } from '@/components/events/view-event-modal';
import { EventExportDropdown } from '@/components/events/event-export-dropdown';
import { EventImportModal } from '@/components/events/event-import-modal';
import { Pagination } from '@/components/common/pagination';
import { ActiveFilters } from '@/components/common/active-filters';
import { EventFilters } from '@/components/events/event-filters';
import { EventFormModal } from '@/components/events/event-form-modal';
import { EventSearch } from '@/components/events/event-search';
import { EventTable } from '@/components/events/event-table';
import { PageLabelsModal } from '@/components/common/page-labels-modal';
import { trpc } from '@/lib/client/trpc';
import { EventStatus } from '@prisma/client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useMemo, type ComponentProps } from 'react';
import type { CreateEventInput, UpdateEventInput, FileLink, EventDocument } from '@/lib/schemas/event.schema';
import { useEventsFilters, type EventSortBy, type SortOrder } from '@/store/events-filters.store';
import { useUrlSync } from '@/lib/hooks/useUrlSync';
import { useCrudMutations } from '@/lib/hooks/useCrudMutations';
import { useTerminology } from '@/lib/hooks/use-terminology';
import { useEventsPageLabels } from '@/lib/hooks/use-labels';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/server/routers/_app';
import { EventsMapView } from '@/components/events/events-map-view';
import { EventCalendar } from '@/components/events/calendar/event-calendar';
import { Calendar, Map, TableIcon } from 'lucide-react';
import type { EventExport } from '@/lib/utils/event-export';

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
  const router = useRouter();
  const pathname = usePathname();
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

  // View toggle state (table / calendar / map)
  type EventsViewMode = 'table' | 'calendar' | 'map';
  const [viewMode, setViewMode] = useState<EventsViewMode>(() => {
    const view = searchParams.get('view');
    return view === 'calendar' || view === 'map' ? view : 'table';
  });

  const setView = (mode: EventsViewMode) => {
    setViewMode(mode);
    const params = new URLSearchParams(searchParams.toString());
    if (mode === 'table') {
      params.delete('view');
    } else {
      params.set('view', mode);
    }
    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  };

  // Import modal state
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Row selection for export
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setBackendErrors([]);
    setIsFormOpen(true);
  };

  // Initialize store from URL params on mount
  useEffect(() => {
    const page = parseNumberParam(searchParams.get('page'), 1);
    const limit = parseNumberParam(searchParams.get('limit'), 10);
    const search = searchParams.get('search') || '';
    const statuses = parseStatusesParam(searchParams.get('statuses'));
    const clientIds = parseClientIdsParam(searchParams.get('clientIds'));
    const sortBy = parseSortByParam(searchParams.get('sortBy'));
    const sortOrder = parseSortOrderParam(searchParams.get('sortOrder'));
    const startDateFrom = searchParams.get('startDateFrom') || null;
    const startDateTo = searchParams.get('startDateTo') || null;

    filters.setPage(page);
    filters.setLimit(limit);
    filters.setSearch(search);
    filters.setSelectedStatuses(statuses);
    filters.setSelectedClientIds(clientIds);
    filters.setSortBy(sortBy);
    filters.setSortOrder(sortOrder);
    filters.setStartDateFrom(startDateFrom);
    filters.setStartDateTo(startDateTo);
  }, []); // Only run on mount

  // Handle create query parameter
  useEffect(() => {
    const createParam = searchParams.get('create');
    if (createParam === 'true') {
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.delete('create');
      const newUrl = urlParams.toString()
        ? `${window.location.pathname}?${urlParams.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);

      const frame = window.requestAnimationFrame(() => handleCreateEvent());
      return () => window.cancelAnimationFrame(frame);
    }
    return undefined;
  }, [searchParams]);

  // Sync store with URL
  useUrlSync(filters, {
    keys: ['page', 'limit', 'search', 'selectedStatuses', 'selectedClientIds', 'sortBy', 'sortOrder', 'startDateFrom', 'startDateTo'],
    preserve: ['view'],
  });

  // tRPC queries
  const { data, isLoading, refetch } = trpc.event.getAll.useQuery({
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
  const events = data?.data ?? [];

  // Fetch all events for export
  const { data: allEventsData, refetch: refetchExport } = trpc.event.getAllForExport.useQuery();
  const allEvents = allEventsData ?? [];

  // Compute selected events for export
  const selectedEvents = useMemo(() => {
    return allEvents.filter((e) => selectedIds.has(e.id)) as EventExport[];
  }, [allEvents, selectedIds]);

  // Row selection handlers
  const clearSelection = () => setSelectedIds(new Set());

  // tRPC mutations with standardized error handling
  const createMutation = trpc.event.create.useMutation(
    createMutationOptions(`${terminology.event.singular} created successfully`, {
      onSuccess: () => {
        setIsFormOpen(false);
        // Clear filters to show the newly created event
        filters.setSelectedStatuses([]);
        filters.setSearch('');
        filters.setPage(1);
        refetch();
        refetchExport();
      },
    })
  );

  const updateMutation = trpc.event.update.useMutation(
    updateMutationOptions(`${terminology.event.singular} updated successfully`, {
      onSuccess: () => {
        setIsFormOpen(false);
        setSelectedEvent(null);
        refetch();
        refetchExport();
      },
    })
  );

  const deleteMutation = trpc.event.delete.useMutation(
    deleteMutationOptions(`${terminology.event.singular} deleted successfully`, {
      onSuccess: () => {
        setIsDeleteOpen(false);
        setSelectedEvent(null);
        refetch();
        refetchExport();
      },
    })
  );

  // Handlers
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

  // Mutations for attachments
  const bulkUpdateServicesMutation = trpc.eventAttachment.bulkUpdateServices.useMutation();
  const bulkUpdateProductsMutation = trpc.eventAttachment.bulkUpdateProducts.useMutation();

  const handleFormSubmit = async (
    data: CreateEventInput | Omit<UpdateEventInput, 'id'>,
    attachments?: {
      services: Array<{ serviceId: string; quantity: number; customPrice?: number | null; notes?: string | null }>;
      products: Array<{ productId: string; quantity: number; customPrice?: number | null; notes?: string | null }>;
    }
  ) => {
    try {
      if (selectedEvent) {
        // Update existing event
        await updateMutation.mutateAsync({ id: selectedEvent.id, ...data });

        // Update attachments if provided
        if (attachments) {
          await Promise.all([
            bulkUpdateServicesMutation.mutateAsync({
              eventId: selectedEvent.id,
              services: attachments.services,
            }),
            bulkUpdateProductsMutation.mutateAsync({
              eventId: selectedEvent.id,
              products: attachments.products,
            }),
          ]);
        }
      } else {
        // Create new event
        const newEvent = await createMutation.mutateAsync(data as CreateEventInput);

        // Save attachments if provided
        if (attachments && newEvent?.id) {
          await Promise.all([
            bulkUpdateServicesMutation.mutateAsync({
              eventId: newEvent.id,
              services: attachments.services,
            }),
            bulkUpdateProductsMutation.mutateAsync({
              eventId: newEvent.id,
              products: attachments.products,
            }),
          ]);
        }
      }
    } catch {
      // Errors are already handled by mutation options
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
      label: 'From',
      value: filters.startDateFrom,
      onRemove: () => filters.setStartDateFrom(null),
    });
  }

  if (filters.startDateTo) {
    activeFilters.push({
      key: 'startDateTo',
      label: 'To',
      value: filters.startDateTo,
      onRemove: () => filters.setStartDateTo(null),
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
                  { key: 'actions', label: 'Actions', defaultLabel: 'Actions' },
                  { key: 'status', label: 'Status', defaultLabel: 'Status' },
                  { key: 'startDate', label: 'Date', defaultLabel: 'Date' },
                  { key: 'title', label: 'Title', defaultLabel: 'Title' },
                  { key: 'client', label: 'Client', defaultLabel: 'Client' },
                  { key: 'venue', label: 'Venue', defaultLabel: 'Venue' },
                  { key: 'assignments', label: 'Assignments', defaultLabel: 'Assignments' },
                  { key: 'progress', label: 'Progress', defaultLabel: 'Progress' },
                ],
              },
            ]}
            buttonVariant="outline"
            buttonSize="md"
          />
          <LinkButton href="/templates/events" variant="outline">
            <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
            Templates
          </LinkButton>
          <EventExportDropdown
            events={allEvents as EventExport[]}
            selectedEvents={selectedEvents}
            selectedCount={selectedIds.size}
          />
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <UploadIcon className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button onClick={handleCreateEvent}>
            <PlusIcon className="h-5 w-5 mr-2" />
            {eventsLabels.addButton}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-6 overflow-visible relative z-20">
        <div className="space-y-4">
          <EventSearch
            value={filters.search}
            onChange={filters.setSearch}
            placeholder={eventsLabels.searchPlaceholder}
          />
          <EventFilters />
          <ActiveFilters filters={activeFilters} />
        </div>
      </Card>

      {/* Selection Info */}
      {selectedIds.size > 0 && (
        <Card className="p-3 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">
              {selectedIds.size} {terminology.event.lower}{selectedIds.size !== 1 ? 's' : ''} selected
            </span>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Clear selection
            </Button>
          </div>
        </Card>
      )}

      {/* View Mode Toggle */}
      <div className="flex justify-end gap-2 mb-4">
        <Button
          variant={viewMode === 'table' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('table')}
          className="gap-2"
        >
          <TableIcon size={16} />
          Table View
        </Button>
        <Button
          variant={viewMode === 'calendar' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('calendar')}
          className="gap-2"
        >
          <Calendar size={16} />
          {eventsLabels.calendarView}
        </Button>
        <Button
          variant={viewMode === 'map' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('map')}
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
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
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

      {/* Events Calendar View */}
      {viewMode === 'calendar' && (
        <EventCalendar
          onEventClick={(eventId) => {
            setSelectedViewEventId(eventId);
            setIsViewOpen(true);
          }}
          statuses={filters.selectedStatuses.length > 0 ? filters.selectedStatuses : undefined}
          clientIds={filters.selectedClientIds.length > 0 ? filters.selectedClientIds : undefined}
          search={filters.search || undefined}
          startDateFrom={filters.startDateFrom ? new Date(filters.startDateFrom) : undefined}
          startDateTo={filters.startDateTo ? new Date(filters.startDateTo) : undefined}
        />
      )}

      {/* Events Map View */}
      {viewMode === 'map' && (
        <EventsMapView
          statuses={filters.selectedStatuses.length > 0 ? filters.selectedStatuses : undefined}
          clientIds={filters.selectedClientIds.length > 0 ? filters.selectedClientIds : undefined}
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

      {/* Import Modal */}
      <EventImportModal
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={() => {
          setIsImportOpen(false);
          refetch();
          refetchExport();
        }}
      />
    </div>
  );
}
