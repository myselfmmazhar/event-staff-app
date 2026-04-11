'use client';

import { CalendarEvent, generateMonthGrid, getMonthEventLayout } from '@/lib/utils/calendar-helpers';
import { CalendarWeekRow } from './calendar-week-row';

interface CalendarMonthViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick: (eventId: string) => void;
  onEventHover: (event: CalendarEvent, position: { x: number; y: number }) => void;
  onEventLeave: () => void;
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarMonthView({
  events,
  currentDate,
  onEventClick,
  onEventHover,
  onEventLeave,
}: CalendarMonthViewProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthGrid = generateMonthGrid(year, month);
  const monthEventLayouts = getMonthEventLayout(events, monthGrid);

  return (
    <div className="mt-4 border rounded-lg overflow-hidden bg-background">
      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-px bg-muted border-b">
        {WEEKDAY_NAMES.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-sm font-semibold text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex flex-col divide-y divide-border">
        {monthGrid.map((week, weekIndex) => (
          <CalendarWeekRow
            key={weekIndex}
            days={week}
            eventLayouts={monthEventLayouts.get(weekIndex) || []}
            currentMonth={currentDate}
            onEventClick={onEventClick}
            onEventHover={onEventHover}
            onEventLeave={onEventLeave}
          />
        ))}
      </div>
    </div>
  );
}
