"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { MapPin, Map as MapIcon, Clock, Eye } from "lucide-react";
import { EVENT_STATUS_COLORS, EVENT_STATUS_LABELS } from "@/lib/constants";
import { format } from "date-fns";
import { EventStatus } from "@prisma/client";
import { isDateNullOrUBD } from "@/lib/utils/date-formatter";

interface StateEvent {
  id: string;
  eventId: string;
  title: string;
  venueName: string | null;
  city: string | null;
  state: string | null;
  startDate: Date | null;
  endDate: Date | null;
  status: EventStatus;
}

interface StateEventsModalProps {
  open: boolean;
  onClose: () => void;
  stateName: string | null;
  events: StateEvent[] | undefined;
  isLoading: boolean;
  onViewEvent: (eventId: string) => void;
  terminology: {
    event: {
      plural: string;
      lowerPlural: string;
    };
  };
}

/**
 * Modal component for displaying events in a selected state
 */
export function StateEventsModal({
  open,
  onClose,
  stateName,
  events,
  isLoading,
  onViewEvent,
  terminology,
}: StateEventsModalProps) {
  return (
    <Dialog open={open} onClose={onClose} className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>
          {terminology.event.plural} in {stateName}
        </DialogTitle>
      </DialogHeader>
      <DialogContent className="max-h-[60vh] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="md" />
            <span className="ml-3 text-muted-foreground">
              Loading {terminology.event.lowerPlural}...
            </span>
          </div>
        ) : events && events.length > 0 ? (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm truncate">{event.title}</p>
                    <Badge variant={EVENT_STATUS_COLORS[event.status]} className="text-xs">
                      {EVENT_STATUS_LABELS[event.status]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {event.city}, {event.state}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {isDateNullOrUBD(event.startDate) ? 'UBD' : format(new Date(event.startDate!), "MMM d, yyyy")}
                    </span>
                  </div>
                  {event.venueName && (
                    <p className="text-xs text-muted-foreground mt-1">{event.venueName}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewEvent(event.id)}
                  className="ml-2"
                >
                  <Eye size={16} className="mr-1" />
                  View
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <MapIcon size={40} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              No {terminology.event.lowerPlural} found in {stateName}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
