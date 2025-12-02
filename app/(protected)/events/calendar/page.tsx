'use client';

import { useState } from 'react';
import { EventCalendar } from '@/components/events/calendar/event-calendar';
import { ViewEventDialog } from '@/components/events/view-event-dialog';

export default function CalendarPage() {
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
        <h1 className="text-3xl font-bold text-foreground">Event Calendar</h1>
        <p className="text-muted-foreground mt-2">
          View and manage your events in calendar format
        </p>
      </div>

      <EventCalendar onEventClick={handleEventClick} />

      {/* View Event Dialog */}
      <ViewEventDialog
        eventId={selectedEventId}
        open={isViewOpen}
        onClose={handleCloseDialog}
      />
    </div>
  );
}
