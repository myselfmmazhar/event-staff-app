"use client";

import { Badge } from "@/components/ui/badge";
import { CalendarIcon, ClockIcon } from "@/components/ui/icons";
import { EventStatus } from "@prisma/client";
import { format } from "date-fns";
import {
  getMockCallTimesForEvent,
  getMockWorkShiftsForEvent,
  getMockAvailabilityForEvent,
  getCallTimeBadgeColor,
  formatCallTimeDisplay,
  getWorkShiftStatusVariant,
  type MockCallTime,
  type MockWorkShifts,
  type MockAvailabilityRequests,
} from "@/lib/mock-data/dashboard-mock";

interface EnhancedEventCardProps {
  event: {
    id: string;
    eventId: string;
    title: string;
    venueName: string;
    city: string;
    state: string;
    startDate: Date;
    startTime: string | null;
    endDate: Date;
    endTime: string | null;
    status: EventStatus;
    client?: {
      businessName: string;
    } | null;
  };
  onClick?: (eventId: string) => void;
}

/**
 * Enhanced Event Card Component
 *
 * Displays event details with mock data for call times, work shifts, and availability requests.
 * This represents the future vision from the dashboard screenshots.
 * Will be replaced with real API data once backend features are implemented.
 */
export function EnhancedEventCard({ event, onClick }: EnhancedEventCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(event.id);
    }
  };

  // Get mock data for this event
  const callTimes = getMockCallTimesForEvent(event.id);
  const workShifts = getMockWorkShiftsForEvent(event.id);
  const availability = getMockAvailabilityForEvent(event.id);

  // Format dates
  const dateRange = `${format(new Date(event.startDate), "MMM d")} - ${format(new Date(event.endDate), "MMM d, yyyy")}`;
  const timeRange = event.startTime && event.endTime
    ? `${event.startTime} - ${event.endTime}`
    : "Time TBD";

  return (
    <div
      onClick={handleClick}
      className="bg-card rounded-xl border border-border p-6 cursor-pointer transition-all duration-200 hover:shadow-lg"
    >
      {/* Event Header */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-card-foreground mb-1">
          {event.title}
        </h3>
        {event.client && (
          <p className="text-sm text-muted-foreground">
            {event.client.businessName}
          </p>
        )}
        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <CalendarIcon className="w-4 h-4" />
            <span>{dateRange}</span>
          </div>
          <div className="flex items-center gap-1">
            <ClockIcon className="w-4 h-4" />
            <span>{timeRange}</span>
          </div>
        </div>
      </div>

      {/* Content Grid - Three Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Call Times Column */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">
            Call Times
          </h4>
          <div className="space-y-2">
            {callTimes.map((callTime) => (
              <div key={callTime.id}>
                <div className={`text-xs px-2 py-1 rounded border inline-block ${getCallTimeBadgeColor(callTime.status)}`}>
                  {formatCallTimeDisplay(callTime)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {callTime.startTime} - {callTime.endTime}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Work Shifts Column */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">
            Work Shifts
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-card-foreground">Sent</span>
              <Badge variant={getWorkShiftStatusVariant(workShifts.sent, workShifts.confirmed)}>
                {workShifts.sent} / {workShifts.sent}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-card-foreground">Confirmed</span>
              <Badge variant={getWorkShiftStatusVariant(workShifts.sent, workShifts.confirmed)}>
                {workShifts.confirmed} / {workShifts.sent}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-card-foreground">Queued to Send</span>
              <span className="text-sm text-muted-foreground">{workShifts.queuedToSend}</span>
            </div>
          </div>
        </div>

        {/* Availability Requests Column */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">
            Availability Requests
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-card-foreground">Available</span>
              <span className="text-sm text-muted-foreground">{availability.available}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-card-foreground">Answered</span>
              <button className="text-sm text-info hover:underline">
                {availability.answered}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-card-foreground">Created</span>
              <span className="text-sm text-muted-foreground">{availability.created}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-card-foreground">Sent</span>
              <span className="text-sm text-muted-foreground">{availability.sent}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
