'use client';

import { useState } from 'react';
import { DataTable, type ColumnDef } from '@/components/common/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  CalendarIcon,
  ClockIcon,
  EyeIcon,
  MapPinIcon,
  SpinnerIcon,
} from '@/components/ui/icons';
import { format } from 'date-fns';
import type { RateType } from '@prisma/client';
import { RATE_TYPE_LABELS } from '@/lib/schemas/call-time.schema';
import { useTerminology } from '@/lib/hooks/use-terminology';
import { SessionHistoryModal } from './session-history-modal';

export interface ShiftSession {
  id: string;
  clockIn: Date | string;
  clockOut: Date | string | null;
}

export interface TalentInvitationData {
  id: string;
  status: string;
  isConfirmed: boolean;
  declineReason?: string | null;
  shiftSessions?: ShiftSession[];
  callTime: {
    id: string;
    callTimeId: string;
    service: { title: string } | null;
    startDate: Date | string | null;
    startTime: string | null;
    endDate: Date | string | null;
    endTime: string | null;
    payRate: number | string | { toNumber?: () => number };
    payRateType: RateType;
    event: {
      id: string;
      eventId: string;
      title: string;
      venueName: string | null;
      city: string | null;
      state: string | null;
    };
  };
}

export type TalentTableCategory = 'inProgress' | 'upcoming' | 'past' | 'declined';

interface TalentAssignmentTableProps {
  data: TalentInvitationData[];
  category: TalentTableCategory;
  onViewDetails: (invitation: TalentInvitationData) => void;
  onStart?: (invitationId: string) => void;
  onEnd?: (invitationId: string) => void;
  pendingActionId?: string;
  emptyMessage?: string;
  emptyDescription?: string;
}

