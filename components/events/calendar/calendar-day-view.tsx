'use client';

import { useMemo, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import {
  CalendarEvent,
  categorizeEvents,
  getTimedEventLayout,
  getEventsForDay,
  isToday,
} from '@/lib/utils/calendar-helpers';
import { CalendarTimedEvent } from './calendar-timed-event';
import { CalendarEventBadge } from './calendar-event-badge';
import { cn } from '@/lib/utils';

interface CalendarDayViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick: (eventId: string) => void;
  onEventHover: (event: CalendarEvent, position: { x: number; y: number }) => void;
  onEventLeave: () => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 60; // pixels per hour

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

export function CalendarDayView({
  events,
  currentDate,
  onEventClick,
  onEventHover,
  onEventLeave,
}: CalendarDayViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDateToday = isToday(currentDate);

  // Scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const scrollPosition = (now.getHours() - 1) * HOUR_HEIGHT;
      scrollRef.current.scrollTop = Math.max(0, scrollPosition);
    }
  }, []);

  // Filter events for this day and categorize them
  const dayEvents = useMemo(
    () => getEventsForDay(events, currentDate),
    [events, currentDate]
  );

  const { allDayEvents, timedEvents } = useMemo(
    () => categorizeEvents(dayEvents),
    [dayEvents]
  );

  // Calculate layout for timed events
  const timedEventLayouts = useMemo(
    () => getTimedEventLayout(timedEvents, currentDate),
    [timedEvents, currentDate]
  );

  return (
    <div className="mt-4 border rounded-lg overflow-hidden bg-background">
      {/* Day Header */}
      <div
        className={cn(
          'px-6 py-4 border-b bg-muted/30',
          isDateToday && 'bg-primary/5'
        )}
      >
        <div className="text-sm text-muted-foreground font-medium uppercase">
          {format(currentDate, 'EEEE')}
        </div>
        <div
          className={cn(
            'text-3xl font-semibold mt-1',
            isDateToday ? 'text-primary' : 'text-foreground'
          )}
        >
          {format(currentDate, 'MMMM d, yyyy')}
        </div>
      </div>

      {/* All-day events section */}
      {allDayEvents.length > 0 && (
        <div className="border-b bg-muted/20">
          <div className="grid grid-cols-[60px_1fr]">
            {/* Label */}
            <div className="flex items-start justify-end pr-2 pt-2 pb-2">
              <span className="text-xs text-muted-foreground">All day</span>
            </div>

            {/* All-day events */}
            <div className="py-2 px-2 space-y-1 border-l border-border">
              {allDayEvents.map((event) => (
                <div key={event.id} className="h-[22px]">
                  <CalendarEventBadge
                    event={event}
                    onClick={() => onEventClick(event.id)}
                    onHover={(e) =>
                      onEventHover(event, { x: e.clientX, y: e.clientY })
                    }
                    onLeave={onEventLeave}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Scrollable time grid */}
      <div
        ref={scrollRef}
        className="overflow-y-auto"
        style={{ maxHeight: '600px' }}
      >
        <div className="grid grid-cols-[60px_1fr] relative">
          {/* Time labels column */}
          <div
            className="relative bg-background"
            style={{ height: `${24 * HOUR_HEIGHT}px` }}
          >
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute right-2 text-xs text-muted-foreground -translate-y-2"
                style={{ top: `${hour * HOUR_HEIGHT}px` }}
              >
                {formatHour(hour)}
              </div>
            ))}
          </div>

          {/* Day column */}
          <div
            className={cn(
              'relative border-l border-border',
              isDateToday && 'bg-primary/5'
            )}
            style={{ height: `${24 * HOUR_HEIGHT}px` }}
          >
            {/* Hour grid lines */}
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute w-full border-t border-border/50"
                style={{ top: `${hour * HOUR_HEIGHT}px` }}
              />
            ))}

            {/* Timed events */}
            {timedEventLayouts.map((layout) => (
              <CalendarTimedEvent
                key={layout.event.id}
                event={layout.event}
                top={layout.top}
                height={layout.height}
                left={layout.left}
                width={layout.width}
                isFirstDay={layout.isFirstDay}
                isLastDay={layout.isLastDay}
                isMiddleDay={layout.isMiddleDay}
                onClick={() => onEventClick(layout.event.id)}
                onHover={(e) =>
                  onEventHover(layout.event, { x: e.clientX, y: e.clientY })
                }
                onLeave={onEventLeave}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
