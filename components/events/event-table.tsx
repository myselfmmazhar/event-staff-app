'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EyeIcon, EditIcon, TrashIcon } from '@/components/ui/icons';
import { EventStatus } from '@prisma/client';
import { format } from 'date-fns';
import { DataTable, ColumnDef } from '@/components/common/data-table';

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
  client?: {
    id: string;
    businessName: string;
  } | null;
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
  const formatDateTime = (date: Date, time?: string | null, timezone?: string) => {
    const dateStr = format(new Date(date), 'MMM d, yyyy');
    if (!time || time === 'TBD') {
      return `${dateStr} - TBD`;
    }
    return `${dateStr} ${time}`;
  };

  const columns: ColumnDef<Event>[] = [
    {
      key: 'eventId',
      label: 'Event ID',
      sortable: true,
      className: 'py-4 px-4',
      render: (event) => (
        <span className="font-mono text-sm text-muted-foreground">
          {event.eventId}
        </span>
      ),
    },
    {
      key: 'title',
      label: 'Title',
      sortable: true,
      className: 'py-4 px-4',
      render: (event) => (
        <div className="font-medium text-foreground">
          {event.title}
        </div>
      ),
    },
    {
      key: 'venueName',
      label: 'Venue',
      sortable: true,
      className: 'py-4 px-4 text-sm text-muted-foreground',
      render: (event) => event.venueName,
    },
    {
      key: 'startDate',
      label: 'Start Date',
      sortable: true,
      className: 'py-4 px-4 text-sm text-muted-foreground',
      render: (event) => (
        <div>
          <div>{formatDateTime(event.startDate, event.startTime, event.timezone)}</div>
          {event.endDate && (
            <div className="text-xs opacity-75">
              to {formatDateTime(event.endDate, event.endTime, event.timezone)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      className: 'py-4 px-4',
      render: (event) => (
        <Badge variant={STATUS_COLORS[event.status]} asSpan>
          {STATUS_LABELS[event.status]}
        </Badge>
      ),
    },
    {
      key: 'client',
      label: 'Client',
      className: 'py-4 px-4 text-sm text-muted-foreground',
      render: (event) => event.client?.businessName || (
        <span className="text-muted-foreground/50 italic">Not applicable</span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'py-4 px-4',
      headerClassName: 'text-right py-3 px-4',
      render: (event) => (
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
      ),
    },
  ];

  const renderMobileCard = (event: Event) => (
    <div
      key={event.id}
      className="bg-card rounded-lg border border-border p-4 space-y-3"
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
          <span className="font-medium">Client:</span>
          <span>{event.client?.businessName || <span className="italic opacity-50">Not applicable</span>}</span>
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
          className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
        >
          <TrashIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <DataTable
      data={events}
      columns={columns}
      isLoading={isLoading}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={(field) => onSort(field as SortableField)}
      emptyMessage="No events found"
      emptyDescription="Try adjusting your search or filters"
      mobileCard={renderMobileCard}
      getRowKey={(event) => event.id}
    />
  );
}
