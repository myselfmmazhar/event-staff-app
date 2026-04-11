'use client';

import { CalendarEvent, formatEventTime } from '@/lib/utils/calendar-helpers';
import { EventStatus } from '@prisma/client';
import { cn } from '@/lib/utils';

interface CalendarTimedEventProps {
  event: CalendarEvent;
  top: number; // percentage
  height: number; // percentage
  left: number; // percentage
  width: number; // percentage
  isFirstDay?: boolean;
  isLastDay?: boolean;
  isMiddleDay?: boolean;
  onClick: () => void;
  onHover: (e: React.MouseEvent) => void;
  onLeave: () => void;
}

const STATUS_COLORS: Record<EventStatus, string> = {
  DRAFT: 'bg-muted hover:bg-muted/80 border-muted-foreground/30',
  PUBLISHED: 'bg-success/20 hover:bg-success/30 border-success/50 text-success',
  ASSIGNED: 'bg-info/20 hover:bg-info/30 border-info/50 text-info',
  IN_PROGRESS: 'bg-primary/20 hover:bg-primary/30 border-primary/50 text-primary',
  COMPLETED: 'bg-success/20 hover:bg-success/30 border-success/50 text-success',
  CANCELLED: 'bg-destructive/20 hover:bg-destructive/30 border-destructive/50 text-destructive',
};

export function CalendarTimedEvent({
  event,
  top,
  height,
  left,
  width,
  isFirstDay = true,
  isLastDay = true,
  isMiddleDay = false,
  onClick,
  onHover,
  onLeave,
}: CalendarTimedEventProps) {
  const timeDisplay = formatEventTime(event.startTime);

  // Minimum height for readability
  const displayHeight = Math.max(height, 2); // At least 2% (roughly 30 min visually)

  // Determine border radius based on continuation
  const isContinuesBefore = !isFirstDay;
  const isContinuesAfter = !isLastDay;

  const borderRadiusClass = cn(
    isFirstDay && isLastDay && 'rounded', // Single day event
    isContinuesBefore && !isContinuesAfter && 'rounded-r rounded-l-none', // Last day
    !isContinuesBefore && isContinuesAfter && 'rounded-l rounded-r-none', // First day
    isContinuesBefore && isContinuesAfter && 'rounded-none' // Middle day
  );

  return (
    <div
      role="button"
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={cn(
        'absolute text-xs transition-colors cursor-pointer border-l-2 overflow-hidden',
        borderRadiusClass,
        STATUS_COLORS[event.status]
      )}
      style={{
        top: `${top}%`,
        height: `${displayHeight}%`,
        left: `calc(${left}% + 2px)`,
        width: `calc(${width}% - 4px)`,
        minHeight: '20px',
      }}
      title={`${event.title} - ${timeDisplay}`}
    >
      <div className="px-1.5 py-0.5 h-full flex flex-col">
        {/* Show continuation indicator for non-first days */}
        {isContinuesBefore && (
          <span className="text-[10px] opacity-70">← continues</span>
        )}

        {/* Show time only on first day */}
        {isFirstDay && (
          <div className="font-semibold truncate">{timeDisplay}</div>
        )}

        <div className="truncate text-[11px] leading-tight opacity-90 flex-1">
          {event.title}
        </div>

        {/* Show continuation indicator for non-last days */}
        {isContinuesAfter && (
          <span className="text-[10px] opacity-70 mt-auto">continues →</span>
        )}
      </div>
    </div>
  );
}
