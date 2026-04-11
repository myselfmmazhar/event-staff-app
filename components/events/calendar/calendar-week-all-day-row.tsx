'use client';

import { CalendarEvent, EventLayout } from '@/lib/utils/calendar-helpers';
import { CalendarEventBadge } from './calendar-event-badge';

interface CalendarWeekAllDayRowProps {
  eventLayouts: EventLayout[];
  onEventClick: (eventId: string) => void;
  onEventHover: (event: CalendarEvent, position: { x: number; y: number }) => void;
  onEventLeave: () => void;
}

export function CalendarWeekAllDayRow({
  eventLayouts,
  onEventClick,
  onEventHover,
  onEventLeave,
}: CalendarWeekAllDayRowProps) {
  // Calculate the maximum row index to determine height
  const maxRow = Math.max(...eventLayouts.map((l) => l.row), -1);
  const rowHeight = 24; // Height of an event bar + gap
  const contentHeight = (maxRow + 1) * rowHeight + 8; // +8 for padding

  return (
    <div className="border-b bg-muted/20">
      <div
        className="grid grid-cols-[60px_repeat(7,1fr)] relative"
        style={{ minHeight: Math.max(32, contentHeight) }}
      >
        {/* Label for multi-day/all-day section */}
        <div className="flex items-start justify-end pr-2 pt-1">
          <span className="text-xs text-muted-foreground">All</span>
        </div>

        {/* Grid cells for visual alignment */}
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="border-l border-border" />
        ))}

        {/* Event Layer */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: '60px',
            right: '0',
            top: '4px',
            bottom: '4px',
          }}
        >
          <div className="relative h-full grid grid-cols-7">
            {eventLayouts.map((layout) => (
              <div
                key={`${layout.event.id}-${layout.colStart}`}
                className="pointer-events-auto absolute px-1"
                style={{
                  left: `${(layout.colStart / 7) * 100}%`,
                  width: `${(layout.colSpan / 7) * 100}%`,
                  top: `${layout.row * rowHeight}px`,
                  height: '22px',
                }}
              >
                <CalendarEventBadge
                  event={layout.event}
                  isContinuesBefore={layout.isContinuesBefore}
                  isContinuesAfter={layout.isContinuesAfter}
                  onClick={() => onEventClick(layout.event.id)}
                  onHover={(e) =>
                    onEventHover(layout.event, { x: e.clientX, y: e.clientY })
                  }
                  onLeave={onEventLeave}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
