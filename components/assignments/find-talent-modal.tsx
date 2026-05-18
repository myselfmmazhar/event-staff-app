'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { MultiSelect, type MultiSelectOption } from '@/components/ui/multi-select';
import { useStaffTerm } from '@/lib/hooks/use-terminology';
import { SkillLevel, StaffRating } from '@prisma/client';
import { formatDateTime } from '@/lib/utils/date-formatter';
import { useDebounce } from '@/lib/hooks/useDebounce';
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
  // Service narrowing — multi-service tasks start with every card unchecked.
  // Single-service case still renders a card but the checkbox is disabled
  // (always on), so its id is seeded as selected.
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  // Shift narrowing — start with all available shifts selected. A shift only
  // drops out of the dropdown once it is fully filled (no open headcount).
  const [selectedShiftIds, setSelectedShiftIds] = useState<string[]>([]);

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

  // Unique services across the selected call times. We dedupe by serviceId so
  // multiple call times sharing the same service collapse into one card.
  const uniqueServices = useMemo(() => {
    const seen = new Map<string, { id: string; title: string }>();
    callTimes?.forEach((ct) => {
      if (ct.service?.id && !seen.has(ct.service.id)) {
        seen.set(ct.service.id, { id: ct.service.id, title: ct.service.title });
      }
    });
    return Array.from(seen.values());
  }, [callTimes]);

  // Earliest call time across the selected set — header shows the event name
  // and this single date/time instead of one line per call time.
  const earliestCallTime = useMemo(() => {
    if (!callTimes?.length) return null;
    const ts = (d: Date | string | null | undefined) =>
      d ? new Date(d).getTime() : Number.POSITIVE_INFINITY;
    return [...callTimes].sort((a, b) => {
      const aTime = ts(a.startDate);
      const bTime = ts(b.startDate);
      if (aTime !== bTime) return aTime - bTime;
      return (a.startTime ?? '').localeCompare(b.startTime ?? '');
    })[0];
  }, [callTimes]);

  // Aggregate confirmed / required per service so each service card can show
  // its own "x/y filled" badge alongside the modal-level total.
  const filledByService = useMemo(() => {
    const map = new Map<string, { confirmed: number; required: number }>();
    callTimes?.forEach((ct) => {
      if (!ct.service?.id) return;
      const existing = map.get(ct.service.id) ?? { confirmed: 0, required: 0 };
      existing.confirmed += ct.confirmedCount;
      existing.required += ct.numberOfStaffRequired;
      map.set(ct.service.id, existing);
    });
    return map;
  }, [callTimes]);

  // Reset whenever the modal opens or the underlying service set changes —
  // closing + reopening should not preserve checks. Multi-service tasks start
  // fully unchecked; a lone service stays selected since its checkbox is
  // locked on (disabled) and can't be toggled by the user.
  const uniqueServiceKey = uniqueServices.map((s) => s.id).sort().join(',');
  useEffect(() => {
    if (!open) return;
    setSelectedServiceIds(
      uniqueServices.length === 1 ? uniqueServices.map((s) => s.id) : []
    );
  }, [open, uniqueServiceKey]);

  // Available shifts (call times) for the dropdown. A shift drops out only
  // when it is fully filled (confirmed >= required). Shifts with a partial
  // acceptance — including ones whose required headcount was just increased —
  // stay in the picker so the remaining slots can still be filled.
  const availableShifts = useMemo(() => {
    return (callTimes ?? []).filter(
      (ct) =>
        ct.numberOfStaffRequired <= 0 ||
        ct.confirmedCount < ct.numberOfStaffRequired
    );
  }, [callTimes]);

  // Precompute the MultiSelect options grouped by serviceId so each service
  // card doesn't rebuild them (with fresh Badge JSX) on every render — that
  // was defeating downstream memoization inside MultiSelect.
  const shiftOptionsByService = useMemo(() => {
    const map = new Map<string, MultiSelectOption[]>();
    for (const ct of availableShifts) {
      const sid = ct.service?.id;
      if (!sid) continue;
      const list = map.get(sid) ?? [];
      list.push({
        value: ct.id,
        label: formatDateTime(ct.startDate, ct.startTime),
        rightLabel: (
          <Badge
            variant={
              ct.numberOfStaffRequired > 0 && ct.confirmedCount >= ct.numberOfStaffRequired
                ? 'default'
                : 'secondary'
            }
            size="sm"
          >
            {ct.confirmedCount}/{ct.numberOfStaffRequired} filled
          </Badge>
        ),
      });
      map.set(sid, list);
    }
    return map;
  }, [availableShifts]);


  // Reset to "all available selected" on open or whenever the available set
  // changes (e.g., a shift just became fully accepted in the background).
  const availableShiftKey = availableShifts.map((c) => c.id).sort().join(',');
  useEffect(() => {
    if (!open) return;
    setSelectedShiftIds(availableShifts.map((c) => c.id));
  }, [open, availableShiftKey]);

  // Effective shifts to act on. If the user unchecked everything we still need
  // ≥1 id for the backend (schema min(1)) — fall back to all available, or to
  // the original modal scope when nothing is available (degenerate case).
  const effectiveShiftIds =
    selectedShiftIds.length > 0
      ? selectedShiftIds
      : availableShifts.length > 0
        ? availableShifts.map((c) => c.id)
        : effectiveCallTimeIds;

  // Reset the "has sent" flag each time the modal opens so a stale flag
  // from a prior session can't trigger an immediate auto-close.
  useEffect(() => {
    if (open) setHasSentOffers(false);
  }, [open]);

  // Only narrow the search when the user has actually unchecked something —
  // sending the full list is equivalent to omitting the filter and adds noise
  // to the query key. Empty selection falls back to "all" on the backend.
  const serviceIdsForQuery =
    selectedServiceIds.length > 0 &&
      selectedServiceIds.length < uniqueServices.length
      ? selectedServiceIds
      : undefined;

  // Debounce filter primitives so rapid dropdown changes don't queue
  // overlapping searchStaff queries (which is what makes the modal feel
  // "stuck" while a stale request resolves). Memoize the object so the
  // debounce only resets when an actual value changes, not on every render.
  const filterInputs = useMemo(
    () => ({
      maxDistance: maxDistance ? Number(maxDistance) : undefined,
      skillLevels: skillLevel ? [skillLevel] : undefined,
      ratings: rating ? [rating] : undefined,
      userType: userType || undefined,
      availableUnits: availableUnits ? Number(availableUnits) : undefined,
    }),
    [maxDistance, skillLevel, rating, userType, availableUnits]
  );
  const debouncedFilters = useDebounce(filterInputs, 250);

  const { data: staffData, isLoading: isLoadingStaff } =
    trpc.callTime.searchStaff.useQuery(
      {
        callTimeIds: effectiveShiftIds,
        includeAlreadyInvited,
        ...debouncedFilters,
        serviceIds: serviceIdsForQuery,
      },
      {
        // Gate on callTimes so we don't fire a wasted request with the raw
        // callTimeIds before we know which shifts are actually available.
        enabled:
          hasCallTimeIds && open && !!callTimes && effectiveShiftIds.length > 0,
      }
    );

  const rows = useMemo<SearchRow[]>(() => (staffData?.data as SearchRow[]) || [], [staffData]);

  // Compute the per-team unit cap. We compute it where `selection` is built
  // because both the table input and the outgoing payload have to agree —
  // otherwise the UI shows "2/2" but we'd send a higher count.
  const totalConfirmed = callTimes?.reduce((sum, ct) => sum + ct.confirmedCount, 0) ?? 0;
  const totalRequired = callTimes?.reduce((sum, ct) => sum + ct.numberOfStaffRequired, 0) ?? 0;
  const remainingSlots = Math.max(0, totalRequired - totalConfirmed);

  // Active offers = invitations that are still in play (not declined/cancelled).
  // Used to decide whether enough offers are out to cover required headcount.
  const totalActiveOffers =
    callTimes?.reduce(
      (sum, ct) =>
        sum +
        ct.invitations.filter(
          (inv) => inv.status !== 'DECLINED' && inv.status !== 'CANCELLED'
        ).length,
      0
    ) ?? 0;

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
        const cap =
          remainingSlots > 0
            ? Math.min(row.availableUnits, remainingSlots)
            : row.availableUnits;
        const requested = selectionCounts[rowId] ?? cap;
        const units = Math.max(1, Math.min(requested, cap));
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
  }, [selectedRowIds, rows, selectionCounts, remainingSlots]);

  // Precompute the per-service selection count once per render so each service
  // card can do an O(1) Map lookup instead of re-scanning rows + selectedRowIds.
  const selectionCountByService = useMemo(() => {
    const rowById = new Map(rows.map((r) => [r.rowId, r]));
    const counts = new Map<string, number>();
    for (const rowId of selectedRowIds) {
      const row = rowById.get(rowId);
      if (!row) continue;
      if (row.kind === 'TEAM' && row.serviceId) {
        const cap =
          remainingSlots > 0
            ? Math.min(row.availableUnits, remainingSlots)
            : row.availableUnits;
        const requested = selectionCounts[rowId] ?? cap;
        const units = Math.max(1, Math.min(requested, cap));
        counts.set(row.serviceId, (counts.get(row.serviceId) ?? 0) + units);
      } else if (row.kind === 'INDIVIDUAL') {
        for (const s of row.services ?? []) {
          counts.set(s.service.id, (counts.get(s.service.id) ?? 0) + 1);
        }
      }
    }
    return counts;
  }, [rows, selectedRowIds, selectionCounts, remainingSlots]);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingOffers, setPendingOffers] = useState<{
    callTimeIds: string[];
    staffIds: string[];
    teamSelections: { managerStaffId: string; serviceId: string }[];
  } | null>(null);
  const [isAssignConfirmOpen, setIsAssignConfirmOpen] = useState(false);
  const [pendingAssign, setPendingAssign] = useState<{ callTimeIds: string[]; staffIds: string[] } | null>(null);
  const [showResendConfirm, setShowResendConfirm] = useState(false);
  const [hasSentOffers, setHasSentOffers] = useState(false);

  const sendInvitations = trpc.callTime.sendInvitations.useMutation({
    onSuccess: (data) => {
      toast({
        title: showResendConfirm ? 'Invitations re-sent' : 'Offers sent',
        description: `Successfully sent ${data.sent} offer(s) across ${effectiveShiftIds.length} assignment(s)`,
      });
      setSelectedRowIds([]);
      setPendingOffers(null);
      setIsConfirmOpen(false);
      setShowResendConfirm(false);
      setHasSentOffers(true);
      if (hasCallTimeIds) {
        utils.callTime.getManyByIds.invalidate({ ids: effectiveCallTimeIds });
        utils.callTime.searchStaff.invalidate({ callTimeIds: effectiveShiftIds });
        utils.callTime.getAll.invalidate();
      }
    },
    onError: (error) => {
      if (error.message.includes('already been invited')) {
        setPendingOffers({
          callTimeIds: effectiveShiftIds,
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
        utils.callTime.searchStaff.invalidate({ callTimeIds: effectiveShiftIds });
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
    if (effectiveShiftIds.length === 0) return;

    if (effectiveShiftIds.length > 1) {
      setPendingOffers({
        callTimeIds: effectiveShiftIds,
        staffIds: selection.individualStaffIds,
        teamSelections: selection.teamSelections,
      });
      setIsConfirmOpen(true);
      return;
    }

    sendInvitations.mutate({
      callTimeIds: effectiveShiftIds,
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
    if (effectiveShiftIds.length === 0) return;

    if (effectiveShiftIds.length > 1) {
      setPendingAssign({
        callTimeIds: effectiveShiftIds,
        staffIds: selection.individualStaffIds,
        teamSelections: selection.teamSelections,
      } as any);
      setIsAssignConfirmOpen(true);
      return;
    }

    assignInvitations.mutate({
      callTimeIds: effectiveShiftIds,
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

  // Auto-close once enough offers are out to cover the required headcount.
  // Gated on hasSentOffers so opening a fully-covered call time doesn't
  // dismiss the modal before the user can act.
  useEffect(() => {
    if (!open || !hasSentOffers) return;
    if (totalRequired > 0 && totalActiveOffers >= totalRequired) {
      handleClose();
    }
  }, [open, hasSentOffers, totalActiveOffers, totalRequired]);

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

  // Paint the dialog shell immediately and let the table show its own loading
  // state — the previous full-page "Loading..." gate forced a remount once
  // callTimes resolved, which made the open feel sluggish.
  const isFilled = totalRequired > 0 && totalConfirmed >= totalRequired;

  // Effective number of invitations that will be sent.
  // Individual: 1 each. Team: capped at remaining slots — UI shows "up to N".
  const totalInvitesToSend =
    selection.individualStaffIds.length +
    Math.min(
      selection.teamInviteCount,
      Math.max(0, totalRequired - totalConfirmed - selection.individualStaffIds.length)
    );

  const getSelectedCountForService = (serviceId: string) =>
    selectionCountByService.get(serviceId) ?? 0;

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
            {earliestCallTime && (
              <p className="mt-2 text-xl font-medium text-muted-foreground">
                <span className="text-foreground">{earliestCallTime.event.title}</span>
                <span className="mx-1.5 opacity-50">•</span>
                <span className="text-base">
                  {formatDateTime(earliestCallTime.startDate, earliestCallTime.startTime)}
                </span>
              </p>
            )}
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

            {uniqueServices.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {uniqueServices.map((svc) => {
                  const isChecked = selectedServiceIds.includes(svc.id);
                  const shiftsForService = availableShifts.filter((s) => s.service?.id === svc.id);
                  const selectedCount = getSelectedCountForService(svc.id);
                  const serviceFilled = filledByService.get(svc.id) ?? { confirmed: 0, required: 0 };
                  const isServiceFilled =
                    serviceFilled.required > 0 && serviceFilled.confirmed >= serviceFilled.required;
                  const serviceShiftOptions = shiftOptionsByService.get(svc.id) ?? [];

                  // Current selected shifts for THIS service
                  const currentServiceShiftIds = selectedShiftIds.filter((id) =>
                    shiftsForService.some((s) => s.id === id)
                  );

                  // Single-service case: lock the checkbox on.
                  const disabled = uniqueServices.length === 1;

                  return (
                    <div
                      key={svc.id}
                      className={`p-3 rounded-lg border transition-all duration-200 ${isChecked
                          ? 'bg-primary/5 border-primary/40 shadow-sm'
                          : 'bg-background border-border'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-3 gap-2">
                        <label
                          className={`flex items-center gap-2 font-semibold min-w-0 ${disabled ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'
                            }`}
                        >
                          <input
                            type="checkbox"
                            className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                            checked={isChecked}
                            disabled={disabled}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSelectedServiceIds((prev) =>
                                checked
                                  ? Array.from(new Set([...prev, svc.id]))
                                  : prev.filter((id) => id !== svc.id)
                              );

                              // Sync shifts: if unchecking, remove its shifts. If checking, add them all.
                              if (!checked) {
                                setSelectedShiftIds((prev) =>
                                  prev.filter((id) => !shiftsForService.some((s) => s.id === id))
                                );
                              } else {
                                setSelectedShiftIds((prev) =>
                                  Array.from(new Set([...prev, ...shiftsForService.map((s) => s.id)]))
                                );
                              }
                            }}
                          />
                          <span className={`truncate ${isChecked ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {svc.title}
                          </span>
                        </label>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant={isServiceFilled ? 'default' : 'secondary'} size="sm">
                            {serviceFilled.confirmed}/{serviceFilled.required} filled
                          </Badge>
                          {selectedCount > 0 && (
                            <Badge variant="default" className="bg-primary text-primary-foreground font-black px-2 py-0 h-5">
                              {selectedCount}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {isChecked && (
                        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-0.5">
                            Dates & Times
                          </label>
                          {serviceShiftOptions.length > 0 ? (
                            <MultiSelect
                              options={serviceShiftOptions}
                              value={currentServiceShiftIds}
                              onChange={(newIds) => {
                                setSelectedShiftIds((prev) => {
                                  const others = prev.filter(
                                    (id) => !shiftsForService.some((s) => s.id === id)
                                  );
                                  return [...others, ...newIds];
                                });
                              }}
                              placeholder="Select dates..."
                              showSelectAll
                              searchable={serviceShiftOptions.length > 5}
                              className="bg-background/50"
                            />
                          ) : (
                            <p className="text-xs text-muted-foreground italic px-1">
                              No shifts available
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

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
            isLoading={isLoading || isLoadingStaff}
            showInvitationStatus={includeAlreadyInvited}
            remainingSlots={remainingSlots}
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
        description={`You are about to send offers to ${selection.totalSelections} talent(s) for ${effectiveShiftIds.length} different assignments.`}
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
        description={`You are about to assign ${selection.totalSelections} talent(s) across ${effectiveShiftIds.length} assignments immediately. They will be marked as accepted (no invitation email).`}
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
