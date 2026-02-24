"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarIcon, DownloadIcon } from "@/components/ui/icons";
import { EventStatus } from "@prisma/client";
import { format } from "date-fns";
import { DataTable, ColumnDef } from "@/components/common/data-table";
import { toast } from "@/components/ui/use-toast";
import {
  getMockCallTimesForEvent,
  getMockWorkShiftsForEvent,
  getMockAvailabilityForEvent,
  getCallTimeBadgeColor,
  formatCallTimeDisplay,
  getWorkShiftStatusVariant,
  type MockCallTime,
} from "@/lib/mock-data/dashboard-mock";
import { exportUpcomingEventsToCSV } from "@/lib/utils/export-upcoming-events-csv";
import { exportUpcomingEventsToExcel } from "@/lib/utils/export-upcoming-events-excel";
import { exportUpcomingEventsToPDF } from "@/lib/utils/export-upcoming-events-pdf";
import { useEventTerm } from "@/lib/hooks/use-terminology";
import { isDateNullOrUBD } from "@/lib/utils/date-formatter";

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
  client?: {
    businessName: string;
  } | null;
}

interface UpcomingEventsTableProps {
  events: UpcomingEvent[] | undefined;
  isLoading: boolean;
  onEventClick?: (eventId: string) => void;
}

