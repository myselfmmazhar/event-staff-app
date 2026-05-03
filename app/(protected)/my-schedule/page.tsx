'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  PendingRequestsList,
  UpcomingEventsList,
  PastEventsList,
  DeclinedInvitationsList,
} from '@/components/staff-dashboard';
import { StaffCalendar } from '@/components/staff-dashboard/staff-calendar';
import { trpc } from '@/lib/client/trpc';
import { useToast } from '@/components/ui/use-toast';
import { CalendarIcon, ClockIcon, CheckCircleIcon, TableCellsIcon } from '@/components/ui/icons';
import { useEventTerm } from '@/lib/hooks/use-terminology';
import { cn } from '@/lib/utils';

type ViewMode = 'table' | 'calendar';
type ActiveCategory = 'pending' | 'upcoming' | 'history';

export default function MySchedulePage() {
  const { toast } = useToast();
  const eventTerm = useEventTerm();
  const [respondingTo, setRespondingTo] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [activeCategory, setActiveCategory] = useState<ActiveCategory>('pending');

  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.callTime.getMyInvitations.useQuery({});

  const respondMutation = trpc.callTime.respondToInvitation.useMutation({
    onSuccess: (result) => {
      if (result.status === 'ACCEPTED' && result.isConfirmed) {
        toast({
          title: 'Invitation Accepted',
          description: 'You have been confirmed for this event!',
        });
      } else if (result.status === 'WAITLISTED') {
        toast({
          title: 'Added to Waitlist',
          description:
            'All positions are currently filled. You will be notified if a spot opens up.',
        });
      } else if (result.status === 'DECLINED') {
        toast({
          title: 'Invitation Declined',
          description: 'The invitation has been declined.',
        });
      }
      setRespondingTo(undefined);
      utils.callTime.getMyInvitations.invalidate();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'error',
      });
      setRespondingTo(undefined);
    },
  });

  const batchRespondMutation = trpc.callTime.batchRespond.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Invitations Processed',
        description: `Successfully processed ${data.count} invitation(s).`,
      });
      utils.callTime.getMyInvitations.invalidate();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'error',
      });
    },
  });

  const handleRespond = (
    invitationId: string,
    accept: boolean,
    declineReason?: string
  ) => {
    setRespondingTo(invitationId);
    respondMutation.mutate({ invitationId, accept, declineReason });
  };

  const handleBatchRespond = (invitationIds: string[], accept: boolean) => {
    batchRespondMutation.mutate({ invitationIds, accept });
  };

  const handleCardClick = (category: ActiveCategory) => {
    setActiveCategory(category);
    setViewMode('table');
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-4 w-96 bg-muted animate-pulse rounded" />
        <div className="space-y-4 mt-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted/50 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-destructive">
          Error loading your schedule: {error.message}
        </p>
      </div>
    );
  }

  const pendingCount = data?.pending.length || 0;
  const upcomingCount = data?.accepted.length || 0;
  const pastCount = data?.past.length || 0;
  const declinedCount = data?.declined.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Schedule</h1>
          <p className="text-muted-foreground mt-1">
            Manage your {eventTerm.lower} invitations and view your upcoming assignments.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 shrink-0">
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="gap-2"
          >
            <TableCellsIcon className="h-4 w-4" />
            Table View
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('calendar')}
            className="gap-2"
          >
            <CalendarIcon className="h-4 w-4" />
            Calendar View
          </Button>
        </div>
      </div>

      {/* Summary Cards — clickable to filter table view */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleCardClick('pending')}
          onKeyDown={(e) => e.key === 'Enter' && handleCardClick('pending')}
          className={cn(
            'p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg cursor-pointer transition-all hover:shadow-md',
            activeCategory === 'pending' && viewMode === 'table' &&
              'ring-2 ring-yellow-400 dark:ring-yellow-600'
          )}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center">
              <ClockIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">Pending Requests</p>
            </div>
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => handleCardClick('upcoming')}
          onKeyDown={(e) => e.key === 'Enter' && handleCardClick('upcoming')}
          className={cn(
            'p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg cursor-pointer transition-all hover:shadow-md',
            activeCategory === 'upcoming' && viewMode === 'table' &&
              'ring-2 ring-blue-400 dark:ring-blue-600'
          )}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <CalendarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{upcomingCount}</p>
              <p className="text-sm text-muted-foreground">Upcoming {eventTerm.plural}</p>
            </div>
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => handleCardClick('history')}
          onKeyDown={(e) => e.key === 'Enter' && handleCardClick('history')}
          className={cn(
            'p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg cursor-pointer transition-all hover:shadow-md',
            activeCategory === 'history' && viewMode === 'table' &&
              'ring-2 ring-green-400 dark:ring-green-600'
          )}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
              <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pastCount}</p>
              <p className="text-sm text-muted-foreground">Completed {eventTerm.plural}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {viewMode === 'calendar' ? (
        <StaffCalendar onEventClick={() => {}} />
      ) : (
        <div>
          {activeCategory === 'pending' && (
            <PendingRequestsList
              invitations={data?.pending || []}
              onRespond={handleRespond}
              onBatchRespond={handleBatchRespond}
              isResponding={respondingTo}
              isBatchResponding={batchRespondMutation.isPending}
            />
          )}

          {activeCategory === 'upcoming' && (
            <UpcomingEventsList invitations={data?.accepted || []} />
          )}

          {activeCategory === 'history' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold mb-4">Completed</h3>
                <PastEventsList invitations={data?.past || []} />
              </div>
              {declinedCount > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Declined</h3>
                  <DeclinedInvitationsList invitations={data?.declined || []} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
