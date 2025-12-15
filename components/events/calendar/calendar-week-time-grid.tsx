'use client';

import { useMemo, useRef, useEffect } from 'react';
import {
  CalendarEvent,
  getTimedEventLayout,
  isToday,
} from '@/lib/utils/calendar-helpers';
import { CalendarTimedEvent } from './calendar-timed-event';
import { cn } from '@/lib/utils';

interface CalendarWeekTimeGridProps {
  days: Date[];
  timedEvents: CalendarEvent[];
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

export function CalendarWeekTimeGrid({
  days,
  timedEvents,
  onEventClick,
  onEventHover,
  onEventLeave,
}: CalendarWeekTimeGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const scrollPosition = (now.getHours() - 1) * HOUR_HEIGHT;
      scrollRef.current.scrollTop = Math.max(0, scrollPosition);
    }
  }, []);

  // Calculate event layouts for each day
  const eventLayoutsByDay = useMemo(() => {
    const layoutMap = new Map<string, ReturnType<typeof getTimedEventLayout>>();

    days.forEach((day) => {
      const dayKey = day.toISOString();
      layoutMap.set(dayKey, getTimedEventLayout(timedEvents, day));
    });

    return layoutMap;
  }, [days, timedEvents]);

  return (
    <div
      ref={scrollRef}
      className="overflow-y-auto"
      style={{ maxHeight: '600px' }}
    >
      <div className="grid grid-cols-[60px_repeat(7,1fr)] relative">
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

        {/* Day columns */}
        {days.map((day, dayIndex) => {
          const dayKey = day.toISOString();
          const dayLayouts = eventLayoutsByDay.get(dayKey) || [];
          const isDateToday = isToday(day);

          return (
            <div
              key={dayKey}
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
              {dayLayouts.map((layout) => (
                <CalendarTimedEvent
                  key={`${layout.event.id}-${dayKey}`}
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
          );
        })}
      </div>
    </div>
  );
}
