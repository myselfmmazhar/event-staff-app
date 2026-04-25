"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/client/trpc";
import { WelcomeSection, QuickStats } from "@/components/dashboard";
import { DashboardUpcomingList } from "@/components/dashboard/dashboard-upcoming-list";
import { ViewEventModal } from "@/components/events/view-event-modal";
import { useEventTerm, useTerminology } from "@/lib/hooks/use-terminology";
import { UserRole } from "@prisma/client";
import {
  CalendarIcon,
  ClockIcon,
  MessageSquare as MessageSquareIcon,
  CheckCircle as CheckCircleIcon,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PendingRequestsList, UpcomingEventsList } from "@/components/staff-dashboard";
import { useToast } from "@/components/ui/use-toast";
import { getEventRoute } from "@/lib/utils/route-helpers";

function StaffDashboard({ firstName }: { firstName?: string; lastName?: string }) {
  const { terminology } = useTerminology();
  const { data: staff, isLoading: staffLoading } = trpc.staff.getMyProfile.useQuery();
  const { data: myBills, isLoading: billsLoading } = trpc.profile.getMyStaffBills.useQuery();
  const { data: invitations, isLoading: invitationsLoading } = trpc.callTime.getMyInvitations.useQuery({}, {
    refetchInterval: 30000,
    staleTime: 5000,
    refetchOnWindowFocus: true,
  });
  const [respondingTo, setRespondingTo] = useState<string | undefined>();
  const utils = trpc.useUtils();
  const { toast } = useToast();



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
      toast({ title: 'Invitations Processed', description: `Successfully processed ${data.count} invitation(s).` });
      utils.callTime.getMyInvitations.invalidate();
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleRespond = (invitationId: string, accept: boolean, declineReason?: string) => {
    setRespondingTo(invitationId);
    respondMutation.mutate({ invitationId, accept, declineReason });
  };

  const handleBatchRespond = (invitationIds: string[], accept: boolean) => {
    batchRespondMutation.mutate({ invitationIds, accept });
  };

  if (staffLoading || invitationsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const pendingOffers = invitations?.pending || [];
  const acceptedOffers = invitations?.accepted || [];
  const previousBills = myBills?.previous || [];
  const upcomingBills = myBills?.upcoming || [];
  const paidBills = myBills?.paid || [];

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="space-y-7">
        {/* Welcome */}
        <div className="bg-card border border-border rounded-xl px-6 py-5">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {firstName || "Team Member"}!
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-muted-foreground">{terminology.staff.singular} Dashboard</span>
            <div className="flex gap-2">
              <Link href="/my-schedule">
                <Button size="sm" className="gap-1.5 text-xs">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  Full Schedule
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main */}
          <div className="lg:col-span-8">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="border-b border-border px-6">
                <Tabs defaultValue="pending" className="w-full">
                  <div className="flex items-center justify-between py-4">
                    <TabsList className="bg-muted p-1 rounded-lg h-9">
                      <TabsTrigger value="pending" className="text-xs gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-md px-4">
                        <ClockIcon className="h-3.5 w-3.5" />
                        Pending Offers
                        {pendingOffers.length > 0 && (
                          <span className="ml-1 h-2 w-2 rounded-full bg-amber-500 animate-pulse inline-block" />
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="accepted" className="text-xs gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-md px-4">
                        <CheckCircleIcon className="h-3.5 w-3.5" />
                        Accepted
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent value="pending" className="px-0 pb-6 focus-visible:outline-none focus-visible:ring-0">
                    <PendingRequestsList
                      invitations={pendingOffers as any}
                      onRespond={handleRespond}
                      onBatchRespond={handleBatchRespond}
                      isResponding={respondingTo}
                      isBatchResponding={batchRespondMutation.isPending}
                    />
                  </TabsContent>
                  <TabsContent value="accepted" className="px-0 pb-6 focus-visible:outline-none focus-visible:ring-0">
                    <UpcomingEventsList invitations={acceptedOffers as any} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl overflow-hidden mt-6">
              <div className="px-6 pt-4 pb-2 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Add Bill</h3>
              </div>
              <div className="px-6 py-4">
                <Tabs defaultValue="previous">
                  <TabsList className="mb-4">
                    <TabsTrigger value="previous">Previous Bills</TabsTrigger>
                    <TabsTrigger value="upcoming">Upcoming Bills</TabsTrigger>
                    <TabsTrigger value="paid">Paid Bills</TabsTrigger>
                  </TabsList>
                  <TabsContent value="previous">
                    {billsLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : (
                      <div className="space-y-2">
                        {previousBills.length === 0 ? <p className="text-sm text-muted-foreground">No previous bills.</p> : previousBills.map((bill: any) => (
                          <div key={bill.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                            <span className="text-sm font-medium">{bill.billNo}</span>
                            <span className="text-sm text-muted-foreground">${Number(bill.total || 0).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="upcoming">
                    {billsLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : (
                      <div className="space-y-2">
                        {upcomingBills.length === 0 ? <p className="text-sm text-muted-foreground">No upcoming bills.</p> : upcomingBills.map((bill: any) => (
                          <div key={bill.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                            <span className="text-sm font-medium">{bill.billNo}</span>
                            <span className="text-sm text-muted-foreground">${Number(bill.total || 0).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="paid">
                    {billsLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : (
                      <div className="space-y-2">
                        {paidBills.length === 0 ? <p className="text-sm text-muted-foreground">No paid bills.</p> : paidBills.map((bill: any) => (
                          <div key={bill.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                            <span className="text-sm font-medium">{bill.billNo}</span>
                            <span className="text-sm text-muted-foreground">${Number(bill.total || 0).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-5">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Your Schedule</p>
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="divide-y divide-border">
                {acceptedOffers.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-sm text-muted-foreground">No accepted assignments yet.</p>
                  </div>
                ) : (
                  acceptedOffers.slice(0, 5).map((inv: any) => (
                    <div key={inv.id} className="px-5 py-3.5 flex items-start gap-3 hover:bg-muted/30 transition-colors cursor-pointer">
                      <div className="h-9 w-9 shrink-0 bg-muted rounded-lg flex flex-col items-center justify-center">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase leading-none">
                          {new Date(inv.callTime.startDate).toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                        <span className="text-base font-bold text-foreground leading-none">
                          {new Date(inv.callTime.startDate).getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {inv.callTime.service?.title || 'Assignment'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{inv.callTime.event.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {inv.callTime.startTime} – {inv.callTime.endTime}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const eventTerm = useEventTerm();
  const { terminology } = useTerminology();
  const { data: profile, isLoading: profileLoading } = trpc.profile.getMyProfile.useQuery();
  const isStaff = profile?.role === UserRole.STAFF;
  const isClient = profile?.role === UserRole.CLIENT;

  useEffect(() => {
    if (!profileLoading && isClient) router.push('/client-portal');
  }, [profileLoading, isClient, router]);

  useEffect(() => {
    if (!profileLoading && isClient) router.push('/client-portal');
  }, [profileLoading, isClient, router]);

  const { data: eventStats, isLoading: eventLoading } = trpc.event.getStats.useQuery(
    undefined, { enabled: !profileLoading && !isStaff && !isClient }
  );
  const { data: staffStats, isLoading: staffLoading } = trpc.staff.getStats.useQuery(
    undefined, { enabled: !profileLoading && !isStaff && !isClient }
  );
  const { data: upcomingEventsRaw, isLoading: upcomingLoading } = trpc.event.getUpcoming.useQuery(
    undefined, { enabled: !profileLoading && !isStaff && !isClient }
  );
  const upcomingEvents = upcomingEventsRaw?.map(e => ({
    ...e,
    client: e.client ? { ...e.client, businessName: e.client.businessName ?? '' } : null,
  }));

  const { data: recentInvoices, isLoading: invoicesLoading } = trpc.invoices.getAll.useQuery(
    { page: 1, limit: 5, showArchived: false },
    { enabled: !profileLoading && !isStaff && !isClient }
  );

  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"upcoming-tasks" | "open-assignments" | "staffing" | "finance">("upcoming-tasks");

  const handleViewEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    setIsViewOpen(true);
  };

  const handleCloseView = () => {
    setIsViewOpen(false);
    setSelectedEventId(null);
  };

  if (profileLoading || isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (isStaff) {
    return <StaffDashboard firstName={profile?.firstName} lastName={profile?.lastName} />;
  }


  return (
    <div className="min-h-screen bg-muted/30">
      <div className="space-y-6">

        {/* Page Header */}
        <WelcomeSection
          firstName={profile?.firstName}
          lastName={profile?.lastName}
          role={profile?.role}
        />

        {/* Stats Row */}
        <QuickStats
          eventStats={eventStats}
          staffStats={staffStats}
          isLoading={eventLoading || staffLoading}
        />

        {/* Two-column content area */}
        <div className="flex gap-6 items-start">

          {/* Left — tabs + content */}
          <div className="flex-1 min-w-0 bg-card border border-border rounded-xl overflow-hidden">
            {/* Tab bar */}
            <div className="border-b border-border px-6 flex items-center justify-between">
              <div className="flex gap-7">
                {([
                  { id: "upcoming-tasks",    label: "Upcoming Tasks" },
                  { id: "open-assignments",  label: "Open Assignments" },
                  { id: "staffing",          label: "Staffing" },
                  { id: "finance",           label: "Finance" },
                ] as const).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 text-sm font-medium transition-colors relative whitespace-nowrap ${
                      activeTab === tab.id
                        ? "text-[#196496] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#196496] after:rounded-full"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <Link href={`${getEventRoute(terminology)}?create=true`}>
                <Button size="sm" className="text-xs h-8 my-3">
                  Create {eventTerm.singular}
                </Button>
              </Link>
            </div>

            {/* Upcoming Tasks */}
            {activeTab === "upcoming-tasks" && (
              <>
                <div className="px-6 pt-5 pb-2 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Upcoming {eventTerm.plural}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">High-signal list of your next events</p>
                  </div>
                  <Link href={getEventRoute(terminology)}>
                    <Button variant="outline" size="sm" className="text-xs">View All</Button>
                  </Link>
                </div>
                <DashboardUpcomingList
                  events={upcomingEvents}
                  isLoading={upcomingLoading}
                  onEventClick={handleViewEvent}
                />
              </>
            )}

            {/* Open Assignments */}
            {activeTab === "open-assignments" && (
              <>
                <div className="px-6 pt-5 pb-2 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Open Assignments</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Events published or assigned that still need staffing</p>
                  </div>
                  <Link href="/assignments">
                    <Button variant="outline" size="sm" className="text-xs">View All</Button>
                  </Link>
                </div>
                <DashboardUpcomingList
                  events={upcomingEvents?.filter(e => e.status === "PUBLISHED" || e.status === "ASSIGNED")}
                  isLoading={upcomingLoading}
                  onEventClick={handleViewEvent}
                />
              </>
            )}

            {/* Staffing */}
            {activeTab === "staffing" && (
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Staff Overview</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Current status of your talent pool</p>
                  </div>
                  <Link href="/staff">
                    <Button variant="outline" size="sm" className="text-xs">View All</Button>
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { label: "Active", value: staffStats?.active ?? 0, color: "text-green-600" },
                    { label: "Pending", value: staffStats?.pending ?? 0, color: "text-amber-600" },
                    { label: "Disabled", value: staffStats?.disabled ?? 0, color: "text-muted-foreground" },
                    { label: "Employees", value: staffStats?.employees ?? 0, color: "text-foreground" },
                    { label: "Contractors", value: staffStats?.contractors ?? 0, color: "text-foreground" },
                    { label: "Teams", value: staffStats?.companies ?? 0, color: "text-foreground" },
                  ].map((item) => (
                    <div key={item.label} className="bg-muted/40 rounded-lg p-4 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                      <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Finance */}
            {activeTab === "finance" && (
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Recent Invoices</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Latest invoices across all clients</p>
                  </div>
                  <Link href="/invoices">
                    <Button variant="outline" size="sm" className="text-xs">View All</Button>
                  </Link>
                </div>
                {invoicesLoading ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}
                  </div>
                ) : !recentInvoices?.data?.length ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">No invoices found.</p>
                    <Link href="/invoices">
                      <Button variant="outline" size="sm" className="mt-3 text-xs">Create Invoice</Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-[1fr_140px_100px_80px] gap-3 px-3 py-2">
                      {["Invoice", "Client", "Amount", "Status"].map(h => (
                        <span key={h} className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</span>
                      ))}
                    </div>
                    <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
                      {recentInvoices.data.map((inv: any) => (
                        <Link key={inv.id} href={`/invoices/${inv.id}`}>
                          <div className="grid grid-cols-[1fr_140px_100px_80px] gap-3 px-3 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer items-center">
                            <p className="text-sm font-semibold text-foreground truncate">{inv.invoiceNo}</p>
                            <p className="text-sm text-muted-foreground truncate">{inv.client?.businessName || "—"}</p>
                            <p className="text-sm text-foreground">
                              {inv.total != null ? `$${Number(inv.total).toLocaleString()}` : "—"}
                            </p>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-md border w-fit ${
                              inv.status === "PAID"    ? "border-green-400 text-green-700" :
                              inv.status === "SENT"    ? "border-blue-400 text-blue-600" :
                              inv.status === "OVERDUE" ? "border-red-400 text-red-600" :
                                                         "border-muted-foreground/30 text-muted-foreground"
                            }`}>{inv.status}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right — sidebar */}
          <div className="w-72 shrink-0 space-y-5">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-0.5">Quick links</h3>
              <p className="text-xs text-muted-foreground mb-4">Navigate to key areas</p>
              <div className="space-y-2.5">
                {[
                  { label: `All ${eventTerm.plural}`, href: getEventRoute(terminology) },
                  { label: "Talent Manager", href: "/staff" },
                  { label: "Assignment Manager", href: "/assignments" },
                  { label: "Invoices", href: "/invoices" },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block text-sm text-foreground hover:text-primary transition-colors py-0.5"
                  >
                    {link.label} →
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ViewEventModal
        eventId={selectedEventId}
        open={isViewOpen}
        onClose={handleCloseView}
      />
    </div>
  );
}
