'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { CalendarIcon, ClockIcon, MapPinIcon } from '@/components/ui/icons';
import { RATE_TYPE_LABELS } from '@/lib/schemas/call-time.schema';
import { useEventTerm } from '@/lib/hooks/use-terminology';
import { useTalentTimezone } from '@/lib/hooks/use-talent-timezone';
import { convertWallClock, shortTzLabel } from '@/lib/utils/timezone-convert';
import type { RateType } from '@prisma/client';

interface Invitation {
  id: string;
  declineReason: string | null;
  respondedAt: Date | null;
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

interface DeclinedInvitationsListProps {
  invitations: Invitation[];
}

const formatDate = (date: Date | null) => {
  if (!date) return 'UBD';
  const d = new Date(date);
  // Check for epoch date (superjson bug workaround for null dates)
  if (d.getFullYear() === 1970) return 'UBD';
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatTime = (time: string | null) => {
  if (!time) return 'TBD';
  const [hoursPart, minutesPart] = time.split(':');
  if (!hoursPart || !minutesPart) {
    return 'TBD';
  }
  const hour = Number.parseInt(hoursPart, 10);
  if (Number.isNaN(hour)) {
    return 'TBD';
  }
  return `${hour > 12 ? hour - 12 : hour}:${minutesPart} ${hour >= 12 ? 'PM' : 'AM'}`;
};

export function DeclinedInvitationsList({
  invitations,
}: DeclinedInvitationsListProps) {
  const eventTerm = useEventTerm();
  const { timezone: talentTz } = useTalentTimezone();

  if (invitations.length === 0) {
    return (
      <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-3">
          <ClockIcon className="h-5 w-5 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">No declined requests</h3>
        <p className="text-muted-foreground text-sm mt-1">
          When you decline a {eventTerm.lower} call time, it will appear here with
          the reason you provided.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
        const end = convertWallClock(
          invitation.callTime.endDate,
          invitation.callTime.endTime,
          eventTz,
          talentTz,
        );
        const tzLabel = shortTzLabel(talentTz, start.date ?? new Date());

        return (
          <Card key={invitation.id} className="p-4 border-destructive/20 bg-destructive/5">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Position</p>
                  <h3 className="text-lg font-semibold">
                    {invitation.callTime.service?.title || 'Service'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {invitation.callTime.event.title}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="destructive">Declined</Badge>
                  {invitation.respondedAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(invitation.respondedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Date</p>
                    <p className="font-medium">
                      {formatDate(start.date)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <ClockIcon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Time</p>
                    <p className="font-medium">
                      {formatTime(start.time)} -{' '}
                      {formatTime(end.time)}
                      {tzLabel && (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          {tzLabel}
                        </span>
                      )}
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
                        {invitation.callTime.event.city}, {invitation.callTime.event.state}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-md bg-background/80 border p-3">
                <p className="text-sm font-medium text-destructive">Reason for declining</p>
                <p className="text-sm mt-1">
                  {invitation.declineReason || 'No reason provided'}
                </p>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>
                  Offered rate: <span className="font-medium text-foreground">${payRate.toFixed(2)}</span>{' '}
                  {RATE_TYPE_LABELS[invitation.callTime.payRateType].toLowerCase()}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
