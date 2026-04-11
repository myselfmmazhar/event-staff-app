'use client';

import { isInCurrentMonth, isToday } from '@/lib/utils/calendar-helpers';
import { cn } from '@/lib/utils';

interface CalendarDayCellProps {
  date: Date;
  currentMonth: Date;
}

export function CalendarDayCell({
  date,
  currentMonth,
}: CalendarDayCellProps) {
  const inCurrentMonth = isInCurrentMonth(date, currentMonth);
  const today = isToday(date);

  return (
    <div
      className={cn(
        'min-h-[100px] border border-border bg-card p-2 transition-colors',
        today && 'bg-primary/5 border-primary',
        !inCurrentMonth && 'bg-muted/30'
      )}
    >
      {/* Day number */}
      <div
        className={cn(
          'text-sm font-medium mb-1',
          inCurrentMonth ? 'text-foreground' : 'text-muted-foreground/50',
          today && 'text-primary font-bold'
        )}
      >
        {date.getDate()}
      </div>
    </div>
  );
}
