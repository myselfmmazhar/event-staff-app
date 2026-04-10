'use client';

import { useState } from 'react';
import type { inferRouterOutputs } from '@trpc/server';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { StaffSearchTable } from '@/components/call-times/staff-search-table';
import { trpc } from '@/lib/client/trpc';
import { useToast } from '@/components/ui/use-toast';
import { CloseIcon, SendIcon, FilterIcon, XIcon, CheckCircleIcon } from '@/components/ui/icons';
import { ConfirmModal } from '@/components/common/confirm-modal';
import { useStaffTerm } from '@/lib/hooks/use-terminology';
import { SkillLevel, StaffRating, AvailabilityStatus } from '@prisma/client';
import { formatDateTime } from '@/lib/utils/date-formatter';
import type { AppRouter } from '@/server/routers/_app';

type RouterOutputs = inferRouterOutputs<AppRouter>;
type CallTimesByIds = RouterOutputs['callTime']['getManyByIds'];

interface FindTalentModalProps {
  callTimeId?: string | null;
  callTimeIds?: string[];
  open: boolean;
  onClose: () => void;
}

const DISTANCE_OPTIONS = [
  { value: '', label: 'Any Distance' },
  { value: '10', label: 'Within 10 mi' },
  { value: '25', label: 'Within 25 mi' },
  { value: '50', label: 'Within 50 mi' },
  { value: '100', label: 'Within 100 mi' },
];

const SKILL_LEVEL_OPTIONS = [
  { value: SkillLevel.BEGINNER, label: 'Beginner' },
  { value: SkillLevel.INTERMEDIATE, label: 'Intermediate' },
  { value: SkillLevel.ADVANCED, label: 'Advanced' },
];

const RATING_OPTIONS = [
  { value: StaffRating.A, label: 'A' },
  { value: StaffRating.B, label: 'B' },
  { value: StaffRating.C, label: 'C' },
  { value: StaffRating.D, label: 'D' },
  { value: StaffRating.NA, label: 'N/A' },
];

const AVAILABILITY_OPTIONS = [
  { value: AvailabilityStatus.OPEN_TO_OFFERS, label: 'Available' },
  { value: AvailabilityStatus.BUSY, label: 'Busy' },
  { value: AvailabilityStatus.TIME_OFF, label: 'Time Off' },
];

