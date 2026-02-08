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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StaffSearchTable } from './staff-search-table';
import { InvitationList } from './invitation-list';
import {
  RATE_TYPE_LABELS,
} from '@/lib/schemas/call-time.schema';
import { SkillLevel, RateType, CallTimeInvitationStatus } from '@prisma/client';
import { trpc } from '@/lib/client/trpc';
import { useToast } from '@/components/ui/use-toast';
import { CloseIcon, SendIcon, UsersIcon } from '@/components/ui/icons';
import { useEventTerm, useStaffTerm } from '@/lib/hooks/use-terminology';

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
  const staffTerm = useStaffTerm();
  const { toast } = useToast();
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [includeAlreadyInvited, setIncludeAlreadyInvited] = useState(false);
  const [activeTab, setActiveTab] = useState('invitations');
  const [resendingId, setResendingId] = useState<string | undefined>();
  const [cancellingId, setCancellingId] = useState<string | undefined>();

  const utils = trpc.useUtils();
  const hasCallTimeId = Boolean(callTimeId);
  const callTimeQueryId = callTimeId ?? '';

  // Fetch call time details
  const { data: callTime, isLoading } = trpc.callTime.getById.useQuery(
    { id: callTimeQueryId },
    { enabled: hasCallTimeId && open }
  );

  // Fetch available staff
  const { data: staffData, isLoading: isLoadingStaff } =
    trpc.callTime.searchStaff.useQuery(
      {
        callTimeId: callTimeQueryId,
        includeAlreadyInvited,
      },
      { enabled: hasCallTimeId && open && activeTab === 'search' }
    );

  // Send invitations mutation
  const sendInvitations = trpc.callTime.sendInvitations.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Invitations sent',
        description: `Successfully sent ${data.sent} invitation(s)`,
      });
      setSelectedStaffIds([]);
      if (hasCallTimeId) {
        utils.callTime.getById.invalidate({ id: callTimeQueryId });
        utils.callTime.searchStaff.invalidate({ callTimeId: callTimeQueryId });
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

  // Resend invitation mutation
  const resendInvitation = trpc.callTime.resendInvitation.useMutation({
    onSuccess: () => {
      toast({
        title: 'Invitation resent',
        description: 'The invitation has been resent successfully',
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

  // Cancel invitation mutation
  const cancelInvitation = trpc.callTime.cancelInvitation.useMutation({
    onSuccess: () => {
      toast({
        title: 'Invitation cancelled',
        description: 'The invitation has been cancelled',
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

  const handleSendInvitations = () => {
    if (selectedStaffIds.length === 0 || !hasCallTimeId) return;
    sendInvitations.mutate({
      callTimeId: callTimeQueryId,
      staffIds: selectedStaffIds,
    });
  };

  const handleResend = (invitationId: string) => {
    setResendingId(invitationId);
    resendInvitation.mutate({ invitationId });
  };

  const handleCancel = (invitationId: string) => {
    setCancellingId(invitationId);
    cancelInvitation.mutate({ invitationId });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
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
      <Dialog open={open} onClose={onClose} className="max-w-4xl">
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

  const isSameDay =
    new Date(callTime.startDate).toDateString() ===
    new Date(callTime.endDate).toDateString();

  const isFilled = callTime.confirmedCount >= callTime.numberOfStaffRequired;

  return (
    <Dialog open={open} onClose={onClose} className="max-w-4xl">
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
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
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
            <p className="text-sm text-muted-foreground">Pay Rate</p>
            <p className="font-medium">
              ${payRate.toFixed(2)} {payRateTypeLabel.toLowerCase()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Bill Rate</p>
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

        {/* Tabs for Invitations and Staff Search */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="invitations" className="flex items-center gap-2">
              <UsersIcon className="h-4 w-4" />
              Invitations ({callTime.invitations.length})
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <SendIcon className="h-4 w-4" />
              Find {staffTerm.plural}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invitations">
            <InvitationList
              invitations={callTime.invitations}
              onResend={handleResend}
              onCancel={handleCancel}
              isResending={resendingId}
              isCancelling={cancellingId}
            />
          </TabsContent>

          <TabsContent value="search">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={includeAlreadyInvited}
                    onChange={(e) => setIncludeAlreadyInvited(e.target.checked)}
                    className="rounded border-input"
                  />
                  Include already invited {staffTerm.lowerPlural}
                </label>

                {selectedStaffIds.length > 0 && (
                  <Button
                    onClick={handleSendInvitations}
                    disabled={sendInvitations.isPending}
                  >
                    <SendIcon className="h-4 w-4 mr-2" />
                    Send {selectedStaffIds.length} Invitation
                    {selectedStaffIds.length > 1 ? 's' : ''}
                  </Button>
                )}
              </div>

              <StaffSearchTable
                staff={staffData?.data || []}
                selectedIds={selectedStaffIds}
                onSelectionChange={setSelectedStaffIds}
                isLoading={isLoadingStaff}
              />

              {staffData && staffData.meta.totalPages > 1 && (
                <p className="text-sm text-muted-foreground text-center">
                  Showing {staffData.data.length} of {staffData.meta.total} {staffTerm.lowerPlural}
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
