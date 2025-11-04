'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { PlusIcon } from '@/components/ui/icons';
import { DeleteEventDialog } from '@/components/events/delete-event-dialog';
import { Pagination } from '@/components/users/pagination';
import { EventFilters } from '@/components/events/event-filters';
import { EventFormModal } from '@/components/events/event-form-modal';
import { EventSearch } from '@/components/events/event-search';
import { EventTable } from '@/components/events/event-table';
import { trpc } from '@/lib/client/trpc';
import { EventStatus } from '@prisma/client';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import type { CreateEventInput, UpdateEventInput } from '@/lib/schemas/event.schema';

export default function EventsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize state from URL params
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [limit, setLimit] = useState(Number(searchParams.get('limit')) || 10);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedStatus, setSelectedStatus] = useState<EventStatus | 'ALL'>(
    (searchParams.get('status') as EventStatus) || 'ALL'
  );
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'startDate' | 'endDate' | 'title' | 'eventId' | 'venueName' | 'status'>(
    (searchParams.get('sortBy') as any) || 'createdAt'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [backendErrors, setBackendErrors] = useState<Array<{ field: string; message: string }>>([]);

  // tRPC queries
  const { data, isLoading, refetch } = trpc.event.getAll.useQuery({
    page,
    limit,
    search: search || undefined,
    status: selectedStatus === 'ALL' ? undefined : selectedStatus,
    sortBy,
    sortOrder,
  });

  // tRPC mutations
  const createMutation = trpc.event.create.useMutation({
    onSuccess: () => {
      toast({
        message: 'Event created successfully',
        type: 'success',
      });
      setIsFormOpen(false);
      setBackendErrors([]);
      // Clear filters to show the newly created event
      setSelectedStatus('ALL');
      setSearch('');
      setPage(1);
      refetch();
    },
    onError: (error) => {
      const fieldErrors = (error.data as { fieldErrors?: Array<{ field: string; message: string }> })?.fieldErrors || [];

      if (fieldErrors.length > 0) {
        setBackendErrors(fieldErrors);
        toast({
          message: 'Please check the form for errors',
          type: 'error',
        });
      } else {
        setBackendErrors([]);
        toast({
          message: error.message,
          type: 'error',
        });
      }
    },
  });

  const updateMutation = trpc.event.update.useMutation({
    onSuccess: () => {
      toast({
        message: 'Event updated successfully',
        type: 'success',
      });
      setIsFormOpen(false);
      setSelectedEvent(null);
      setBackendErrors([]);
      refetch();
    },
    onError: (error) => {
      const fieldErrors = (error.data as { fieldErrors?: Array<{ field: string; message: string }> })?.fieldErrors || [];

      if (fieldErrors.length > 0) {
        setBackendErrors(fieldErrors);
        toast({
          message: 'Please check the form for errors',
          type: 'error',
        });
      } else {
        setBackendErrors([]);
        toast({
          message: error.message,
          type: 'error',
        });
      }
    },
  });

  const deleteMutation = trpc.event.delete.useMutation({
    onSuccess: () => {
      toast({
        message: 'Event deleted successfully',
        type: 'success',
      });
      setIsDeleteOpen(false);
      setSelectedEvent(null);
      refetch();
    },
    onError: (error) => {
      toast({
        message: error.message,
        type: 'error',
      });
    },
  });

  // Sync URL with state
  useEffect(() => {
    const params = new URLSearchParams();

    if (page > 1) params.set('page', page.toString());
    if (limit !== 10) params.set('limit', limit.toString());
    if (search) params.set('search', search);
    if (selectedStatus !== 'ALL') params.set('status', selectedStatus);
    if (sortBy !== 'createdAt') params.set('sortBy', sortBy);
    if (sortOrder !== 'desc') params.set('sortOrder', sortOrder);

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

    router.replace(newUrl, { scroll: false });
  }, [page, limit, search, selectedStatus, sortBy, sortOrder, pathname, router]);

  // Handlers
  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setBackendErrors([]);
    setIsFormOpen(true);
  };

  const handleEditEvent = (event: any) => {
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

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status as EventStatus | 'ALL');
    setPage(1);
  };

  const handleSortByChange = (value: string) => {
    setSortBy(value as typeof sortBy);
    setPage(1);
  };

  const handleSortOrderChange = (value: 'asc' | 'desc') => {
    setSortOrder(value);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSelectedStatus('ALL');
    setSearch('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  };

  const hasActiveFilters = selectedStatus !== 'ALL' || search !== '';

  return (
    <div className="space-y-6">
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

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="relative z-10 space-y-4">
          <EventSearch
            value={search}
            onChange={handleSearch}
            placeholder="Search by title, venue, city, or event ID..."
          />

          <EventFilters
            status={selectedStatus}
            onStatusChange={handleStatusChange}
            sortBy={sortBy}
            onSortByChange={handleSortByChange}
            sortOrder={sortOrder}
            onSortOrderChange={handleSortOrderChange}
          />

          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <p className="text-sm text-muted-foreground">
                {data?.meta.total || 0} event{data?.meta.total !== 1 ? 's' : ''} found
              </p>
              <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Events Table */}
      <Card className="p-4">
        <div className="relative z-10">
          <EventTable
            events={data?.data || []}
            isLoading={isLoading}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onEdit={handleEditEvent}
            onDelete={handleDeleteEvent}
            onSort={handleSort}
          />

          {/* Pagination */}
          {data && data.meta.totalPages > 1 && (
            <div className="mt-6">
              <Pagination
                currentPage={page}
                totalPages={data.meta.totalPages}
                totalItems={data.meta.total}
                itemsPerPage={limit}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleLimitChange}
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
