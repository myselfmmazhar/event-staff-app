'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { EditIcon, ArchiveBoxIcon, UsersIcon, ChevronDownIcon, ChevronUpIcon } from '@/components/ui/icons';
import { CallTimeInvitationStatus, EventStatus } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { DataTable, ColumnDef } from '@/components/common/data-table';
import { useTerminology } from '@/lib/hooks/use-terminology';
import { useColumnLabels } from '@/lib/hooks/use-column-labels';
import { EVENT_STATUS_COLORS, EVENT_STATUS_LABELS } from '@/lib/constants';
import { formatDateTime, isDateNullOrUBD } from '@/lib/utils/date-formatter';

interface Event {
  id: string;
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

interface EventTableProps {
  events: Event[];
  isLoading: boolean;
  sortBy?: SortableField;
  sortOrder?: 'asc' | 'desc';
  onEdit: (event: Event) => void;
  onArchive: (event: Event) => void;
  onSort: (field: SortableField) => void;
  // Optional selection props
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

export function EventTable({
  events,
  isLoading,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  onEdit,
  onArchive,
  onSort,
  selectedIds,
  onSelectionChange,
}: EventTableProps) {
  const router = useRouter();
  const { terminology } = useTerminology();

  // Track which rows have expanded assignment columns
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpanded = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  // Get column labels from saved configuration
  const columnLabels = useColumnLabels('events', {
    actions: 'Actions',
    status: 'Status',
    startDate: 'Date',
    title: 'Title',
    client: 'Client',
    venue: 'Venue',
    openAssignments: 'Open Assignments',
    closedAssignments: 'Accepted Assignments',
    progress: 'Progress',
  });

  const getAssignmentSummary = (event: Event) => {
    const callTimes = event.callTimes ?? [];

    const groups = new Map<
      string,
      { serviceId: string | null; serviceName: string; required: number; accepted: number }
    >();

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

      const serviceId = callTime.service?.id ?? null;
      const key = serviceId ?? callTime.service?.title ?? callTime.id;
      const existing = groups.get(key);
      if (existing) {
        existing.required += required;
        existing.accepted += accepted;
      } else {
        groups.set(key, {
          serviceId,
          serviceName: callTime.service?.title ?? 'Unknown',
          required,
          accepted,
        });
      }
    }

    const allGroups = Array.from(groups.values())
      .sort((a, b) => b.required - a.required || a.serviceName.localeCompare(b.serviceName));

    // Open assignments = accepted < required (needs more staff)
    const openAssignments = allGroups.filter((g) => g.accepted < g.required);
    // Closed assignments = accepted >= required (fully staffed)
    const closedAssignments = allGroups.filter((g) => g.accepted >= g.required);

    const lines = allGroups.map((g) => `${g.required} ${g.serviceName}: ${g.accepted}/${g.required} Accepted`);

    return { lines, openAssignments, closedAssignments, totalRequired, totalAccepted, totalConfirmed };
  };

  // Selection handlers
  const allSelected = selectedIds && events.length > 0 && events.every((e) => selectedIds.has(e.id));
  const someSelected = selectedIds && events.some((e) => selectedIds.has(e.id));

