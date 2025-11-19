'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlusIcon } from '@/components/ui/icons';
import { DeleteEventDialog } from '@/components/events/delete-event-dialog';
import { ViewEventDialog } from '@/components/events/view-event-dialog';
import { Pagination } from '@/components/common/pagination';
import { ActiveFilters } from '@/components/common/active-filters';
import { EventFilters } from '@/components/events/event-filters';
import { EventFormModal } from '@/components/events/event-form-modal';
import { EventSearch } from '@/components/events/event-search';
import { EventTable } from '@/components/events/event-table';
import { trpc } from '@/lib/client/trpc';
import { EventStatus } from '@prisma/client';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import type { CreateEventInput, UpdateEventInput } from '@/lib/schemas/event.schema';
import { useEventsFilters } from '@/store/events-filters.store';
import { useUrlSync } from '@/lib/hooks/useUrlSync';
import { useCrudMutations } from '@/lib/hooks/useCrudMutations';

export default function EventsPage() {
  const searchParams = useSearchParams();

  // Use filters store
  const filters = useEventsFilters();

  // Use CRUD mutations hook
  const { backendErrors, setBackendErrors, createMutationOptions, updateMutationOptions, deleteMutationOptions } = useCrudMutations();

  // Local modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedViewEventId, setSelectedViewEventId] = useState<string | null>(null);

  // Initialize store from URL params on mount
  useEffect(() => {
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 10;
    const search = searchParams.get('search') || '';
    const status = (searchParams.get('status') as EventStatus) || 'ALL';
    const clientId = searchParams.get('clientId') || 'ALL';
    const sortBy = (searchParams.get('sortBy') as any) || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';

    filters.setPage(page);
    filters.setLimit(limit);
    filters.setSearch(search);
    filters.setSelectedStatus(status);
    filters.setSelectedClientId(clientId);
    filters.setSortBy(sortBy);
    filters.setSortOrder(sortOrder);
  }, []); // Only run on mount

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

  // tRPC mutations with standardized error handling
  const createMutation = trpc.event.create.useMutation(
    createMutationOptions('Event created successfully', {
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
    updateMutationOptions('Event updated successfully', {
      onSuccess: () => {
        setIsFormOpen(false);
        setSelectedEvent(null);
        refetch();
      },
    })
  );

  const deleteMutation = trpc.event.delete.useMutation(
    deleteMutationOptions('Event deleted successfully', {
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

  const handleViewEvent = (event: any) => {
    setSelectedViewEventId(event.id);
    setIsViewOpen(true);
  };

  const handleEditEvent = (event: any) => {
    setSelectedEvent(event);
    setBackendErrors([]);
    setIsFormOpen(true);
  };

  const handleEditFromView = (event: any) => {
    // Close view dialog and open edit form
    setIsViewOpen(false);
    setSelectedViewEventId(null);
    setSelectedEvent(event);
    setBackendErrors([]);
    setIsFormOpen(true);
  };

  const handleDeleteEvent = (event: any) => {
    setSelectedEvent(event);
    setIsDeleteOpen(true);
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
          <h1 className="text-3xl font-bold text-foreground">Events</h1>
          <p className="text-muted-foreground mt-1">
            Manage your events
          </p>
        </div>
        <Button onClick={handleCreateEvent}>
          <PlusIcon className="h-5 w-5 mr-2" />
          New Event
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="relative z-10 space-y-4">
          <EventSearch
            value={filters.search}
            onChange={filters.setSearch}
            placeholder="Search by title, venue, city, or event ID..."
          />
          <EventFilters />
          <ActiveFilters filters={activeFilters} />
        </div>
      </Card>

      {/* Events Table */}
      <Card className="p-6">
        <div className="relative z-10">
          <EventTable
            events={data?.data || []}
            isLoading={isLoading}
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder}
            onView={handleViewEvent}
            onEdit={handleEditEvent}
            onDelete={handleDeleteEvent}
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

      {/* View Dialog */}
      <ViewEventDialog
        eventId={selectedViewEventId}
        open={isViewOpen}
        onClose={() => {
          setIsViewOpen(false);
          setSelectedViewEventId(null);
        }}
        onEdit={handleEditFromView}
      />

      {/* Delete Dialog */}
      <DeleteEventDialog
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
