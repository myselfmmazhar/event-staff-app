"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EventStatus } from "@prisma/client";
import { format } from "date-fns";
import Link from "next/link";
import { useTerminology } from "@/lib/hooks/use-terminology";
import { isDateNullOrUBD } from "@/lib/utils/date-formatter";
import { getMockWorkShiftsForEvent } from "@/lib/mock-data/dashboard-mock";
import { getEventRoute } from "@/lib/utils/route-helpers";

interface UpcomingEvent {
  id: string;
  eventId: string;
  title: string;
  venueName: string;
  city: string;
  state: string;
  startDate: Date | null;
  startTime: string | null;
  endDate: Date | null;
  endTime: string | null;
  status: EventStatus;
  client?: { businessName: string } | null;
}

interface Props {
  events: UpcomingEvent[] | undefined;
  isLoading: boolean;
  onEventClick?: (eventId: string) => void;
}

const STATUS_BADGE: Record<EventStatus, { label: string; className: string }> = {
  DRAFT:       { label: "Draft",       className: "border border-muted-foreground/30 text-muted-foreground bg-transparent" },
  PUBLISHED:   { label: "Open",        className: "border border-blue-400 text-blue-600 bg-transparent" },
  ASSIGNED:    { label: "Assigned",    className: "border border-green-500 text-green-700 bg-transparent" },
  IN_PROGRESS: { label: "In Progress", className: "border border-primary text-primary bg-transparent" },
  COMPLETED:   { label: "Completed",   className: "border border-green-500 text-green-700 bg-transparent" },
  CANCELLED:   { label: "Cancelled",   className: "border border-destructive text-destructive bg-transparent" },
};

function needsTalent(status: EventStatus) {
  return status === EventStatus.PUBLISHED;
}

export function DashboardUpcomingList({ events, isLoading, onEventClick }: Props) {
  const { terminology } = useTerminology();

  const formatDate = (date: Date | null) => {
    if (isDateNullOrUBD(date)) return "Date TBD";
    return format(new Date(date!), "MMM d, yyyy");
  };

  const formatTime = (start: string | null, end: string | null) => {
    if (!start && !end) return "Time TBD";
    if (!start) return end!;
    if (!end) return start;
    return `${start} – ${end}`;
  };

  if (isLoading) {
    return (
      <div className="divide-y divide-border">
        {[1, 2, 3].map((i) => (
          <div key={i} className="grid grid-cols-[140px_1fr_140px_140px_100px] gap-4 px-6 py-4">
            {[1,2,3,4,5].map(j => (
              <div key={j} className="h-4 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-muted-foreground text-sm mb-4">
          No upcoming {terminology.event.lowerPlural} in the next 30 days.
        </p>
        <Link href={`${getEventRoute(terminology)}?create=true`}>
          <Button size="sm" variant="outline">
            Create {terminology.event.singular}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Table Header */}
      <div className="grid grid-cols-[150px_1fr_160px_150px_110px] gap-4 px-6 py-3 border-b border-border">
        {["Date", "Task", "Client", "Assignment Progress", "Status"].map((h) => (
          <span key={h} className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-border">
        {events.map((event) => {
          const shifts = getMockWorkShiftsForEvent(event.id);
          const filled = shifts.confirmed;
          const total = shifts.sent || shifts.confirmed;
          const open = Math.max(0, total - filled);
          const badge = needsTalent(event.status)
            ? { label: "Needs Talent", className: "border border-amber-400 text-amber-700 bg-transparent" }
            : STATUS_BADGE[event.status];

          return (
            <div
              key={event.id}
              className="grid grid-cols-[150px_1fr_160px_150px_110px] gap-4 px-6 py-4 hover:bg-muted/30 cursor-pointer transition-colors"
              onClick={() => onEventClick?.(event.id)}
            >
              {/* Date / Time */}
              <div>
                <p className="text-sm font-semibold text-foreground leading-snug">
                  {formatDate(event.startDate)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatTime(event.startTime, event.endTime)}
                </p>
              </div>

              {/* Title / ID */}
              <div>
                <p className="text-sm font-semibold text-foreground leading-snug">
                  {event.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                  {event.eventId}
                </p>
              </div>

              {/* Client */}
              <div className="flex items-center">
                <span className="text-sm text-foreground">
                  {event.client?.businessName || "No Client"}
                </span>
              </div>

              {/* Assignment Progress */}
              <div>
                <p className="text-sm font-medium text-foreground">
                  {filled} / {total} filled
                </p>
                {open > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">{open} open</p>
                )}
              </div>

              {/* Status Badge */}
              <div className="flex items-center">
                <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${badge.className}`}>
                  {badge.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
