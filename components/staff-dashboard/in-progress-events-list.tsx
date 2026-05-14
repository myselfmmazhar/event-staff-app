'use client';

import { useEffect, useState } from 'react';
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
import { useTalentTimezone } from '@/lib/hooks/use-talent-timezone';
import {
  convertWallClock,
  resolveWallClockInstant,
  shortTzLabel,
} from '@/lib/utils/timezone-convert';

interface ShiftSession {
  id: string;
  clockIn: Date | string;
  clockOut: Date | string | null;
}

interface Invitation {
  id: string;
  status: string;
  isConfirmed: boolean;
  confirmedAt?: Date | null;
  shiftSessions?: ShiftSession[];
  shiftEndedAt?: Date | string | null;
  callTime: {
    id: string;
    callTimeId: string;
    service: { title: string } | null;
    startDate: Date | string | null;
    startTime: string | null;
    endDate: Date | string | null;
    endTime: string | null;
    payRate: number | string | { toNumber?: () => number };
    payRateType: RateType;
    event: {
      id: string;
      eventId: string;
      title: string;
      venueName: string | null;
      city: string | null;
      state: string | null;
      timezone?: string | null;
    };
  };
}

interface InProgressEventsListProps {
  invitations: Invitation[];
  onStart: (invitationId: string) => void;
  onPause: (invitationId: string) => void;
  onEnd: (invitationId: string) => void;
  pendingActionId?: string;
}

type PendingConfirm =
  | { invitationId: string; action: 'start' | 'pause' | 'end' }
  | null;

const START_WINDOW_MS = 15 * 60 * 1000;