const STATUS_COLORS: Record<EventStatus, 'default' | 'info' | 'success' | 'primary' | 'purple' | 'danger'> = {
  DRAFT: 'default',
  ASSIGNED: 'info',
  IN_PROGRESS: 'primary',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

/**
 * Upcoming Events Table Component
 *
 * Displays upcoming events in a table format with call times, work shifts, and availability.
 * Includes export functionality and search/sort capabilities.
 * Uses mock data for Phase 2 demonstration.
 */
export function UpcomingEventsTable({ events, isLoading, onEventClick }: UpcomingEventsTableProps) {
  const eventTerm = useEventTerm();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (type: 'csv' | 'excel' | 'pdf') => {
    if (type === 'csv') {
      // Handle CSV export
      if (!events || events.length === 0) {
        toast({
          title: `No ${eventTerm.lowerPlural} to export`,
          description: `There are no upcoming ${eventTerm.lowerPlural} to export.`,
          variant: 'error',
        });
        return;
      }

      setIsExporting(true);

      try {
        // Show loading toast
        toast({
          title: 'Exporting CSV...',
          description: 'Preparing your file for download.',
          variant: 'info',
        });

        // Export to CSV
        exportUpcomingEventsToCSV(events);

        // Show success toast
        toast({
          title: 'CSV exported successfully!',
          description: `Exported ${events.length} ${events.length !== 1 ? eventTerm.lowerPlural : eventTerm.lower} to CSV.`,
          variant: 'success',
        });
      } catch (error) {
        console.error('CSV export failed:', error);
        toast({
          title: 'Export failed',
          description: 'Failed to export CSV. Please try again.',
          variant: 'error',
        });
      } finally {
        setIsExporting(false);
      }
    } else if (type === 'excel') {
      // Handle Excel export
      if (!events || events.length === 0) {
        toast({
          title: `No ${eventTerm.lowerPlural} to export`,
          description: `There are no upcoming ${eventTerm.lowerPlural} to export.`,
          variant: 'error',
        });
        return;
      }

      setIsExporting(true);

      try {
        // Show loading toast
        toast({
          title: 'Exporting Excel...',
          description: 'Preparing your file for download.',
          variant: 'info',
        });

        // Export to Excel
        exportUpcomingEventsToExcel(events);

        // Show success toast
        toast({
          title: 'Excel exported successfully!',
          description: `Exported ${events.length} ${events.length !== 1 ? eventTerm.lowerPlural : eventTerm.lower} to Excel.`,
          variant: 'success',
        });
      } catch (error) {
        console.error('Excel export failed:', error);
        toast({
          title: 'Export failed',
          description: 'Failed to export Excel. Please try again.',
          variant: 'error',
        });
      } finally {
        setIsExporting(false);
      }
    } else if (type === 'pdf') {
      // Handle PDF export
      if (!events || events.length === 0) {
        toast({
          title: `No ${eventTerm.lowerPlural} to export`,
          description: `There are no upcoming ${eventTerm.lowerPlural} to export.`,
          variant: 'error',
        });
        return;
      }

      setIsExporting(true);

      try {
        // Show loading toast
        toast({
          title: 'Exporting PDF...',
          description: 'Preparing your file for download.',
          variant: 'info',
        });

        // Export to PDF
        await exportUpcomingEventsToPDF(events);

        // Show success toast
        toast({
          title: 'PDF exported successfully!',
          description: `Exported ${events.length} ${events.length !== 1 ? eventTerm.lowerPlural : eventTerm.lower} to PDF.`,
          variant: 'success',
        });
      } catch (error) {
        console.error('PDF export failed:', error);
        toast({
          title: 'Export failed',
          description: 'Failed to export PDF. Please try again.',
          variant: 'error',
        });
      } finally {
        setIsExporting(false);
      }
    }
  };

  const formatDateTime = (date: Date | null, time: string | null) => {
    if (isDateNullOrUBD(date)) {
      return "Date UBD";
    }
    const dateStr = format(new Date(date!), "MMM d, yyyy");
    if (!time) {
      return `${dateStr} - TBD`;
    }
    return `${dateStr} ${time}`;
  };

  const columns: ColumnDef<UpcomingEvent>[] = [
    {
      key: "title",
      label: eventTerm.singular,
      sortable: true,
      className: "py-4 px-4 whitespace-nowrap",
      render: (event) => (
        <div>
          <div className="font-medium text-foreground">{event.title}</div>
          <div className="text-xs text-muted-foreground font-mono">{event.eventId}</div>
        </div>
      ),
    },
    {
      key: "client",
      label: "Client",
      sortable: true,
      className: "py-4 px-4 whitespace-nowrap",
      render: (event) => (
        <span className="text-sm text-card-foreground">
          {event.client?.businessName || "-"}
        </span>
      ),
    },
    {
      key: "startDate",
      label: "Date / Time",
      sortable: true,
      className: "py-4 px-4 whitespace-nowrap",
      render: (event) => (
        <div className="text-sm">
          <div className="text-card-foreground">
            {formatDateTime(event.startDate, event.startTime)}
          </div>
          <div className="text-xs text-muted-foreground">
            to {formatDateTime(event.endDate, event.endTime)}
          </div>
        </div>
      ),
    },
    {
      key: "callTimes",
      label: "Call Times",
      sortable: false,
      className: "py-4 px-4",
      render: (event) => {
        const callTimes = getMockCallTimesForEvent(event.id);
        return (
          <div className="space-y-1 min-w-[200px]">
            {callTimes.map((callTime) => (
              <div key={callTime.id}>
                <div className={`text-xs px-2 py-1 rounded border inline-block ${getCallTimeBadgeColor(callTime.status)}`}>
                  {formatCallTimeDisplay(callTime)}
                </div>
                <span className="text-xs text-muted-foreground ml-2">
                  {callTime.startTime} - {callTime.endTime}
                </span>
              </div>
            ))}
          </div>
        );
      },
    },
    {
      key: "workShifts",
      label: "Work Shifts",
      sortable: false,
      className: "py-4 px-4 whitespace-nowrap",
      render: (event) => {
        const workShifts = getMockWorkShiftsForEvent(event.id);
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Sent:</span>
              <Badge variant={getWorkShiftStatusVariant(workShifts.sent, workShifts.confirmed)} className="text-xs">
                {workShifts.sent} / {workShifts.sent}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Confirmed:</span>
              <Badge variant={getWorkShiftStatusVariant(workShifts.sent, workShifts.confirmed)} className="text-xs">
                {workShifts.confirmed} / {workShifts.sent}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Queued:</span>
              <span className="text-xs">{workShifts.queuedToSend}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: "availability",
      label: "Availability Requests",
      sortable: false,
      className: "py-4 px-4 whitespace-nowrap",
      render: (event) => {
        const availability = getMockAvailabilityForEvent(event.id);
        return (
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Available:</span>
              <span>{availability.available}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Answered:</span>
              <button className="text-info hover:underline">
                {availability.answered}
              </button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Created:</span>
              <span>{availability.created}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Sent:</span>
              <span>{availability.sent}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      className: "py-4 px-4 whitespace-nowrap",
      render: (event) => (
        <Badge variant={STATUS_COLORS[event.status]}>
          {event.status.replace(/_/g, " ")}
        </Badge>
      ),
    },
  ];

  // Mobile card renderer
  const mobileCard = (event: UpcomingEvent) => {
    const callTimes = getMockCallTimesForEvent(event.id);
    const workShifts = getMockWorkShiftsForEvent(event.id);
    const availability = getMockAvailabilityForEvent(event.id);

    return (
      <div
        key={event.id}
        className="bg-card rounded-lg border border-border p-4 space-y-3"
        onClick={() => onEventClick?.(event.id)}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium text-foreground">{event.title}</h3>
            <p className="text-xs text-muted-foreground font-mono">{event.eventId}</p>
          </div>
          <Badge variant={STATUS_COLORS[event.status]}>
            {event.status.replace(/_/g, " ")}
          </Badge>
        </div>

        {event.client && (
          <p className="text-sm text-muted-foreground">{event.client.businessName}</p>
        )}

        <div className="text-sm space-y-1">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-muted-foreground" />
            <span>{formatDateTime(event.startDate, event.startTime)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
              Call Times
            </h4>
            {callTimes.slice(0, 2).map((callTime) => (
              <div key={callTime.id} className="text-xs mb-1">
                <div className={`px-2 py-1 rounded border inline-block ${getCallTimeBadgeColor(callTime.status)}`}>
                  {formatCallTimeDisplay(callTime)}
                </div>
              </div>
            ))}
          </div>
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
              Work Shifts
            </h4>
            <div className="text-xs space-y-1">
              <div>Sent: {workShifts.sent}</div>
              <div>Confirmed: {workShifts.confirmed}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with Export Buttons */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Upcoming {eventTerm.plural}</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("csv")}
            disabled={isExporting || isLoading}
            className="text-xs"
          >
            <DownloadIcon className="w-4 h-4 mr-1" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("excel")}
            disabled={isExporting || isLoading}
            className="text-xs"
          >
            <DownloadIcon className="w-4 h-4 mr-1" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("pdf")}
            disabled={isExporting || isLoading}
            className="text-xs"
          >
            <DownloadIcon className="w-4 h-4 mr-1" />
            PDF
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <DataTable
          data={events || []}
          columns={columns}
          isLoading={isLoading}
          getRowKey={(event) => event.id}
          emptyMessage={`No upcoming ${eventTerm.lowerPlural} found`}
          emptyDescription={`${eventTerm.plural} scheduled for the next 30 days will appear here`}
          mobileCard={mobileCard}
          minWidth="1400px"
          skeletonRows={3}
        />
      </div>

      {/* Mock Data Notice */}
      <div className="bg-info/10 border border-info/30 rounded-lg p-4">
        <p className="text-sm text-info">
          <strong>Note:</strong> Call Times, Work Shifts, and Availability Requests shown here are mock data for demonstration purposes.
          These features will be implemented with real data in a future update.
        </p>
      </div>
    </div>
  );
}
