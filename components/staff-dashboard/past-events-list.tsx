'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { RATE_TYPE_LABELS } from '@/lib/schemas/call-time.schema';
import { RateType } from '@prisma/client';
import { CalendarIcon, MapPinIcon, CheckIcon } from '@/components/ui/icons';
import { useEventTerm } from '@/lib/hooks/use-terminology';

interface Invitation {
  id: string;
  status: string;
  isConfirmed: boolean;
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

interface PastEventsListProps {
  invitations: Invitation[];
}

export function PastEventsList({ invitations }: PastEventsListProps) {
  const eventTerm = useEventTerm();

  const formatDate = (date: Date | null) => {
    if (!date) return 'UBD';
    const d = new Date(date);
    // Check for epoch date (superjson bug workaround for null dates)
    if (d.getFullYear() === 1970) return 'UBD';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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

        return (
          <Card key={invitation.id} className="p-4">
            <div className="flex items-center justify-between">
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
                  {formatDate(invitation.callTime.startDate)}
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
          </Card>
        );
      })}
    </div>
  );
}
