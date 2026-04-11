'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { EditIcon, ArchiveBoxIcon, UsersIcon, ChevronDownIcon, ChevronUpIcon, ChatBubbleLeftRightIcon } from '@/components/ui/icons';
import { CallTimeInvitationStatus, EventStatus } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { DataTable, ColumnDef } from '@/components/common/data-table';
import { useTerminology } from '@/lib/hooks/use-terminology';
import { useColumnLabels } from '@/lib/hooks/use-column-labels';
import { EVENT_STATUS_COLORS, EVENT_STATUS_LABELS } from '@/lib/constants';
import { formatDateTime, isDateNullOrUBD } from '@/lib/utils/date-formatter';
import { InvitationSummaryModal } from './invitation-summary-modal';
import { ActionDropdown, type ActionItem } from '@/components/common/action-dropdown';

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
      staff: {
        id: string;
        firstName: string;
        lastName: string;
      };
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
  onMessage: (event: Event) => void;
  onStatusChange?: (id: string, status: EventStatus) => void;
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
  onMessage,
  onStatusChange,
  onSort,
  selectedIds,
  onSelectionChange,
}: EventTableProps) {
  const router = useRouter();
  const { terminology } = useTerminology();

  // Track which rows have expanded assignment columns
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Track which event's invitation summary modal is open
  const [summaryEvent, setSummaryEvent] = useState<Event | null>(null);

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
    venue: 'Location',
    assignmentProgress: 'Assignment Progress',
  });

  const getAssignmentSummary = (event: Event) => {
    const callTimes = event.callTimes ?? [];

    const groups = new Map<
      string,
      { serviceId: string | null; serviceName: string; required: number; accepted: number; pending: number; open: number; invitations: typeof callTimes[0]['invitations'] }
    >();

    let totalRequired = 0;
    let totalAccepted = 0;
    let totalPending = 0;

    for (const callTime of callTimes) {
      const required = callTime.numberOfStaffRequired ?? 0;
      const accepted = callTime.invitations.filter((inv) => inv.status === 'ACCEPTED').length;
      const pending = callTime.invitations.filter((inv) => inv.status === 'PENDING').length;
      // Open = positions not yet filled (not offered or declined needing re-offer)
      const open = Math.max(0, required - accepted - pending);

      totalRequired += required;
      totalAccepted += accepted;
      totalPending += pending;

      const serviceId = callTime.service?.id ?? null;
      const key = serviceId ?? callTime.service?.title ?? callTime.id;
      const existing = groups.get(key);
      if (existing) {
        existing.required += required;
        existing.accepted += accepted;
        existing.pending += pending;
        existing.open = Math.max(0, existing.required - existing.accepted - existing.pending);
        existing.invitations = [...existing.invitations, ...callTime.invitations];
      } else {
        groups.set(key, {
          serviceId,
          serviceName: callTime.service?.title ?? 'Unknown',
          required,
          accepted,
          pending,
          open,
          invitations: [...callTime.invitations],
        });
      }
    }

    const allGroups = Array.from(groups.values())
      .sort((a, b) => b.required - a.required || a.serviceName.localeCompare(b.serviceName));

    // Calculate totals
    const totalOpen = Math.max(0, totalRequired - totalAccepted - totalPending);

    return {
      totalRequired,
      totalAccepted,
      totalPending,
      totalOpen,
      allGroups
    };
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
      headerClassName: 'text-left py-3 px-4 w-10',
      className: 'w-10 py-4 px-4',
      render: (event) => {
        const actions: ActionItem[] = [
          {
            label: `Edit ${terminology.event.lower}`,
            icon: <EditIcon className="h-3.5 w-3.5" />,
            onClick: () => onEdit(event),
          },
          {
            label: "Send Message",
            icon: <ChatBubbleLeftRightIcon className="h-3.5 w-3.5" />,
            onClick: () => onMessage(event),
          },
          {
            label: "Manage Assignments",
            icon: <UsersIcon className="h-3.5 w-3.5" />,
            onClick: () => {
              const { allGroups } = getAssignmentSummary(event);
              const serviceIds = allGroups
                .map(g => g.serviceId)
                .filter(Boolean) as string[];
              const serviceParam = serviceIds.length > 0
                ? `&serviceIds=${serviceIds.join(',')}`
                : '';
              router.push(`/assignments?eventId=${event.id}${serviceParam}`);
            },
          },
          {
            label: `Archive ${terminology.event.lower}`,
            icon: <ArchiveBoxIcon className="h-3.5 w-3.5" />,
            onClick: () => onArchive(event),
            variant: 'destructive',
          },
        ];

        return <ActionDropdown actions={actions} />;
      },
    },
    {
      key: 'status',
      label: columnLabels.status,
      sortable: true,
      className: 'py-4 px-4 whitespace-nowrap',
      render: (event) => {
        const nextStatusMap: Record<EventStatus, EventStatus> = {
          DRAFT: 'PUBLISHED',
          PUBLISHED: 'ASSIGNED',
          ASSIGNED: 'IN_PROGRESS',
          IN_PROGRESS: 'COMPLETED',
          COMPLETED: 'CANCELLED',
          CANCELLED: 'DRAFT',
        };

        return (
          <Badge
            variant={EVENT_STATUS_COLORS[event.status]}
            asSpan
            className={onStatusChange ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
            onClick={(e) => {
              if (onStatusChange) {
                e.stopPropagation();
                onStatusChange(event.id, nextStatusMap[event.status]);
              }
            }}
          >
            {EVENT_STATUS_LABELS[event.status]}
          </Badge>
        );
      },
    },
    {
      key: 'startDate',
      label: columnLabels.startDate,
      sortable: true,
      className: 'py-4 px-4 text-sm text-muted-foreground whitespace-nowrap',
      render: (event) => (
        <div>
          <div>{formatDateTime(event.startDate, event.startTime)} -</div>
          {!isDateNullOrUBD(event.endDate) && (
            <div>
              {formatDateTime(event.endDate, event.endTime)}
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
      key: 'assignmentProgress',
      label: columnLabels.assignmentProgress,
      className: 'py-4 px-4 align-top min-w-[240px]',
      render: (event) => {
        const { totalRequired, totalAccepted, totalPending, totalOpen, allGroups } = getAssignmentSummary(event);

        if (totalRequired === 0) {
          return <span className="text-muted-foreground/50 italic">—</span>;
        }

        const isExpanded = expandedRows.has(event.id);

        // Get all invitations grouped by status for expanded view
        const allInvitations = allGroups.flatMap(g => g.invitations);
        const acceptedInvitations = allInvitations.filter(inv => inv.status === 'ACCEPTED');
        const pendingInvitations = allInvitations.filter(inv => inv.status === 'PENDING');
        const declinedInvitations = allInvitations.filter(inv => inv.status === 'DECLINED');

        return (
          <div className="space-y-2">
            {/* Compressed view - always visible */}
            <div
              className="cursor-pointer hover:bg-accent/50 rounded-md p-2 -m-2 transition-colors"
              onClick={(e) => toggleRowExpanded(event.id, e)}
              title="Click for details"
            >
              {!isExpanded && (
                <div className="flex flex-col gap-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">Open:</span>
                    <Badge variant="danger" size="sm" className="w-[72px] justify-center tabular-nums">
                      {totalOpen} of {totalRequired}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">Pending:</span>
                    <Badge variant="warning" size="sm" className="w-[72px] justify-center tabular-nums">
                      {totalPending} of {totalRequired}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">Accepted:</span>
                    <Badge variant="success" size="sm" className="w-[72px] justify-center tabular-nums">
                      {totalAccepted} of {totalRequired}
                    </Badge>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-center mt-1">
                {isExpanded ? (
                  <ChevronUpIcon className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Expanded panel - full summary inline */}
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-border">
                {/* Stats header */}
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/50">
                  <Badge variant="default" size="sm">{totalRequired} Required</Badge>
                  <Badge variant="info" size="sm">{allInvitations.length} Sent</Badge>
                  {/* Declined - more subtle */}
                  {declinedInvitations.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30">
                      <span className="text-xs text-muted-foreground">{declinedInvitations.length} declined</span>
                      <div className="flex -space-x-1">
                        {declinedInvitations.slice(0, 3).map((inv) => (
                          <div key={inv.id} className="h-5 w-5 rounded-full bg-muted border border-background flex items-center justify-center text-[8px] font-medium text-muted-foreground" title={`${inv.staff.firstName} ${inv.staff.lastName}`}>
                            {inv.staff.firstName?.[0]}{inv.staff.lastName?.[0]}
                          </div>
                        ))}
                        {declinedInvitations.length > 3 && (
                          <div className="h-5 w-5 rounded-full bg-muted border border-background flex items-center justify-center text-[8px] font-medium text-muted-foreground">
                            +{declinedInvitations.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Status sections */}                  <div className="space-y-2 h-fit">
                  {/* Open Positions */}
                  <button
                    type="button"
                    className="w-full text-left group transition-all h-fit"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/assignments?eventId=${event.id}&status=open`);
                    }}
                  >
                    <div className="flex items-center gap-3 p-2.5 rounded-lg border border-destructive/40 bg-gradient-to-r from-destructive/10 to-transparent hover:from-destructive/20 transition-all shadow-sm group-hover:shadow transition-all">
                      <div className="h-9 w-9 rounded-full bg-destructive/20 flex items-center justify-center shrink-0 border border-destructive/30">
                        <span className="text-destructive font-bold text-base">{totalOpen}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-destructive group-hover:text-destructive/80 transition-colors">Open Positions</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Needs staffing</p>
                      </div>
                      <ChevronDownIcon className="h-4 w-4 text-muted-foreground -rotate-90 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>

                  {/* Pending */}
                  <button
                    type="button"
                    className="w-full text-left group transition-all h-fit"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/assignments?eventId=${event.id}&status=pending`);
                    }}
                  >
                    <div className="p-2.5 rounded-lg border border-warning/40 bg-gradient-to-r from-warning/10 to-transparent hover:from-warning/20 transition-all shadow-sm group-hover:shadow transition-all">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-warning/20 flex items-center justify-center shrink-0 border border-warning/30">
                          <span className="text-warning font-bold text-base">{totalPending}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-warning group-hover:text-warning/80 transition-colors">Pending Response</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Awaiting confirmation</p>
                        </div>
                        <ChevronDownIcon className="h-4 w-4 text-muted-foreground -rotate-90 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      {pendingInvitations.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2 pl-[48px]">
                          {pendingInvitations.slice(0, 5).map((inv) => (
                            <div key={inv.id} className="h-5 w-5 rounded-full bg-warning/20 border border-warning/30 flex items-center justify-center text-[8px] font-medium" title={`${inv.staff.firstName} ${inv.staff.lastName}`}>
                              {inv.staff.firstName?.[0]}{inv.staff.lastName?.[0]}
                            </div>
                          ))}
                          {pendingInvitations.length > 5 && (
                            <div className="h-5 px-1.5 rounded-full bg-warning/10 flex items-center justify-center text-[9px] text-warning font-medium">
                              +{pendingInvitations.length - 5}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Accepted */}
                  <button
                    type="button"
                    className="w-full text-left group transition-all h-fit"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/assignments?eventId=${event.id}&status=accepted`);
                    }}
                  >
                    <div className="p-2.5 rounded-lg border border-success/40 bg-gradient-to-r from-success/10 to-transparent hover:from-success/20 transition-all shadow-sm group-hover:shadow transition-all">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-success/20 flex items-center justify-center shrink-0 border border-success/30">
                          <span className="text-success font-bold text-base">{totalAccepted}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-success group-hover:text-success/80 transition-colors">Accepted</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                            {acceptedInvitations.filter(i => i.isConfirmed).length} confirmed
                          </p>
                        </div>
                        <ChevronDownIcon className="h-4 w-4 text-muted-foreground -rotate-90 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      {acceptedInvitations.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2 pl-[48px]">
                          {acceptedInvitations.slice(0, 5).map((inv) => (
                            <div
                              key={inv.id}
                              className={`h-5 w-5 rounded-full flex items-center justify-center text-[8px] font-medium ${inv.isConfirmed
                                ? 'bg-success/30 border-2 border-success'
                                : 'bg-success/20 border border-success/30'
                                }`}
                              title={`${inv.staff.firstName} ${inv.staff.lastName}${inv.isConfirmed ? ' (Confirmed)' : ''}`}
                            >
                              {inv.staff.firstName?.[0]}{inv.staff.lastName?.[0]}
                            </div>
                          ))}
                          {acceptedInvitations.length > 5 && (
                            <div className="h-5 px-1.5 rounded-full bg-success/10 flex items-center justify-center text-[9px] text-success font-medium">
                              +{acceptedInvitations.length - 5}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                </div>

              </div>
            )}


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
        {(() => {
          const { totalRequired, totalAccepted, totalPending, totalOpen } = getAssignmentSummary(event);
          if (totalRequired === 0) return null;
          return (
            <div className="space-y-1">
              {/* <div className="flex items-center justify-between text-xs">
                <span>Open:</span>
                <Badge variant={totalOpen > 0 ? 'danger' : 'secondary'} size="sm" className="min-w-[4rem] justify-center tabular-nums">{totalOpen} of {totalRequired}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>Pending:</span>
                <Badge variant={totalPending > 0 ? 'warning' : 'secondary'} size="sm" className="min-w-[4rem] justify-center tabular-nums">{totalPending} of {totalRequired}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>Accepted:</span>
                <Badge variant={totalAccepted > 0 ? 'success' : 'secondary'} size="sm" className="min-w-[4rem] justify-center tabular-nums">{totalAccepted} of {totalRequired}</Badge>
              </div> */}
              <div className="flex flex-col gap-1 text-sm min-w-[160px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground shrink-0 text-xs">Open:</span>
                  <Badge
                    variant="danger"
                    size="sm"
                    className="w-[72px] justify-center tabular-nums whitespace-nowrap shrink-0"
                  >
                    {totalOpen} of {totalRequired}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground shrink-0 text-xs">Pending:</span>
                  <Badge
                    variant="warning"
                    size="sm"
                    className="w-[72px] justify-center tabular-nums whitespace-nowrap shrink-0"
                  >
                    {totalPending} of {totalRequired}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground shrink-0 text-xs">Accepted:</span>
                  <Badge
                    variant="success"
                    size="sm"
                    className="w-[72px] justify-center tabular-nums whitespace-nowrap shrink-0"
                  >
                    {totalAccepted} of {totalRequired}
                  </Badge>
                </div>
              </div>
            </div>
          );
        })()}
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
          onClick={() => onMessage(event)}
          className="flex-1"
        >
          <ChatBubbleLeftRightIcon className="h-4 w-4 mr-1" />
          Message
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

  // Build service groups for the summary modal
  const summaryServiceGroups = summaryEvent ? getAssignmentSummary(summaryEvent).allGroups.map((g) => ({
    serviceName: g.serviceName,
    required: g.required,
    invitations: g.invitations,
  })) : [];

  return (
    <>
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

      {/* Invitation Summary Modal */}
      <InvitationSummaryModal
        open={!!summaryEvent}
        onClose={() => setSummaryEvent(null)}
        eventTitle={summaryEvent?.title ?? ''}
        serviceGroups={summaryServiceGroups}
      />
    </>
  );
}