export function InProgressEventsList({
  invitations,
  onStart,
  onPause,
  onEnd,
  pendingActionId,
}: InProgressEventsListProps) {
  const eventTerm = useEventTerm();
  const { timezone: talentTz } = useTalentTimezone();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [confirm, setConfirm] = useState<PendingConfirm>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: prev[id] === false ? true : false }));
  };

  const formatDate = (date: Date | string | null) => {
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
      ...(talentTz ? { timeZone: talentTz } : {}),
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

  const getPayRate = (payRate: Invitation['callTime']['payRate']) => {
    if (typeof payRate === 'number') return payRate;
    if (typeof payRate === 'string') return parseFloat(payRate);
    if (payRate && typeof payRate === 'object' && 'toNumber' in payRate && payRate.toNumber) {
      return payRate.toNumber();
    }
    return 0;
  };

  const nowString = () =>
    new Date().toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      ...(talentTz ? { timeZone: talentTz } : {}),
    });

  if (invitations.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
        <h3 className="text-lg font-medium mb-2">No {eventTerm.lowerPlural} in progress</h3>
        <p className="text-muted-foreground">
          {eventTerm.plural} on today&apos;s date will appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {invitations.map((invitation) => {
          const payRate = getPayRate(invitation.callTime.payRate);

          const eventTz = invitation.callTime.event.timezone || 'UTC';
          const start = convertWallClock(
            invitation.callTime.startDate,
            invitation.callTime.startTime,
            eventTz,
            talentTz,
          );
          const end = convertWallClock(
            invitation.callTime.endDate,
            invitation.callTime.endTime,
            eventTz,
            talentTz,
          );
          const tzLabel = shortTzLabel(talentTz, start.date ?? new Date());

          const isSameDay =
            start.date &&
            end.date &&
            new Date(start.date).toDateString() ===
              new Date(end.date).toDateString();

          const sessions = invitation.shiftSessions ?? [];
          const isOpen = hasOpenSession(sessions);
          const totalMs = totalSessionsMs(sessions);
          const isExpanded = expanded[invitation.id] !== false;
          const isProcessing = pendingActionId === invitation.id;
          const isShiftEnded = !!invitation.shiftEndedAt;

          const scheduledStartInstant = resolveWallClockInstant(
            invitation.callTime.startDate,
            invitation.callTime.startTime,
            eventTz,
          );
          const hasScheduledStart = scheduledStartInstant !== null;
          const scheduledStartMs = scheduledStartInstant?.getTime() ?? null;
          const withinStartWindow =
            !hasScheduledStart ||
            scheduledStartMs === null ||
            now >= scheduledStartMs - START_WINDOW_MS;
          const minutesUntilWindowOpens =
            hasScheduledStart && scheduledStartMs !== null
              ? Math.max(0, Math.ceil((scheduledStartMs - START_WINDOW_MS - now) / 60_000))
              : 0;

          const startDisabled = isOpen || isProcessing || isShiftEnded || !withinStartWindow;
          const pauseDisabled = !isOpen || isProcessing || isShiftEnded;
          const endDisabled = (sessions.length === 0 && !isOpen) || isProcessing || isShiftEnded;

          return (
            <Card key={invitation.id} className="overflow-hidden">
              {/* Collapsed summary row */}
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircleIcon className="h-5 w-5 text-orange-500 shrink-0" />
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold leading-tight truncate">
                        {invitation.callTime.service?.title || 'Service'}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {invitation.callTime.event.title}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="default"
                      className="bg-orange-500 hover:bg-orange-500 text-white"
                    >
                      {isShiftEnded ? 'Ended' : isOpen ? 'Active' : 'In Progress'}
                    </Badge>
                  </div>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="flex items-start gap-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="font-medium">
                        {formatDate(start.date)}
                        {!isSameDay && (
                          <span className="block text-muted-foreground font-normal">
                            – {formatDate(end.date)}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <ClockIcon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Scheduled Time</p>
                      <p className="font-medium">
                        {formatTimeStr(start.time)} –{' '}
                        {formatTimeStr(end.time)}
                        {tzLabel && (
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            {tzLabel}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPinIcon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="font-medium">{invitation.callTime.event.venueName || '—'}</p>
                      {(invitation.callTime.event.city || invitation.callTime.event.state) && (
                        <p className="text-xs text-muted-foreground">
                          {[invitation.callTime.event.city, invitation.callTime.event.state]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Pay Rate</p>
                    <p className="font-medium">
                      ${payRate.toFixed(2)}{' '}
                      <span className="text-muted-foreground font-normal">
                        {RATE_TYPE_LABELS[invitation.callTime.payRateType].toLowerCase()}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Footer row */}
                <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-sm text-muted-foreground">
                    {sessions.length > 0 ? (
                      <span>
                        Time logged:{' '}
                        <span className="font-medium text-foreground">
                          {formatDurationMs(totalMs)}
                        </span>
                        {isOpen && (
                          <span className="text-orange-600 dark:text-orange-400 font-medium">
                            {' '}+ active
                          </span>
                        )}
                        {' '}({sessions.length} session{sessions.length !== 1 ? 's' : ''})
                      </span>
                    ) : (
                      <span className="italic">No time logged yet</span>
                    )}
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => toggleExpand(invitation.id)}
                    className="gap-1.5 text-sm"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUpIcon className="h-4 w-4" />
                        Collapse
                      </>
                    ) : (
                      <>
                        <ChevronDownIcon className="h-4 w-4" />
                        Manage Shift
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Expanded section */}
              {isExpanded && (
                <div className="border-t border-border bg-muted/30 px-5 py-5 space-y-5">
                  {/* Shift actions */}
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Shift Actions</h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      {isShiftEnded
                        ? 'This shift has been ended. No further actions are available.'
                        : isOpen
                        ? 'Your shift is currently active. Click Pause to save the current session, or End to finish the shift.'
                        : sessions.length > 0
                        ? 'Shift paused. Click Start to clock back in, or End to finish the shift.'
                        : hasScheduledStart && !withinStartWindow
                        ? `Start will be available 15 minutes before the scheduled start time (in ${minutesUntilWindowOpens} minute${minutesUntilWindowOpens === 1 ? '' : 's'}).`
                        : 'Click Start to clock in for this assignment.'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={startDisabled}
                        onClick={() =>
                          setConfirm({ invitationId: invitation.id, action: 'start' })
                        }
                        className="min-w-[110px]"
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
                        disabled={pauseDisabled}
                        onClick={() =>
                          setConfirm({ invitationId: invitation.id, action: 'pause' })
                        }
                        className="min-w-[110px]"
                      >
                        {isProcessing && isOpen ? (
                          <SpinnerIcon className="h-4 w-4 animate-spin" />
                        ) : (
                          'Pause'
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={endDisabled}
                        onClick={() =>
                          setConfirm({ invitationId: invitation.id, action: 'end' })
                        }
                        className="min-w-[110px]"
                      >
                        {isProcessing && !isOpen && sessions.length > 0 ? (
                          <SpinnerIcon className="h-4 w-4 animate-spin" />
                        ) : (
                          'End'
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Time log */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3">
                      Time Log
                      {sessions.length > 0 && (
                        <span className="ml-2 text-xs text-muted-foreground font-normal">
                          ({sessions.length} session{sessions.length !== 1 ? 's' : ''} &mdash; total{' '}
                          {formatDurationMs(totalMs)}
                          {isOpen && ' + active'})
                        </span>
                      )}
                    </h4>
                    {sessions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No sessions recorded yet. Click <strong>Start</strong> above when your shift begins.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {sessions.map((session, idx) => {
                          const ms = sessionDuration(session);
                          return (
                            <div
                              key={session.id}
                              className="flex items-center justify-between text-sm p-3 rounded-md bg-background border border-border"
                            >
                              <div className="flex items-center gap-4 flex-wrap">
                                <span className="text-xs font-medium text-muted-foreground w-8">
                                  #{idx + 1}
                                </span>
                                <div>
                                  <span className="text-xs text-muted-foreground">Clock In</span>
                                  <p className="font-medium">{formatTimestamp(session.clockIn)}</p>
                                </div>
                                <div>
                                  <span className="text-xs text-muted-foreground">Clock Out</span>
                                  <p className="font-medium">
                                    {session.clockOut
                                      ? formatTimestamp(session.clockOut)
                                      : '—'}
                                  </p>
                                </div>
                              </div>
                              <div className="shrink-0">
                                {ms === null ? (
                                  <Badge
                                    variant="outline"
                                    className="border-orange-500 text-orange-600 dark:text-orange-400"
                                  >
                                    Active
                                  </Badge>
                                ) : (
                                  <span className="text-sm font-semibold text-foreground">
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
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Confirmation dialog */}
      <Dialog open={confirm !== null} onClose={() => setConfirm(null)}>
        <DialogHeader>
          <DialogTitle>
            {confirm?.action === 'start'
              ? 'Start shift?'
              : confirm?.action === 'pause'
              ? 'Pause shift?'
              : 'End shift?'}
          </DialogTitle>
          <DialogDescription>
            {confirm?.action === 'start'
              ? 'This will record the current time as your clock-in for this shift.'
              : confirm?.action === 'pause'
              ? 'This will close the current session and save the time. You can start a new session afterwards.'
              : 'This will permanently end the shift. You will not be able to start it again.'}
          </DialogDescription>
        </DialogHeader>
        <DialogContent>
          <div className="rounded-md bg-muted px-4 py-3 text-sm">
            <span className="text-muted-foreground">Recording time: </span>
            <span className="font-semibold">{nowString()}</span>
            {talentTz && (
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                {shortTzLabel(talentTz)}
              </span>
            )}
          </div>
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
              } else if (confirm.action === 'pause') {
                onPause(confirm.invitationId);
              } else {
                onEnd(confirm.invitationId);
              }
              setConfirm(null);
            }}
          >
            {confirm?.action === 'start'
              ? 'Confirm Clock In'
              : confirm?.action === 'pause'
              ? 'Confirm Pause'
              : 'Confirm End Shift'}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
