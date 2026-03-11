'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { InvitationResponseForm } from './invitation-response-form';
import { RATE_TYPE_LABELS } from '@/lib/schemas/call-time.schema';
import { RateType } from '@prisma/client';
import { CalendarIcon, MapPinIcon, ClockIcon, DollarSignIcon, CheckCircleIcon, XCircleIcon, XIcon } from '@/components/ui/icons';
import { useEventTerm } from '@/lib/hooks/use-terminology';
import { ConfirmModal } from '@/components/common/confirm-modal';
import { cn } from '@/lib/utils';

interface Invitation {
  id: string;
  status: string;
  callTime: {
    id: string;
    callTimeId: string;
    service: { title: string } | null;
    startDate: Date | null;
    startTime: string | null;
    endDate: Date | null;
    endTime: string | null;
    payRate: number | { toNumber: () => number };
    payRateType: RateType;
    event: {
      id: string;
      eventId: string;
      title: string;
      venueName: string;
      city: string;
      state: string;
    };
  };
}

interface PendingRequestsListProps {
  invitations: Invitation[];
  onRespond: (invitationId: string, accept: boolean, declineReason?: string) => void;
  onBatchRespond?: (invitationIds: string[], accept: boolean) => void;
  isResponding?: string;
  isBatchResponding?: boolean;
}

