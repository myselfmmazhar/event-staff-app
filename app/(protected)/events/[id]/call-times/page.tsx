'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  CallTimeFormModal,
  CallTimeList,
  CallTimeDetailModal,
  DeleteCallTimeModal,
} from '@/components/call-times';
import { trpc } from '@/lib/client/trpc';
import { useToast } from '@/components/ui/use-toast';
import { useCrudMutations } from '@/lib/hooks/useCrudMutations';
import { ArrowLeftIcon, PlusIcon } from '@/components/ui/icons';
import type { CreateCallTimeInput, UpdateCallTimeInput } from '@/lib/schemas/call-time.schema';
import { useEventTerm } from '@/lib/hooks/use-terminology';
import { isDateNullOrUBD } from '@/lib/utils/date-formatter';

// Using any for call time type to avoid type conflicts between components
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CallTimeItem = any;

export default function EventCallTimesPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const eventTerm = useEventTerm();
  const eventId = params.id as string;

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCallTime, setSelectedCallTime] = useState<CallTimeItem | null>(null);
  const [backendErrors, setBackendErrors] = useState<Array<{ field: string; message: string }>>([]);

  const utils = trpc.useUtils();

  // Fetch event details
  const { data: event, isLoading: isLoadingEvent } = trpc.event.getById.useQuery(
    { id: eventId },
    { enabled: !!eventId }
  );

  // Fetch call times
  const { data: callTimesData, isLoading: isLoadingCallTimes } =
    trpc.callTime.getByEvent.useQuery(
      { eventId },
      { enabled: !!eventId }
    );

  // Create mutation
  const createMutation = trpc.callTime.create.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Call time created successfully' });
      setIsFormOpen(false);
      setSelectedCallTime(null);
      setBackendErrors([]);
      utils.callTime.getByEvent.invalidate({ eventId });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'error',
      });
    },
  });

  // Update mutation
  const updateMutation = trpc.callTime.update.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Call time updated successfully' });
      setIsFormOpen(false);
      setSelectedCallTime(null);
      setBackendErrors([]);
      utils.callTime.getByEvent.invalidate({ eventId });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'error',
      });
    },
  });

  // Delete mutation
  const deleteMutation = trpc.callTime.delete.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Call time deleted successfully' });
      setIsDeleteOpen(false);
      setSelectedCallTime(null);
      utils.callTime.getByEvent.invalidate({ eventId });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'error',
      });
    },
  });

  const handleCreate = () => {
    setSelectedCallTime(null);
    setBackendErrors([]);
    setIsFormOpen(true);
  };

  const handleEdit = (callTime: CallTimeItem) => {
    setSelectedCallTime(callTime);
    setBackendErrors([]);
    setIsFormOpen(true);
  };

  const handleView = (callTime: CallTimeItem) => {
    setSelectedCallTime(callTime);
    setIsDetailOpen(true);
  };

  const handleDelete = (callTime: CallTimeItem) => {
    setSelectedCallTime(callTime);
    setIsDeleteOpen(true);
  };

  const handleFormSubmit = (data: CreateCallTimeInput | Omit<UpdateCallTimeInput, 'id'>) => {
    if (selectedCallTime) {
      updateMutation.mutate({ id: selectedCallTime.id, ...data } as UpdateCallTimeInput);
    } else {
      createMutation.mutate(data as CreateCallTimeInput);
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedCallTime) {
      deleteMutation.mutate({ id: selectedCallTime.id });
    }
  };

  if (isLoadingEvent) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded mb-4" />
        <div className="h-4 w-96 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Event not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/events`)}
            className="mb-2 -ml-2"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to {eventTerm.plural}
          </Button>
          <h1 className="text-3xl font-bold">Assignments</h1>
          <p className="text-muted-foreground mt-1">
            {event.title} ({event.eventId})
          </p>
        </div>
        <Button onClick={handleCreate}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Assignment
        </Button>
      </div>

      {/* Event Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
        <div>
          <p className="text-sm text-muted-foreground">Venue</p>
          <p className="font-medium">{event.venueName}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Location</p>
          <p className="font-medium">
            {event.city}, {event.state}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Date</p>
          <p className="font-medium">
            {isDateNullOrUBD(event.startDate) ? 'UBD' : new Date(event.startDate!).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Assignments</p>
          <p className="font-medium">{callTimesData?.meta.total || 0} total</p>
        </div>
      </div>

      {/* Call Times List */}
      <CallTimeList
        callTimes={callTimesData?.data || []}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={handleCreate}
        isLoading={isLoadingCallTimes}
      />

      {/* Form Modal */}
      <CallTimeFormModal
        callTime={selectedCallTime}
        eventId={eventId}
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedCallTime(null);
          setBackendErrors([]);
        }}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        backendErrors={backendErrors}
      />

      {/* Detail Modal */}
      <CallTimeDetailModal
        callTimeId={selectedCallTime?.id || null}
        open={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedCallTime(null);
        }}
      />

      {/* Delete Modal */}
      <DeleteCallTimeModal
        callTime={selectedCallTime}
        open={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setSelectedCallTime(null);
        }}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
