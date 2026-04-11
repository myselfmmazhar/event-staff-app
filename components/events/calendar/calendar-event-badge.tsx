'use client';

import { CalendarEvent, formatEventTime } from '@/lib/utils/calendar-helpers';
import { EventStatus } from '@prisma/client';
import { cn } from '@/lib/utils';

interface CalendarEventBadgeProps {
  event: CalendarEvent;
  isContinuesBefore?: boolean;
  isContinuesAfter?: boolean;
  onClick: () => void;
  onHover: (e: React.MouseEvent) => void;
  onLeave: () => void;
}

const STATUS_COLORS: Record<EventStatus, string> = {
  DRAFT: 'bg-muted hover:bg-muted/80',
  PUBLISHED: 'bg-success/20 hover:bg-success/30 text-success',
  ASSIGNED: 'bg-info/20 hover:bg-info/30 text-info',
  IN_PROGRESS: 'bg-primary/20 hover:bg-primary/30 text-primary',
  COMPLETED: 'bg-success/20 hover:bg-success/30 text-success',
  CANCELLED: 'bg-destructive/20 hover:bg-destructive/30 text-destructive',
};

export function CalendarEventBadge({
  event,
  isContinuesBefore = false,
  isContinuesAfter = false,
  onClick,
  onHover,
  onLeave,
}: CalendarEventBadgeProps) {
  const timeDisplay = formatEventTime(event.startTime);

  // Determine border radius based on continuation
  const borderRadiusClass = cn(
    !isContinuesBefore && !isContinuesAfter && 'rounded', // Normal event
    isContinuesBefore && !isContinuesAfter && 'rounded-r rounded-l-none', // Continues from previous week
    !isContinuesBefore && isContinuesAfter && 'rounded-l rounded-r-none', // Continues to next week
    isContinuesBefore && isContinuesAfter && 'rounded-none' // Continues both directions
  );

  return (
    <div
      role="button"
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={cn(
        'w-full h-full text-left px-2 py-0.5 text-xs font-medium transition-colors cursor-pointer border border-transparent hover:border-border flex items-center overflow-hidden',
        borderRadiusClass,
        STATUS_COLORS[event.status],
        // Add subtle border on continuation edges
        isContinuesBefore && 'border-l-2 border-l-border/50',
        isContinuesAfter && 'border-r-2 border-r-border/50'
      )}
      title={event.title}
    >
      {/* Visual indicator for continuation from previous week */}
      {isContinuesBefore && (
        <span className="mr-1 text-[10px] opacity-70">←</span>
      )}

      <span className="truncate flex-1">
        {timeDisplay !== 'TBD' && <span className="font-semibold">{timeDisplay}</span>}
        {timeDisplay !== 'TBD' && ' - '}
        {event.title}
      </span>

      {/* Visual indicator for continuation to next week */}
      {isContinuesAfter && (
        <span className="ml-1 text-[10px] opacity-70">→</span>
      )}
    </div>
  );
}
