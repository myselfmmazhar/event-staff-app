"use client";

import { StatsCard } from "./stats-card";
import { CalendarIcon, UsersIcon, BriefcaseIcon, ClipboardListIcon } from "@/components/ui/icons";
import { useTerminology } from "@/lib/hooks/use-terminology";
import { getEventRoute } from "@/lib/utils/route-helpers";

interface EventStats {
  total: number;
  upcoming: number;
  byStatus: {
    DRAFT: number;
    PUBLISHED: number;
    ASSIGNED: number;
    IN_PROGRESS: number;
    COMPLETED: number;
    CANCELLED: number;
  };
}

interface StaffStats {
  total: number;
  active: number;
  disabled: number;
  pending: number;
  employees: number;
  contractors: number;
  companies: number;
}

interface QuickStatsProps {
  eventStats: EventStats | undefined;
  staffStats: StaffStats | undefined;
  isLoading: boolean;
}

export function QuickStats({ eventStats, staffStats, isLoading }: QuickStatsProps) {
  const { terminology } = useTerminology();

  const openAssignments =
    (eventStats?.byStatus?.PUBLISHED ?? 0) + (eventStats?.byStatus?.ASSIGNED ?? 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <StatsCard
        title={`Upcoming ${terminology.event.plural}`}
        value={eventStats?.upcoming || 0}
        icon={<CalendarIcon className="w-5 h-5" />}
        description="Next 30 days"
        gradient="purple"
        href={getEventRoute(terminology)}
        isLoading={isLoading}
      />
      <StatsCard
        title={`Active ${terminology.staff.plural}`}
        value={staffStats?.active || 0}
        icon={<UsersIcon className="w-5 h-5" />}
        description={`Available ${terminology.staff.lowerPlural}`}
        gradient="green"
        href="/staff"
        isLoading={isLoading}
      />
      <StatsCard
        title="Open Assignments"
        value={openAssignments}
        icon={<BriefcaseIcon className="w-5 h-5" />}
        description="Published & assigned"
        gradient="blue"
        href="/assignments"
        isLoading={isLoading}
      />
      <StatsCard
        title={`Total ${terminology.event.plural}`}
        value={eventStats?.total || 0}
        icon={<ClipboardListIcon className="w-5 h-5" />}
        description={`All ${terminology.event.lowerPlural}`}
        gradient="rose"
        href={getEventRoute(terminology)}
        isLoading={isLoading}
      />
    </div>
  );
}
