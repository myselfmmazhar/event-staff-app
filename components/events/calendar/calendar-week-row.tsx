'use client';

import { CalendarEvent, EventLayout, isToday, isInCurrentMonth } from '@/lib/utils/calendar-helpers';
import { cn } from '@/lib/utils';
import { CalendarEventBadge } from './calendar-event-badge';

interface CalendarWeekRowProps {
    days: Date[];
    eventLayouts: EventLayout[];
    currentMonth: Date;
    onEventClick: (eventId: string) => void;
    onEventHover: (event: CalendarEvent, position: { x: number; y: number }) => void;
    onEventLeave: () => void;
}

export function CalendarWeekRow({
    days,
    eventLayouts,
    currentMonth,
    onEventClick,
    onEventHover,
    onEventLeave,
}: CalendarWeekRowProps) {

    // Calculate the maximum row index to determine height
    const maxRow = Math.max(...eventLayouts.map(l => l.row), -1);
    const minHeight = 100; // Minimum height for a cell
    const rowHeight = 24; // Height of an event bar + gap
    const contentHeight = (maxRow + 1) * rowHeight + 30; // +30 for date header

    return (
        <div className="grid grid-cols-7 gap-px bg-border relative">
            {/* Background Grid Cells */}
            {days.map((date, index) => {
                const isCurrentMonth = isInCurrentMonth(date, currentMonth);
                const isDateToday = isToday(date);

                return (
                    <div
                        key={index}
                        className={cn(
                            'bg-card p-2 transition-colors relative',
                            isDateToday && 'bg-primary/5',
                            !isCurrentMonth && 'bg-muted/30'
                        )}
                        style={{ minHeight: Math.max(minHeight, contentHeight) }}
                    >
                        {/* Day Number */}
                        <div
                            className={cn(
                                'text-sm font-medium mb-1',
                                isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/50',
                                isDateToday && 'text-primary font-bold'
                            )}
                        >
                            {date.getDate()}
                        </div>
                    </div>
                );
            })}

            {/* Event Layer */}
            <div
                className="absolute inset-0 grid grid-cols-7 pointer-events-none"
                style={{
                    top: '30px', // Offset for date numbers
                    paddingLeft: '1px', // Align with grid gaps
                    paddingRight: '1px'
                }}
            >
                {eventLayouts.map((layout) => (
                    <div
                        key={`${layout.event.id}-${layout.colStart}`}
                        className="pointer-events-auto relative px-1 mb-1"
                        style={{
                            gridColumnStart: layout.colStart + 1,
                            gridColumnEnd: layout.colStart + 1 + layout.colSpan,
                            gridRowStart: layout.row + 1,
                            height: '22px', // Fixed height for event bar
                        }}
                    >
                        <CalendarEventBadge
                            event={layout.event}
                            isContinuesBefore={layout.isContinuesBefore}
                            isContinuesAfter={layout.isContinuesAfter}
                            onClick={() => onEventClick(layout.event.id)}
                            onHover={(e) => onEventHover(layout.event, { x: e.clientX, y: e.clientY })}
                            onLeave={onEventLeave}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
