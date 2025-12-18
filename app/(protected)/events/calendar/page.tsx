'use client';

import { useState } from 'react';
import { EventCalendar } from '@/components/events/calendar/event-calendar';
import { ViewEventModal } from '@/components/events/view-event-modal';
import { useTerminology } from '@/lib/hooks/use-terminology';

export default function CalendarPage() {
  const { terminology } = useTerminology();
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const handleEventClick = (eventId: string) => {
    setSelectedEventId(eventId);
    setIsViewOpen(true);
  };

  const handleCloseDialog = () => {
    setIsViewOpen(false);
    setSelectedEventId(null);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">{terminology.event.singular} Calendar</h1>
        <p className="text-muted-foreground mt-2">
          View and manage your {terminology.event.lowerPlural} in calendar format
        </p>
      </div>

      <EventCalendar onEventClick={handleEventClick} />

      {/* View Event Modal */}
      <ViewEventModal
        eventId={selectedEventId}
        open={isViewOpen}
        onClose={handleCloseDialog}
      />
    </div>
  );
}
