'use client';

import { useState, useMemo } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { SearchIcon, CloseIcon } from '@/components/ui/icons';
import { useToast } from '@/components/ui/use-toast';
import { trpc } from '@/lib/client/trpc';
import { useTerminology } from '@/lib/hooks/use-terminology';
import type { StaffWithRelations } from './staff-table';

interface AssignStaffModalProps {
  staff: StaffWithRelations;
  open: boolean;
  onClose: () => void;
}

export function AssignStaffModal({ staff, open, onClose }: AssignStaffModalProps) {
  const { toast } = useToast();
  const { terminology } = useTerminology();
  const utils = trpc.useUtils();

  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedCallTimeId, setSelectedCallTimeId] = useState<string>('');
  const [eventSearch, setEventSearch] = useState('');

  // Fetch events
  const eventsQuery = trpc.event.getAll.useQuery({
    page: 1,
    limit: 100,
    search: eventSearch || undefined,
  });

  // Fetch call times for selected event
  const callTimesQuery = trpc.callTime.getAll.useQuery(
    { eventId: selectedEventId, page: 1, limit: 100 },
    { enabled: !!selectedEventId }
  );

  // Send invitation mutation
  const sendInvitationMutation = trpc.callTime.sendInvitations.useMutation({
    onSuccess: () => {
      toast({
        title: 'Invitation sent',
        description: `${staff.firstName} ${staff.lastName} has been invited to the assignment.`,
      });
      utils.callTime.getAll.invalidate();
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invitation',
        variant: 'destructive',
      });
    },
  });

  const events = eventsQuery.data?.data || [];
  const callTimes = callTimesQuery.data?.data || [];

  // Filter events by search
  const filteredEvents = useMemo(() => {
    if (!eventSearch) return events;
    const search = eventSearch.toLowerCase();
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(search) ||
        e.eventId.toLowerCase().includes(search) ||
        e.venueName?.toLowerCase().includes(search)
    );
  }, [events, eventSearch]);

  const handleSubmit = () => {
    if (!selectedCallTimeId) {
      toast({
        title: 'Error',
        description: 'Please select an assignment',
        variant: 'destructive',
      });
      return;
    }

    sendInvitationMutation.mutate({
      callTimeId: selectedCallTimeId,
      staffIds: [staff.id],
    });
  };

  const handleClose = () => {
    setSelectedEventId('');
    setSelectedCallTimeId('');
    setEventSearch('');
    onClose();
  };

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  return (
    <Dialog open={open} onClose={handleClose} className="max-w-lg">
      <DialogHeader>
        <div className="flex items-center justify-between">
          <DialogTitle>Assign to {terminology.event.singular}</DialogTitle>
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
        {/* Staff Info */}
        <div className="mb-6 p-3 bg-muted/30 rounded-md border border-border">
          <p className="text-sm text-muted-foreground">{terminology.staff.singular}</p>
          <p className="text-base font-medium">
            {staff.firstName} {staff.lastName}
          </p>
          <p className="text-sm text-muted-foreground">{staff.email}</p>
        </div>

        {/* Event Selection */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Select {terminology.event.singular}
            </Label>
            <div className="relative mb-2">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${terminology.event.lowerPlural}...`}
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedEventId} onValueChange={(value) => {
              setSelectedEventId(value);
              setSelectedCallTimeId('');
            }}>
              <SelectTrigger>
                <SelectValue placeholder={`Choose a ${terminology.event.lower}...`} />
              </SelectTrigger>
              <SelectContent>
                {filteredEvents.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.title} ({event.eventId})
                  </SelectItem>
                ))}
                {filteredEvents.length === 0 && (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    No {terminology.event.lowerPlural} found
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Assignment Selection */}
          {selectedEventId && (
            <div>
              <Label className="text-sm font-medium mb-2 block">Select Assignment</Label>
              {callTimesQuery.isLoading ? (
                <div className="text-sm text-muted-foreground">Loading assignments...</div>
              ) : callTimes.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No assignments available for this {terminology.event.lower}
                </div>
              ) : (
                <Select value={selectedCallTimeId} onValueChange={setSelectedCallTimeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an assignment..." />
                  </SelectTrigger>
                  <SelectContent>
                    {callTimes.map((ct) => (
                      <SelectItem key={ct.id} value={ct.id}>
                        {ct.service?.title || 'No Service'} - {ct.startDate ? new Date(ct.startDate).toLocaleDateString() : 'No date'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>
      </DialogContent>

      <DialogFooter>
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!selectedCallTimeId || sendInvitationMutation.isPending}
        >
          {sendInvitationMutation.isPending ? 'Sending...' : 'Send Invitation'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
