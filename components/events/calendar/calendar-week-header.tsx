'use client';

import { format } from 'date-fns';
import { isToday } from '@/lib/utils/calendar-helpers';
import { cn } from '@/lib/utils';

interface CalendarWeekHeaderProps {
  days: Date[];
}

export function CalendarWeekHeader({ days }: CalendarWeekHeaderProps) {
  return (
    <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/30">
      {/* Empty cell for time column alignment */}
      <div className="py-3" />

      {/* Day headers */}
      {days.map((day) => {
        const isDateToday = isToday(day);

        return (
          <div
            key={day.toISOString()}
            className={cn(
              'py-3 text-center border-l border-border',
              isDateToday && 'bg-primary/5'
            )}
          >
            <div className="text-xs text-muted-foreground font-medium uppercase">
              {format(day, 'EEE')}
            </div>
            <div
              className={cn(
                'text-xl font-semibold mt-0.5',
                isDateToday ? 'text-primary' : 'text-foreground'
              )}
            >
              {format(day, 'd')}
            </div>
          </div>
        );
      })}
    </div>
  );
}
