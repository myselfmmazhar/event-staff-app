'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertIcon } from '@/components/ui/icons';

interface Event {
  id: string;
  title: string;
  eventId: string;
}

interface DeleteEventDialogProps {
  event: Event | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function DeleteEventDialog({
  event,
  open,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteEventDialogProps) {
  if (!event) return null;

  return (
    <Dialog open={open} onClose={onClose} className="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-destructive">
          <AlertIcon className="h-5 w-5" />
          Delete Event
        </DialogTitle>
      </DialogHeader>

      <DialogContent>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete this event? This action cannot be undone.
        </p>
        <div className="mt-4 p-3 bg-muted/50 rounded-md border border-border">
          <p className="text-sm font-medium text-foreground">{event.title}</p>
          <p className="text-xs text-muted-foreground mt-1">ID: {event.eventId}</p>
        </div>
      </DialogContent>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={isDeleting}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="danger"
          onClick={onConfirm}
          disabled={isDeleting}
        >
          {isDeleting ? 'Deleting...' : 'Delete Event'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
