'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { RATE_TYPE_LABELS } from '@/lib/schemas/call-time.schema';
import { RateType } from '@prisma/client';
import {
  CalendarIcon,
  MapPinIcon,
  ClockIcon,
  CheckCircleIcon,
} from '@/components/ui/icons';
import { useEventTerm } from '@/lib/hooks/use-terminology';

interface Invitation {
  id: string;
  status: string;
  isConfirmed: boolean;
  confirmedAt: Date | null;
  callTime: {
    id: string;
    callTimeId: string;
    service: { title: string };
    startDate: Date;
    startTime: string | null;
    endDate: Date;
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

interface UpcomingEventsListProps {
  invitations: Invitation[];
}

export function UpcomingEventsList({ invitations }: UpcomingEventsListProps) {
  const eventTerm = useEventTerm();

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
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

  const getDaysUntil = (date: Date) => {
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

        const isSameDay =
          new Date(invitation.callTime.startDate).toDateString() ===
          new Date(invitation.callTime.endDate).toDateString();

        const daysUntil = getDaysUntil(invitation.callTime.startDate);

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
                        {invitation.callTime.service.title}
                      </h3>
                    </div>
                    <p className="text-muted-foreground">
                      {invitation.callTime.event.title}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="default">Confirmed</Badge>
                    {daysUntil > 0 && daysUntil <= 7 && (
                      <p className="text-sm text-muted-foreground mt-1">
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
                        {formatTime(invitation.callTime.startTime)} -{' '}
                        {formatTime(invitation.callTime.endTime)}
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
