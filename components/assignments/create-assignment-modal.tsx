'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { trpc } from '@/lib/client/trpc';
import { useToast } from '@/components/ui/use-toast';
import { CloseIcon } from '@/components/ui/icons';
import { CallTimeFormModal } from '@/components/call-times/call-time-form-modal';
import type { CreateCallTimeInput } from '@/lib/schemas/call-time.schema';
import { useEventTerm } from '@/lib/hooks/use-terminology';

interface CreateAssignmentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateAssignmentModal({
  open,
  onClose,
  onSuccess,
}: CreateAssignmentModalProps) {
  const eventTerm = useEventTerm();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [showCallTimeForm, setShowCallTimeForm] = useState(false);

  // Fetch events for dropdown
  const { data: eventsData, isLoading: isLoadingEvents } = trpc.event.getAll.useQuery({
    page: 1,
    limit: 100,
  });

  const events = eventsData?.data || [];

  // Create call time mutation
  const createCallTime = trpc.callTime.create.useMutation({
    onSuccess: () => {
      toast({
        title: 'Assignment created',
        description: 'The assignment has been created successfully',
      });
      utils.callTime.getAll.invalidate();
      setShowCallTimeForm(false);
      setSelectedEventId('');
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'error',
      });
    },
  });

  const handleEventSelect = () => {
    if (!selectedEventId) return;
    setShowCallTimeForm(true);
  };

  const handleCallTimeSubmit = (data: CreateCallTimeInput | Record<string, unknown>) => {
    // The CallTimeFormModal passes the data with eventId included for create
    createCallTime.mutate(data as CreateCallTimeInput);
  };

  const handleClose = () => {
    setSelectedEventId('');
    setShowCallTimeForm(false);
    onClose();
  };

  const handleCallTimeFormClose = () => {
    setShowCallTimeForm(false);
  };

  // Show call time form modal when event is selected
  if (showCallTimeForm && selectedEventId) {
    return (
      <CallTimeFormModal
        callTime={null}
        eventId={selectedEventId}
        open={true}
        onClose={handleCallTimeFormClose}
        onSubmit={handleCallTimeSubmit}
        isSubmitting={createCallTime.isPending}
      />
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} className="max-w-md">
      <DialogHeader>
        <div className="flex items-center justify-between">
          <DialogTitle>Create Assignment</DialogTitle>
          <button
            type="button"
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
      </DialogHeader>

      <DialogContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select an {eventTerm.lower} to create a new assignment for.
          </p>

          <div>
            <Label htmlFor="eventSelect" required>
              {eventTerm.singular}
            </Label>
            <Select
              id="eventSelect"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              disabled={isLoadingEvents}
            >
              <option value="">Select an {eventTerm.lower}</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title} ({event.eventId})
                </option>
              ))}
            </Select>
          </div>

          {events.length === 0 && !isLoadingEvents && (
            <p className="text-sm text-muted-foreground">
              No {eventTerm.lowerPlural} found. Create an {eventTerm.lower} first.
            </p>
          )}
        </div>
      </DialogContent>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={handleClose}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleEventSelect}
          disabled={!selectedEventId || isLoadingEvents}
        >
          Continue
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
