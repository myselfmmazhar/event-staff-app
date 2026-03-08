"use client";

import { Badge } from "@/components/ui/badge";
import { CalendarIcon, ClockIcon, BriefcaseIcon } from "@/components/ui/icons";
import { EventStatus } from "@prisma/client";
import { format } from "date-fns";
import { isDateNullOrUBD } from "@/lib/utils/date-formatter";

interface UpcomingEventCardProps {
  event: {
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
    client?: {
      businessName: string;
    } | null;
  };
  onClick?: (eventId: string) => void;
}

/**
 * Status badge variants mapping
 */
const statusVariants: Record<EventStatus, "default" | "info" | "success" | "purple" | "danger"> = {
  DRAFT: "default",
  ASSIGNED: "info",
  IN_PROGRESS: "purple",
  COMPLETED: "success",
  CANCELLED: "danger",
  PUBLISHED: "success",
};

/**
 * Status gradient colors for date badge
 */
const statusGradients: Record<EventStatus, string> = {
  DRAFT: "from-muted to-muted/80",
  ASSIGNED: "from-info to-info/80",
  IN_PROGRESS: "from-purple-500 to-purple-600",
  COMPLETED: "from-success to-success/80",
  CANCELLED: "from-destructive to-destructive/80",
  PUBLISHED: "from-success to-success/80",
};

/**
 * Upcoming Event Card Component
 * Displays individual event in an attractive card format with date badge,
 * event details, venue, time, status, and client information
 */
export function UpcomingEventCard({ event, onClick }: UpcomingEventCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(event.id);
    }
  };

  // Format dates (handle UBD)
  const startIsUBD = isDateNullOrUBD(event.startDate);
  const endIsUBD = isDateNullOrUBD(event.endDate);

  const dayOfMonth = startIsUBD ? "?" : format(new Date(event.startDate!), "d");
  const monthAbbr = startIsUBD ? "UBD" : format(new Date(event.startDate!), "MMM");
  const dateRange = startIsUBD
    ? "Date UBD"
    : endIsUBD
      ? `${format(new Date(event.startDate!), "MMM d, yyyy")}`
      : `${format(new Date(event.startDate!), "MMM d")} - ${format(new Date(event.endDate!), "MMM d, yyyy")}`;

  // Format time range
  const timeRange = event.startTime && event.endTime
    ? `${event.startTime} - ${event.endTime}`
    : "Time TBD";

  return (
    <div
      onClick={handleClick}
      className="group relative bg-card rounded-xl border border-border p-6 cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg"
    >
      {/* Date Badge */}
      <div className={`absolute top-4 right-4 w-16 h-16 rounded-lg bg-gradient-to-br ${statusGradients[event.status]} flex flex-col items-center justify-center text-white shadow-md`}>
        <span className="text-2xl font-bold leading-none">{dayOfMonth}</span>
        <span className="text-xs uppercase font-medium">{monthAbbr}</span>
      </div>

      {/* Event Title */}
      <div className="pr-20 mb-3">
        <h3 className="text-lg font-bold text-card-foreground truncate group-hover:text-primary transition-colors">
          {event.title}
        </h3>
        <p className="text-xs text-muted-foreground font-medium mt-1">
          {event.eventId}
        </p>
      </div>

      {/* Event Details */}
      <div className="space-y-2">
        {/* Venue */}
        <div className="flex items-start gap-2 text-sm">
          <CalendarIcon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-card-foreground font-medium truncate">
              {event.venueName}
            </p>
            <p className="text-muted-foreground text-xs">
              {event.city}, {event.state}
            </p>
          </div>
        </div>

        {/* Time */}
        <div className="flex items-center gap-2 text-sm">
          <ClockIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-card-foreground truncate">{dateRange}</p>
            <p className="text-muted-foreground text-xs">{timeRange}</p>
          </div>
        </div>

        {/* Client */}
        {event.client && (
          <div className="flex items-center gap-2 text-sm">
            <BriefcaseIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <p className="text-card-foreground truncate">{event.client.businessName}</p>
          </div>
        )}
      </div>

      {/* Status Badge */}
      <div className="mt-4 pt-4 border-t border-border">
        <Badge variant={statusVariants[event.status]}>
          {event.status.replace(/_/g, " ")}
        </Badge>
      </div>
    </div>
  );
}
