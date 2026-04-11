'use client';

import { ConfirmModal } from '@/components/common/confirm-modal';
import { useTerminology } from '@/lib/hooks/use-terminology';

interface ArchiveEvent {
  id: string;
  title: string;
  eventId: string;
}

interface ArchiveEventModalProps {
  events: ArchiveEvent[];
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isArchiving: boolean;
}

export function ArchiveEventModal({
  events,
  open,
  onClose,
  onConfirm,
  isArchiving,
}: ArchiveEventModalProps) {
  const { terminology } = useTerminology();

  if (!events || events.length === 0) return null;

  const isBulk = events.length > 1;
  const title = isBulk ? `Archive ${terminology.event.plural}` : `Archive ${terminology.event.singular}`;

  return (
    <ConfirmModal
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      isLoading={isArchiving}
      title={title}
      description={isBulk ? 'These events will be moved to Archived.' : 'This event will be moved to Archived.'}
      confirmText={isArchiving ? 'Archiving...' : isBulk ? `Archive ${terminology.event.plural}` : `Archive ${terminology.event.singular}`}
      variant="default"
      warningMessage={`You can restore ${terminology.event.lowerPlural} later from Archived.`}
    >
      <p className="text-sm text-muted-foreground">
        {isBulk
          ? `Are you sure you want to archive these ${events.length} ${terminology.event.lowerPlural}?`
          : `Are you sure you want to archive this ${terminology.event.lower}?`}
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

