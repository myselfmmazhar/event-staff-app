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
import { StaffSearchTable } from '@/components/call-times/staff-search-table';
import { trpc } from '@/lib/client/trpc';
import { useToast } from '@/components/ui/use-toast';
import { CloseIcon, SendIcon, FilterIcon, XIcon } from '@/components/ui/icons';
import { useStaffTerm } from '@/lib/hooks/use-terminology';
import { SkillLevel, StaffRating, AvailabilityStatus } from '@prisma/client';
import { formatDateTime } from '@/lib/utils/date-formatter';

interface FindTalentModalProps {
  callTimeId: string | null;
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
  const hasCallTimeId = Boolean(callTimeId);
  const callTimeQueryId = callTimeId ?? '';

  const hasActiveFilters = maxDistance || skillLevel || rating || availabilityStatuses.length > 0;

  // Fetch call time details (minimal, just for header info)
  const { data: callTime, isLoading } = trpc.callTime.getById.useQuery(
    { id: callTimeQueryId },
    { enabled: hasCallTimeId && open }
  );

  // Fetch available staff with filters
  const { data: staffData, isLoading: isLoadingStaff } =
    trpc.callTime.searchStaff.useQuery(
      {
        callTimeId: callTimeQueryId,
        includeAlreadyInvited,
        maxDistance: maxDistance ? Number(maxDistance) : undefined,
        skillLevels: skillLevel ? [skillLevel] : undefined,
        ratings: rating ? [rating] : undefined,
        availabilityStatuses: availabilityStatuses.length > 0 ? availabilityStatuses : undefined,
      },
      { enabled: hasCallTimeId && open }
    );

  // Send offers mutation
  const sendInvitations = trpc.callTime.sendInvitations.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Offers sent',
        description: `Successfully sent ${data.sent} offer(s)`,
      });
      setSelectedStaffIds([]);
      if (hasCallTimeId) {
        utils.callTime.getById.invalidate({ id: callTimeQueryId });
        utils.callTime.searchStaff.invalidate({ callTimeId: callTimeQueryId });
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

  const handleSendOffers = () => {
    if (selectedStaffIds.length === 0 || !hasCallTimeId) return;
    sendInvitations.mutate({
      callTimeId: callTimeQueryId,
      staffIds: selectedStaffIds,
    });
  };

  const handleClose = () => {
    setSelectedStaffIds([]);
    setIncludeAlreadyInvited(false);
    clearFilters();
    onClose();
  };

  const clearFilters = () => {
    setMaxDistance('');
    setSkillLevel('');
    setRating('');
    setAvailabilityStatuses([]);
  };

  const toggleMultiSelect = <T,>(list: T[], value: T, setter: (v: T[]) => void) => {
    if (list.includes(value)) {
      setter(list.filter((v) => v !== value));
    } else {
      setter([...list, value]);
    }
  };

  if (isLoading || !callTime) {
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

  const isFilled = callTime.confirmedCount >= callTime.numberOfStaffRequired;

  return (
    <Dialog open={open} onClose={handleClose} className="max-w-6xl w-[90vw]">
      <DialogHeader>
        <div className="flex items-center justify-between">
          <div>
            <DialogTitle className="flex items-center gap-2">
              Find {staffTerm.plural}
              <Badge variant={isFilled ? 'default' : 'secondary'}>
                {callTime.confirmedCount}/{callTime.numberOfStaffRequired} filled
              </Badge>
            </DialogTitle>
            <p className="text-base font-medium text-muted-foreground mt-1">
              {callTime.service?.title || 'No Position'} - {callTime.event.title}
              <span className="mx-2">•</span>
              {formatDateTime(callTime.startDate, callTime.startTime)}
            </p>
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

              {/* Skill Level Multi-Select */}
              {/* <div>
                <label className="text-xs text-muted-foreground mb-1 block">Skill Level</label>
                <div className="flex flex-wrap gap-1">
                  {SKILL_LEVEL_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleMultiSelect(skillLevels, opt.value, setSkillLevels)}
                      className={`text-xs px-2 py-1 rounded-md border transition-colors ${skillLevels.includes(opt.value)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-input hover:bg-muted text-foreground'
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div> */}
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

              {/* Rating Multi-Select */}
              {/* <div>
                <label className="text-xs text-muted-foreground mb-1 block">Rating</label>
                <div className="flex flex-wrap gap-1">
                  {RATING_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleMultiSelect(ratings, opt.value, setRatings)}
                      className={`text-xs px-2 py-1 rounded-md border transition-colors ${ratings.includes(opt.value)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-input hover:bg-muted text-foreground'
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div> */}
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

              {/* Availability Multi-Select */}
              {/* <div>
                <label className="text-xs text-muted-foreground mb-1 block">Availability</label>
                <div className="flex flex-wrap gap-1">
                  {AVAILABILITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleMultiSelect(availabilityStatuses, opt.value, setAvailabilityStatuses)}
                      className={`text-xs px-2 py-1 rounded-md border transition-colors ${availabilityStatuses.includes(opt.value)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-input hover:bg-muted text-foreground'
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div> */}
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
              <Button
                onClick={handleSendOffers}
                disabled={sendInvitations.isPending}
              >
                <SendIcon className="h-4 w-4 mr-2" />
                Send {selectedStaffIds.length} Offer
                {selectedStaffIds.length > 1 ? 's' : ''}
              </Button>
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
    </Dialog>
  );
}