  const toggleAll = () => {
    if (!onSelectionChange || !selectedIds) return;
    if (allSelected) {
      // Deselect all on current page
      const newSet = new Set(selectedIds);
      events.forEach((e) => newSet.delete(e.id));
      onSelectionChange(newSet);
    } else {
      // Select all on current page
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

  const columns: ColumnDef<Event>[] = [
    // Selection column (only if selection is enabled)
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
      headerClassName: 'w-12 py-3 px-4',
      className: 'w-12 py-4 px-4',
      render: (event: Event) => (
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
      className: 'py-4 px-4',
      headerClassName: 'text-left py-3 px-4',
      render: (event) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="px-0"
            onClick={() => onEdit(event)}
            title={`Edit ${terminology.event.lower}`}
          >
            <EditIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="px-0"
            onClick={() => router.push(`/assignments?eventId=${event.id}`)}
            title="Manage Assignments"
          >
            <UsersIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="px-0"
            onClick={() => onArchive(event)}
            title={`Archive ${terminology.event.lower}`}
          >
            <ArchiveBoxIcon className="h-4 w-4" />
          </Button>
        </div>
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
      className: 'py-4 px-4 text-sm text-muted-foreground whitespace-nowrap',
      render: (event) => (
        <div>
          <div>{formatDateTime(event.startDate, event.startTime)}</div>
          {!isDateNullOrUBD(event.endDate) && (
            <div className="text-xs opacity-75">
              to {formatDateTime(event.endDate, event.endTime)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'title',
      label: columnLabels.title,
      sortable: true,
      className: 'py-4 px-4',
      render: (event) => (
        <div className="font-medium text-foreground">
          {event.title}
        </div>
      ),
    },
    {
      key: 'client',
      label: columnLabels.client,
      className: 'py-4 px-4 text-sm text-muted-foreground',
      render: (event) => event.client?.businessName || (
        <span className="text-muted-foreground/50 italic">Not applicable</span>
      ),
    },
    {
      key: 'venueName',
      label: columnLabels.venue,
      sortable: true,
      className: 'py-4 px-4 text-sm text-muted-foreground',
      render: (event) => (
        <div>
          <div>{event.venueName}</div>
          <div className="text-xs opacity-75">
            {event.city}, {event.state}
          </div>
        </div>
      ),
    },
    {
      key: 'openAssignments',
      label: columnLabels.openAssignments,
      className: 'py-4 px-4 text-sm text-muted-foreground',
      render: (event) => {
        const { openAssignments } = getAssignmentSummary(event);
        if (openAssignments.length === 0) {
          return <span className="text-muted-foreground/50 italic">—</span>;
        }

        const isExpanded = expandedRows.has(event.id);
        const visible = isExpanded ? openAssignments : openAssignments.slice(0, 3);
        const remaining = openAssignments.length - 3;
        const hasMore = remaining > 0;

        return (
          <div className="space-y-0.5">
            {visible.map((item, idx) => {
              const line = `${item.required} ${item.serviceName}: ${item.accepted}/${item.required}`;
              const url = item.serviceId
                ? `/assignments?eventId=${event.id}&serviceId=${item.serviceId}`
                : `/assignments?eventId=${event.id}`;
              return (
                <div
                  key={idx}
                  className="truncate cursor-pointer hover:text-primary transition-colors"
                  title={`${line} - Click to view`}
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(url);
                  }}
                >
                  {line}
                </div>
              );
            })}
            {hasMore && (
              <button
                type="button"
                className="flex items-center gap-1 text-xs opacity-75 hover:opacity-100 hover:text-primary transition-all cursor-pointer"
                onClick={(e) => toggleRowExpanded(event.id, e)}
              >
                {isExpanded ? (
                  <>
                    <ChevronUpIcon className="h-3 w-3" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDownIcon className="h-3 w-3" />
                    +{remaining} more
                  </>
                )}
              </button>
            )}
          </div>
        );
      },
    },
    {
      key: 'closedAssignments',
      label: columnLabels.closedAssignments,
      className: 'py-4 px-4 text-sm text-muted-foreground',
      render: (event) => {
        const { closedAssignments } = getAssignmentSummary(event);
        if (closedAssignments.length === 0) {
          return <span className="text-muted-foreground/50 italic">—</span>;
        }

        const isExpanded = expandedRows.has(event.id);
        const visible = isExpanded ? closedAssignments : closedAssignments.slice(0, 3);
        const remaining = closedAssignments.length - 3;
        const hasMore = remaining > 0;

        return (
          <div className="space-y-0.5">
            {visible.map((item, idx) => {
              const line = `${item.required} ${item.serviceName}: ${item.accepted}/${item.required}`;
              const url = item.serviceId
                ? `/assignments?eventId=${event.id}&serviceId=${item.serviceId}`
                : `/assignments?eventId=${event.id}`;
              return (
                <div
                  key={idx}
                  className="truncate cursor-pointer hover:text-primary transition-colors"
                  title={`${line} - Click to view`}
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(url);
                  }}
                >
                  {line}
                </div>
              );
            })}
            {hasMore && (
              <button
                type="button"
                className="flex items-center gap-1 text-xs opacity-75 hover:opacity-100 hover:text-primary transition-all cursor-pointer"
                onClick={(e) => toggleRowExpanded(event.id, e)}
              >
                {isExpanded ? (
                  <>
                    <ChevronUpIcon className="h-3 w-3" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDownIcon className="h-3 w-3" />
                    +{remaining} more
                  </>
                )}
              </button>
            )}
          </div>
        );
      },
    },
    {
      key: 'progress',
      label: columnLabels.progress,
      className: 'py-4 px-4 whitespace-nowrap',
      render: (event) => {
        const { totalRequired, totalAccepted, totalConfirmed } = getAssignmentSummary(event);

        if (totalRequired === 0) {
          return <span className="text-muted-foreground/50 italic">—</span>;
        }

        const summary = `${totalAccepted} of ${totalRequired} Assignments`;
        const statusLabel =
          totalAccepted === 0 ? `Needs ${terminology.staff.lower}` : totalConfirmed >= totalRequired ? 'Filled' : 'Accepted';
        const statusVariant: 'warning' | 'success' | 'info' =
          totalAccepted === 0 ? 'warning' : totalConfirmed >= totalRequired ? 'success' : 'info';

        return (
          <div
            className="space-y-1 cursor-pointer hover:text-primary transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              router.push('/assignments');
            }}
            title="View in Assignment Manager"
          >
            <div className="text-sm text-muted-foreground">{summary}</div>
            <Badge variant={statusVariant} size="sm" asSpan>
              {statusLabel}
            </Badge>
          </div>
        );
      },
    },
  ];

