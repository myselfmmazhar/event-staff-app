"use client";

import { trpc } from "@/lib/client/trpc";
import { StatsCard } from "@/components/dashboard/stats-card";
import { WelcomeSection } from "@/components/dashboard/welcome-section";
import {
  UsersIcon,
  UserIcon,
  SettingsIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  BriefcaseIcon,
  LockOpenIcon,
  LockClosedIcon,
} from "@/components/ui/icons";

/**
 * Main dashboard page with user, event, and client statistics
 * Shows welcome message, user stats, event stats, and client stats
 */
export default function DashboardPage() {
  const { data: profile } = trpc.profile.getMyProfile.useQuery();
  const { data: stats, isLoading, error } = trpc.user.getStats.useQuery();
  const { data: eventStats, isLoading: eventLoading, error: eventError } = trpc.event.getStats.useQuery();
  const { data: clientStats, isLoading: clientLoading, error: clientError } = trpc.client.getStats.useQuery();

  // Calculate role percentages for descriptions
  const getRolePercentage = (count: number) => {
    if (!stats?.total || stats.total === 0) return "0%";
    return `${Math.round((count / stats.total) * 100)}%`;
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
        {(error || eventError || clientError) && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
            <p className="text-destructive text-sm">
              Failed to load dashboard statistics. Please try refreshing the page.
            </p>
          </div>
        )}

        {/* User Statistics Section */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">User Statistics</h2>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Users"
            value={stats?.total || 0}
            icon={<UsersIcon className="w-6 h-6" />}
            description="All users in system"
            gradient="purple"
            isLoading={isLoading}
          />
          <StatsCard
            title="Active Users"
            value={stats?.active || 0}
            icon={<UserIcon className="w-6 h-6" />}
            description={
              stats?.total
                ? `${getRolePercentage(stats.active)} of total`
                : "No users yet"
            }
            gradient="green"
            isLoading={isLoading}
          />
          <StatsCard
            title="Inactive Users"
            value={stats?.inactive || 0}
            icon={<UserIcon className="w-6 h-6" />}
            description={
              stats?.total
                ? `${getRolePercentage(stats.inactive)} of total`
                : "No users yet"
            }
            gradient="rose"
            isLoading={isLoading}
          />
          <StatsCard
            title="Administrators"
            value={(stats?.byRole?.SUPER_ADMIN || 0) + (stats?.byRole?.ADMIN || 0)}
            icon={<SettingsIcon className="w-6 h-6" />}
            description="Super admins and admins"
            gradient="blue"
            isLoading={isLoading}
          />
        </div>

        {/* Role Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Super Admins
              </h3>
              <div className="w-3 h-3 bg-gradient-to-br from-primary to-primary/80 rounded-full" />
            </div>
            {isLoading ? (
              <div className="h-8 w-16 bg-muted rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-card-foreground">
                {stats?.byRole?.SUPER_ADMIN || 0}
              </p>
            )}
            {stats?.total && stats.total > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {getRolePercentage(stats?.byRole?.SUPER_ADMIN || 0)} of users
              </p>
            )}
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Admins
              </h3>
              <div className="w-3 h-3 bg-gradient-to-br from-info to-info/80 rounded-full" />
            </div>
            {isLoading ? (
              <div className="h-8 w-16 bg-muted rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-card-foreground">
                {stats?.byRole?.ADMIN || 0}
              </p>
            )}
            {stats?.total && stats.total > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {getRolePercentage(stats?.byRole?.ADMIN || 0)} of users
              </p>
            )}
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Managers
              </h3>
              <div className="w-3 h-3 bg-gradient-to-br from-success to-success/80 rounded-full" />
            </div>
            {isLoading ? (
              <div className="h-8 w-16 bg-muted rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-card-foreground">
                {stats?.byRole?.MANAGER || 0}
              </p>
            )}
            {stats?.total && stats.total > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {getRolePercentage(stats?.byRole?.MANAGER || 0)} of users
              </p>
            )}
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Staff
              </h3>
              <div className="w-3 h-3 bg-gradient-to-br from-secondary to-secondary/80 rounded-full" />
            </div>
            {isLoading ? (
              <div className="h-8 w-16 bg-muted rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-card-foreground">
                {stats?.byRole?.STAFF || 0}
              </p>
            )}
            {stats?.total && stats.total > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {getRolePercentage(stats?.byRole?.STAFF || 0)} of users
              </p>
            )}
          </div>
        </div>

        {/* Event Statistics Section */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Event Statistics</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Events"
            value={eventStats?.total || 0}
            icon={<CalendarIcon className="w-6 h-6" />}
            description="All events in system"
            gradient="purple"
            isLoading={eventLoading}
          />
          <StatsCard
            title="Upcoming Events"
            value={eventStats?.upcoming || 0}
            icon={<ClockIcon className="w-6 h-6" />}
            description="Next 30 days"
            gradient="blue"
            isLoading={eventLoading}
          />
          <StatsCard
            title="Completed Events"
            value={eventStats?.byStatus?.COMPLETED || 0}
            icon={<CheckCircleIcon className="w-6 h-6" />}
            description="Successfully finished"
            gradient="green"
            isLoading={eventLoading}
          />
          <StatsCard
            title="In Progress"
            value={eventStats?.byStatus?.IN_PROGRESS || 0}
            icon={<CalendarIcon className="w-6 h-6" />}
            description="Currently ongoing"
            gradient="rose"
            isLoading={eventLoading}
          />
        </div>

        {/* Event Status Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Draft Events
              </h3>
              <div className="w-3 h-3 bg-gradient-to-br from-muted to-muted/80 rounded-full" />
            </div>
            {eventLoading ? (
              <div className="h-8 w-16 bg-muted rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-card-foreground">
                {eventStats?.byStatus?.DRAFT || 0}
              </p>
            )}
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Published Events
              </h3>
              <div className="w-3 h-3 bg-gradient-to-br from-info to-info/80 rounded-full" />
            </div>
            {eventLoading ? (
              <div className="h-8 w-16 bg-muted rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-card-foreground">
                {eventStats?.byStatus?.PUBLISHED || 0}
              </p>
            )}
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Confirmed Events
              </h3>
              <div className="w-3 h-3 bg-gradient-to-br from-success to-success/80 rounded-full" />
            </div>
            {eventLoading ? (
              <div className="h-8 w-16 bg-muted rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-card-foreground">
                {eventStats?.byStatus?.CONFIRMED || 0}
              </p>
            )}
          </div>
        </div>

        {/* Client Statistics Section */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Client Statistics</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatsCard
            title="Total Clients"
            value={clientStats?.total || 0}
            icon={<BriefcaseIcon className="w-6 h-6" />}
            description="All clients in system"
            gradient="purple"
            isLoading={clientLoading}
          />
          <StatsCard
            title="With Portal Access"
            value={clientStats?.withLoginAccess || 0}
            icon={<LockOpenIcon className="w-6 h-6" />}
            description="Can access client portal"
            gradient="green"
            isLoading={clientLoading}
          />
          <StatsCard
            title="Without Portal Access"
            value={clientStats?.withoutLoginAccess || 0}
            icon={<LockClosedIcon className="w-6 h-6" />}
            description="No portal access"
            gradient="rose"
            isLoading={clientLoading}
          />
        </div>

        {/* Quick Actions (Optional - can be expanded later) */}
        {stats?.total === 0 && !isLoading && (
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-6 text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Get Started
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              No users found. Create your first user to get started with the platform.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
