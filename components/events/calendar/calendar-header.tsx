'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/ui/icons';
import { ViewMode, getNavigationPeriod } from '@/lib/utils/calendar-helpers';
import { cn } from '@/lib/utils';

interface CalendarHeaderProps {
  currentDate: Date;
  viewMode: ViewMode;
  onNavigate: (direction: 'prev' | 'next') => void;
  onToday: () => void;
  onViewModeChange: (mode: ViewMode) => void;
}

const VIEW_MODES: { value: ViewMode; label: string }[] = [
  { value: 'month', label: 'Month' },
  { value: 'week', label: 'Week' },
  { value: 'day', label: 'Day' },
  { value: 'list', label: 'List' },
];

export function CalendarHeader({
  currentDate,
  viewMode,
  onNavigate,
  onToday,
  onViewModeChange,
}: CalendarHeaderProps) {
  const periodLabel = getNavigationPeriod(currentDate, viewMode);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      {/* Left: Navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('prev')}
          title="Previous"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onToday}
          className="min-w-[70px]"
        >
          Today
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('next')}
          title="Next"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>

        <h2 className="text-xl font-semibold text-foreground ml-4">
          {periodLabel}
        </h2>
      </div>

      {/* Right: View mode selector */}
      <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
        {VIEW_MODES.map((mode) => (
          <button
            key={mode.value}
            type="button"
            onClick={() => onViewModeChange(mode.value)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded transition-colors',
              viewMode === mode.value
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  );
}