function formatTime(time: string | null): string {
  if (!time) return '—';
  const parts = time.split(':');
  if (parts.length < 2) return '—';
  const hours = parts[0] || '0';
  const minutes = parts[1] || '00';
  const hour = parseInt(hours, 10);
  if (isNaN(hour)) return '—';
  const ampm = hour >= 12 ? 'pm' : 'am';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes}${ampm}`;
}

function formatDateShort(date: Date | string | null): string {
  if (!date) return 'UBD';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (d.getFullYear() === 1970) return 'UBD';
  return format(d, 'EEE, MMM d');
}

function getPayRateValue(payRate: TalentInvitationData['callTime']['payRate']): number {
  if (typeof payRate === 'number') return payRate;
  if (typeof payRate === 'string') return parseFloat(payRate);
  if (payRate && typeof payRate === 'object' && 'toNumber' in payRate && payRate.toNumber) {
    return payRate.toNumber();
  }
  return 0;
}

function hasOpenSession(sessions: ShiftSession[] | undefined): boolean {
  if (!sessions || sessions.length === 0) return false;
  return sessions.some((s) => !s.clockOut);
}

function formatActualInstant(value: Date | string | null | undefined): string {
  if (!value) return '-';
  return format(new Date(value), 'h:mma').toLowerCase();
}

function getFirstInLastOut(sessions: ShiftSession[] | undefined): {
  firstIn: Date | string | null;
  lastOut: Date | string | null;
} {
  if (!sessions || sessions.length === 0) {
    return { firstIn: null, lastOut: null };
  }
  // Sessions arrive sorted by clockIn ASC from the server.
  const firstIn = sessions[0]?.clockIn ?? null;
  const lastSession = sessions[sessions.length - 1];
  const lastOut = lastSession?.clockOut ?? null;
  return { firstIn, lastOut };
}

function getStatusBadge(item: TalentInvitationData, category: TalentTableCategory) {
  if (category === 'inProgress') {
    const isOpen = hasOpenSession(item.shiftSessions);
    return (
      <Badge
        variant="default"
        className="bg-orange-500 hover:bg-orange-500 text-white"
      >
        {isOpen ? 'Active' : 'In Progress'}
      </Badge>
    );
  }
  if (category === 'upcoming') {
    return <Badge variant="success">Confirmed</Badge>;
  }
  if (category === 'past') {
    return <Badge variant="outline">Completed</Badge>;
  }
  return <Badge variant="destructive">Declined</Badge>;
}

export function TalentAssignmentTable({
  data,
  category,
  onViewDetails,
  onStart,
  onEnd,
  pendingActionId,
  emptyMessage,
  emptyDescription,
}: TalentAssignmentTableProps) {
  const { terminology } = useTerminology();
  const showShiftActions = category === 'inProgress' && !!onStart && !!onEnd;
  const [sessionHistoryFor, setSessionHistoryFor] = useState<TalentInvitationData | null>(null);

  const columns: ColumnDef<TalentInvitationData>[] = [
    {
      key: 'actions',
      label: 'Actions',
      headerClassName: 'text-left py-3 px-2',
      className: 'py-4 px-2',
      render: (item) => {
        const isProcessing = pendingActionId === item.id;
        const isOpen = hasOpenSession(item.shiftSessions);

        return (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onViewDetails(item)}
              title="View Details"
            >
              <EyeIcon className="h-4 w-4" />
              <span className="sr-only">View Details</span>
            </Button>
            {showShiftActions && (
              <>
                <Button
                  type="button"
                  size="sm"
                  className="h-8"
                  disabled={isOpen || isProcessing}
                  onClick={() => onStart?.(item.id)}
                >
                  {isProcessing && !isOpen ? (
                    <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    'Start'
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8"
                  disabled={!isOpen || isProcessing}
                  onClick={() => onEnd?.(item.id)}
                >
                  {isProcessing && isOpen ? (
                    <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    'End'
                  )}
                </Button>
              </>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (item) => getStatusBadge(item, category),
    },
    {
      key: 'startDate',
      label: 'Date',
      render: (item) => (
        <span className="font-medium text-foreground">
          {formatDateShort(item.callTime.startDate)}
        </span>
      ),
    },
    {
      key: 'time',
      label: 'Time',
      render: (item) => {
        if (category === 'past') {
          const sessions = item.shiftSessions ?? [];
          const { firstIn, lastOut } = getFirstInLastOut(sessions);
          return (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                {formatActualInstant(firstIn)} - {formatActualInstant(lastOut)}
              </span>
              {sessions.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setSessionHistoryFor(item)}
                >
                  View ({sessions.length})
                </Button>
              )}
            </div>
          );
        }
        return (
          <span className="text-muted-foreground">
            {formatTime(item.callTime.startTime)} - {formatTime(item.callTime.endTime)}
          </span>
        );
      },
    },
    {
      key: 'event',
      label: terminology.event.singular,
      render: (item) => (
        <div>
          <p className="font-medium text-foreground">{item.callTime.event.title}</p>
          <p className="text-sm text-muted-foreground">{item.callTime.event.eventId}</p>
        </div>
      ),
    },
    {
      key: 'service',
      label: 'Service',
      render: (item) => (
        <span className="text-foreground">
          {item.callTime.service?.title || 'No Service'}
        </span>
      ),
    },
    {
      key: 'location',
      label: 'Location',
      render: (item) => (
        <div className="text-sm">
          <p className="text-foreground">{item.callTime.event.venueName || '-'}</p>
          {(item.callTime.event.city || item.callTime.event.state) && (
            <p className="text-muted-foreground">
              {[item.callTime.event.city, item.callTime.event.state]
                .filter(Boolean)
                .join(', ')}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'payRate',
      label: 'Pay Rate',
      render: (item) => {
        const rate = getPayRateValue(item.callTime.payRate);
        return (
          <span className="text-foreground">
            ${rate.toFixed(2)}{' '}
            <span className="text-muted-foreground text-xs">
              {RATE_TYPE_LABELS[item.callTime.payRateType].toLowerCase()}
            </span>
          </span>
        );
      },
    },
  ];

  const tableId = `talent-assignments-${category}`;

  return (
    <>
      <DataTable
        tableId={tableId}
        data={data}
        columns={columns}
        getRowKey={(item) => item.id}
        emptyMessage={emptyMessage ?? 'No assignments found'}
        emptyDescription={emptyDescription ?? 'Nothing here yet.'}
        minWidth="1000px"
        mobileCard={(item) => (
          <TalentAssignmentMobileCard
            invitation={item}
            category={category}
            onViewDetails={() => onViewDetails(item)}
            onStart={showShiftActions ? () => onStart?.(item.id) : undefined}
            onEnd={showShiftActions ? () => onEnd?.(item.id) : undefined}
            isProcessing={pendingActionId === item.id}
            onViewSessions={
              category === 'past' ? () => setSessionHistoryFor(item) : undefined
            }
          />
        )}
      />
      <SessionHistoryModal
        open={sessionHistoryFor !== null}
        onClose={() => setSessionHistoryFor(null)}
        sessions={sessionHistoryFor?.shiftSessions ?? []}
      />
    </>
  );
}

interface TalentAssignmentMobileCardProps {
  invitation: TalentInvitationData;
  category: TalentTableCategory;
  onViewDetails: () => void;
  onStart?: () => void;
  onEnd?: () => void;
  isProcessing?: boolean;
  onViewSessions?: () => void;
}

function TalentAssignmentMobileCard({
  invitation,
  category,
  onViewDetails,
  onStart,
  onEnd,
  isProcessing,
  onViewSessions,
}: TalentAssignmentMobileCardProps) {
  const isOpen = hasOpenSession(invitation.shiftSessions);
  const rate = getPayRateValue(invitation.callTime.payRate);
  const sessions = invitation.shiftSessions ?? [];
  const showActualTime = category === 'past';
  const { firstIn, lastOut } = getFirstInLastOut(sessions);

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        {getStatusBadge(invitation, category)}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onViewDetails}
          title="View Details"
        >
          <EyeIcon className="h-4 w-4" />
        </Button>
      </div>

      <h3 className="font-semibold text-foreground mb-1">
        {invitation.callTime.service?.title || 'No Service'}
      </h3>
      <p className="text-sm text-muted-foreground mb-2">
        {invitation.callTime.event.title}
      </p>

      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 flex-wrap">
        <CalendarIcon className="h-4 w-4" />
        <span>
          {formatDateShort(invitation.callTime.startDate)} &middot;{' '}
          <ClockIcon className="inline h-3.5 w-3.5" />{' '}
          {showActualTime
            ? `${formatActualInstant(firstIn)} - ${formatActualInstant(lastOut)}`
            : `${formatTime(invitation.callTime.startTime)} - ${formatTime(invitation.callTime.endTime)}`}
        </span>
        {showActualTime && sessions.length > 1 && onViewSessions && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={onViewSessions}
          >
            View ({sessions.length})
          </Button>
        )}
      </div>

      {(invitation.callTime.event.venueName || invitation.callTime.event.city) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <MapPinIcon className="h-4 w-4" />
          <span>
            {invitation.callTime.event.venueName}
            {invitation.callTime.event.city && `, ${invitation.callTime.event.city}`}
            {invitation.callTime.event.state && `, ${invitation.callTime.event.state}`}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <span className="text-sm font-medium text-foreground">
          ${rate.toFixed(2)}{' '}
          <span className="text-muted-foreground text-xs">
            {RATE_TYPE_LABELS[invitation.callTime.payRateType].toLowerCase()}
          </span>
        </span>
        {onStart && onEnd && (
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={isOpen || isProcessing}
              onClick={onStart}
            >
              {isProcessing && !isOpen ? (
                <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
              ) : (
                'Start'
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!isOpen || isProcessing}
              onClick={onEnd}
            >
              {isProcessing && isOpen ? (
                <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
              ) : (
                'End'
              )}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
