'use client';

import { useState, useMemo } from 'react';
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
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { SearchIcon, ChevronDownIcon } from '@/components/ui/icons';
import { trpc } from '@/lib/client/trpc';
import { useToast } from '@/components/ui/use-toast';
import { CloseIcon } from '@/components/ui/icons';
import { EventFormModal } from '@/components/events/event-form-modal';
import { useEventTerm } from '@/lib/hooks/use-terminology';
import type { CreateEventInput, UpdateEventInput } from '@/lib/schemas/event.schema';
import { AmountType, EventStatus } from '@prisma/client';

const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  [EventStatus.DRAFT]: 'Draft',
  [EventStatus.ASSIGNED]: 'Assigned',
  [EventStatus.IN_PROGRESS]: 'In Progress',
  [EventStatus.COMPLETED]: 'Completed',
  [EventStatus.CANCELLED]: 'Cancelled',
  [EventStatus.PUBLISHED]: 'Published',
};

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

  const [eventSelectorOpen, setEventSelectorOpen] = useState(false);
  const [eventSearch, setEventSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'ALL'>('ALL');
  const [clientIdFilter, setClientIdFilter] = useState<string>('ALL');

  const { data: clientsData } = trpc.clients.getAll.useQuery({ page: 1, limit: 100 });
  const clients = clientsData?.data ?? [];

  const { data: eventsData, isLoading: isLoadingEvents } = trpc.event.getAll.useQuery({
    page: 1,
    limit: 100,
    status: statusFilter !== 'ALL' ? (statusFilter as EventStatus) : undefined,
    clientId: clientIdFilter !== 'ALL' ? clientIdFilter : undefined,
  });

  const allEvents = eventsData?.data ?? [];

  const events = useMemo(() => {
    if (!eventSearch.trim()) return allEvents;
    const q = eventSearch.toLowerCase();
    return allEvents.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.eventId.toLowerCase().includes(q),
    );
  }, [allEvents, eventSearch]);

  const selectedEvent = useMemo(
    () => allEvents.find((e) => e.id === selectedEventId) ?? null,
    [allEvents, selectedEventId],
  );

  const { data: selectedEventData, isLoading: isLoadingEvent } = trpc.event.getById.useQuery(
    { id: selectedEventId },
    { enabled: showEventForm && !!selectedEventId }
  );

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
    setEventSearch('');
    setStatusFilter('ALL');
    setClientIdFilter('ALL');
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
    <Dialog
      open={open}
      onClose={handleClose}
      className="mx-4 flex h-[min(94vh,1000px)] w-full max-h-[min(94vh,1000px)] max-w-[1400px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-card p-0 shadow-xl"
    >
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
            <Label required>{eventTerm.singular}</Label>

            {/* Filters row */}
            <div className="flex gap-2 mt-2 mb-2">
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as EventStatus | 'ALL')}
              >
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  {Object.values(EventStatus).map((s) => (
                    <SelectItem key={s} value={s}>
                      {EVENT_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={clientIdFilter}
                onValueChange={setClientIdFilter}
              >
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="Client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Clients</SelectItem>
                  {clients.map((c: { id: string; businessName: string | null }) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.businessName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Event selector with search */}
            <Popover open={eventSelectorOpen} onOpenChange={setEventSelectorOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between font-normal"
                  disabled={isLoadingEvents}
                >
                  <span className={selectedEvent ? 'text-foreground' : 'text-muted-foreground'}>
                    {selectedEvent
                      ? `${selectedEvent.title} (${selectedEvent.eventId})`
                      : `Select an ${eventTerm.lower}`}
                  </span>
                  <ChevronDownIcon className="h-4 w-4 opacity-50 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" style={{ width: 'var(--radix-popover-trigger-width)' }} align="start">
                <div className="p-2 border-b">
                  <div className="relative">
                    <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={`Search by name or ID…`}
                      value={eventSearch}
                      onChange={(e) => setEventSearch(e.target.value)}
                      className="pl-8 h-9"
                    />
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {isLoadingEvents ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">Loading…</div>
                  ) : events.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      {eventSearch ? `No ${eventTerm.lowerPlural} match your search` : `No ${eventTerm.lowerPlural} found`}
                    </div>
                  ) : (
                    <div className="py-1">
                      {events.map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-accent/50 transition-colors ${
                            selectedEventId === event.id ? 'bg-accent/30' : ''
                          }`}
                          onClick={() => {
                            setSelectedEventId(event.id);
                            setEventSelectorOpen(false);
                            setEventSearch('');
                          }}
                        >
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">{event.title}</div>
                            <div className="text-xs text-muted-foreground truncate">{event.eventId}</div>
                          </div>
                          {event.status && (
                            <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                              {EVENT_STATUS_LABELS[event.status as EventStatus]}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
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
