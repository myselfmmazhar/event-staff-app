'use client';

import { Badge } from '@/components/ui/badge';
import { CalendarIcon, BriefcaseIcon } from '@/components/ui/icons';
import { trpc } from '@/lib/client/trpc';
import { EVENT_STATUS_COLORS, EVENT_STATUS_LABELS } from '@/lib/constants/status';
import { formatDateTime } from '@/lib/utils/date-formatter';
import { useEventTerm } from '@/lib/hooks/use-terminology';
import { useRouter } from 'next/navigation';

interface StaffExpandedRowProps {
  staffId: string;
}

export function StaffExpandedRow({ staffId }: StaffExpandedRowProps) {
  const router = useRouter();
  const eventTerm = useEventTerm();

  const { data: activity, isLoading } = trpc.staff.getRecentActivity.useQuery({ staffId });

  const eventDate = activity?.callTime.startDate ?? activity?.callTime.event.startDate ?? null;
  const eventTime = activity?.callTime.startTime ?? activity?.callTime.event.startTime ?? null;

  return (
    <div className="px-6 py-4 bg-muted/20 border-t border-border/50">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Recent Activity
      </p>

      {isLoading ? (
        <div className="h-14 bg-muted/40 rounded animate-pulse" />
      ) : !activity ? (
        <p className="text-sm text-muted-foreground italic">
          No accepted {eventTerm.lowerPlural} found for this talent
        </p>
      ) : (
        <button
          type="button"
          className="w-fit rounded-lg border border-border bg-card px-5 py-3 text-left transition-colors hover:bg-muted/50"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/events?search=${encodeURIComponent(activity.callTime.event.title)}`);
          }}
        >
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            {/* Task Title */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">
                {eventTerm.singular}
              </p>
              <p className="text-sm font-semibold text-foreground truncate">
                {activity.callTime.event.title}
              </p>
            </div>

            {/* Status */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">
                Status
              </p>
              <Badge variant={EVENT_STATUS_COLORS[activity.callTime.event.status]} asSpan>
                {EVENT_STATUS_LABELS[activity.callTime.event.status]}
              </Badge>
            </div>

            {/* Position */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">
                Position
              </p>
              {activity.callTime.service ? (
                <span className="flex items-center gap-1 text-sm text-foreground">
                  <BriefcaseIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {activity.callTime.service.title}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground italic">—</span>
              )}
            </div>

            {/* Date */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">
                Date
              </p>
              {eventDate ? (
                <span className="flex items-center gap-1 text-sm text-foreground whitespace-nowrap">
                  <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {formatDateTime(eventDate, eventTime)}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground italic">—</span>
              )}
            </div>
          </div>
        </button>
      )}
    </div>
  );
}
