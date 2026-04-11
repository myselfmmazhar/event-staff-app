'use client';

import { ConfirmModal } from '@/components/common/confirm-modal';
import { useTerminology } from '@/lib/hooks/use-terminology';
import { Badge } from '@/components/ui/badge';

interface Event {
  id: string;
  title: string;
  eventId: string;
}

interface DeleteEventModalProps {
  // Support single event or array of events
  events: Event[];
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function DeleteEventModal({
  events,
  open,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteEventModalProps) {
  const { terminology } = useTerminology();

  if (events.length === 0) return null;

  const isSingle = events.length === 1;
  const event = events[0];

  return (
    <ConfirmModal
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      isLoading={isDeleting}
      title={
        isSingle
          ? `Permanently delete ${terminology.event.singular}`
          : `Permanently delete ${events.length} ${terminology.event.lowerPlural}`
      }
      description={`This permanently deletes the archived ${isSingle ? terminology.event.lower : terminology.event.lowerPlural} and cannot be undone.`}
      confirmText={isDeleting ? 'Deleting...' : 'Delete permanently'}
      variant="danger"
      warningMessage={`This is a permanent delete. Archive is reversible; delete is not.`}
    >
      <p className="text-sm text-muted-foreground">
        Are you sure you want to permanently delete {isSingle ? `this archived ${terminology.event.lower}` : `these ${events.length} archived ${terminology.event.lowerPlural}`}?
      </p>
      {isSingle && event ? (
        <div className="mt-4 p-3 bg-muted/50 rounded-md border border-border">
          <p className="text-sm font-medium text-foreground">{event.title}</p>
          <p className="text-xs text-muted-foreground mt-1">ID: {event.eventId}</p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-3 bg-muted/50 rounded-md border border-border">
            {events.map((e) => (
              <Badge key={e.id} variant="secondary" size="sm">
                {e.title}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </ConfirmModal>
  );
}
