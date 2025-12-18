'use client';

import { ConfirmModal } from '@/components/common/confirm-modal';
import { useTerminology } from '@/lib/hooks/use-terminology';

interface Event {
  id: string;
  title: string;
  eventId: string;
}

interface DeleteEventModalProps {
  event: Event | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function DeleteEventModal({
  event,
  open,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteEventModalProps) {
  const { terminology } = useTerminology();

  if (!event) return null;

  return (
    <ConfirmModal
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      isLoading={isDeleting}
      title={`Delete ${terminology.event.singular}`}
      description="This action cannot be undone"
      confirmText={isDeleting ? 'Deleting...' : `Delete ${terminology.event.singular}`}
      variant="danger"
      warningMessage={`All ${terminology.event.lower} data will be permanently deleted.`}
    >
      <p className="text-sm text-muted-foreground">
        Are you sure you want to delete this {terminology.event.lower}?
      </p>
      <div className="mt-4 p-3 bg-muted/50 rounded-md border border-border">
        <p className="text-sm font-medium text-foreground">{event.title}</p>
        <p className="text-xs text-muted-foreground mt-1">ID: {event.eventId}</p>
      </div>
    </ConfirmModal>
  );
}
