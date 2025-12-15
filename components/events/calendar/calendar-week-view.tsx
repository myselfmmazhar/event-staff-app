'use client';

import { useMemo } from 'react';
import { startOfWeek } from 'date-fns';
import {
  CalendarEvent,
  generateWeekGrid,
  categorizeEvents,
  getEventLayout,
} from '@/lib/utils/calendar-helpers';
import { CalendarWeekHeader } from './calendar-week-header';
import { CalendarWeekAllDayRow } from './calendar-week-all-day-row';
import { CalendarWeekTimeGrid } from './calendar-week-time-grid';

interface CalendarWeekViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick: (eventId: string) => void;
  onEventHover: (event: CalendarEvent, position: { x: number; y: number }) => void;
  onEventLeave: () => void;
}

export function CalendarWeekView({
  events,
  currentDate,
  onEventClick,
  onEventHover,
  onEventLeave,
}: CalendarWeekViewProps) {
  // Generate 7 days for the week
  const weekDays = useMemo(() => generateWeekGrid(currentDate), [currentDate]);
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });

  // Separate all-day and timed events
  const { allDayEvents, timedEvents } = useMemo(
    () => categorizeEvents(events),
    [events]
  );

  // Calculate layout for all-day events
  const allDayEventLayouts = useMemo(
    () => getEventLayout(allDayEvents, weekStart),
    [allDayEvents, weekStart]
  );

  return (
    <div className="mt-4 border rounded-lg overflow-hidden bg-background">
      {/* Day column headers */}
      <CalendarWeekHeader days={weekDays} />

      {/* All-day events banner */}
      {allDayEventLayouts.length > 0 && (
        <CalendarWeekAllDayRow
          eventLayouts={allDayEventLayouts}
          onEventClick={onEventClick}
          onEventHover={onEventHover}
          onEventLeave={onEventLeave}
        />
      )}

      {/* Scrollable time grid */}
      <CalendarWeekTimeGrid
        days={weekDays}
        timedEvents={timedEvents}
        onEventClick={onEventClick}
        onEventHover={onEventHover}
        onEventLeave={onEventLeave}
      />
    </div>
  );
}