  const renderMobileCard = (event: Event) => (
    <div
      key={event.id}
      className="bg-card rounded-lg border border-border p-4 space-y-3"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-foreground">{event.title}</h3>
        </div>
        <Badge variant={EVENT_STATUS_COLORS[event.status]} asSpan>
          {EVENT_STATUS_LABELS[event.status]}
        </Badge>
      </div>

      <div className="space-y-1 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="font-medium">Date:</span>
          <span>{formatDateTime(event.startDate, event.startTime)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">Client:</span>
          <span>{event.client?.businessName || <span className="italic opacity-50">Not applicable</span>}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">Venue:</span>
          <span>{event.venueName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">Progress:</span>
          {(() => {
            const { totalRequired, totalAccepted, totalConfirmed } = getAssignmentSummary(event);
            if (totalRequired === 0) return <span className="italic opacity-50">—</span>;
            const label = `${totalAccepted}/${totalRequired} Accepted`;
            const status = totalAccepted === 0 ? 'Needs staff' : totalConfirmed >= totalRequired ? 'Filled' : 'Accepted';
            return (
              <span className="truncate" title={`${label} • ${status}`}>
                {label} • {status}
              </span>
            );
          })()}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/events/${event.id}/call-times`)}
          className="flex-1"
        >
          <UsersIcon className="h-4 w-4 mr-1" />
          Staff
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
          onClick={() => onArchive(event)}
          className="px-3"
        >
          <ArchiveBoxIcon className="h-4 w-4" />
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
      emptyMessage={`No ${terminology.event.lowerPlural} found`}
      emptyDescription="Try adjusting your search or filters"
      mobileCard={renderMobileCard}
      getRowKey={(event) => event.id}
    />
  );
}
