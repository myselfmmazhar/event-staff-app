'use client';

import { Badge } from '@/components/ui/badge';
import { CalendarEvent, formatEventTime } from '@/lib/utils/calendar-helpers';
import { EventStatus } from '@prisma/client';
import { isSameDay } from 'date-fns';

interface CalendarListItemProps {
  event: CalendarEvent;
  onClick: () => void;
}

const STATUS_COLORS: Record<
  EventStatus,
  'default' | 'info' | 'success' | 'primary' | 'purple' | 'danger'
> = {
  DRAFT: 'default',
  PUBLISHED: 'info',
  CONFIRMED: 'success',
  IN_PROGRESS: 'primary',
  COMPLETED: 'purple',
  CANCELLED: 'danger',
};

const STATUS_LABELS: Record<EventStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

function getTimeDisplay(event: CalendarEvent): string {
  // All-day event
  if (!event.startTime) {
    return 'All day';
  }

  const startTime = formatEventTime(event.startTime);
  const endTime = event.endTime ? formatEventTime(event.endTime) : null;

  // Check if multi-day event (calendar only shows events with valid dates)
  const isMultiDay = event.startDate && event.endDate && !isSameDay(new Date(event.startDate), new Date(event.endDate));

  if (isMultiDay) {
    return endTime ? `${startTime} - ${endTime} (multi-day)` : `${startTime} (multi-day)`;
  }

  return endTime ? `${startTime} - ${endTime}` : startTime;
}

export function CalendarListItem({ event, onClick }: CalendarListItemProps) {
  const timeDisplay = getTimeDisplay(event);

  return (
    <div
      role="button"
      onClick={onClick}
      className="flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer border-b border-border last:border-b-0"
    >
      {/* Status Badge */}
      <div className="pt-0.5">
        <Badge variant={STATUS_COLORS[event.status]} size="sm" asSpan>
          {STATUS_LABELS[event.status]}
        </Badge>
      </div>

      {/* Event Details */}
      <div className="flex-1 min-w-0">
        {/* Time */}
        <div className="text-sm text-muted-foreground">{timeDisplay}</div>

        {/* Title */}
        <div className="font-medium text-foreground truncate">{event.title}</div>

        {/* Venue and Client */}
        <div className="text-sm text-muted-foreground mt-0.5">
          {event.venueName}
          {event.client && (
            <>
              <span className="mx-1.5">•</span>
              {event.client.businessName}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
