"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/client/trpc";
import {
  WelcomeSection,
  QuickStats,
  UpcomingEventsSection,
  DashboardTabs,
  UpcomingEventsTable,
} from "@/components/dashboard";
import { ViewEventModal } from "@/components/events/view-event-modal";
import { useEventTerm, useTerminology } from "@/lib/hooks/use-terminology";
import { UserRole } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, ClockIcon, BriefcaseIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeatMap } from "@/components/maps/heat-map";

/**
 * Staff Dashboard - Coming Soon view for staff members
 */
function StaffDashboard({ firstName, lastName }: { firstName?: string; lastName?: string }) {
  const { terminology } = useTerminology();

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 to-muted/50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Welcome Section */}
        <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {firstName || 'Team Member'}!
          </h1>
          <p className="text-muted-foreground mt-1">
            {terminology.staff.singular} Portal
          </p>
        </div>

        {/* Coming Soon Banner */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-primary">
              <BriefcaseIcon className="h-6 w-6" />
              {terminology.staff.singular} Dashboard Coming Soon
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              We're building an amazing dashboard experience just for you! Soon you'll be able to:
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CalendarIcon className="h-5 w-5 text-primary mt-0.5" />
                <span className="text-foreground">View your upcoming event assignments</span>
              </li>
              <li className="flex items-start gap-3">
                <ClockIcon className="h-5 w-5 text-primary mt-0.5" />
                <span className="text-foreground">Track your hours and availability</span>
              </li>
              <li className="flex items-start gap-3">
                <BriefcaseIcon className="h-5 w-5 text-primary mt-0.5" />
                <span className="text-foreground">Manage your schedule and time off requests</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2">Update Your Profile</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Keep your contact information and availability status up to date.
              </p>
              <Link href="/profile">
                <Button variant="outline" className="w-full">
                  Go to Profile
                </Button>
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2">Set Your Availability</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Let us know when you're available for assignments.
              </p>
              <Link href="/profile">
                <Button variant="outline" className="w-full">
                  Update Availability
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * Main dashboard page - revamped to focus on events and staff management
 * Shows upcoming events, key metrics, and actionable information
 * Staff users see a coming soon dashboard
 * Client users are redirected to the client portal
 */
export default function DashboardPage() {
  const router = useRouter();
  const eventTerm = useEventTerm();
  const { data: profile, isLoading: profileLoading } = trpc.profile.getMyProfile.useQuery();
  const isStaff = profile?.role === UserRole.STAFF;
  const isClient = profile?.role === UserRole.CLIENT;

  // Redirect CLIENT users to the client portal
  useEffect(() => {
    if (!profileLoading && isClient) {
      router.push('/client-portal');
    }
  }, [profileLoading, isClient, router]);

  // Only fetch admin data if user is not staff or client
  const { data: eventStats, isLoading: eventLoading, error: eventError } = trpc.event.getStats.useQuery(
    undefined,
    { enabled: !profileLoading && !isStaff && !isClient }
  );
  const { data: staffStats, isLoading: staffLoading, error: staffError } = trpc.staff.getStats.useQuery(
    undefined,
    { enabled: !profileLoading && !isStaff && !isClient }
  );
  const { data: upcomingEvents, isLoading: upcomingLoading, error: upcomingError } = trpc.event.getUpcoming.useQuery(
    undefined,
    { enabled: !profileLoading && !isStaff && !isClient }
  );

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

  // Show loading while redirecting CLIENT users
  if (isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show staff dashboard for STAFF role users
  if (isStaff) {
    return (
      <StaffDashboard
        firstName={profile?.firstName}
        lastName={profile?.lastName}
      />
    );
  }

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
              label: `Upcoming ${eventTerm.plural}`,
              content: (
                <UpcomingEventsTable
                  events={upcomingEvents}
                  isLoading={upcomingLoading}
                  onEventClick={handleViewEvent}
                />
              ),
            },
            {
              id: "event-distribution",
              label: "Event Distribution",
              content: (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Geographic Distribution</h3>
                    <p className="text-sm text-muted-foreground">
                      Heat map showing where your events are located
                    </p>
                  </div>
                  <HeatMap />
                </div>
              ),
            },
          ]}
          defaultTab="overview"
        />

        {/* View Event Details Modal */}
        <ViewEventModal
          eventId={selectedEventId}
          open={isViewOpen}
          onClose={handleCloseView}
        />
      </div>
    </div>
  );
}
