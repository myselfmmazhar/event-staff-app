'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  PendingRequestsList,
  InProgressEventsList,
  TalentAssignmentTable,
  TalentCallTimeDetailModal,
  type TalentInvitationData,
} from '@/components/staff-dashboard';
import { StaffCalendar } from '@/components/staff-dashboard/staff-calendar';
import { trpc } from '@/lib/client/trpc';
import { useToast } from '@/components/ui/use-toast';
import { CalendarIcon, ClockIcon, CheckCircleIcon, TableCellsIcon } from '@/components/ui/icons';
import { useEventTerm } from '@/lib/hooks/use-terminology';
import { cn } from '@/lib/utils';

type ViewMode = 'table' | 'calendar';
type ActiveCategory = 'inProgress' | 'upcoming' | 'pending' | 'history';

export default function MySchedulePage() {
  const { toast } = useToast();
  const eventTerm = useEventTerm();
  const searchParams = useSearchParams();
  const highlightedInvitationId = searchParams.get('invitation') ?? undefined;
  const [respondingTo, setRespondingTo] = useState<string | undefined>();
  const [shiftActionId, setShiftActionId] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [activeCategory, setActiveCategory] = useState<ActiveCategory>('inProgress');
  const [detailInvitationId, setDetailInvitationId] = useState<string | null>(null);

  useEffect(() => {
    if (highlightedInvitationId) {
      setActiveCategory('pending');
      setViewMode('table');
    }
  }, [highlightedInvitationId]);

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

  const startShiftMutation = trpc.callTime.startShift.useMutation({
    onSuccess: () => {
      toast({
        title: 'Shift started',
        description: 'Your start time has been recorded.',
      });
      setShiftActionId(undefined);
      utils.callTime.getMyInvitations.invalidate();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'error',
      });
      setShiftActionId(undefined);
    },
  });

  const endShiftMutation = trpc.callTime.endShift.useMutation({
    onSuccess: () => {
      toast({
        title: 'Shift ended',
        description: 'Your end time has been recorded.',
      });
      setShiftActionId(undefined);
      utils.callTime.getMyInvitations.invalidate();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'error',
      });
      setShiftActionId(undefined);
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

  const handleStartShift = (invitationId: string) => {
    setShiftActionId(invitationId);
    startShiftMutation.mutate({ invitationId });
  };

  const handleEndShift = (invitationId: string) => {
    setShiftActionId(invitationId);
    endShiftMutation.mutate({ invitationId });
  };

  const handleCardClick = (category: ActiveCategory) => {
    setActiveCategory(category);
    setViewMode('table');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl px-6 py-5">
            <div className="h-7 w-48 bg-muted animate-pulse rounded mb-2" />
            <div className="h-4 w-96 bg-muted animate-pulse rounded" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-xl p-5 h-[110px] animate-pulse"
              />
            ))}
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="border-b border-border px-6 py-4 h-[68px]" />
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-32 bg-muted/50 animate-pulse rounded-lg"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="bg-card border border-border rounded-xl px-6 py-5">
          <p className="text-destructive">
            Error loading your schedule: {error.message}
          </p>
        </div>
      </div>
    );
  }

  const inProgressCount = data?.inProgress?.length || 0;
  const upcomingCount = data?.accepted.length || 0;
  const pendingCount = data?.pending.length || 0;
  const pastCount = data?.past.length || 0;
  const declinedCount = data?.declined.length || 0;

  const summaryCards: Array<{
    key: ActiveCategory;
    label: string;
    count: number;
    icon: typeof ClockIcon;
    iconBg: string;
    iconColor: string;
    valueColor: string;
  }> = [
    {
      key: 'inProgress',
      label: 'In Progress',
      count: inProgressCount,
      icon: ClockIcon,
      iconBg: 'bg-orange-100 dark:bg-orange-900/30',
      iconColor: 'text-orange-600 dark:text-orange-400',
      valueColor: 'text-orange-600 dark:text-orange-400',
    },
    {
      key: 'upcoming',
      label: `Upcoming ${eventTerm.plural}`,
      count: upcomingCount,
      icon: CalendarIcon,
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      valueColor: 'text-foreground',
    },
    {
      key: 'pending',
      label: 'Pending Requests',
      count: pendingCount,
      icon: ClockIcon,
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      valueColor: 'text-foreground',
    },
    {
      key: 'history',
      label: `Completed ${eventTerm.plural}`,
      count: pastCount,
      icon: CheckCircleIcon,
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400',
      valueColor: 'text-foreground',
    },
  ];

  const categoryMeta: Record<
    ActiveCategory,
    { title: string; description: string }
  > = {
    inProgress: {
      title: `${eventTerm.plural} In Progress`,
      description: `${eventTerm.plural} on today's date — clock in and out from here.`,
    },
    upcoming: {
      title: `Upcoming ${eventTerm.plural}`,
      description: `Confirmed assignments scheduled in the future.`,
    },
    pending: {
      title: 'Pending Requests',
      description: `Invitations awaiting your response.`,
    },
    history: {
      title: 'History',
      description: `Completed ${eventTerm.lowerPlural} and declined invitations.`,
    },
  };

  const currentMeta =
    viewMode === 'calendar'
      ? {
          title: 'Schedule Calendar',
          description: `View all your ${eventTerm.lowerPlural} on a calendar.`,
        }
      : categoryMeta[activeCategory];

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="space-y-6">
        {/* Welcome banner */}
        <div className="bg-card border border-border rounded-xl px-6 py-5">
          <h1 className="text-3xl font-bold text-foreground mb-2">My Schedule</h1>
          <p className="text-sm text-muted-foreground">
            Manage your {eventTerm.lower} invitations and view your upcoming assignments.
          </p>
        </div>

        {/* Summary Cards — clickable to filter table view */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            const isActive =
              activeCategory === card.key && viewMode === 'table';
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => handleCardClick(card.key)}
                className={cn(
                  'bg-card border border-border rounded-xl p-5 text-left transition-all hover:shadow-md hover:border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  isActive && 'ring-2 ring-primary border-primary/40 shadow-sm'
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={cn(
                      'h-9 w-9 rounded-lg flex items-center justify-center',
                      card.iconBg
                    )}
                  >
                    <Icon className={cn('h-4 w-4', card.iconColor)} />
                  </div>
                  <p className={cn('text-3xl font-bold', card.valueColor)}>
                    {card.count}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  {card.label}
                </p>
              </button>
            );
          })}
        </div>

        {/* Main content card */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="border-b border-border px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground">
                {currentMeta.title}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {currentMeta.description}
              </p>
            </div>

            {/* View toggle */}
            <div className="inline-flex items-center gap-1 rounded-lg bg-muted p-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('table')}
                className={cn(
                  'h-7 gap-1.5 text-xs rounded-md px-3',
                  viewMode === 'table'
                    ? 'bg-card text-foreground shadow-sm hover:bg-card'
                    : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
                )}
              >
                <TableCellsIcon className="h-3.5 w-3.5" />
                Table
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('calendar')}
                className={cn(
                  'h-7 gap-1.5 text-xs rounded-md px-3',
                  viewMode === 'calendar'
                    ? 'bg-card text-foreground shadow-sm hover:bg-card'
                    : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
                )}
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                Calendar
              </Button>
            </div>
          </div>

          <div className="p-6">
            {viewMode === 'calendar' ? (
              <StaffCalendar onEventClick={() => {}} />
            ) : (
              <>
                {activeCategory === 'inProgress' && (
                  <InProgressEventsList
                    invitations={(data?.inProgress || []) as TalentInvitationData[]}
                    onStart={handleStartShift}
                    onEnd={handleEndShift}
                    pendingActionId={shiftActionId}
                  />
                )}

                {activeCategory === 'upcoming' && (
                  <TalentAssignmentTable
                    data={(data?.accepted || []) as TalentInvitationData[]}
                    category="upcoming"
                    onViewDetails={(inv) => setDetailInvitationId(inv.id)}
                    emptyMessage={`No upcoming ${eventTerm.lowerPlural}`}
                    emptyDescription={`You don't have any confirmed upcoming ${eventTerm.lowerPlural} yet.`}
                  />
                )}

                {activeCategory === 'pending' && (
                  <PendingRequestsList
                    invitations={data?.pending || []}
                    onRespond={handleRespond}
                    onBatchRespond={handleBatchRespond}
                    isResponding={respondingTo}
                    isBatchResponding={batchRespondMutation.isPending}
                    highlightedId={highlightedInvitationId}
                  />
                )}

                {activeCategory === 'history' && (
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-3">
                        Completed
                      </h3>
                      <TalentAssignmentTable
                        data={(data?.past || []) as TalentInvitationData[]}
                        category="past"
                        onViewDetails={(inv) => setDetailInvitationId(inv.id)}
                        emptyMessage={`No past ${eventTerm.lowerPlural}`}
                        emptyDescription={`Your completed ${eventTerm.lowerPlural} will appear here.`}
                      />
                    </div>
                    {declinedCount > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-3">
                          Declined
                        </h3>
                        <TalentAssignmentTable
                          data={(data?.declined || []) as TalentInvitationData[]}
                          category="declined"
                          onViewDetails={(inv) => setDetailInvitationId(inv.id)}
                          emptyMessage="No declined invitations"
                        />
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <TalentCallTimeDetailModal
        invitationId={detailInvitationId}
        open={detailInvitationId !== null}
        onClose={() => setDetailInvitationId(null)}
      />
    </div>
  );
}
