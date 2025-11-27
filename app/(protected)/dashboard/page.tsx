"use client";

import { useState } from "react";
import { trpc } from "@/lib/client/trpc";
import {
  WelcomeSection,
  QuickStats,
  UpcomingEventsSection,
  DashboardTabs,
  UpcomingEventsTable,
} from "@/components/dashboard";
import { ViewEventDialog } from "@/components/events/view-event-dialog";

/**
 * Main dashboard page - revamped to focus on events and staff management
 * Shows upcoming events, key metrics, and actionable information
 */
export default function DashboardPage() {
  const { data: profile } = trpc.profile.getMyProfile.useQuery();
  const { data: eventStats, isLoading: eventLoading, error: eventError } = trpc.event.getStats.useQuery();
  const { data: staffStats, isLoading: staffLoading, error: staffError } = trpc.staff.getStats.useQuery();
  const { data: upcomingEvents, isLoading: upcomingLoading, error: upcomingError } = trpc.event.getUpcoming.useQuery();

  // Modal state for viewing event details
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const isStatsLoading = eventLoading || staffLoading;

  // Handler to open event details modal
  const handleViewEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    setIsViewOpen(true);
  };

  // Handler to close event details modal
  const handleCloseView = () => {
    setIsViewOpen(false);
    setSelectedEventId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 to-muted/50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Section */}
        <WelcomeSection
          firstName={profile?.firstName}
          lastName={profile?.lastName}
          role={profile?.role}
        />

        {/* Error States */}
        {(eventError || staffError || upcomingError) && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
            <p className="text-destructive text-sm">
              Failed to load dashboard data. Please try refreshing the page.
            </p>
          </div>
        )}

        {/* Quick Stats */}
        <QuickStats
          eventStats={eventStats}
          staffStats={staffStats}
          isLoading={isStatsLoading}
        />

        {/* Dashboard Tabs */}
        <DashboardTabs
          tabs={[
            {
              id: "overview",
              label: "Overview",
              content: (
                <UpcomingEventsSection
                  events={upcomingEvents}
                  isLoading={upcomingLoading}
                  onEventClick={handleViewEvent}
                />
              ),
            },
            {
              id: "upcoming-events",
              label: "Upcoming Events",
              content: (
                <UpcomingEventsTable
                  events={upcomingEvents}
                  isLoading={upcomingLoading}
                  onEventClick={handleViewEvent}
                />
              ),
            },
          ]}
          defaultTab="overview"
        />

        {/* View Event Details Modal */}
        <ViewEventDialog
          eventId={selectedEventId}
          open={isViewOpen}
          onClose={handleCloseView}
        />
      </div>
    </div>
  );
}
