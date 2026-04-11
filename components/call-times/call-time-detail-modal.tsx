'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { InvitationList } from './invitation-list';
import {
  RATE_TYPE_LABELS,
} from '@/lib/schemas/call-time.schema';
import { SkillLevel, RateType } from '@prisma/client';
import { trpc } from '@/lib/client/trpc';
import { useToast } from '@/components/ui/use-toast';
import { CloseIcon, EditIcon } from '@/components/ui/icons';
import { useEventTerm } from '@/lib/hooks/use-terminology';
import { CallTimeFormModal } from './call-time-form-modal';
import { isDateNullOrUBD, isSameDay as checkSameDay } from '@/lib/utils/date-formatter';
import type { UpdateCallTimeInput } from '@/lib/schemas/call-time.schema';

interface CallTimeDetailModalProps {
  callTimeId: string | null;
  open: boolean;
  onClose: () => void;
}

const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

export function CallTimeDetailModal({
  callTimeId,
  open,
  onClose,
}: CallTimeDetailModalProps) {
  const eventTerm = useEventTerm();
  const { toast } = useToast();
  const [resendingId, setResendingId] = useState<string | undefined>();
  const [cancellingId, setCancellingId] = useState<string | undefined>();
  const [acceptingId, setAcceptingId] = useState<string | undefined>();
  const [isEditing, setIsEditing] = useState(false);

  const utils = trpc.useUtils();
  const hasCallTimeId = Boolean(callTimeId);
  const callTimeQueryId = callTimeId ?? '';

  // Fetch call time details
  const { data: callTime, isLoading } = trpc.callTime.getById.useQuery(
    { id: callTimeQueryId },
    { enabled: hasCallTimeId && open }
  );

  // Resend invitation mutation
  const resendInvitation = trpc.callTime.resendInvitation.useMutation({
    onSuccess: () => {
      toast({
        title: 'Offer resent',
        description: 'The offer has been resent successfully',
      });
      if (hasCallTimeId) {
        utils.callTime.getById.invalidate({ id: callTimeQueryId });
      }
      setResendingId(undefined);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'error',
      });
      setResendingId(undefined);
    },
  });

  // Update call time mutation
  const updateCallTime = trpc.callTime.update.useMutation({
    onSuccess: () => {
      toast({
        title: 'Assignment updated',
        description: 'The assignment has been updated successfully',
      });
      setIsEditing(false);
      if (hasCallTimeId) {
        utils.callTime.getById.invalidate({ id: callTimeQueryId });
        utils.callTime.getAll.invalidate();
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'error',
      });
    },
  });

  // Cancel invitation mutation
  const cancelInvitation = trpc.callTime.cancelInvitation.useMutation({
    onSuccess: () => {
      toast({
        title: 'Offer cancelled',
        description: 'The offer has been cancelled',
      });
      if (hasCallTimeId) {
        utils.callTime.getById.invalidate({ id: callTimeQueryId });
      }
      setCancellingId(undefined);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'error',
      });
      setCancellingId(undefined);
    },
  });

  // Accept invitation on behalf mutation
  const acceptInvitationOnBehalf = trpc.callTime.acceptInvitationOnBehalf.useMutation({
    onSuccess: () => {
      toast({
        title: 'Offer accepted',
        description: 'The offer has been accepted on behalf of the user',
      });
      if (hasCallTimeId) {
        utils.callTime.getById.invalidate({ id: callTimeQueryId });
        utils.callTime.getAll.invalidate();
      }
      setAcceptingId(undefined);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'error',
      });
      setAcceptingId(undefined);
    },
  });

  const handleResend = (invitationId: string) => {
    setResendingId(invitationId);
    resendInvitation.mutate({ invitationId });
  };

  const handleCancel = (invitationId: string) => {
    setCancellingId(invitationId);
    cancelInvitation.mutate({ invitationId });
  };

  const handleAcceptOnBehalf = (invitationId: string) => {
    setAcceptingId(invitationId);
    acceptInvitationOnBehalf.mutate({ invitationId });
  };

  const handleEditSubmit = (data: Omit<UpdateCallTimeInput, 'id'>) => {
    if (callTime) {
      updateCallTime.mutate({ ...data, id: callTime.id });
    }
  };

  const formatDate = (date: Date | null | undefined) => {
    // Check for null/undefined or epoch date (superjson bug workaround)
    if (!date) return 'UBD';
    const dateObj = new Date(date);
    if (dateObj.getFullYear() === 1970) return 'UBD';
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (time: string | null) => {
    if (!time) return 'TBD';
    const [hours, minutes] = time.split(':');
    if (!hours || !minutes) return 'TBD';
    const hour = Number.parseInt(hours, 10);
    if (Number.isNaN(hour)) return 'TBD';
    return `${hour > 12 ? hour - 12 : hour}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  if (isLoading || !callTime) {
    return (
      <Dialog open={open} onClose={onClose} className="max-w-5xl w-[90vw]">
        <DialogContent>
          <div className="h-96 flex items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const payRate =
    typeof callTime.payRate === 'object'
      ? (callTime.payRate as { toNumber: () => number }).toNumber()
      : Number(callTime.payRate);
  const billRate =
    typeof callTime.billRate === 'object'
      ? (callTime.billRate as { toNumber: () => number }).toNumber()
      : Number(callTime.billRate);

  const payRateTypeLabel = RATE_TYPE_LABELS[callTime.payRateType as RateType];
  const billRateTypeLabel = RATE_TYPE_LABELS[callTime.billRateType as RateType];
  const skillLevelLabel = SKILL_LEVEL_LABELS[callTime.skillLevel as SkillLevel];

  // Check if dates are UBD (null or epoch from superjson bug)
  const isStartDateUBD = isDateNullOrUBD(callTime.startDate);
  const isEndDateUBD = isDateNullOrUBD(callTime.endDate);
  const isSameDay = checkSameDay(callTime.startDate, callTime.endDate);

  const isFilled = callTime.confirmedCount >= callTime.numberOfStaffRequired;

  return (
    <Dialog open={open} onClose={onClose} className="max-w-5xl w-[90vw]">
      <DialogHeader>
        <div className="flex items-center justify-between">
          <div>
            <DialogTitle className="flex items-center gap-2">
              {callTime.service?.title || 'No Service'}
              <Badge variant={isFilled ? 'default' : 'secondary'}>
                {callTime.confirmedCount}/{callTime.numberOfStaffRequired} filled
              </Badge>
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {callTime.callTimeId}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="gap-1"
            >
              <EditIcon className="h-4 w-4" />
              Edit
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </DialogHeader>

      <DialogContent className="max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Call Time Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg mb-6">
          <div>
            <p className="text-sm text-muted-foreground">Date</p>
            <p className="font-medium">
              {formatDate(callTime.startDate)}
              {!isSameDay && (
                <>
                  <br />
                  <span className="text-muted-foreground">to </span>
                  {formatDate(callTime.endDate)}
                </>
              )}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Time</p>
            <p className="font-medium">
              {formatTime(callTime.startTime)} - {formatTime(callTime.endTime)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Cost</p>
            <p className="font-medium">
              ${payRate.toFixed(2)} {payRateTypeLabel.toLowerCase()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Price</p>
            <p className="font-medium">
              ${billRate.toFixed(2)} {billRateTypeLabel.toLowerCase()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Skill Level</p>
            <p className="font-medium">
              {skillLevelLabel}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{eventTerm.singular}</p>
            <p className="font-medium">{callTime.event.title}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Location</p>
            <p className="font-medium">
              {callTime.event.venueName}, {callTime.event.city}
            </p>
          </div>
        </div>

        {callTime.notes && (
          <div className="mb-6 p-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Notes</p>
            <p className="text-sm">{callTime.notes}</p>
          </div>
        )}

        {/* Offers Section */}
        <div>
          <h3 className="font-medium text-foreground mb-4">
            Offers ({callTime.invitations.length})
          </h3>
          <InvitationList
            invitations={callTime.invitations}
            onResend={handleResend}
            onCancel={handleCancel}
            onAcceptOnBehalf={handleAcceptOnBehalf}
            isResending={resendingId}
            isCancelling={cancellingId}
            isAccepting={acceptingId}
          />
        </div>
      </DialogContent>

      {/* Edit Assignment Modal */}
      {callTime && (
        <CallTimeFormModal
          callTime={{
            id: callTime.id,
            callTimeId: callTime.callTimeId,
            serviceId: callTime.service?.id || '',
            numberOfStaffRequired: callTime.numberOfStaffRequired,
            skillLevel: callTime.skillLevel,
            ratingRequired: callTime.ratingRequired,
            startDate: isStartDateUBD ? null : new Date(callTime.startDate!),
            startTime: callTime.startTime,
            endDate: isEndDateUBD ? null : new Date(callTime.endDate!),
            endTime: callTime.endTime,
            payRate: payRate,
            payRateType: callTime.payRateType,
            billRate: billRate,
            billRateType: callTime.billRateType,
            customCost: callTime.customCost,
            customPrice: callTime.customPrice,
            approveOvertime: callTime.approveOvertime ?? false,
            overtimeRate: callTime.overtimeRate ?? null,
            overtimeRateType: callTime.overtimeRateType ?? null,
            commission: callTime.commission ?? false,
            commissionAmount: callTime.commissionAmount ?? null,
            commissionAmountType: callTime.commissionAmountType ?? null,
            applyMinimum: callTime.applyMinimum ?? false,
            minimum: callTime.minimum ?? null,
            travelInMinimum: callTime.travelInMinimum ?? false,
            expenditure: callTime.expenditure ?? false,
            expenditureCost: callTime.expenditureCost ?? null,
            expenditurePrice: callTime.expenditurePrice ?? null,
            expenditureAmountType: callTime.expenditureAmountType ?? null,
            notes: callTime.notes,
          }}
          eventId={callTime.event.id}
          open={isEditing}
          onClose={() => setIsEditing(false)}
          onSubmit={handleEditSubmit}
          isSubmitting={updateCallTime.isPending}
        />
      )}
    </Dialog>
  );
}
