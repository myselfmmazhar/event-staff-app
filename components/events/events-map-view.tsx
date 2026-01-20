"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { MapRef } from "react-map-gl/mapbox";
import { BaseMap } from "@/components/maps/base-map";
import { EventMarker } from "@/components/maps/event-marker";
import { EventPopup } from "@/components/maps/event-popup";
import { trpc } from "@/lib/client/trpc";
import { EventStatus } from "@prisma/client";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle, ChevronDown, ChevronUp, MapPin, Map } from "lucide-react";

/**
 * Status colors for legend
 */
const STATUS_LEGEND: { status: EventStatus; label: string; color: string }[] = [
  { status: EventStatus.DRAFT, label: "Draft", color: "#6b7280" },
  { status: EventStatus.PUBLISHED, label: "Published", color: "#3b82f6" },
  { status: EventStatus.CONFIRMED, label: "Confirmed", color: "#10b981" },
  { status: EventStatus.IN_PROGRESS, label: "In Progress", color: "#f59e0b" },
  { status: EventStatus.COMPLETED, label: "Completed", color: "#8b5cf6" },
  { status: EventStatus.CANCELLED, label: "Cancelled", color: "#ef4444" },
];

interface EventsMapViewProps {
  status?: EventStatus;
  clientId?: string;
  search?: string;
  onViewEvent?: (id: string) => void;
  onEditEvent?: (id: string) => void;
}

interface MapEvent {
  id: string;
  title: string;
  venueName: string;
  city: string;
  state: string;
  startDate: Date;
  status: EventStatus;
  latitude: number;
  longitude: number;
}

/**
 * Events Map View Component
 * Displays events on an interactive map with markers
 */
export function EventsMapView({
  status,
  clientId,
  search,
  onViewEvent,
  onEditEvent,
}: EventsMapViewProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [legendExpanded, setLegendExpanded] = useState(false);
  const mapRef = useRef<MapRef>(null);

  // Fetch events for map
  const { data: events, isLoading, error } = trpc.event.getForMap.useQuery(
    {
      status,
      clientId,
      search,
    },
    {
      refetchOnWindowFocus: false,
    }
  );

  // Calculate bounds to fit all events
  const fitMapToEvents = useCallback(() => {
    if (!mapRef.current || !events || events.length === 0) return;

    // Find bounds of all events
    let minLng = Infinity;
    let maxLng = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;

    events.forEach((event) => {
      if (event.latitude && event.longitude) {
        minLng = Math.min(minLng, event.longitude);
        maxLng = Math.max(maxLng, event.longitude);
        minLat = Math.min(minLat, event.latitude);
        maxLat = Math.max(maxLat, event.latitude);
      }
    });

    // Add padding
    const padding = 50;

    // Fit bounds
    try {
      mapRef.current.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        {
          padding: { top: padding, bottom: padding, left: padding, right: padding },
          maxZoom: 15,
          duration: 1000,
        }
      );
    } catch (error) {
      console.error("Error fitting bounds:", error);
    }
  }, [events]);

  // Fit map when events load
  useEffect(() => {
    if (events && events.length > 0) {
      // Small delay to ensure map is ready
      const timer = setTimeout(() => {
        fitMapToEvents();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [events, fitMapToEvents]);

  const selectedEvent = events?.find((e) => e.id === selectedEventId);

  if (isLoading) {
    return (
      <div className="relative w-full h-[600px] rounded-lg overflow-hidden border shadow-lg bg-linear-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
        {/* Decorative map grid pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }} />
        </div>

        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            {/* Animated map icon */}
            <div className="relative mb-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Map size={40} className="text-primary animate-pulse" />
              </div>
              {/* Ping effect */}
              <div className="absolute inset-0 w-20 h-20 mx-auto rounded-full bg-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
            </div>

            {/* Loading spinner and text */}
            <div className="flex items-center justify-center gap-3 mb-2">
              <Spinner size="sm" />
              <p className="text-base font-medium text-foreground">Loading map...</p>
            </div>
            <p className="text-sm text-muted-foreground">Fetching event locations</p>
          </div>
        </div>

        {/* Decorative corner markers */}
        <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-primary/30 rounded-tl-lg" />
        <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-primary/30 rounded-tr-lg" />
        <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-primary/30 rounded-bl-lg" />
        <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-primary/30 rounded-br-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative w-full h-[600px] rounded-lg overflow-hidden border shadow-lg bg-linear-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center p-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle size={32} className="text-destructive" />
            </div>
            <p className="text-lg font-semibold text-destructive mb-2">Failed to load map</p>
            <p className="text-sm text-muted-foreground max-w-xs">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="relative w-full h-[600px] rounded-lg overflow-hidden border-2 border-dashed border-muted-foreground/25 bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        {/* Decorative map grid pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.2) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.2) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }} />
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center p-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <MapPin size={40} className="text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold text-foreground mb-2">No events with locations</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Create events with addresses using the address autocomplete to see them on the map
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden border shadow-lg">
      <BaseMap
        onLoad={(map) => {
          mapRef.current = map;
        }}
      >
        {/* Event Markers */}
        {events.map((event) => {
          if (!event.latitude || !event.longitude) return null;

          return (
            <EventMarker
              key={event.id}
              latitude={event.latitude}
              longitude={event.longitude}
              status={event.status}
              title={event.title}
              onClick={() => setSelectedEventId(event.id)}
            />
          );
        })}

        {/* Selected Event Popup */}
        {selectedEvent && selectedEvent.latitude && selectedEvent.longitude && (
          <EventPopup
            latitude={selectedEvent.latitude}
            longitude={selectedEvent.longitude}
            event={selectedEvent}
            onClose={() => setSelectedEventId(null)}
            onView={onViewEvent}
            onEdit={onEditEvent}
          />
        )}
      </BaseMap>

      {/* Event Count Badge */}
      <div className="absolute top-4 left-4 bg-background/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border">
        <p className="text-sm font-medium">
          {events.length} {events.length === 1 ? "event" : "events"} on map
        </p>
      </div>

      {/* Status Legend */}
      <div className="absolute bottom-4 left-4 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border overflow-hidden">
        <button
          onClick={() => setLegendExpanded(!legendExpanded)}
          className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
        >
          <span>Status Legend</span>
          {legendExpanded ? (
            <ChevronDown size={16} className="ml-2" />
          ) : (
            <ChevronUp size={16} className="ml-2" />
          )}
        </button>
        {legendExpanded && (
          <div className="px-3 pb-3 pt-1 border-t space-y-1.5">
            {STATUS_LEGEND.map(({ status: s, label, color }) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full ring-2 ring-white shadow-sm"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