export function FindTalentModal({
  callTimeId,
  callTimeIds = [],
  open,
  onClose,
}: FindTalentModalProps) {
  const staffTerm = useStaffTerm();
  const { toast } = useToast();
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [includeAlreadyInvited, setIncludeAlreadyInvited] = useState(false);

  // Filter state
  const [maxDistance, setMaxDistance] = useState<string>('');
  const [skillLevel, setSkillLevel] = useState<SkillLevel | ''>('');
  const [rating, setRating] = useState<StaffRating | ''>('');
  const [availabilityStatuses, setAvailabilityStatuses] = useState<AvailabilityStatus[]>([]);

  const utils = trpc.useUtils();

  // Normalize IDs to an array
  const effectiveCallTimeIds = callTimeId ? [callTimeId] : callTimeIds;
  const hasCallTimeIds = effectiveCallTimeIds.length > 0;

  const hasActiveFilters = maxDistance || skillLevel || rating || availabilityStatuses.length > 0;

  // Fetch call time details
  const callTimesQuery = trpc.callTime.getManyByIds.useQuery(
    { ids: effectiveCallTimeIds },
    { enabled: hasCallTimeIds && open }
  );
  const callTimes: CallTimesByIds | undefined = callTimesQuery.data;
  const isLoading = callTimesQuery.isLoading;

  // Fetch available staff with filters
  const { data: staffData, isLoading: isLoadingStaff } =
    trpc.callTime.searchStaff.useQuery(
      {
        callTimeIds: effectiveCallTimeIds,
        includeAlreadyInvited,
        maxDistance: maxDistance ? Number(maxDistance) : undefined,
        skillLevels: skillLevel ? [skillLevel] : undefined,
        ratings: rating ? [rating] : undefined,
        availabilityStatuses: availabilityStatuses.length > 0 ? availabilityStatuses : undefined,
      },
      { enabled: hasCallTimeIds && open }
    );

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingOffers, setPendingOffers] = useState<{ callTimeIds: string[], staffIds: string[] } | null>(null);
  const [isAssignConfirmOpen, setIsAssignConfirmOpen] = useState(false);
  const [pendingAssign, setPendingAssign] = useState<{ callTimeIds: string[], staffIds: string[] } | null>(null);
  const [showResendConfirm, setShowResendConfirm] = useState(false);

  // Send offers mutation
  const sendInvitations = trpc.callTime.sendInvitations.useMutation({
    onSuccess: (data) => {
      toast({
        title: showResendConfirm ? 'Invitations re-sent' : 'Offers sent',
        description: `Successfully sent ${data.sent} offer(s) across ${effectiveCallTimeIds.length} assignment(s)`,
      });
      setSelectedStaffIds([]);
      setPendingOffers(null);
      setIsConfirmOpen(false);
      setShowResendConfirm(false);
      if (hasCallTimeIds) {
        utils.callTime.getManyByIds.invalidate({ ids: effectiveCallTimeIds });
        utils.callTime.searchStaff.invalidate({ callTimeIds: effectiveCallTimeIds });
        utils.callTime.getAll.invalidate();
      }
    },
    onError: (error) => {
      // Check for fixed "already invited" message
      if (error.message.includes('already been invited')) {
        setPendingOffers({
          callTimeIds: effectiveCallTimeIds,
          staffIds: selectedStaffIds,
        });
        setShowResendConfirm(true);
      } else {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'error',
        });
      }
      setPendingOffers(null);
      setIsConfirmOpen(false);
    },
  });

  const assignInvitations = trpc.callTime.assignInvitations.useMutation({
    onSuccess: (data) => {
      const confirmed = data.results.filter((r) => r.outcome === 'confirmed').length;
      const waitlisted = data.results.filter((r) => r.outcome === 'waitlisted').length;
      const skipped = data.results.filter((r) => r.outcome === 'already_assigned').length;
      let description: string;
      if (data.processed === 0 && skipped > 0) {
        description = `All selected ${staffTerm.lowerPlural} were already assigned.`;
      } else if (data.processed > 0) {
        const bits: string[] = [];
        if (confirmed) bits.push(`${confirmed} confirmed`);
        if (waitlisted) bits.push(`${waitlisted} waitlisted`);
        description = `${bits.join(', ')}. Confirmation or waitlist email sent.`;
        if (skipped > 0) description += ` ${skipped} were already assigned.`;
      } else {
        description = 'No changes were needed.';
      }
      toast({
        title: 'Assignment updated',
        description,
      });
      setSelectedStaffIds([]);
      setPendingAssign(null);
      setIsAssignConfirmOpen(false);
      if (hasCallTimeIds) {
        utils.callTime.getManyByIds.invalidate({ ids: effectiveCallTimeIds });
        utils.callTime.searchStaff.invalidate({ callTimeIds: effectiveCallTimeIds });
        utils.callTime.getAll.invalidate();
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'error',
      });
      setIsAssignConfirmOpen(false);
      setPendingAssign(null);
    },
  });

  const handleSendOffers = () => {
    if (selectedStaffIds.length === 0 || !hasCallTimeIds) return;

    // If multiple assignments are selected, show confirmation
    if (effectiveCallTimeIds.length > 1) {
      setPendingOffers({
        callTimeIds: effectiveCallTimeIds,
        staffIds: selectedStaffIds,
      });
      setIsConfirmOpen(true);
      return;
    }

    sendInvitations.mutate({
      callTimeIds: effectiveCallTimeIds,
      staffIds: selectedStaffIds,
    });
  };

  const handleConfirmSend = () => {
    if (pendingOffers) {
      sendInvitations.mutate(pendingOffers);
    }
  };

  const handleResend = () => {
    if (pendingOffers) {
      sendInvitations.mutate({
        ...pendingOffers,
        resendExisting: true,
      });
    }
  };

  const handleAssignAssignment = () => {
    if (selectedStaffIds.length === 0 || !hasCallTimeIds) return;

    if (effectiveCallTimeIds.length > 1) {
      setPendingAssign({
        callTimeIds: effectiveCallTimeIds,
        staffIds: selectedStaffIds,
      });
      setIsAssignConfirmOpen(true);
      return;
    }

    assignInvitations.mutate({
      callTimeIds: effectiveCallTimeIds,
      staffIds: selectedStaffIds,
    });
  };

  const handleConfirmAssign = () => {
    if (pendingAssign) {
      assignInvitations.mutate(pendingAssign);
    }
  };

  const handleClose = () => {
    setSelectedStaffIds([]);
    setIncludeAlreadyInvited(false);
    setIsAssignConfirmOpen(false);
    setPendingAssign(null);
    clearFilters();
    onClose();
  };

  const clearFilters = () => {
    setMaxDistance('');
    setSkillLevel('');
    setRating('');
    setAvailabilityStatuses([]);
  };

  if (isLoading || !callTimes) {
    return (
      <Dialog open={open} onClose={handleClose} className="max-w-6xl w-[90vw]">
        <DialogContent>
          <div className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const totalConfirmed = callTimes.reduce((sum, ct) => sum + ct.confirmedCount, 0);
  const totalRequired = callTimes.reduce((sum, ct) => sum + ct.numberOfStaffRequired, 0);
  const isFilled = totalConfirmed >= totalRequired;

  return (
    <Dialog open={open} onClose={handleClose} className="max-w-6xl w-[90vw]">
      <DialogHeader>
        <div className="flex items-center justify-between">
          <div>
            <DialogTitle className="flex items-center gap-2">
              Find {staffTerm.plural}
              <Badge variant={isFilled ? 'default' : 'secondary'}>
                {totalConfirmed}/{totalRequired} filled
              </Badge>
            </DialogTitle>
            <div className="mt-2 space-y-1">
              {callTimes.map((ct) => (
                <p key={ct.id} className="text-xl font-medium text-muted-foreground">
                  <span className="text-foreground">{ct.service?.title || 'No Position'}</span>
                  <span className="mx-1.5">•</span>
                  {ct.event.title}
                  <span className="mx-1.5 opacity-50">•</span>
                  <span className="text-base">{formatDateTime(ct.startDate, ct.startTime)}</span>
                </p>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
      </DialogHeader>

      <DialogContent className="max-h-[calc(100vh-200px)] overflow-y-auto">
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-muted/30 border border-border/50 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <FilterIcon className="h-4 w-4" />
                Filters
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <XIcon className="h-3 w-3" />
                  Clear All
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Distance Filter */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Distance</label>
                <select
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(e.target.value)}
                  className="w-full text-sm rounded-md border border-input bg-background px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {DISTANCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Skill Level Dropdown */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Skill Level</label>
                <select
                  value={skillLevel}
                  onChange={(e) => setSkillLevel(e.target.value as SkillLevel)}
                  className="w-full text-sm rounded-md border border-input bg-background px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Any Skill Level</option>
                  {SKILL_LEVEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Rating Dropdown */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Rating</label>
                <select
                  value={rating}
                  onChange={(e) => setRating(e.target.value as StaffRating)}
                  className="w-full text-sm rounded-md border border-input bg-background px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Any Rating</option>
                  {RATING_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Actions Row */}
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
              <div className="flex flex-wrap items-center gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAssignAssignment}
                  disabled={sendInvitations.isPending || assignInvitations.isPending}
                >
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Assign {selectedStaffIds.length} assignment
                  {selectedStaffIds.length > 1 ? 's' : ''}
                </Button>
                <Button
                  type="button"
                  onClick={handleSendOffers}
                  disabled={sendInvitations.isPending || assignInvitations.isPending}
                >
                  <SendIcon className="h-4 w-4 mr-2" />
                  Send {selectedStaffIds.length} Offer
                  {selectedStaffIds.length > 1 ? 's' : ''}
                </Button>
              </div>
            )}
          </div>

          <StaffSearchTable
            staff={staffData?.data || []}
            selectedIds={selectedStaffIds}
            onSelectionChange={setSelectedStaffIds}
            isLoading={isLoadingStaff}
            showInvitationStatus={includeAlreadyInvited}
          />

          {staffData && staffData.meta.totalPages > 1 && (
            <p className="text-sm text-muted-foreground text-center">
              Showing {staffData.data.length} of {staffData.meta.total} {staffTerm.lowerPlural}
            </p>
          )}
        </div>
      </DialogContent>

      <ConfirmModal
        open={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmSend}
        title="Confirm Batch Offers"
        description={`You are about to send offers to ${selectedStaffIds.length} ${staffTerm.lowerPlural} for ${effectiveCallTimeIds.length} different assignments.`}
        warningMessage="Are you sure you want to send batch alert confirmation?"
        confirmText="Yes, Send Offers"
        variant="default"
        isLoading={sendInvitations.isPending}
      />

      <ConfirmModal
        open={isAssignConfirmOpen}
        onClose={() => {
          setIsAssignConfirmOpen(false);
          setPendingAssign(null);
        }}
        onConfirm={handleConfirmAssign}
        title="Confirm assign on behalf"
        description={`You are about to assign ${selectedStaffIds.length} ${staffTerm.lowerPlural} across ${effectiveCallTimeIds.length} assignments immediately. They will be marked as accepted (no invitation email).`}
        warningMessage="We will send a call time confirmation or waitlist email only—not an invitation."
        confirmText="Yes, assign"
        variant="default"
        isLoading={assignInvitations.isPending}
      />

      <ConfirmModal
        open={showResendConfirm}
        onClose={() => setShowResendConfirm(false)}
        onConfirm={handleResend}
        title="Staff Already Invited"
        description="Some or all of the selected staff have already been invited to these assignments."
        warningMessage="Do you want to re-send the invitations to these staff members?"
        confirmText="Yes, Re-send Invitation"
        variant="default"
        isLoading={sendInvitations.isPending}
      />
    </Dialog>
  );
}
