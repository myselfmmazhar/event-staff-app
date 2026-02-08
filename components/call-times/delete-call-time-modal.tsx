'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface DeleteCallTimeModalProps {
  callTime: {
    id: string;
    callTimeId: string;
    service: { title: string } | null;
  } | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function DeleteCallTimeModal({
  callTime,
  open,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteCallTimeModalProps) {
  if (!callTime) return null;

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Delete Call Time</DialogTitle>
      </DialogHeader>

      <DialogContent>
        <p className="text-muted-foreground">
          Are you sure you want to delete the call time{' '}
          <strong>{callTime.service?.title || 'Unknown Service'}</strong> ({callTime.callTimeId})?
        </p>
        <p className="text-sm text-destructive mt-2">
          This action cannot be undone. All invitations associated with this
          call time will also be deleted.
        </p>
      </DialogContent>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isDeleting}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={onConfirm}
          disabled={isDeleting}
        >
          {isDeleting ? 'Deleting...' : 'Delete Call Time'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
