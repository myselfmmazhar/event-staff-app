'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RATE_TYPE_LABELS } from '@/lib/schemas/call-time.schema';
import { RateType } from '@prisma/client';
import {
  CalendarIcon,
  MapPinIcon,
  ClockIcon,
  CheckCircleIcon,
  EyeIcon,
} from '@/components/ui/icons';
import { useEventTerm } from '@/lib/hooks/use-terminology';
import { useTalentTimezone } from '@/lib/hooks/use-talent-timezone';
import { convertWallClock, shortTzLabel } from '@/lib/utils/timezone-convert';
import { isDateNullOrUBD, toDisplayDate } from '@/lib/utils/date-formatter';

interface Invitation {
  id: string;
  status: string;
  isConfirmed: boolean;
  confirmedAt: Date | null;
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

interface UpcomingEventsListProps {
  invitations: Invitation[];
  onViewDetails?: (invitationId: string) => void;
}

export function UpcomingEventsList({ invitations, onViewDetails }: UpcomingEventsListProps) {
  const eventTerm = useEventTerm();
  const { timezone: talentTz } = useTalentTimezone();

  const formatDate = (date: Date | null) => {
    if (isDateNullOrUBD(date)) return 'UBD';
    return toDisplayDate(date)!.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (time: string | null) => {
    if (!time) return 'TBD';
    const [hoursPart, minutesPart] = time.split(':');
    const hours = hoursPart ?? '0';
    const minutes = minutesPart ?? '00';
    const hour = Number.parseInt(hours, 10);
    const normalizedHour = Number.isNaN(hour) ? 0 : hour;
    return `${normalizedHour > 12 ? normalizedHour - 12 : normalizedHour}:${minutes} ${normalizedHour >= 12 ? 'PM' : 'AM'}`;
  };

  const getDaysUntil = (date: Date | null) => {
    if (!date) return null;
    const now = new Date();
    const eventDate = new Date(date);
    const diffTime = eventDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (invitations.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
        <h3 className="text-lg font-medium mb-2">No upcoming {eventTerm.lowerPlural}</h3>
        <p className="text-muted-foreground">
          You don't have any confirmed upcoming {eventTerm.lowerPlural} yet.
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

        const isSameDay = start.date && end.date &&
          new Date(start.date).toDateString() ===
          new Date(end.date).toDateString();

        const daysUntil = getDaysUntil(start.date);

        return (
          <Card key={invitation.id} className="p-5">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex-1">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      <h3 className="text-lg font-semibold">
                        {invitation.callTime.service?.title || 'Service'}
                      </h3>
                    </div>
                    <p className="text-muted-foreground">
                      {invitation.callTime.event.title}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="default">Confirmed</Badge>
                      {onViewDetails && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => onViewDetails(invitation.id)}
                          title="View Details"
                        >
                          <EyeIcon className="h-4 w-4" />
                          <span className="sr-only">View Details</span>
                        </Button>
                      )}
                    </div>
                    {daysUntil !== null && daysUntil > 0 && daysUntil <= 7 && (
                      <p className="text-sm text-muted-foreground">
                        {daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}
                      </p>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Date</p>
                      <p className="font-medium">
                        {formatDate(start.date)}
                        {!isSameDay && (
                          <>
                            <br />- {formatDate(end.date)}
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
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
