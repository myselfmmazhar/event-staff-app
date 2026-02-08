'use client';

import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarEvent, groupEventsByDate, isToday } from '@/lib/utils/calendar-helpers';
import { CalendarListItem } from './calendar-list-item';
import { cn } from '@/lib/utils';

interface CalendarListViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick: (eventId: string) => void;
}

export function CalendarListView({
  events,
  currentDate,
  onEventClick,
}: CalendarListViewProps) {
  // Group events by date and sort chronologically
  const groupedEvents = useMemo(() => {
    const grouped = groupEventsByDate(events);

    // Convert Map to sorted array
    const sortedEntries = Array.from(grouped.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    );

    return sortedEntries;
  }, [events]);

  if (groupedEvents.length === 0) {
    return (
      <div className="mt-4 border rounded-lg bg-background">
        <div className="p-8 text-center text-muted-foreground">
          No events scheduled for this period.
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 border rounded-lg overflow-hidden bg-background">
      {groupedEvents.map(([dateString, dayEvents]) => {
        const date = parseISO(dateString);
        const isDateToday = isToday(date);

        return (
          <div key={dateString}>
            {/* Date Header */}
            <div
              className={cn(
                'px-4 py-2 bg-muted/50 border-b border-border sticky top-0',
                isDateToday && 'bg-primary/10'
              )}
            >
              <div
                className={cn(
                  'font-semibold',
                  isDateToday ? 'text-primary' : 'text-foreground'
                )}
              >
                {format(date, 'EEEE, MMMM d, yyyy')}
                {isDateToday && (
                  <span className="ml-2 text-xs font-normal text-primary">
                    Today
                  </span>
                )}
              </div>
            </div>

            {/* Events for this date */}
            <div>
              {dayEvents.map((event) => (
                <CalendarListItem
                  key={event.id}
                  event={event}
                  onClick={() => onEventClick(event.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
