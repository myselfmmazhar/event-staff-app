"use client";

import Link from "next/link";
import { UpcomingEventCard } from "./upcoming-event-card";
import { EventStatus } from "@prisma/client";

interface UpcomingEvent {
  id: string;
  eventId: string;
  title: string;
  venueName: string;
  city: string;
  state: string;
  startDate: Date;
  startTime: string | null;
  endDate: Date;
  endTime: string | null;
  status: EventStatus;
  client?: {
    businessName: string;
  } | null;
}

interface UpcomingEventsSectionProps {
  events: UpcomingEvent[] | undefined;
  isLoading: boolean;
  onEventClick?: (eventId: string) => void;
}

/**
 * Upcoming Events Section Component
 * Displays a grid of upcoming event cards with loading and empty states
 */
export function UpcomingEventsSection({ events, isLoading, onEventClick }: UpcomingEventsSectionProps) {
  // Show loading skeleton
  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Upcoming Events</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-6 h-64 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
              <div className="space-y-3">
                <div className="h-3 bg-muted rounded"></div>
                <div className="h-3 bg-muted rounded w-5/6"></div>
                <div className="h-3 bg-muted rounded w-4/6"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Show empty state
  if (!events || events.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Upcoming Events</h2>
        </div>
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-muted-foreground mb-4">
            No upcoming events in the next 30 days.
          </p>
          <Link
            href="/events?create=true"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4"
          >
            Create Your First Event
          </Link>
        </div>
      </div>
    );
  }

  // Display events (max 6)
  const displayEvents = events.slice(0, 6);
  const hasMore = events.length > 6;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Upcoming Events</h2>
        {hasMore && (
          <Link
            href="/events"
            className="text-sm font-medium text-primary hover:underline"
          >
            View All ({events.length})
          </Link>
        )}
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayEvents.map((event) => (
          <UpcomingEventCard key={event.id} event={event} onClick={onEventClick} />
        ))}
      </div>

      {/* View All Button (if more than 6 events) */}
      {hasMore && (
        <div className="mt-6 text-center">
          <Link
            href="/events"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 py-2 px-4"
          >
            View All Events
          </Link>
        </div>
      )}
    </div>
  );
}
