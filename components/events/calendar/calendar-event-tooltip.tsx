'use client';

import { Badge } from '@/components/ui/badge';
import { CalendarEvent, formatEventDateTime } from '@/lib/utils/calendar-helpers';
import { EventStatus } from '@prisma/client';

interface CalendarEventTooltipProps {
  event: CalendarEvent;
  position: { x: number; y: number };
}

const STATUS_COLORS: Record<EventStatus, 'default' | 'info' | 'success' | 'primary' | 'purple' | 'danger'> = {
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

export function CalendarEventTooltip({ event, position }: CalendarEventTooltipProps) {
  // Bounds checking - ensure tooltip stays within viewport
  const tooltipWidth = 300;
  const tooltipHeight = 200;

  const adjustedX =
    position.x + tooltipWidth > window.innerWidth
      ? position.x - tooltipWidth - 10
      : position.x + 10;

  const adjustedY =
    position.y + tooltipHeight > window.innerHeight
      ? position.y - tooltipHeight - 10
      : position.y + 10;

  return (
    <div
      className="fixed z-50 w-[300px] rounded-lg border border-border bg-card p-4 shadow-xl"
      style={{
        left: `${adjustedX}px`,
        top: `${adjustedY}px`,
      }}
    >
      {/* Event Title */}
      <h4 className="font-semibold text-foreground mb-2 text-sm">{event.title}</h4>

      {/* Event Details */}
      <div className="space-y-1.5 text-xs text-muted-foreground">
        {/* Start Date/Time */}
        <div>
          <span className="font-medium">Start:</span>{' '}
          {event.startDate ? formatEventDateTime(new Date(event.startDate), event.startTime, event.timezone) : 'UBD'}
        </div>

        {/* End Date/Time */}
        <div>
          <span className="font-medium">End:</span>{' '}
          {event.endDate ? formatEventDateTime(new Date(event.endDate), event.endTime, event.timezone) : 'UBD'}
        </div>

        {/* Venue */}
        <div>
          <span className="font-medium">Venue:</span> {event.venueName}
        </div>

        {/* Client (if exists) */}
        {event.client && (
          <div>
            <span className="font-medium">Client:</span> {event.client.businessName}
          </div>
        )}
      </div>

      {/* Status Badge */}
      <div className="mt-3 pt-2 border-t border-border">
        <Badge variant={STATUS_COLORS[event.status]} size="sm" asSpan>
          {STATUS_LABELS[event.status]}
        </Badge>
      </div>

      {/* Small arrow pointing to event */}
      <div
        className="absolute w-2 h-2 bg-card border-l border-t border-border rotate-45"
        style={{
          left: position.x + tooltipWidth > window.innerWidth ? 'auto' : '-4px',
          right: position.x + tooltipWidth > window.innerWidth ? '-4px' : 'auto',
          top: '16px',
        }}
      />
    </div>
  );
}
