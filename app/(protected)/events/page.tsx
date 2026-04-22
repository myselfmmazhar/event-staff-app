'use client';

import { Button, LinkButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlusIcon, UploadIcon, DocumentDuplicateIcon, ArchiveBoxIcon } from '@/components/ui/icons';
import { ArchiveEventModal } from '@/components/events/archive-event-modal';
import { EventBulkActionBar } from '@/components/events/event-bulk-action-bar';
import { EventBulkEditModal, type EventBulkEditFormData } from '@/components/events/event-bulk-edit-modal';
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
import { TaskMessageModal } from '@/components/events/task-message-modal';
import { trpc } from '@/lib/client/trpc';
import { AmountType, EventStatus } from '@prisma/client';
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
import EventRequestsPage from '@/app/(protected)/event-requests/page';

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

  const utils = trpc.useUtils();

  // Use CRUD mutations hook
  const { backendErrors, setBackendErrors, createMutationOptions, updateMutationOptions, handleSuccess, handleError } = useCrudMutations();

  // Local modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventFormData | null>(null);
  const [selectedViewEventId, setSelectedViewEventId] = useState<string | null>(null);
  const [archiveTargets, setArchiveTargets] = useState<Array<{ id: string; title: string; eventId: string }>>([]);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [messageTarget, setMessageTarget] = useState<EventListItem | null>(null);

  // Bulk edit modal state
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);

  // Reset key for Save & New functionality
  const [formResetKey, setFormResetKey] = useState(0);

  // Track if we're doing Save & New (to prevent closing the form)
  const [isSaveAndNew, setIsSaveAndNew] = useState(false);

  // Track if we're doing Update & Continue (to prevent closing the form)
  const [isUpdateAndContinue, setIsUpdateAndContinue] = useState(false);

  // Page tab state (events / event-requests)
  type EventsTabMode = 'events' | 'event-requests';
  const [activeTab, setActiveTab] = useState<EventsTabMode>(() => {
    const tab = searchParams.get('tab');
    return tab === 'event-requests' ? 'event-requests' : 'events';
  });

  const handleTabChange = (tab: EventsTabMode) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'events') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  };

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

  // Rehydrate filters from localStorage on mount, then apply URL params if present
  useEffect(() => {
    useEventsFilters.persist.rehydrate();

    // Only override with URL params if they are explicitly set
    if (searchParams.has('page')) filters.setPage(parseNumberParam(searchParams.get('page'), 1));
    if (searchParams.has('limit')) filters.setLimit(parseNumberParam(searchParams.get('limit'), 10));
    if (searchParams.has('search')) filters.setSearch(searchParams.get('search') || '');
    if (searchParams.has('selectedStatuses') || searchParams.has('statuses')) {
      filters.setSelectedStatuses(parseStatusesParam(searchParams.get('selectedStatuses') ?? searchParams.get('statuses')));
    }
    if (searchParams.has('selectedClientIds') || searchParams.has('clientIds')) {
      filters.setSelectedClientIds(parseClientIdsParam(searchParams.get('selectedClientIds') ?? searchParams.get('clientIds')));
    }
    if (searchParams.has('startDateFrom')) filters.setStartDateFrom(searchParams.get('startDateFrom') || null);
    if (searchParams.has('startDateTo')) filters.setStartDateTo(searchParams.get('startDateTo') || null);
    if (searchParams.has('sortBy')) filters.setSortBy(parseSortByParam(searchParams.get('sortBy')));
    if (searchParams.has('sortOrder')) filters.setSortOrder(parseSortOrderParam(searchParams.get('sortOrder')));
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
    preserve: ['view', 'tab'],
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
        // Only close the form if NOT doing Save & New
        if (!isSaveAndNew) {
          setIsFormOpen(false);
          // Clear filters to show the newly created event
          filters.setSelectedStatuses([]);
          filters.setSearch('');
          filters.setPage(1);
        }
        refetch();
        refetchExport();
      },
    })
  );

  const updateMutation = trpc.event.update.useMutation(
    updateMutationOptions(`${terminology.event.singular} updated successfully`, {
      onSuccess: () => {
        if (!isUpdateAndContinue) {
          setIsFormOpen(false);
          setSelectedEvent(null);
        }
        setIsUpdateAndContinue(false);
        refetch();
      },
    })
  );

  const archiveManyMutation = trpc.event.archiveMany.useMutation({
    onSuccess: (result) => {
      const count = result.count ?? archiveTargets.length;
      const message =
        count === 1
          ? `${terminology.event.singular} archived successfully`
          : `${count} ${terminology.event.plural} archived successfully`;
      handleSuccess(message);

      setIsArchiveOpen(false);
      setArchiveTargets([]);
      clearSelection();
      refetch();
      refetchExport();
    },
    onError: handleError,
  });

  // Bulk update mutation for editing multiple events
  const bulkUpdateMutation = trpc.event.bulkUpdate.useMutation({
    onSuccess: (result) => {
      const count = result.success;
      const message =
        count === 1
          ? `${terminology.event.singular} updated successfully`
          : `${count} ${terminology.event.lowerPlural} updated successfully`;
      handleSuccess(message);

      setIsBulkEditOpen(false);
      clearSelection();
      refetch();
      refetchExport();

      // Show warning if some updates failed
      if (result.failed.length > 0) {
        console.warn('Some events failed to update:', result.failed);
      }
    },
    onError: handleError,
  });

  // Handlers
  const getEventDetails = (id: string): EventListItem | undefined =>
    events.find((evt) => evt.id === id);

  const updateStatusMutation = trpc.event.updateStatus.useMutation({
    onSuccess: () => {
      handleSuccess(`${terminology.event.singular} status updated successfully`);
      refetch();
    },
    onError: handleError,
  });

  const handleStatusChange = (id: string, status: EventStatus) => {
    updateStatusMutation.mutate({ id, status });
  };

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

  const handleViewFromEdit = () => {
    if (selectedEvent) {
      setIsFormOpen(false);
      setSelectedViewEventId(selectedEvent.id);
      setIsViewOpen(true);
    }
  };

  const handleArchiveEvent = (event: EventListItem) => {
    setArchiveTargets([{ id: event.id, title: event.title, eventId: event.eventId }]);
    setIsArchiveOpen(true);
  };

  const handleArchiveSelected = () => {
    const targets = allEvents
      .filter((event) => selectedIds.has(event.id))
      .map((event) => ({
        id: event.id,
        title: event.title,
        eventId: event.eventId,
      }));

    if (targets.length === 0) return;
    setArchiveTargets(targets);
    setIsArchiveOpen(true);
  };

  // Handle bulk edit
  const handleBulkEditSelected = () => {
    if (selectedIds.size === 0) return;
    setIsBulkEditOpen(true);
  };

  const handleBulkEditSubmit = (formData: EventBulkEditFormData) => {
    bulkUpdateMutation.mutate({
      eventIds: Array.from(selectedIds),
      ...formData,
    });
  };

  const handleEditEventFromTable = (event: EventTableEvent) => {
    const eventDetails = getEventDetails(event.id);
    if (eventDetails) {
      handleEditEvent(eventDetails);
    }
  };

  const handleArchiveEventFromTable = (event: EventTableEvent) => {
    const eventDetails = getEventDetails(event.id);
    if (eventDetails) {
      handleArchiveEvent(eventDetails);
    }
  };

  const handleMessageEventFromTable = (event: EventTableEvent) => {
    const eventDetails = getEventDetails(event.id);
    if (eventDetails) {
      setMessageTarget(eventDetails);
      setIsMessageOpen(true);
    }
  };

  // Mutations for attachments
  const bulkSyncCallTimesMutation = trpc.callTime.bulkSyncForEvent.useMutation();
  const bulkUpdateProductsMutation = trpc.eventAttachment.bulkUpdateProducts.useMutation();

  type SaveAction = 'close' | 'new' | 'update-continue';

  // Type for CallTime assignments from Event Form
  type CallTimeAssignment = {
    serviceId: string;
    quantity: number;
    customCost?: number | null;
    customPrice?: number | null;
    startDate?: string | null;
    startTime?: string | null;
    endDate?: string | null;
    endTime?: string | null;
    experienceRequired?: 'ANY' | 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    ratingRequired?: 'ANY' | 'NA' | 'A' | 'B' | 'C' | 'D';
    approveOvertime?: boolean;
    overtimeRate?: number | null;
    overtimeRateType?: AmountType | null;
    commission?: boolean;
    commissionAmount?: number | null;
    commissionAmountType?: AmountType | null;
    payRate?: number | null;
    billRate?: number | null;
    rateType?: 'PER_HOUR' | 'PER_SHIFT' | 'PER_DAY' | 'PER_EVENT' | null;
    expenditure?: boolean;
    expenditureCost?: number | null;
    expenditurePrice?: number | null;
    expenditureAmount?: number | null;
    expenditureAmountType?: AmountType | null;
    minimum?: number | null;
    travelInMinimum?: boolean;
    notes?: string | null;
    instructions?: string | null;
  };

  const handleFormSubmit = async (
    data: CreateEventInput | Omit<UpdateEventInput, 'id'>,
    attachments?: {
      callTimes: CallTimeAssignment[];
      products: Array<{ productId: string; quantity: number; customPrice?: number | null; notes?: string | null }>;
    },
    saveAction?: SaveAction
  ) => {
    console.log('[EventsPage] handleFormSubmit called');
    console.log('[EventsPage] data:', data);
    console.log('[EventsPage] attachments:', attachments);
    console.log('[EventsPage] saveAction:', saveAction);
    console.log('[EventsPage] selectedEvent:', selectedEvent);

    // Set flag before mutation so onSuccess knows whether to close the form
    setIsSaveAndNew(saveAction === 'new');
    setIsUpdateAndContinue(saveAction === 'update-continue');

    try {
      if (selectedEvent) {
        // Update existing event
        console.log('[EventsPage] Updating event with id:', selectedEvent.id);
        await updateMutation.mutateAsync({ id: selectedEvent.id, ...data });
        console.log('[EventsPage] Event updated successfully');

        // Update attachments if provided (run sequentially to avoid transaction conflicts)
        if (attachments) {
          await bulkSyncCallTimesMutation.mutateAsync({
            eventId: selectedEvent.id,
            assignments: attachments.callTimes,
          });
          await bulkUpdateProductsMutation.mutateAsync({
            eventId: selectedEvent.id,
            products: attachments.products,
          });
        }

        // Invalidate after all mutations complete so the list reflects updated assignments
        utils.event.getAll.invalidate();
        utils.event.getAllForExport.invalidate();
      } else {
        // Create new event
        const newEvent = await createMutation.mutateAsync(data as CreateEventInput);

        // Save attachments if provided (run sequentially to avoid transaction conflicts)
        if (attachments && newEvent?.id) {
          await bulkSyncCallTimesMutation.mutateAsync({
            eventId: newEvent.id,
            assignments: attachments.callTimes,
          });
          await bulkUpdateProductsMutation.mutateAsync({
            eventId: newEvent.id,
            products: attachments.products,
          });
        }

        // Handle Save & New: keep form open for creating another event
        if (saveAction === 'new') {
          // Keep form open and reset to create another
          setSelectedEvent(null);
          setBackendErrors([]);
          // Increment resetKey to trigger form reset in the modal
          setFormResetKey((prev) => prev + 1);
          // Reset the flag for next submission
          setIsSaveAndNew(false);
        }
      }
    } catch (error) {
      // Errors are already handled by mutation options
      console.error('[EventsPage] handleFormSubmit error:', error);
    }
  };

  const handleArchiveConfirm = () => {
    if (archiveTargets.length === 0) return;
    archiveManyMutation.mutate({ ids: archiveTargets.map((e) => e.id) });
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
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit">
        <button
          onClick={() => handleTabChange('events')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'events'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {terminology.event.plural}
        </button>
        <button
          onClick={() => handleTabChange('event-requests')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'event-requests'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Event Requests
        </button>
      </div>

      {activeTab === 'event-requests' && <EventRequestsPage />}

      {activeTab === 'events' && <>
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
          <LinkButton href={`/${terminology.event.route}/archived`} variant="outline">
            <ArchiveBoxIcon className="h-4 w-4 mr-2" />
            Archived
          </LinkButton>
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

      {/* Bulk Action Bar */}
      <EventBulkActionBar
        selectedCount={selectedIds.size}
        onClearSelection={clearSelection}
        onEditSelected={handleBulkEditSelected}
        onArchiveSelected={handleArchiveSelected}
        isEditing={bulkUpdateMutation.isPending}
        isArchiving={archiveManyMutation.isPending}
      />

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
              onEdit={handleEditEventFromTable}
              onArchive={handleArchiveEventFromTable}
              onMessage={handleMessageEventFromTable}
              onStatusChange={handleStatusChange}
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
        resetKey={formResetKey}
        onViewDetails={handleViewFromEdit}
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

      {/* Archive Modal */}
      <ArchiveEventModal
        events={archiveTargets}
        open={isArchiveOpen}
        onClose={() => {
          setIsArchiveOpen(false);
          setArchiveTargets([]);
        }}
        onConfirm={handleArchiveConfirm}
        isArchiving={archiveManyMutation.isPending}
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

      {/* Bulk Edit Modal */}
      <EventBulkEditModal
        events={allEvents
          .filter((e) => selectedIds.has(e.id))
          .map((e) => ({ id: e.id, eventId: e.eventId, title: e.title }))}
        open={isBulkEditOpen}
        onClose={() => setIsBulkEditOpen(false)}
        onSubmit={handleBulkEditSubmit}
        isSubmitting={bulkUpdateMutation.isPending}
      />

      {/* Task Message Modal */}
      <TaskMessageModal
        event={messageTarget}
        open={isMessageOpen}
        onClose={() => {
          setIsMessageOpen(false);
          setMessageTarget(null);
        }}
      />
      </>}
    </div>
  );
}
