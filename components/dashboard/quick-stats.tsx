import { StatsCard } from "./stats-card";
import { CalendarIcon, UsersIcon } from "@/components/ui/icons";

interface EventStats {
  total: number;
  upcoming: number;
  byStatus: {
    DRAFT: number;
    PUBLISHED: number;
    CONFIRMED: number;
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
}

interface QuickStatsProps {
  eventStats: EventStats | undefined;
  staffStats: StaffStats | undefined;
  isLoading: boolean;
}

/**
 * Quick Stats Component
 * Displays 3 key metrics: Upcoming Events, Active Staff, and Total Events
 */
export function QuickStats({ eventStats, staffStats, isLoading }: QuickStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatsCard
        title="Upcoming Events"
        value={eventStats?.upcoming || 0}
        icon={<CalendarIcon className="w-6 h-6" />}
        description="Next 30 days"
        gradient="purple"
        isLoading={isLoading}
      />
      <StatsCard
        title="Active Staff"
        value={staffStats?.active || 0}
        icon={<UsersIcon className="w-6 h-6" />}
        description="Available staff members"
        gradient="green"
        isLoading={isLoading}
      />
      <StatsCard
        title="Total Events"
        value={eventStats?.total || 0}
        icon={<CalendarIcon className="w-6 h-6" />}
        description="All events"
        gradient="blue"
        isLoading={isLoading}
      />
    </div>
  );
}
