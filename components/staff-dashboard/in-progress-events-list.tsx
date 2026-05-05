'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { RATE_TYPE_LABELS } from '@/lib/schemas/call-time.schema';
import { RateType } from '@prisma/client';
import {
  CalendarIcon,
  MapPinIcon,
  ClockIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SpinnerIcon,
} from '@/components/ui/icons';
import { useEventTerm } from '@/lib/hooks/use-terminology';

interface ShiftSession {
  id: string;
  clockIn: Date | string;
  clockOut: Date | string | null;
}

interface Invitation {
  id: string;
  status: string;
  isConfirmed: boolean;
  confirmedAt: Date | null;
  shiftSessions?: ShiftSession[];
  callTime: {
    id: string;
    callTimeId: string;
    service: { title: string } | null;
    startDate: Date | null;
    startTime: string | null;
    endDate: Date | null;
    endTime: string | null;
    payRate: number | { toNumber: () => number };
    payRateType: RateType;
    event: {
      id: string;
      eventId: string;
      title: string;
      venueName: string;
      city: string;
      state: string;
    };
  };
}

interface InProgressEventsListProps {
  invitations: Invitation[];
  onStart: (invitationId: string) => void;
  onEnd: (invitationId: string) => void;
  pendingActionId?: string;
}

type PendingConfirm =
  | { invitationId: string; action: 'start' | 'end' }
  | null;

