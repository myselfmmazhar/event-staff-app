'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RATE_TYPE_LABELS } from '@/lib/schemas/call-time.schema';
import { RateType } from '@prisma/client';
import { isDateNullOrUBD, toDisplayDate } from '@/lib/utils/date-formatter';
import {
  CalendarIcon,
  MapPinIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@/components/ui/icons';
import { useEventTerm } from '@/lib/hooks/use-terminology';
import { useTalentTimezone } from '@/lib/hooks/use-talent-timezone';
import { convertWallClock } from '@/lib/utils/timezone-convert';

interface ShiftSession {
  id: string;
  clockIn: Date | string;
  clockOut: Date | string | null;
}

interface Invitation {
  id: string;
  status: string;
  isConfirmed: boolean;
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
      timezone?: string | null;
    };
  };
}

interface PastEventsListProps {
  invitations: Invitation[];
}

export function PastEventsList({ invitations }: PastEventsListProps) {
  const eventTerm = useEventTerm();
  const { timezone: talentTz } = useTalentTimezone();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const formatDate = (date: Date | null) => {
    if (isDateNullOrUBD(date)) return 'UBD';
    return toDisplayDate(date)!.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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

  const sessionDurationMs = (session: ShiftSession) => {
    if (!session.clockOut) return 0;
    const ms =
      new Date(session.clockOut).getTime() - new Date(session.clockIn).getTime();
    return ms > 0 ? ms : 0;
  };

  const totalSessionsMs = (sessions: ShiftSession[]) => {
    return sessions.reduce((acc, s) => acc + sessionDurationMs(s), 0);
  };

  if (invitations.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
        <h3 className="text-lg font-medium mb-2">No past {eventTerm.lowerPlural}</h3>
        <p className="text-muted-foreground">
          Your completed {eventTerm.lowerPlural} will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {invitations.map((invitation) => {
        const payRate =
          typeof invitation.callTime.payRate === 'object'
            ? invitation.callTime.payRate.toNumber()
            : Number(invitation.callTime.payRate);

        const eventTz = invitation.callTime.event.timezone || 'UTC';
        const start = convertWallClock(
          invitation.callTime.startDate,
          invitation.callTime.startTime,
          eventTz,
          talentTz,
        );

        const sessions = invitation.shiftSessions ?? [];
        const isExpanded = !!expanded[invitation.id];
        const totalMs = totalSessionsMs(sessions);

        return (
          <Card key={invitation.id} className="p-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-medium">
                    {invitation.callTime.service?.title || 'Service'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {invitation.callTime.event.title}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarIcon className="h-4 w-4" />
                  {formatDate(start.date)}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPinIcon className="h-4 w-4" />
                  {invitation.callTime.event.city},{' '}
                  {invitation.callTime.event.state}
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    ${payRate.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {RATE_TYPE_LABELS[invitation.callTime.payRateType].toLowerCase()}
                  </p>
                </div>
                <Badge variant="outline">Completed</Badge>
              </div>
            </div>

            {sessions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Total worked:{' '}
                  <span className="font-medium text-foreground">
                    {formatDurationMs(totalMs)}
                  </span>
                </span>
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
            )}

            {isExpanded && sessions.length > 0 && (
              <div className="mt-3 space-y-2">
                {sessions.map((session, idx) => {
                  const ms = sessionDurationMs(session);
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
                          <span className="text-muted-foreground">Start:</span>{' '}
                          <span className="font-medium">
                            {formatTimestamp(session.clockIn)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">End:</span>{' '}
                          <span className="font-medium">
                            {session.clockOut
                              ? formatTimestamp(session.clockOut)
                              : '—'}
                          </span>
                        </div>
                      </div>
                      <span className="font-medium">
                        {session.clockOut ? formatDurationMs(ms) : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
