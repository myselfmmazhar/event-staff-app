'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EyeIcon, EditIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon } from '@/components/ui/icons';
import { EventStatus } from '@prisma/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Event {
  id: string;
  eventId: string;
  title: string;
  venueName: string;
  city: string;
  state: string;
  startDate: Date;
  startTime?: string | null;
  endDate: Date;
  endTime?: string | null;
  timezone: string;
  status: EventStatus;
  createdAt: Date;
}

type SortableField = 'createdAt' | 'updatedAt' | 'title' | 'eventId' | 'startDate' | 'endDate' | 'status' | 'venueName';

interface EventTableProps {
  events: Event[];
  isLoading: boolean;
  sortBy?: SortableField;
  sortOrder?: 'asc' | 'desc';
  onView: (event: Event) => void;
  onEdit: (event: Event) => void;
  onDelete: (event: Event) => void;
  onSort: (field: SortableField) => void;
}

const STATUS_COLORS: Record<EventStatus, 'default' | 'info' | 'success' | 'primary' | 'purple' | 'danger'> = {
  DRAFT: 'default',
  PUBLISHED: 'info',
  CONFIRMED: 'success',
  IN_PROGRESS: 'primary',
  COMPLETED: 'purple',
  CANCELLED: 'danger',
};

const STATUS_LABELS: Record<EventStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const SORTABLE_COLUMNS: Array<{ key: SortableField; label: string }> = [
  { key: 'eventId', label: 'Event ID' },
  { key: 'title', label: 'Title' },
  { key: 'venueName', label: 'Venue' },
  { key: 'startDate', label: 'Start Date' },
  { key: 'status', label: 'Status' },
];

export function EventTable({
  events,
  isLoading,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  onView,
  onEdit,
  onDelete,
  onSort,
}: EventTableProps) {
  const renderSortIcon = (columnKey: SortableField) => {
    if (sortBy !== columnKey) {
      return <ChevronUpIcon className="h-4 w-4 opacity-30" />;
    }
    return sortOrder === 'asc' ? (
      <ChevronUpIcon className="h-4 w-4" />
    ) : (
      <ChevronDownIcon className="h-4 w-4" />
    );
  };

  const formatDateTime = (date: Date, time?: string | null, timezone?: string) => {
    const dateStr = format(new Date(date), 'MMM d, yyyy');
    if (!time || time === 'TBD') {
      return `${dateStr} - TBD`;
    }
    return `${dateStr} ${time}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-foreground text-lg">No events found</p>
        <p className="text-muted-foreground text-sm mt-2">
          Try adjusting your search or filters
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <div className="min-w-full inline-block">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-border">
                {SORTABLE_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="py-3 px-4 text-left"
                  >
                    <button
                      onClick={() => onSort(col.key)}
                      className="flex items-center gap-2 font-semibold text-sm text-foreground hover:text-primary transition-colors"
                    >
                      {col.label}
                      {renderSortIcon(col.key)}
                    </button>
                  </th>
                ))}
                <th className="text-left py-3 px-4">
                  <span className="font-semibold text-sm text-foreground">Location</span>
                </th>
                <th className="text-right py-3 px-4">
                  <span className="font-semibold text-sm text-foreground">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr
                  key={event.id}
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                >
                  <td className="py-4 px-4">
                    <span className="font-mono text-sm text-muted-foreground">
                      {event.eventId}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-medium text-foreground">
                      {event.title}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">
                    {event.venueName}
                  </td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">
                    <div>{formatDateTime(event.startDate, event.startTime, event.timezone)}</div>
                    {event.endDate && (
                      <div className="text-xs opacity-75">
                        to {formatDateTime(event.endDate, event.endTime, event.timezone)}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <Badge variant={STATUS_COLORS[event.status]} asSpan>
                      {STATUS_LABELS[event.status]}
                    </Badge>
                  </td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">
                    {event.city}, {event.state}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView(event)}
                        title="View event details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(event)}
                        title="Edit event"
                      >
                        <EditIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(event)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Delete event"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {events.map((event) => (
          <div
            key={event.id}
            className="p-4 border border-border rounded-lg bg-card space-y-3"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-mono text-xs text-muted-foreground mb-1">
                  {event.eventId}
                </div>
                <h3 className="font-medium text-foreground">{event.title}</h3>
              </div>
              <Badge variant={STATUS_COLORS[event.status]} asSpan>
                {STATUS_LABELS[event.status]}
              </Badge>
            </div>

            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="font-medium">Venue:</span>
                <span>{event.venueName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Location:</span>
                <span>{event.city}, {event.state}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Start:</span>
                <span>{formatDateTime(event.startDate, event.startTime, event.timezone)}</span>
              </div>
              {event.endDate && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">End:</span>
                  <span>{formatDateTime(event.endDate, event.endTime, event.timezone)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onView(event)}
                className="flex-1"
              >
                <EyeIcon className="h-4 w-4 mr-1" />
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(event)}
                className="flex-1"
              >
                <EditIcon className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(event)}
                className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <TrashIcon className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
