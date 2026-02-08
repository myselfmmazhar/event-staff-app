'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  PendingRequestsList,
  UpcomingEventsList,
  PastEventsList,
  DeclinedInvitationsList,
} from '@/components/staff-dashboard';
import { trpc } from '@/lib/client/trpc';
import { useToast } from '@/components/ui/use-toast';
import { CalendarIcon, ClockIcon, CheckCircleIcon } from '@/components/ui/icons';
import { useEventTerm } from '@/lib/hooks/use-terminology';

export default function MySchedulePage() {
  const { toast } = useToast();
  const eventTerm = useEventTerm();
  const [respondingTo, setRespondingTo] = useState<string | undefined>();

  const utils = trpc.useUtils();

  // Fetch invitations
  const { data, isLoading, error } = trpc.callTime.getMyInvitations.useQuery({});

  // Respond to invitation mutation
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

  const handleRespond = (
    invitationId: string,
    accept: boolean,
    declineReason?: string
  ) => {
    setRespondingTo(invitationId);
    respondMutation.mutate({
      invitationId,
      accept,
      declineReason,
    });
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
  const historyCount = pastCount + declinedCount;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">My Schedule</h1>
        <p className="text-muted-foreground mt-1">
          Manage your {eventTerm.lower} invitations and view your upcoming assignments.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
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

        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
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

        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
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

      {/* Tabs */}
      <Tabs defaultValue="pending" className="mt-6">
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4" />
            Pending
            {pendingCount > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 rounded-full">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Upcoming
            {upcomingCount > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full">
                {upcomingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <CheckCircleIcon className="h-4 w-4" />
            History
            {historyCount > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full">
                {historyCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <PendingRequestsList
            invitations={data?.pending || []}
            onRespond={handleRespond}
            isResponding={respondingTo}
          />
        </TabsContent>

        <TabsContent value="upcoming" className="mt-6">
          <UpcomingEventsList invitations={data?.accepted || []} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold">History</h3>
              <p className="text-sm text-muted-foreground">
                Review your completed assignments or revisit requests you declined.
              </p>
            </div>
            <Tabs defaultValue={pastCount > 0 ? 'completed' : 'declined'} className="space-y-4">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="completed" className="flex items-center justify-center gap-2">
                  Completed
                  {pastCount > 0 && (
                    <span className="ml-1 px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded-full">
                      {pastCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="declined" className="flex items-center justify-center gap-2">
                  Declined
                  {declinedCount > 0 && (
                    <span className="ml-1 px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded-full">
                      {declinedCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="completed">
                <PastEventsList invitations={data?.past || []} />
              </TabsContent>
              <TabsContent value="declined">
                <DeclinedInvitationsList invitations={data?.declined || []} />
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
