'use client';

import { Badge } from '@/components/ui/badge';
import { CalendarIcon, MapPinIcon } from '@/components/ui/icons';
import { trpc } from '@/lib/client/trpc';
import { EVENT_STATUS_COLORS, EVENT_STATUS_LABELS } from '@/lib/constants/status';
import { formatDateTime } from '@/lib/utils/date-formatter';
import { useEventTerm } from '@/lib/hooks/use-terminology';
import { useRouter } from 'next/navigation';

interface ClientExpandedRowProps {
  clientId: string;
}

export function ClientExpandedRow({ clientId }: ClientExpandedRowProps) {
  const router = useRouter();
  const eventTerm = useEventTerm();

  const { data: events, isLoading } = trpc.clients.getRecentActivity.useQuery({ clientId });

  return (
    <div className="px-6 py-4 bg-muted/20 border-t border-border/50">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Recent {eventTerm.plural}
        </span>
      </div>

      {isLoading ? (
        <div className="h-10 bg-muted/40 rounded animate-pulse" />
      ) : !events || events.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          No {eventTerm.lowerPlural} found for this client
        </p>
      ) : (() => {
        const event = events[0];
        return (
          <button
            type="button"
            className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5 text-left transition-colors hover:bg-muted/50"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/events?search=${encodeURIComponent(event.title)}`);
            }}
          >
            <Badge
              variant={EVENT_STATUS_COLORS[event.status]}
              asSpan
              className="shrink-0 min-w-[90px] justify-center"
            >
              {EVENT_STATUS_LABELS[event.status]}
            </Badge>

            <span className="text-sm font-medium text-foreground truncate">
              {event.title}
            </span>

            {event.startDate && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap shrink-0">
                <CalendarIcon className="h-3 w-3" />
                {formatDateTime(event.startDate, event.startTime ?? null)}
              </span>
            )}

            {event.venueName && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap shrink-0 hidden sm:flex">
                <MapPinIcon className="h-3 w-3" />
                {event.city}, {event.state}
              </span>
            )}
          </button>
        );
      })()}
    </div>
  );
}
