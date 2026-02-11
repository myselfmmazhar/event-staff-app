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
import { CloseIcon, SendIcon } from '@/components/ui/icons';
import { useStaffTerm } from '@/lib/hooks/use-terminology';

interface FindTalentModalProps {
  callTimeId: string | null;
  open: boolean;
  onClose: () => void;
}

export function FindTalentModal({
  callTimeId,
  open,
  onClose,
}: FindTalentModalProps) {
  const staffTerm = useStaffTerm();
  const { toast } = useToast();
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [includeAlreadyInvited, setIncludeAlreadyInvited] = useState(false);

  const utils = trpc.useUtils();
  const hasCallTimeId = Boolean(callTimeId);
  const callTimeQueryId = callTimeId ?? '';

  // Fetch call time details (minimal, just for header info)
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
    onClose();
  };

  if (isLoading || !callTime) {
    return (
      <Dialog open={open} onClose={handleClose} className="max-w-4xl">
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
    <Dialog open={open} onClose={handleClose} className="max-w-4xl">
      <DialogHeader>
        <div className="flex items-center justify-between">
          <div>
            <DialogTitle className="flex items-center gap-2">
              Find {staffTerm.plural}
              <Badge variant={isFilled ? 'default' : 'secondary'}>
                {callTime.confirmedCount}/{callTime.numberOfStaffRequired} filled
              </Badge>
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {callTime.service?.title || 'No Position'} - {callTime.event.title}
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
