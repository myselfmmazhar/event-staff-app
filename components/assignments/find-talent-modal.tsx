'use client';

import { useMemo, useState } from 'react';
import type { inferRouterOutputs } from '@trpc/server';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { StaffSearchTable, type SearchRow } from '@/components/call-times/staff-search-table';
import { trpc } from '@/lib/client/trpc';
import { useToast } from '@/components/ui/use-toast';
import { CloseIcon, SendIcon, FilterIcon, XIcon, CheckCircleIcon } from '@/components/ui/icons';
import { ConfirmModal } from '@/components/common/confirm-modal';
import { useStaffTerm } from '@/lib/hooks/use-terminology';
import { SkillLevel, StaffRating } from '@prisma/client';
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

const USER_TYPE_OPTIONS = [
  { value: '', label: 'Any Type' },
  { value: 'INDIVIDUAL', label: 'Individual' },
  { value: 'TEAM', label: 'Team' },
];

const AVAILABLE_UNITS_OPTIONS = [
  { value: '', label: 'Any Units' },
  { value: '1', label: '1 unit' },
  { value: '2', label: '2 units' },
  { value: '3', label: '3 units' },
  { value: '4', label: '4 units' },
  { value: '5', label: '5+ units' },
];

export function FindTalentModal({
  callTimeId,
  callTimeIds = [],
  open,
  onClose,
}: FindTalentModalProps) {
  const staffTerm = useStaffTerm();
  const { toast } = useToast();
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [selectionCounts, setSelectionCounts] = useState<Record<string, number>>({});
  const [includeAlreadyInvited, setIncludeAlreadyInvited] = useState(false);

  // Filter state
  const [maxDistance, setMaxDistance] = useState<string>('');
  const [skillLevel, setSkillLevel] = useState<SkillLevel | ''>('');
  const [rating, setRating] = useState<StaffRating | ''>('');
  const [userType, setUserType] = useState<'' | 'INDIVIDUAL' | 'TEAM'>('');
  const [availableUnits, setAvailableUnits] = useState<string>('');

  const utils = trpc.useUtils();

  const effectiveCallTimeIds = callTimeId ? [callTimeId] : callTimeIds;
  const hasCallTimeIds = effectiveCallTimeIds.length > 0;

  const hasActiveFilters =
    maxDistance || skillLevel || rating || userType || availableUnits;

  const callTimesQuery = trpc.callTime.getManyByIds.useQuery(
    { ids: effectiveCallTimeIds },
    { enabled: hasCallTimeIds && open }
  );
  const callTimes: CallTimesByIds | undefined = callTimesQuery.data;
  const isLoading = callTimesQuery.isLoading;

  const { data: staffData, isLoading: isLoadingStaff } =
    trpc.callTime.searchStaff.useQuery(
      {
        callTimeIds: effectiveCallTimeIds,
        includeAlreadyInvited,
        maxDistance: maxDistance ? Number(maxDistance) : undefined,
        skillLevels: skillLevel ? [skillLevel] : undefined,
        ratings: rating ? [rating] : undefined,
        userType: userType || undefined,
        availableUnits: availableUnits ? Number(availableUnits) : undefined,
      },
      { enabled: hasCallTimeIds && open }
    );

  const rows = useMemo<SearchRow[]>(() => (staffData?.data as SearchRow[]) || [], [staffData]);

  // Split selection by kind
  const selection = useMemo(() => {
    const individualStaffIds: string[] = [];
    const teamSelections: { managerStaffId: string; serviceId: string; units?: number }[] = [];
    let teamInviteCount = 0;
    for (const rowId of selectedRowIds) {
      const row = rows.find((r) => r.rowId === rowId);
      if (!row) continue;
      if (row.kind === 'INDIVIDUAL') {
        individualStaffIds.push(row.id);
      } else if (row.serviceId && row.managerStaffId) {
        const units = selectionCounts[rowId] ?? row.availableUnits;
        teamSelections.push({
          managerStaffId: row.managerStaffId,
          serviceId: row.serviceId,
          units,
        });
        teamInviteCount += units;
      }
    }
    return {
      individualStaffIds,
      teamSelections,
      teamInviteCount,
      totalSelections: individualStaffIds.length + teamSelections.length,
    };
  }, [selectedRowIds, rows, selectionCounts]);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingOffers, setPendingOffers] = useState<{
    callTimeIds: string[];
    staffIds: string[];
    teamSelections: { managerStaffId: string; serviceId: string }[];
  } | null>(null);
  const [isAssignConfirmOpen, setIsAssignConfirmOpen] = useState(false);
  const [pendingAssign, setPendingAssign] = useState<{ callTimeIds: string[]; staffIds: string[] } | null>(null);
  const [showResendConfirm, setShowResendConfirm] = useState(false);

  const sendInvitations = trpc.callTime.sendInvitations.useMutation({
    onSuccess: (data) => {
      toast({
        title: showResendConfirm ? 'Invitations re-sent' : 'Offers sent',
        description: `Successfully sent ${data.sent} offer(s) across ${effectiveCallTimeIds.length} assignment(s)`,
      });
      setSelectedRowIds([]);
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
      if (error.message.includes('already been invited')) {
        setPendingOffers({
          callTimeIds: effectiveCallTimeIds,
          staffIds: selection.individualStaffIds,
          teamSelections: selection.teamSelections,
        });
        setShowResendConfirm(true);
      } else {
        toast({ title: 'Error', description: error.message, variant: 'error' });
        setPendingOffers(null);
      }
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
      toast({ title: 'Assignment updated', description });
      setSelectedRowIds([]);
      setPendingAssign(null);
      setIsAssignConfirmOpen(false);
      if (hasCallTimeIds) {
        utils.callTime.getManyByIds.invalidate({ ids: effectiveCallTimeIds });
        utils.callTime.searchStaff.invalidate({ callTimeIds: effectiveCallTimeIds });
        utils.callTime.getAll.invalidate();
      }
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'error' });
      setIsAssignConfirmOpen(false);
      setPendingAssign(null);
    },
  });

  const handleSendOffers = () => {
    if (selection.totalSelections === 0 || !hasCallTimeIds) return;

    if (effectiveCallTimeIds.length > 1) {
      setPendingOffers({
        callTimeIds: effectiveCallTimeIds,
        staffIds: selection.individualStaffIds,
        teamSelections: selection.teamSelections,
      });
      setIsConfirmOpen(true);
      return;
    }

    sendInvitations.mutate({
      callTimeIds: effectiveCallTimeIds,
      staffIds: selection.individualStaffIds.length > 0 ? selection.individualStaffIds : undefined,
      teamSelections: selection.teamSelections.length > 0 ? selection.teamSelections : undefined,
    });
  };

  const handleConfirmSend = () => {
    if (pendingOffers) {
      sendInvitations.mutate({
        callTimeIds: pendingOffers.callTimeIds,
        staffIds: pendingOffers.staffIds.length > 0 ? pendingOffers.staffIds : undefined,
        teamSelections: pendingOffers.teamSelections.length > 0 ? pendingOffers.teamSelections : undefined,
      });
    }
  };

  const handleResend = () => {
    if (pendingOffers) {
      sendInvitations.mutate({
        callTimeIds: pendingOffers.callTimeIds,
        staffIds: pendingOffers.staffIds.length > 0 ? pendingOffers.staffIds : undefined,
        teamSelections: pendingOffers.teamSelections.length > 0 ? pendingOffers.teamSelections : undefined,
        resendExisting: true,
      });
    }
  };

  const handleAssignAssignment = () => {
    if (selection.totalSelections === 0 || !hasCallTimeIds) return;

    if (effectiveCallTimeIds.length > 1) {
      setPendingAssign({
        callTimeIds: effectiveCallTimeIds,
        staffIds: selection.individualStaffIds,
        teamSelections: selection.teamSelections,
      } as any);
      setIsAssignConfirmOpen(true);
      return;
    }

    assignInvitations.mutate({
      callTimeIds: effectiveCallTimeIds,
      staffIds: selection.individualStaffIds.length > 0 ? selection.individualStaffIds : undefined,
      teamSelections: selection.teamSelections.length > 0 ? selection.teamSelections : undefined,
    });
  };

  const handleConfirmAssign = () => {
    if (pendingAssign) {
      assignInvitations.mutate(pendingAssign);
    }
  };

  const handleClose = () => {
    setSelectedRowIds([]);
    setSelectionCounts({});
    setIncludeAlreadyInvited(false);
    setIsAssignConfirmOpen(false);
    setPendingAssign(null);
    clearFilters();
    onClose();
  };

  const handleSelectionChange = (newIds: string[]) => {
    setSelectedRowIds(newIds);
    setSelectionCounts((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => {
        if (!newIds.includes(id)) delete next[id];
      });
      return next;
    });
  };

  const handleCountChange = (rowId: string, count: number) => {
    setSelectionCounts((prev) => ({ ...prev, [rowId]: count }));
  };

  const clearFilters = () => {
    setMaxDistance('');
    setSkillLevel('');
    setRating('');
    setUserType('');
    setAvailableUnits('');
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

  // Effective number of invitations that will be sent.
  // Individual: 1 each. Team: capped at remaining slots — UI shows "up to N".
  const totalInvitesToSend =
    selection.individualStaffIds.length +
    Math.min(
      selection.teamInviteCount,
      Math.max(0, totalRequired - totalConfirmed - selection.individualStaffIds.length)
    );

  return (
    <Dialog open={open} onClose={handleClose} className="max-w-7xl w-[95vw]">
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

      <DialogContent className="max-h-[90vh] overflow-hidden">
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

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">User Type</label>
                <select
                  value={userType}
                  onChange={(e) => setUserType(e.target.value as '' | 'INDIVIDUAL' | 'TEAM')}
                  className="w-full text-sm rounded-md border border-input bg-background px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {USER_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Available Units</label>
                <select
                  value={availableUnits}
                  onChange={(e) => setAvailableUnits(e.target.value)}
                  className="w-full text-sm rounded-md border border-input bg-background px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {AVAILABLE_UNITS_OPTIONS.map((opt) => (
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
              Include already invited talents
            </label>

            {selection.totalSelections > 0 && (
              <div className="flex flex-wrap items-center gap-2 justify-end">
                {selection.teamSelections.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    Up to {totalInvitesToSend} invitation{totalInvitesToSend === 1 ? '' : 's'} will be sent
                  </span>
                )}
                {selection.totalSelections > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAssignAssignment}
                    disabled={sendInvitations.isPending || assignInvitations.isPending}
                  >
                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                    Assign {selection.totalSelections} assignment
                    {selection.totalSelections > 1 ? 's' : ''}
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={handleSendOffers}
                  disabled={sendInvitations.isPending || assignInvitations.isPending}
                >
                  <SendIcon className="h-4 w-4 mr-2" />
                  Send {selection.totalSelections} Offer
                  {selection.totalSelections > 1 ? 's' : ''}
                </Button>
              </div>
            )}
          </div>

          <StaffSearchTable
            rows={rows}
            selectedRowIds={selectedRowIds}
            selectionCounts={selectionCounts}
            onSelectionChange={handleSelectionChange}
            onCountChange={handleCountChange}
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
        description={`You are about to send offers to ${selection.totalSelections} talent(s) for ${effectiveCallTimeIds.length} different assignments.`}
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
        description={`You are about to assign ${selection.totalSelections} talent(s) across ${effectiveCallTimeIds.length} assignments immediately. They will be marked as accepted (no invitation email).`}
        warningMessage="We will send a call time confirmation or waitlist email only—not an invitation. This will include individual and team assignments."
        confirmText="Yes, assign"
        variant="default"
        isLoading={assignInvitations.isPending}
      />

      <ConfirmModal
        open={showResendConfirm}
        onClose={() => setShowResendConfirm(false)}
        onConfirm={handleResend}
        title="Talents Already Invited"
        description="Some or all of the selected talents have already been invited to these assignments."
        warningMessage="Do you want to re-send the invitations to these talents?"
        confirmText="Yes, Re-send Invitation"
        variant="default"
        isLoading={sendInvitations.isPending}
      />
    </Dialog>
  );
}
