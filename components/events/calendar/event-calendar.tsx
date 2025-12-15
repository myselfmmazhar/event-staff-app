'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { CalendarHeader } from './calendar-header';
import { CalendarMonthView } from './calendar-month-view';
import { CalendarWeekView } from './calendar-week-view';
import { CalendarDayView } from './calendar-day-view';
import { CalendarEventTooltip } from './calendar-event-tooltip';
import { ViewMode, CalendarEvent } from '@/lib/utils/calendar-helpers';
import { trpc } from '@/lib/client/trpc';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
} from 'date-fns';

interface EventCalendarProps {
  onEventClick: (eventId: string) => void;
}

export function EventCalendar({ onEventClick }: EventCalendarProps) {
  // State management
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Check localStorage for saved preference
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('calendarViewMode') as ViewMode;
      if (saved && ['month', 'week', 'day', 'list'].includes(saved)) {
        return saved;
      }
    }
    // Default to month view
    return 'month';
  });

  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredEvent, setHoveredEvent] = useState<CalendarEvent | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Save view mode preference to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('calendarViewMode', viewMode);
    }
  }, [viewMode]);

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    switch (viewMode) {
      case 'month':
        return {
          startDate: startOfMonth(currentDate),
          endDate: endOfMonth(currentDate),
        };
      case 'week':
        return {
          startDate: startOfWeek(currentDate, { weekStartsOn: 0 }),
          endDate: endOfWeek(currentDate, { weekStartsOn: 0 }),
        };
      case 'day':
        return {
          startDate: startOfDay(currentDate),
          endDate: endOfDay(currentDate),
        };
      case 'list':
        return {
          startDate: currentDate,
          endDate: addMonths(currentDate, 1),
        };
      default:
        return {
          startDate: startOfMonth(currentDate),
          endDate: endOfMonth(currentDate),
        };
    }
  }, [viewMode, currentDate]);

  // Fetch events for the current date range
  const { data: events = [], isLoading } = trpc.event.getByDateRange.useQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  // Navigation handlers
  const handleNavigate = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      switch (viewMode) {
        case 'month':
          return direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1);
        case 'week':
          return direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1);
        case 'day':
          return direction === 'next' ? addDays(prev, 1) : subDays(prev, 1);
        case 'list':
          return direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1);
        default:
          return prev;
      }
    });
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  const handleEventHover = (event: CalendarEvent, position: { x: number; y: number }) => {
    setHoveredEvent(event);
    setTooltipPosition(position);
  };

  const handleEventLeave = () => {
    setHoveredEvent(null);
  };

  // Render the appropriate view
  const renderView = () => {
    switch (viewMode) {
      case 'month':
        return (
          <CalendarMonthView
            events={events}
            currentDate={currentDate}
            onEventClick={onEventClick}
            onEventHover={handleEventHover}
            onEventLeave={handleEventLeave}
          />
        );
      case 'week':
        return (
          <CalendarWeekView
            events={events}
            currentDate={currentDate}
            onEventClick={onEventClick}
            onEventHover={handleEventHover}
            onEventLeave={handleEventLeave}
          />
        );
      case 'day':
        return (
          <CalendarDayView
            events={events}
            currentDate={currentDate}
            onEventClick={onEventClick}
            onEventHover={handleEventHover}
            onEventLeave={handleEventLeave}
          />
        );
      case 'list':
        return (
          <div className="mt-4 p-8 text-center text-muted-foreground">
            List view coming soon...
          </div>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-muted-foreground">Loading calendar...</div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6">
        <CalendarHeader
          currentDate={currentDate}
          viewMode={viewMode}
          onNavigate={handleNavigate}
          onToday={handleToday}
          onViewModeChange={handleViewModeChange}
        />

        {renderView()}
      </Card>

      {/* Tooltip */}
      {hoveredEvent && (
        <CalendarEventTooltip event={hoveredEvent} position={tooltipPosition} />
      )}
    </>
  );
}
