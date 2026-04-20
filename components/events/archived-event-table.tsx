'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { EyeIcon, RefreshCwIcon, TrashIcon } from '@/components/ui/icons';
import { CallTimeInvitationStatus, EventStatus } from '@prisma/client';
import { DataTable, ColumnDef } from '@/components/common/data-table';
import { useTerminology } from '@/lib/hooks/use-terminology';
import { useColumnLabels } from '@/lib/hooks/use-column-labels';
import { ActionDropdown, type ActionItem } from '@/components/common/action-dropdown';
import { EVENT_STATUS_COLORS, EVENT_STATUS_LABELS } from '@/lib/constants';
import { formatDateTime } from '@/lib/utils/date-formatter';
import { format } from 'date-fns';

interface ArchivedEvent {
  id: string;
  eventId: string;
  title: string;
  venueName: string;
  city: string;
  state: string;
  startDate: Date | null;
  startTime?: string | null;
  endDate: Date | null;
  endTime?: string | null;
  timezone: string;
  status: EventStatus;
  createdAt: Date;
  archivedAt?: Date | null;
  client?: {
    id: string;
    businessName: string;
  } | null;
  callTimes?: Array<{
    id: string;
    numberOfStaffRequired: number;
    service: { id: string; title: string } | null;
    invitations: Array<{
      id: string;
      status: CallTimeInvitationStatus;
      isConfirmed: boolean;
    }>;
  }>;
}

type SortableField = 'createdAt' | 'updatedAt' | 'title' | 'eventId' | 'startDate' | 'endDate' | 'status' | 'venueName';

