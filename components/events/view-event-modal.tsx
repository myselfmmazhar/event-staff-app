'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { EditIcon, UsersIcon } from '@/components/ui/icons';
import { trpc } from '@/lib/client/trpc';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useTerminology } from '@/lib/hooks/use-terminology';
import { EVENT_STATUS_COLORS, EVENT_STATUS_LABELS } from '@/lib/constants';
import { formatDateTime } from '@/lib/utils/date-formatter';

interface ViewEventModalProps {
  eventId: string | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (event: any) => void;
}

export function ViewEventModal({
  eventId,
  open,
  onClose,
  onEdit,
}: ViewEventModalProps) {
  const router = useRouter();
  const { terminology } = useTerminology();
  const { data: event, isLoading, error } = trpc.event.getById.useQuery(
    { id: eventId || '' },
    { enabled: !!eventId && open }
  );

  const handleEdit = () => {
    if (event && onEdit) {
      onEdit(event);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>{terminology.event.singular} Details</DialogTitle>
      </DialogHeader>

      <DialogContent className="max-h-[calc(100vh-280px)] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-destructive">Failed to load {terminology.event.lower} details</p>
            <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
          </div>
        ) : event ? (
          <div className="space-y-5">
            {/* Header: Event ID + Status */}
            <div className="flex items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg border border-border">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{terminology.event.singular} ID</p>
                <p className="font-mono text-sm font-medium">{event.eventId}</p>
              </div>
              <Badge variant={EVENT_STATUS_COLORS[event.status]} asSpan>
                {EVENT_STATUS_LABELS[event.status]}
              </Badge>
            </div>

            {/* Event Details Section */}
            <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
              <h3 className="text-base font-semibold border-b border-border pb-2 mb-4">{terminology.event.singular} Details</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Title</p>
                  <p className="text-sm font-medium text-foreground">{event.title}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Client</p>
                  <p className="text-sm text-foreground">
                    {event.client?.businessName || (
                      <span className="text-muted-foreground/70 italic">Not applicable</span>
                    )}
                  </p>
                </div>

                {event.description && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{event.description}</p>
                  </div>
                )}

                {event.dressCode && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Dress Code</p>
                    <p className="text-sm text-foreground">{event.dressCode}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Venue Information Section */}
            <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
              <h3 className="text-base font-semibold border-b border-border pb-2 mb-4">Venue Information</h3>
              <div className="space-y-2">
                <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                  <span className="text-muted-foreground">Venue:</span>
                  <span className="font-medium text-foreground">{event.venueName}</span>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                  <span className="text-muted-foreground">Address:</span>
                  <span className="text-foreground">{event.address}</span>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                  <span className="text-muted-foreground">Room:</span>
                  <span className="text-foreground">{event.room}</span>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                  <span className="text-muted-foreground">Location:</span>
                  <span className="text-foreground">{event.city}, {event.state} {event.zipCode}</span>
                </div>
              </div>
            </div>

            {/* Schedule Section */}
            <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
              <h3 className="text-base font-semibold border-b border-border pb-2 mb-4">Schedule</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Start</p>
                  <p className="text-sm text-foreground">{formatDateTime(event.startDate, event.startTime, { dateFormat: 'long' })}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">End</p>
                  <p className="text-sm text-foreground">{formatDateTime(event.endDate, event.endTime, { dateFormat: 'long' })}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Timezone</p>
                  <p className="text-sm text-foreground font-mono">{event.timezone}</p>
                </div>
              </div>
            </div>

            {/* Files Section */}
            {event.fileLinks && Array.isArray(event.fileLinks) && event.fileLinks.length > 0 && (
              <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
                <h3 className="text-base font-semibold border-b border-border pb-2 mb-4">Files</h3>
                <div className="space-y-2">
                  {event.fileLinks.map((file: any, index: number) => (
                    <a
                      key={index}
                      href={file.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer"
                    >
                      <span className="truncate">{file.name}</span>
                      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Internal Notes Section */}
            {event.privateComments && (
              <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
                <h3 className="text-base font-semibold border-b border-border pb-2 mb-4">Internal Notes</h3>
                <p className="text-sm text-foreground whitespace-pre-wrap">{event.privateComments}</p>
              </div>
            )}

            {/* Metadata Section */}
            <div className="bg-muted/20 border border-border/30 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Metadata</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground mb-1">Created</p>
                  <p className="text-foreground font-medium">
                    {format(new Date(event.createdAt), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Last Updated</p>
                  <p className="text-foreground font-medium">
                    {format(new Date(event.updatedAt), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        {event && (
          <Button
            variant="secondary"
            onClick={() => {
              onClose();
              router.push(`/events/${event.id}/call-times`);
            }}
          >
            <UsersIcon className="h-4 w-4 mr-2" />
            Manage Call Times
          </Button>
        )}
        {event && onEdit && (
          <Button onClick={handleEdit}>
            <EditIcon className="h-4 w-4 mr-2" />
            Edit {terminology.event.singular}
          </Button>
        )}
      </DialogFooter>
    </Dialog>
  );
}

