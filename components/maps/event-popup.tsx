"use client";

import React from "react";
import { Popup } from "react-map-gl/mapbox";
import { EventStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Eye, Pencil, X } from "lucide-react";
import { format } from "date-fns";
import { isDateNullOrUBD } from "@/lib/utils/date-formatter";

interface EventPopupProps {
  latitude: number;
  longitude: number;
  event: {
    id: string;
    title: string;
    venueName: string;
    city: string;
    state: string;
    startDate: Date | null;
    status: EventStatus;
  };
  onClose: () => void;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
}

/**
 * Status badge color mapping
 */
const STATUS_VARIANTS: Record<
  EventStatus,
  "default" | "secondary" | "success" | "warning" | "destructive"
> = {
  DRAFT: "secondary",
  ASSIGNED: "default",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  CANCELLED: "destructive",
};

/**
 * Event Popup Component
 * Displays event details in a popup when marker is clicked
 */
export function EventPopup({
  latitude,
  longitude,
  event,
  onClose,
  onView,
  onEdit,
}: EventPopupProps) {
  return (
    <Popup
      latitude={latitude}
      longitude={longitude}
      onClose={onClose}
      closeButton={false}
      closeOnClick={false}
      anchor="top"
      offset={20}
      className="event-popup"
      maxWidth="320px"
    >
      <div className="relative min-w-[280px] max-w-[300px] bg-background rounded-lg shadow-xl border overflow-hidden">
        {/* Custom Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close popup"
        >
          <X size={14} />
        </button>

        {/* Content */}
        <div className="p-4 pt-3">
          <div className="space-y-3">
            {/* Title and Status */}
            <div className="pr-6">
              <h3 className="font-semibold text-sm line-clamp-2 mb-2 text-foreground">
                {event.title}
              </h3>
              <Badge variant={STATUS_VARIANTS[event.status]} className="text-xs">
                {event.status.replace(/_/g, " ")}
              </Badge>
            </div>

            {/* Venue Information */}
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <MapPin size={14} className="mt-0.5 shrink-0 text-primary" />
                <div>
                  <div className="font-medium text-foreground">
                    {event.venueName}
                  </div>
                  <div>
                    {event.city}, {event.state}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar size={14} className="shrink-0 text-primary" />
                <span>{isDateNullOrUBD(event.startDate) ? 'UBD' : format(new Date(event.startDate!), "EEE, MMM d, yyyy")}</span>
              </div>
            </div>

            {/* Actions */}
            {(onView || onEdit) && (
              <div className="flex gap-2 pt-3 border-t border-border">
                {onView && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={() => onView(event.id)}
                  >
                    <Eye size={12} className="mr-1.5" />
                    View
                  </Button>
                )}
                {onEdit && (
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={() => onEdit(event.id)}
                  >
                    <Pencil size={12} className="mr-1.5" />
                    Edit
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Popup>
  );
}