export function PendingRequestsList({
  invitations,
  onRespond,
  onBatchRespond,
  isResponding,
  isBatchResponding,
}: PendingRequestsListProps) {
  const eventTerm = useEventTerm();
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingAction, setPendingAction] = useState<{ ids: string[], accept: boolean } | null>(null);

  const formatDate = (date: Date | null) => {
    if (!date) return 'UBD';
    const d = new Date(date);
    // Check for epoch date (superjson bug workaround for null dates)
    if (d.getFullYear() === 1970) return 'UBD';
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (time: string | null) => {
    if (!time) return 'TBD';
    const [hoursPart, minutesPart] = time.split(':');
    const hours = hoursPart ?? '0';
    const minutes = minutesPart ?? '00';
    const hour = Number.parseInt(hours, 10);
    const normalizedHour = Number.isNaN(hour) ? 0 : hour;
    return `${normalizedHour > 12 ? normalizedHour - 12 : normalizedHour}:${minutes} ${normalizedHour >= 12 ? 'PM' : 'AM'}`;
  };

  const handleSelectOne = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(invitations.map(inv => inv.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleConfirmAction = () => {
    if (!pendingAction) return;

    const firstId = pendingAction.ids[0];
    if (pendingAction.ids.length === 1 && firstId) {
      onRespond(firstId, pendingAction.accept);
    } else {
      onBatchRespond?.(pendingAction.ids, pendingAction.accept);
      setSelectedIds(new Set());
    }
    setPendingAction(null);
  };

  if (invitations.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
        <h3 className="text-lg font-medium mb-2">No pending requests</h3>
        <p className="text-muted-foreground">
          You don't have any pending {eventTerm.lower} invitations at the moment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Batch Actions Bar */}
      {selectedIds.size > 0 && (
        <Card className="p-3 bg-primary/5 border-primary/20 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {selectedIds.size} request{selectedIds.size > 1 ? 's' : ''} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
                className="text-muted-foreground h-8"
              >
                <XIcon className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setPendingAction({ ids: Array.from(selectedIds), accept: true })}
                disabled={isBatchResponding}
              >
                <CheckCircleIcon className="h-4 w-4 mr-1" />
                {selectedIds.size > 1 ? 'Batch Accept' : 'Accept'}
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setPendingAction({ ids: Array.from(selectedIds), accept: false })}
                disabled={isBatchResponding}
              >
                <XCircleIcon className="h-4 w-4 mr-1" />
                {selectedIds.size > 1 ? 'Batch Reject' : 'Decline'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Select All */}
      <div className="flex items-center gap-2 px-1">
        <input
          type="checkbox"
          id="select-all"
          checked={selectedIds.size === invitations.length && invitations.length > 0}
          onChange={(e) => handleSelectAll(e.target.checked)}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
        />
        <label htmlFor="select-all" className="text-sm text-muted-foreground cursor-pointer">
          Select all pending requests
        </label>
      </div>

      {invitations.map((invitation) => {
        const isSelected = selectedIds.has(invitation.id);
        const payRate =
          typeof invitation.callTime.payRate === 'object'
            ? invitation.callTime.payRate.toNumber()
            : Number(invitation.callTime.payRate);

        const isSameDay = invitation.callTime.startDate && invitation.callTime.endDate &&
          new Date(invitation.callTime.startDate).toDateString() ===
          new Date(invitation.callTime.endDate).toDateString();

        return (
          <Card
            key={invitation.id}
            className={cn(
              "p-5 transition-all duration-200 border-2",
              isSelected ? "border-primary bg-primary/[0.02]" : "border-border shadow-sm hover:border-border/80"
            )}
          >
            <div className="flex gap-4">
              <div className="pt-1">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleSelectOne(invitation.id)}
                  className="h-5 w-5 rounded border-border text-primary focus:ring-primary cursor-pointer mt-1"
                />
              </div>

              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-foreground">
                          {invitation.callTime.service?.title || 'Service'}
                        </h3>
                        <p className="text-muted-foreground font-medium">
                          {invitation.callTime.event.title}
                        </p>
                      </div>
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-400">
                        Pending Response
                      </Badge>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-start gap-2">
                        <div className="p-1.5 bg-muted rounded-lg">
                          <CalendarIcon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">Date</p>
                          <p className="font-semibold text-foreground leading-tight">
                            {formatDate(invitation.callTime.startDate)}
                            {!isSameDay && (
                              <>
                                <br />- {formatDate(invitation.callTime.endDate)}
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <div className="p-1.5 bg-muted rounded-lg">
                          <ClockIcon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">Time</p>
                          <p className="font-semibold text-foreground leading-tight">
                            {formatTime(invitation.callTime.startTime)} -{' '}
                            {formatTime(invitation.callTime.endTime)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <div className="p-1.5 bg-muted rounded-lg">
                          <MapPinIcon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">Location</p>
                          <p className="font-semibold text-foreground leading-tight">
                            {invitation.callTime.event.venueName}
                            <br />
                            <span className="text-muted-foreground font-normal">
                              {invitation.callTime.event.city},{' '}
                              {invitation.callTime.event.state}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <div className="p-1.5 bg-muted rounded-lg">
                          <DollarSignIcon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">Pay Rate</p>
                          <p className="font-bold text-foreground leading-tight">
                            ${payRate.toFixed(2)}{' '}
                            {RATE_TYPE_LABELS[invitation.callTime.payRateType].toLowerCase()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {respondingTo === invitation.id ? (
                    <InvitationResponseForm
                      onSubmit={(accept, reason) => {
                        onRespond(invitation.id, accept, reason);
                        setRespondingTo(null);
                      }}
                      onCancel={() => setRespondingTo(null)}
                      isSubmitting={isResponding === invitation.id}
                    />
                  ) : (
                    <div className="flex gap-2 md:flex-col min-w-[120px]">
                      <Button
                        onClick={() => setPendingAction({ ids: [invitation.id], accept: true })}
                        disabled={isResponding === invitation.id}
                        className="flex-1 md:flex-none shadow-sm font-bold"
                      >
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setRespondingTo(invitation.id)}
                        disabled={isResponding === invitation.id}
                        className="flex-1 md:flex-none font-bold"
                      >
                        Decline
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );
      })}

      <ConfirmModal
        open={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        onConfirm={handleConfirmAction}
        title={pendingAction?.accept ? (pendingAction.ids.length > 1 ? 'Batch Accept Invitations?' : 'Accept Invitation?') : (pendingAction?.ids.length! > 1 ? 'Batch Reject Invitations?' : 'Decline Invitation?')}
        description={`You are about to ${pendingAction?.accept ? 'accept' : 'reject'} ${pendingAction?.ids.length} invitation(s).`}
        warningMessage={pendingAction?.accept
          ? (pendingAction.ids.length > 1 ? 'Do you want to accept all selected invitations?' : 'Do you want to accept this invitation?')
          : (pendingAction?.ids.length! > 1 ? 'Do you want to reject all selected invitations?' : 'Do you want to decline this invitation?')}
        confirmText={pendingAction?.accept ? (pendingAction.ids.length > 1 ? 'Yes, Batch Accept' : 'Yes, Accept') : (pendingAction?.ids.length! > 1 ? 'Yes, Batch Reject' : 'Yes, Decline')}
        variant={pendingAction?.accept ? 'default' : 'danger'}
        isLoading={!!isResponding || !!isBatchResponding}
      />
    </div>
  );
}
