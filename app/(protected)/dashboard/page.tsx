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
import { 
  CalendarIcon, 
  ClockIcon, 
  BriefcaseIcon, 
  MessageSquare as MessageSquareIcon, 
  AlertCircle, 
  CheckCircle as CheckCircleIcon 
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeatMap } from "@/components/maps/heat-map";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PendingRequestsList, UpcomingEventsList } from "@/components/staff-dashboard";
import { useToast } from "@/components/ui/use-toast";

/**
 * Staff Dashboard - Revamped for Talent view
 */
function StaffDashboard({ firstName, lastName }: { firstName?: string; lastName?: string }) {
  const { terminology } = useTerminology();
  const eventTerm = useEventTerm();
  const { data: staff, isLoading: staffLoading } = trpc.staff.getMyProfile.useQuery();
  const { data: invitations, isLoading: invitationsLoading } = trpc.callTime.getMyInvitations.useQuery({}, {
    refetchInterval: 30000, // Refresh every 30 seconds for real-time status updates
    staleTime: 5000,        // Consider data stale after 5 seconds to allow more frequent updates
    refetchOnWindowFocus: true,
  });
  const [respondingTo, setRespondingTo] = useState<string | undefined>();
  const utils = trpc.useUtils();
  const { toast } = useToast();

  const isProfileComplete = (staff: any) => {
    if (!staff) return true; // Don't show alert while loading
    const criticalFields = ['phone', 'streetAddress', 'city', 'state', 'zipCode', 'dateOfBirth'];
    return criticalFields.every(field => !!staff[field]);
  };

  const respondMutation = trpc.callTime.respondToInvitation.useMutation({
    onSuccess: (result) => {
      if (result.status === 'ACCEPTED' && result.isConfirmed) {
        toast({ title: 'Invitation Accepted', description: 'You have been confirmed for this event!' });
      } else if (result.status === 'DECLINED') {
        toast({ title: 'Invitation Declined', description: 'The invitation has been declined.' });
      }
      setRespondingTo(undefined);
      utils.callTime.getMyInvitations.invalidate();
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setRespondingTo(undefined);
    },
  });

  const batchRespondMutation = trpc.callTime.batchRespond.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Invitations Processed',
        description: `Successfully processed ${data.count} invitation(s).`,
      });
      utils.callTime.getMyInvitations.invalidate();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleRespond = (invitationId: string, accept: boolean, declineReason?: string) => {
    setRespondingTo(invitationId);
    respondMutation.mutate({ invitationId, accept, declineReason });
  };

  const handleBatchRespond = (invitationIds: string[], accept: boolean) => {
    batchRespondMutation.mutate({
      invitationIds,
      accept,
    });
  };

  if (staffLoading || invitationsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const complete = isProfileComplete(staff);
  const pendingOffers = invitations?.pending || [];
  const acceptedOffers = invitations?.accepted || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 to-muted/50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card rounded-xl p-6 shadow-sm border border-border">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Welcome back, {firstName || 'Team Member'}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Your {terminology.staff.singular} Dashboard
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/communication-manager">
              <Button variant="outline" className="gap-2 shadow-sm font-bold">
                <MessageSquareIcon className="h-4 w-4" />
                Communication History
              </Button>
            </Link>
            <Link href="/my-schedule">
              <Button variant="default" className="gap-2 shadow-sm font-bold">
                <CalendarIcon className="h-4 w-4" />
                Full Schedule
              </Button>
            </Link>
          </div>
        </div>

        {/* Profile Completeness Alert */}
        {!complete && (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900/30">
            <CardHeader className="py-3 px-6">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-800 dark:text-amber-400 uppercase tracking-widest">
                <AlertCircle className="h-4 w-4" />
                Complete Your Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <p className="text-sm text-amber-700 dark:text-amber-500 font-medium">
                  Some details are missing in your profile. Complete it to ensure your account remains active and ready for offers.
                </p>
                <Link href="/profile">
                  <Button variant="outline" size="sm" className="bg-white border-amber-200 text-amber-700 hover:bg-amber-100 dark:bg-amber-800/20 dark:border-amber-900/30 dark:text-amber-400 font-bold whitespace-nowrap">
                    Update Profile Now
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-6">
            <Tabs defaultValue="pending">
              <div className="flex items-center justify-between mb-2">
                <TabsList className="bg-muted shadow-sm rounded-xl p-1 h-11">
                  <TabsTrigger value="pending" className="flex items-center gap-2 px-6 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-md font-bold text-xs uppercase tracking-wider">
                    <ClockIcon className="h-4 w-4" />
                    Pending Offers
                    {pendingOffers.length > 0 && (
                      <span className="ml-1 flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="accepted" className="flex items-center gap-2 px-6 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-md font-bold text-xs uppercase tracking-wider">
                    <CheckCircleIcon className="h-4 w-4" />
                    Accepted Assignments 
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="pending" className="mt-4 focus-visible:outline-none focus-visible:ring-0">
                <PendingRequestsList
                  invitations={pendingOffers as any}
                  onRespond={handleRespond}
                  onBatchRespond={handleBatchRespond}
                  isResponding={respondingTo}
                  isBatchResponding={batchRespondMutation.isPending}
                />
              </TabsContent>

              <TabsContent value="accepted" className="mt-4 focus-visible:outline-none focus-visible:ring-0">
                <UpcomingEventsList
                  invitations={acceptedOffers as any}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar Area */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="shadow-sm overflow-hidden border-border bg-card">
              <CardHeader className="bg-primary/5 py-3 px-5 border-b border-primary/10">
                <CardTitle className="text-xs font-black uppercase tracking-[0.15em] text-primary flex items-center justify-between">
                  Your Schedule
                  <CalendarIcon className="h-4 w-4 opacity-50" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {acceptedOffers.length === 0 ? (
                    <div className="p-8 text-center bg-muted/20">
                      <p className="text-sm text-muted-foreground font-medium italic">No accepted assignments yet.</p>
                      <Link href="/my-schedule">
                        <Button variant="ghost" className="mt-2 text-xs font-bold uppercase tracking-wider h-auto p-0 hover:bg-transparent hover:text-primary">Browse Invitations</Button>
                      </Link>
                    </div>
                  ) : (
                    acceptedOffers.slice(0, 5).map((inv: any) => (
                      <div key={inv.id} className="p-4 hover:bg-muted/30 transition-colors flex items-start gap-3 group group cursor-pointer">
                        <div className="h-10 w-10 shrink-0 bg-primary/10 rounded-xl flex flex-col items-center justify-center border border-primary/5 group-hover:bg-primary/20 transition-colors">
                          <span className="text-[10px] font-black leading-none text-primary/60 uppercase">{new Date(inv.callTime.startDate).toLocaleDateString('en-US', { month: 'short' })}</span>
                          <span className="text-base font-black leading-none text-primary">{new Date(inv.callTime.startDate).getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm truncate text-foreground group-hover:text-primary transition-colors">{inv.callTime.service?.title || 'Assignment'}</h4>
                          <p className="text-xs text-muted-foreground truncate">{inv.callTime.event.title}</p>
                          <div className="flex items-center gap-2 mt-1.5 opacity-60">
                            <ClockIcon className="h-3 w-3" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                              {inv.callTime.startTime} - {inv.callTime.endTime}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-5 space-y-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-primary">Need Help?</h4>
                  <p className="text-xs text-muted-foreground font-medium">Reach out to your manager for any assignment-related questions.</p>
                </div>
                <Link href="/communication-manager">
                  <Button variant="outline" className="w-full bg-white border-primary/20 text-primary hover:bg-primary hover:text-white transition-all shadow-sm font-bold h-10">
                    Contact Management
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
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
  if (profileLoading || isClient) {
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
