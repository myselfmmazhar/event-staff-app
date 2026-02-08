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
import type { AssignmentData } from './assignment-table';

interface DuplicateAssignmentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  sourceAssignment: AssignmentData | null;
}

export function DuplicateAssignmentModal({
  open,
  onClose,
  onSuccess,
  sourceAssignment,
}: DuplicateAssignmentModalProps) {
  const eventTerm = useEventTerm();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [showCallTimeForm, setShowCallTimeForm] = useState(false);

  // Fetch full call time details to get skillLevel, billRate, etc.
  const { data: fullCallTimeData } = trpc.callTime.getById.useQuery(
    { id: sourceAssignment?.id ?? '' },
    { enabled: !!sourceAssignment?.id && open }
  );

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
        title: 'Assignment duplicated',
        description: 'The assignment has been duplicated successfully',
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
    // Ensure eventId is included in the submission data
    const submitData = {
      ...data,
      eventId: selectedEventId,
    } as CreateCallTimeInput;

    createCallTime.mutate(submitData);
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
  if (showCallTimeForm && selectedEventId && sourceAssignment) {
    // Use full call time data if available, otherwise fall back to assignment data
    const fullData = fullCallTimeData;

    // Get the pay rate value
    const payRateValue = fullData
      ? (typeof fullData.payRate === 'number'
          ? fullData.payRate
          : typeof fullData.payRate === 'string'
            ? parseFloat(fullData.payRate)
            : (fullData.payRate as any)?.toNumber?.() || 0)
      : (typeof sourceAssignment.payRate === 'number'
          ? sourceAssignment.payRate
          : typeof sourceAssignment.payRate === 'string'
            ? parseFloat(sourceAssignment.payRate)
            : sourceAssignment.payRate?.toNumber?.() || 0);

    // Get the bill rate value from full data
    const billRateValue = fullData
      ? (typeof fullData.billRate === 'number'
          ? fullData.billRate
          : typeof fullData.billRate === 'string'
            ? parseFloat(fullData.billRate)
            : (fullData.billRate as any)?.toNumber?.() || 0)
      : payRateValue;

    // Create a partial call time object with source assignment data for pre-filling
    // Must match the CallTime interface expected by CallTimeFormModal
    const prefilledCallTime = {
      id: 'duplicate', // Non-empty to trigger edit mode which uses reset()
      callTimeId: '',
      serviceId: fullData?.serviceId || sourceAssignment.service?.id || '',
      numberOfStaffRequired: fullData?.numberOfStaffRequired || sourceAssignment.numberOfStaffRequired,
      skillLevel: fullData?.skillLevel || 'BEGINNER',
      startDate: fullData?.startDate
        ? (typeof fullData.startDate === 'string' ? new Date(fullData.startDate) : fullData.startDate)
        : (typeof sourceAssignment.startDate === 'string'
            ? new Date(sourceAssignment.startDate)
            : sourceAssignment.startDate),
      startTime: fullData?.startTime || sourceAssignment.startTime,
      endDate: fullData?.endDate
        ? (typeof fullData.endDate === 'string' ? new Date(fullData.endDate) : fullData.endDate)
        : (typeof sourceAssignment.endDate === 'string'
            ? new Date(sourceAssignment.endDate)
            : sourceAssignment.endDate),
      endTime: fullData?.endTime || sourceAssignment.endTime,
      payRate: payRateValue,
      payRateType: fullData?.payRateType || sourceAssignment.payRateType,
      billRate: billRateValue,
      billRateType: fullData?.billRateType || sourceAssignment.payRateType,
      notes: fullData?.notes || null,
    };

    return (
      <CallTimeFormModal
        callTime={prefilledCallTime as any}
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
          <DialogTitle>Duplicate Assignment</DialogTitle>
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
          {sourceAssignment && (
            <div className="rounded-lg bg-muted p-3 space-y-1 text-sm">
              <p className="font-medium">Duplicating assignment:</p>
              <p className="text-muted-foreground">
                {sourceAssignment.service?.title || 'No Position'} - {sourceAssignment.event.title}
              </p>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            Select a target {eventTerm.lower} to duplicate this assignment to.
          </p>

          <div>
            <Label htmlFor="eventSelect" required>
              Target {eventTerm.singular}
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
