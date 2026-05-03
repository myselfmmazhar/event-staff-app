'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { CalendarHeader } from '@/components/events/calendar/calendar-header';
import { CalendarMonthView } from '@/components/events/calendar/calendar-month-view';
import { CalendarWeekView } from '@/components/events/calendar/calendar-week-view';
import { CalendarDayView } from '@/components/events/calendar/calendar-day-view';
import { CalendarListView } from '@/components/events/calendar/calendar-list-view';
import { CalendarEventTooltip } from '@/components/events/calendar/calendar-event-tooltip';
import { ViewMode, CalendarEvent } from '@/lib/utils/calendar-helpers';
import { trpc } from '@/lib/client/trpc';
import { EventStatus } from '@prisma/client';
import { isDateNullOrUBD } from '@/lib/utils/date-formatter';
import {
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
} from 'date-fns';

interface StaffCalendarProps {
  onEventClick: (eventId: string) => void;
}

export function StaffCalendar({ onEventClick }: StaffCalendarProps) {
  // State management
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Check localStorage for saved preference
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('staffCalendarViewMode') as ViewMode;
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
      localStorage.setItem('staffCalendarViewMode', viewMode);
    }
  }, [viewMode]);

  // Fetch staff invitations
  const { data: invitations, isLoading } = trpc.callTime.getMyInvitations.useQuery({});

  // Map invitations to CalendarEvents
  const events = useMemo(() => {
    if (!invitations) return [];

    const allInvs = [
      ...invitations.accepted,
      ...invitations.pending,
      ...invitations.past
    ];

    return allInvs
      .filter(inv => !isDateNullOrUBD(inv.callTime.startDate) && !isDateNullOrUBD(inv.callTime.endDate))
      .map(inv => ({
        id: inv.id, // Use invitation ID as the primary ID here
        eventId: inv.callTime.eventId,
        title: `${inv.callTime.service?.title || 'Assignment'} - ${inv.callTime.event.title}`,
        startDate: inv.callTime.startDate,
        startTime: inv.callTime.startTime,
        endDate: inv.callTime.endDate,
        endTime: inv.callTime.endTime,
        // Map invitation status to EventStatus for coloring
        status: inv.status === 'ACCEPTED' ? (inv.isConfirmed ? EventStatus.ASSIGNED : EventStatus.PUBLISHED) : EventStatus.DRAFT,
        timezone: 'UTC', // Default or fetch from event if available
        venueName: inv.callTime.event.venueName || '',
      })) as CalendarEvent[];
  }, [invitations]);

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

  // Wrap onEventClick to pass eventId (the real event ID)
  const handleEventClick = (invitationId: string) => {
    const event = events.find(e => e.id === invitationId);
    if (event) {
      onEventClick(event.eventId);
    }
  };

  // Render the appropriate view
  const renderView = () => {
    switch (viewMode) {
      case 'month':
        return (
          <CalendarMonthView
            events={events}
            currentDate={currentDate}
            onEventClick={handleEventClick}
            onEventHover={handleEventHover}
            onEventLeave={handleEventLeave}
          />
        );
      case 'week':
        return (
          <CalendarWeekView
            events={events}
            currentDate={currentDate}
            onEventClick={handleEventClick}
            onEventHover={handleEventHover}
            onEventLeave={handleEventLeave}
          />
        );
      case 'day':
        return (
          <CalendarDayView
            events={events}
            currentDate={currentDate}
            onEventClick={handleEventClick}
            onEventHover={handleEventHover}
            onEventLeave={handleEventLeave}
          />
        );
      case 'list':
        return (
          <CalendarListView
            events={events}
            currentDate={currentDate}
            onEventClick={handleEventClick}
          />
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <div className="ml-3 text-muted-foreground">Loading your schedule...</div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6 border-none shadow-none bg-transparent">
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