export function InProgressEventsList({
  invitations,
  onStart,
  onEnd,
  pendingActionId,
}: InProgressEventsListProps) {
  const eventTerm = useEventTerm();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [confirm, setConfirm] = useState<PendingConfirm>(null);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'TBD';
    const d = new Date(date);
    if (d.getFullYear() === 1970) return 'TBD';
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTimeStr = (time: string | null) => {
    if (!time) return 'TBD';
    const [hoursPart, minutesPart] = time.split(':');
    const hours = hoursPart ?? '0';
    const minutes = minutesPart ?? '00';
    const hour = Number.parseInt(hours, 10);
    const normalizedHour = Number.isNaN(hour) ? 0 : hour;
    return `${normalizedHour > 12 ? normalizedHour - 12 : normalizedHour}:${minutes} ${normalizedHour >= 12 ? 'PM' : 'AM'}`;
  };

  const formatTimestamp = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDurationMs = (ms: number) => {
    const totalMinutes = Math.floor(ms / 60000);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  const sessionDuration = (session: ShiftSession) => {
    if (!session.clockOut) return null;
    const ms =
      new Date(session.clockOut).getTime() - new Date(session.clockIn).getTime();
    return ms > 0 ? ms : 0;
  };

  const totalSessionsMs = (sessions: ShiftSession[]) => {
    return sessions.reduce((acc, s) => {
      const ms = sessionDuration(s);
      return acc + (ms ?? 0);
    }, 0);
  };

  const hasOpenSession = (sessions: ShiftSession[] | undefined) => {
    if (!sessions || sessions.length === 0) return false;
    return sessions.some((s) => !s.clockOut);
  };

  if (invitations.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
        <h3 className="text-lg font-medium mb-2">No {eventTerm.lowerPlural} in progress</h3>
        <p className="text-muted-foreground">
          {eventTerm.plural} on today's date will appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {invitations.map((invitation) => {
          const payRate =
            typeof invitation.callTime.payRate === 'object'
              ? invitation.callTime.payRate.toNumber()
              : Number(invitation.callTime.payRate);

          const isSameDay =
            invitation.callTime.startDate &&
            invitation.callTime.endDate &&
            new Date(invitation.callTime.startDate).toDateString() ===
              new Date(invitation.callTime.endDate).toDateString();

          const sessions = invitation.shiftSessions ?? [];
          const isOpen = hasOpenSession(sessions);
          const totalMs = totalSessionsMs(sessions);
          const isExpanded = !!expanded[invitation.id];
          const isProcessing = pendingActionId === invitation.id;

          return (
            <Card key={invitation.id} className="p-5">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircleIcon className="h-5 w-5 text-orange-500" />
                        <h3 className="text-lg font-semibold">
                          {invitation.callTime.service?.title || 'Service'}
                        </h3>
                      </div>
                      <p className="text-muted-foreground">
                        {invitation.callTime.event.title}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant="default"
                        className="bg-orange-500 hover:bg-orange-500 text-white"
                      >
                        {isOpen ? 'Active' : 'In Progress'}
                      </Badge>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">Date</p>
                        <p className="font-medium">
                          {formatDate(invitation.callTime.startDate)}
                          {!isSameDay && (
                            <>
                              <br />- {formatDate(invitation.callTime.endDate)}
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <ClockIcon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">Time</p>
                        <p className="font-medium">
                          {formatTimeStr(invitation.callTime.startTime)} -{' '}
                          {formatTimeStr(invitation.callTime.endTime)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPinIcon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">Location</p>
                        <p className="font-medium">
                          {invitation.callTime.event.venueName}
                          <br />
                          <span className="text-muted-foreground font-normal">
                            {invitation.callTime.event.city},{' '}
                            {invitation.callTime.event.state}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-muted-foreground">Pay Rate</p>
                      <p className="font-medium">
                        ${payRate.toFixed(2)}{' '}
                        {RATE_TYPE_LABELS[invitation.callTime.payRateType].toLowerCase()}
                      </p>
                    </div>
                  </div>

                  {/* Actions + total */}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={isOpen || isProcessing}
                      onClick={() =>
                        setConfirm({ invitationId: invitation.id, action: 'start' })
                      }
                    >
                      {isProcessing && !isOpen ? (
                        <SpinnerIcon className="h-4 w-4 animate-spin" />
                      ) : (
                        'Start'
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!isOpen || isProcessing}
                      onClick={() =>
                        setConfirm({ invitationId: invitation.id, action: 'end' })
                      }
                    >
                      {isProcessing && isOpen ? (
                        <SpinnerIcon className="h-4 w-4 animate-spin" />
                      ) : (
                        'End'
                      )}
                    </Button>

                    <div className="ml-auto flex items-center gap-2 text-sm">
                      {sessions.length > 0 && (
                        <span className="text-muted-foreground">
                          Total worked:{' '}
                          <span className="font-medium text-foreground">
                            {formatDurationMs(totalMs)}
                          </span>
                          {isOpen && (
                            <span className="text-orange-600 dark:text-orange-400 font-medium">
                              {' '}
                              + active
                            </span>
                          )}
                        </span>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleExpand(invitation.id)}
                        className="gap-1"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUpIcon className="h-4 w-4" />
                            Hide history
                          </>
                        ) : (
                          <>
                            <ChevronDownIcon className="h-4 w-4" />
                            View history ({sessions.length})
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded session history */}
                  {isExpanded && (
                    <div className="mt-4 border-t border-border pt-4">
                      <h4 className="text-sm font-medium mb-2">Time History</h4>
                      {sessions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No sessions yet. Click Start when your shift begins.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {sessions.map((session, idx) => {
                            const ms = sessionDuration(session);
                            return (
                              <div
                                key={session.id}
                                className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-medium text-muted-foreground w-12">
                                    #{idx + 1}
                                  </span>
                                  <div>
                                    <span className="text-muted-foreground">
                                      Start:
                                    </span>{' '}
                                    <span className="font-medium">
                                      {formatTimestamp(session.clockIn)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">
                                      End:
                                    </span>{' '}
                                    <span className="font-medium">
                                      {session.clockOut
                                        ? formatTimestamp(session.clockOut)
                                        : '—'}
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  {ms === null ? (
                                    <Badge
                                      variant="outline"
                                      className="border-orange-500 text-orange-600 dark:text-orange-400"
                                    >
                                      Active
                                    </Badge>
                                  ) : (
                                    <span className="font-medium">
                                      {formatDurationMs(ms)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Confirmation dialog */}
      <Dialog open={confirm !== null} onClose={() => setConfirm(null)}>
        <DialogHeader>
          <DialogTitle>
            {confirm?.action === 'start' ? 'Start shift?' : 'End shift?'}
          </DialogTitle>
          <DialogDescription>
            {confirm?.action === 'start'
              ? 'This will record the current time as your start time for this shift.'
              : 'This will record the current time as your end time and close the active session.'}
          </DialogDescription>
        </DialogHeader>
        <DialogContent>
          <p className="text-sm">
            <span className="text-muted-foreground">Current time:</span>{' '}
            <span className="font-medium">
              {new Date().toLocaleString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })}
            </span>
          </p>
        </DialogContent>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirm(null)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (!confirm) return;
              if (confirm.action === 'start') {
                onStart(confirm.invitationId);
              } else {
                onEnd(confirm.invitationId);
              }
              setConfirm(null);
            }}
          >
            Confirm
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
