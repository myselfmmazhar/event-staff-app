'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { InvitationResponseForm } from './invitation-response-form';
import { RATE_TYPE_LABELS } from '@/lib/schemas/call-time.schema';
import { RateType } from '@prisma/client';
import { CalendarIcon, MapPinIcon, ClockIcon, DollarSignIcon } from '@/components/ui/icons';
import { useEventTerm } from '@/lib/hooks/use-terminology';

interface Invitation {
  id: string;
  status: string;
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

interface PendingRequestsListProps {
  invitations: Invitation[];
  onRespond: (invitationId: string, accept: boolean, declineReason?: string) => void;
  isResponding?: string;
}

export function PendingRequestsList({
  invitations,
  onRespond,
  isResponding,
}: PendingRequestsListProps) {
  const eventTerm = useEventTerm();
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

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
    const hours = hoursPart ?? '0';
    const minutes = minutesPart ?? '00';
    const hour = Number.parseInt(hours, 10);
    const normalizedHour = Number.isNaN(hour) ? 0 : hour;
    return `${normalizedHour > 12 ? normalizedHour - 12 : normalizedHour}:${minutes} ${normalizedHour >= 12 ? 'PM' : 'AM'}`;
  };

  if (invitations.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
        <h3 className="text-lg font-medium mb-2">No pending requests</h3>
        <p className="text-muted-foreground">
          You don't have any pending {eventTerm.lower} invitations at the moment.
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

        const isSameDay = invitation.callTime.startDate && invitation.callTime.endDate &&
          new Date(invitation.callTime.startDate).toDateString() ===
          new Date(invitation.callTime.endDate).toDateString();

        return (
          <Card key={invitation.id} className="p-5">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex-1">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {invitation.callTime.service?.title || 'Service'}
                    </h3>
                    <p className="text-muted-foreground">
                      {invitation.callTime.event.title}
                    </p>
                  </div>
                  <Badge variant="secondary">Pending Response</Badge>
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

                  <div className="flex items-center gap-2">
                    <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
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

              {/* Actions */}
              {respondingTo === invitation.id ? (
                <InvitationResponseForm
                  onSubmit={(accept, reason) => {
                    onRespond(invitation.id, accept, reason);
                    setRespondingTo(null);
                  }}
                  onCancel={() => setRespondingTo(null)}
                  isSubmitting={isResponding === invitation.id}
                />
              ) : (
                <div className="flex gap-2 md:flex-col">
                  <Button
                    onClick={() => {
                      onRespond(invitation.id, true);
                    }}
                    disabled={isResponding === invitation.id}
                    className="flex-1 md:flex-none"
                  >
                    Accept
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setRespondingTo(invitation.id)}
                    disabled={isResponding === invitation.id}
                    className="flex-1 md:flex-none"
                  >
                    Decline
                  </Button>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