interface ArchivedEventTableProps {
  events: ArchivedEvent[];
  isLoading: boolean;
  sortBy?: SortableField;
  sortOrder?: 'asc' | 'desc';
  onView: (event: ArchivedEvent) => void;
  onRestore: (event: ArchivedEvent) => void;
  onDelete: (event: ArchivedEvent) => void;
  onSort: (field: SortableField) => void;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

export function ArchivedEventTable({
  events,
  isLoading,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  onView,
  onRestore,
  onDelete,
  onSort,
  selectedIds,
  onSelectionChange,
}: ArchivedEventTableProps) {
  const { terminology } = useTerminology();

  const columnLabels = useColumnLabels('events', {
    actions: 'Actions',
    status: 'Status',
    startDate: 'Date',
    title: 'Title',
    client: 'Client',
    venue: 'Venue',
    assignments: 'Assignments',
    progress: 'Progress',
  });

  const getAssignmentSummary = (event: ArchivedEvent) => {
    const callTimes = event.callTimes ?? [];

    const groups = new Map<string, { serviceName: string; required: number; accepted: number }>();

    let totalRequired = 0;
    let totalAccepted = 0;
    let totalConfirmed = 0;

    for (const callTime of callTimes) {
      const required = callTime.numberOfStaffRequired ?? 0;
      const accepted = callTime.invitations.filter((inv) => inv.status === 'ACCEPTED').length;
      const confirmed = callTime.invitations.filter(
        (inv) => inv.status === 'ACCEPTED' && inv.isConfirmed
      ).length;

      totalRequired += required;
      totalAccepted += accepted;
      totalConfirmed += confirmed;

      const key = callTime.service?.id ?? callTime.service?.title ?? callTime.id;
      const existing = groups.get(key);
      if (existing) {
        existing.required += required;
        existing.accepted += accepted;
      } else {
        groups.set(key, {
          serviceName: callTime.service?.title ?? 'Unknown',
          required,
          accepted,
        });
      }
    }

    const lines = Array.from(groups.values())
      .sort((a, b) => b.required - a.required || a.serviceName.localeCompare(b.serviceName))
      .map((g) => `${g.required} ${g.serviceName}: ${g.accepted}/${g.required} Accepted`);

    return { lines, totalRequired, totalAccepted, totalConfirmed };
  };

  const allSelected = selectedIds && events.length > 0 && events.every((e) => selectedIds.has(e.id));
  const someSelected = selectedIds && events.some((e) => selectedIds.has(e.id));

  const toggleAll = () => {
    if (!onSelectionChange || !selectedIds) return;
    if (allSelected) {
      const newSet = new Set(selectedIds);
      events.forEach((e) => newSet.delete(e.id));
      onSelectionChange(newSet);
    } else {
      const newSet = new Set(selectedIds);
      events.forEach((e) => newSet.add(e.id));
      onSelectionChange(newSet);
    }
  };

  const toggleOne = (id: string) => {
    if (!onSelectionChange || !selectedIds) return;
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    onSelectionChange(newSet);
  };

  const columns: ColumnDef<ArchivedEvent>[] = [
    ...(selectedIds && onSelectionChange ? [{
      key: 'select' as const,
      label: (
        <Checkbox
          checked={allSelected}
          indeterminate={someSelected && !allSelected}
          onChange={toggleAll}
          aria-label="Select all"
        />
      ),
      headerClassName: 'w-12 py-3 px-4 text-left',
      className: 'w-12 py-4 px-4',
      render: (event: ArchivedEvent) => (
        <Checkbox
          checked={selectedIds.has(event.id)}
          onChange={() => toggleOne(event.id)}
          aria-label={`Select ${event.title}`}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        />
      ),
    }] : []),
    {
      key: 'actions',
      label: columnLabels.actions,
      headerClassName: 'text-left py-3 px-4 w-10',
      className: 'w-10 py-4 px-4',
      render: (event) => {
        const actions: ActionItem[] = [
          {
            label: `View ${terminology.event.lower} details`,
            icon: <EyeIcon className="h-3.5 w-3.5" />,
            onClick: () => onView(event),
          },
          {
            label: `Restore ${terminology.event.lower}`,
            icon: <RefreshCwIcon className="h-3.5 w-3.5" />,
            onClick: () => onRestore(event),
          },
          {
            label: `Permanently delete ${terminology.event.lower}`,
            icon: <TrashIcon className="h-3.5 w-3.5" />,
            onClick: () => onDelete(event),
            variant: 'destructive',
          },
        ];

        return <ActionDropdown actions={actions} />;
      },
    },
    {
      key: 'archivedAt',
      label: 'Archived on',
      className: 'py-4 px-4 whitespace-nowrap',
      render: (event) => (
        <span className="text-sm text-muted-foreground">
          {event.archivedAt ? format(new Date(event.archivedAt), 'MMM d, yyyy HH:mm') : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      label: columnLabels.status,
      sortable: true,
      className: 'py-4 px-4 whitespace-nowrap',
      render: (event) => (
        <Badge variant={EVENT_STATUS_COLORS[event.status]} asSpan>
          {EVENT_STATUS_LABELS[event.status]}
        </Badge>
      ),
    },
    {
      key: 'startDate',
      label: columnLabels.startDate,
      sortable: true,
      className: 'py-4 px-4 whitespace-nowrap',
      render: (event) => (
        <span className="text-sm text-foreground">
          {formatDateTime(event.startDate, event.startTime)}
        </span>
      ),
    },
    {
      key: 'title',
      label: columnLabels.title,
      sortable: true,
      className: 'py-4 px-4',
      render: (event) => (
        <div className="min-w-[220px]">
          <p className="font-medium text-foreground">{event.title}</p>
          <p className="text-xs text-muted-foreground font-mono">{event.eventId}</p>
        </div>
      ),
    },
    {
      key: 'client',
      label: columnLabels.client,
      className: 'py-4 px-4',
      render: (event) => (
        <span className="text-sm text-foreground">
          {event.client?.businessName || (
            <span className="text-muted-foreground italic">No client</span>
          )}
        </span>
      ),
    },
    {
      key: 'venueName',
      label: columnLabels.venue,
      sortable: true,
      className: 'py-4 px-4',
      render: (event) => (
        <div className="min-w-[220px]">
          <p className="text-sm font-medium text-foreground">{event.venueName}</p>
          <p className="text-xs text-muted-foreground">
            {event.city}, {event.state}
          </p>
        </div>
      ),
    },
    {
      key: 'assignments',
      label: columnLabels.assignments,
      className: 'py-4 px-4',
      render: (event) => {
        const { totalRequired, totalAccepted, totalConfirmed } = getAssignmentSummary(event);

        if (totalRequired === 0) {
          return <span className="text-xs text-muted-foreground italic">No call times</span>;
        }

        return (
          <div className="text-xs">
            <p className="text-foreground">
              {totalAccepted}/{totalRequired} Accepted
            </p>
            <p className="text-muted-foreground">
              {totalConfirmed}/{totalAccepted} Confirmed
            </p>
          </div>
        );
      },
    },
    {
      key: 'progress',
      label: columnLabels.progress,
      className: 'py-4 px-4',
      render: (event) => {
        const { totalRequired, totalAccepted } = getAssignmentSummary(event);
        if (totalRequired === 0) return <span className="text-xs text-muted-foreground">—</span>;
        const pct = Math.round((totalAccepted / totalRequired) * 100);
        return (
          <div className="min-w-[120px]">
            <div className="h-2 w-full bg-muted rounded">
              <div className="h-2 bg-primary rounded" style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{pct}%</p>
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      tableId="events-archived"
      data={events}
      columns={columns}
      isLoading={isLoading}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={(field) => onSort(field as SortableField)}
      getRowKey={(event) => event.id}
      minWidth="1200px"
      emptyMessage={`No archived ${terminology.event.lowerPlural} found`}
      emptyDescription="Try adjusting your search or filters"
    />
  );
}
