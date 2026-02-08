'use client';

import { ConfirmModal } from '@/components/common/confirm-modal';
import { useTerminology } from '@/lib/hooks/use-terminology';

interface RestoreEvent {
  id: string;
  title: string;
  eventId: string;
}

interface RestoreEventModalProps {
  events: RestoreEvent[];
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isRestoring: boolean;
}

export function RestoreEventModal({
  events,
  open,
  onClose,
  onConfirm,
  isRestoring,
}: RestoreEventModalProps) {
  const { terminology } = useTerminology();

  if (!events || events.length === 0) return null;

  const isBulk = events.length > 1;
  const title = isBulk ? `Restore ${terminology.event.plural}` : `Restore ${terminology.event.singular}`;

  return (
    <ConfirmModal
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      isLoading={isRestoring}
      title={title}
      description={isBulk ? 'These events will be restored to your main list.' : 'This event will be restored to your main list.'}
      confirmText={isRestoring ? 'Restoring...' : isBulk ? `Restore ${terminology.event.plural}` : `Restore ${terminology.event.singular}`}
      variant="default"
      warningMessage={`Restored ${terminology.event.lowerPlural} will appear in ${terminology.event.plural}.`}
    >
      <p className="text-sm text-muted-foreground">
        {isBulk
          ? `Are you sure you want to restore these ${events.length} ${terminology.event.lowerPlural}?`
          : `Are you sure you want to restore this ${terminology.event.lower}?`}
      </p>

      <div className="mt-4 space-y-2">
        {(isBulk ? events.slice(0, 5) : events).map((event) => (
          <div
            key={event.id}
            className="p-3 bg-muted/50 rounded-md border border-border"
          >
            <p className="text-sm font-medium text-foreground">{event.title}</p>
            <p className="text-xs text-muted-foreground mt-1">ID: {event.eventId}</p>
          </div>
        ))}

        {isBulk && events.length > 5 && (
          <p className="text-xs text-muted-foreground">
            +{events.length - 5} more
          </p>
        )}
      </div>
    </ConfirmModal>
  );
}

