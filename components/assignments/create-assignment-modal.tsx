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
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from '@/components/ui/select';
import { trpc } from '@/lib/client/trpc';
import { useToast } from '@/components/ui/use-toast';
import { CloseIcon } from '@/components/ui/icons';
import { EventFormModal } from '@/components/events/event-form-modal';
import { useEventTerm } from '@/lib/hooks/use-terminology';
import type { CreateEventInput, UpdateEventInput } from '@/lib/schemas/event.schema';
import { AmountType } from '@prisma/client';

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
  const [showEventForm, setShowEventForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: eventsData, isLoading: isLoadingEvents } = trpc.event.getAll.useQuery({
    page: 1,
    limit: 100,
  });

  const { data: selectedEventData, isLoading: isLoadingEvent } = trpc.event.getById.useQuery(
    { id: selectedEventId },
    { enabled: showEventForm && !!selectedEventId }
  );

  const events = eventsData?.data || [];

  const updateMutation = trpc.event.update.useMutation();
  const bulkSyncCallTimesMutation = trpc.callTime.bulkSyncForEvent.useMutation();
  const bulkUpdateProductsMutation = trpc.eventAttachment.bulkUpdateProducts.useMutation();

  const handleEventSelect = () => {
    if (!selectedEventId) return;
    setShowEventForm(true);
  };

  const handleFormSubmit = async (
    data: CreateEventInput | Omit<UpdateEventInput, 'id'>,
    attachments?: {
      callTimes: CallTimeAssignment[];
      products: Array<{ productId: string; quantity: number; notes?: string | null }>;
    },
  ) => {
    if (!selectedEventId) return;
    setIsSubmitting(true);
    try {
      await updateMutation.mutateAsync({ id: selectedEventId, ...data });
      if (attachments) {
        await bulkSyncCallTimesMutation.mutateAsync({
          eventId: selectedEventId,
          assignments: attachments.callTimes,
        });
        await bulkUpdateProductsMutation.mutateAsync({
          eventId: selectedEventId,
          products: attachments.products,
        });
      }
      utils.callTime.getAll.invalidate();
      toast({
        title: 'Assignment created',
        description: 'The assignment has been created successfully',
      });
      setShowEventForm(false);
      setSelectedEventId('');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message ?? 'Something went wrong',
        variant: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedEventId('');
    setShowEventForm(false);
    onClose();
  };

  const handleEventFormClose = () => {
    setShowEventForm(false);
  };

  if (showEventForm && selectedEventId) {
    if (isLoadingEvent || !selectedEventData) {
      return null;
    }
    return (
      <EventFormModal
        event={selectedEventData as any}
        open={true}
        onClose={handleEventFormClose}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
        initialTab="staff"
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
              value={selectedEventId}
              onValueChange={setSelectedEventId}
              disabled={isLoadingEvents}
            >
              <SelectTrigger id="eventSelect">
                <SelectValue placeholder={`Select an ${eventTerm.lower}`} />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.title} ({event.eventId})
                  </SelectItem>
                ))}
              </SelectContent>
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
