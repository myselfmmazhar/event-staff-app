"use client";

import React, { useState } from "react";
import { BaseMap } from "@/components/maps/base-map";
import { trpc } from "@/lib/client/trpc";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle, MapPin, Map as MapIcon, TrendingUp } from "lucide-react";
import { useTerminology } from "@/lib/hooks/use-terminology";
import { ViewEventModal } from "@/components/events/view-event-modal";
import { useChoroplethMap } from "./use-choropleth-map";
import { StateEventsModal } from "./state-events-modal";
import { HeatMapSidebar } from "./heat-map-sidebar";

interface HeatMapProps {
  startDate?: Date;
  endDate?: Date;
  className?: string;
  showStats?: boolean;
}

/**
 * Choropleth Map Component
 * Displays event distribution with state-level coloring
 */
export function HeatMap({ startDate, endDate, className, showStats = true }: HeatMapProps) {
  const { terminology } = useTerminology();

  // State events modal
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [stateModalOpen, setStateModalOpen] = useState(false);

  // View event modal
  const [viewEventId, setViewEventId] = useState<string | null>(null);
  const [viewEventModalOpen, setViewEventModalOpen] = useState(false);

  // Fetch location data
  const { data: locations, isLoading, error } = trpc.event.getLocationData.useQuery(
    { startDate, endDate },
    { refetchOnWindowFocus: false }
  );

  // Fetch events for selected state
  const { data: stateEvents, isLoading: isLoadingStateEvents } = trpc.event.getByState.useQuery(
    { state: selectedState || "" },
    { enabled: !!selectedState && stateModalOpen }
  );

  // Handle state click - open modal
  const handleStateClick = (stateName: string) => {
    setSelectedState(stateName);
    setStateModalOpen(true);
  };

  // Use choropleth map hook
  const { mapRef, setMapReady, hoveredState, hoveredStateCount, stats } = useChoroplethMap({
    locations,
    onStateClick: handleStateClick,
  });

  // Handle view event from list
  const handleViewEvent = (eventId: string) => {
    setViewEventId(eventId);
    setViewEventModalOpen(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="relative w-full h-[450px] rounded-lg overflow-hidden border shadow-lg bg-linear-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }}
          />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="relative mb-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp size={32} className="text-primary animate-pulse" />
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 mb-2">
              <Spinner size="sm" />
              <p className="text-base font-medium text-foreground">Loading distribution...</p>
            </div>
            <p className="text-sm text-muted-foreground">Analyzing {terminology.event.lower} locations</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="relative w-full h-[450px] rounded-lg overflow-hidden border shadow-lg bg-linear-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center p-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle size={32} className="text-destructive" />
            </div>
            <p className="text-lg font-semibold text-destructive mb-2">Failed to load data</p>
            <p className="text-sm text-muted-foreground max-w-xs">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!locations || locations.length === 0) {
    return (
      <div className="relative w-full h-[450px] rounded-lg overflow-hidden border-2 border-dashed border-muted-foreground/25 bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="absolute inset-0 opacity-5">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(rgba(0,0,0,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.2) 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }}
          />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center p-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <MapIcon size={40} className="text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold text-foreground mb-2">No {terminology.event.lower} locations yet</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Add addresses to your {terminology.event.lowerPlural} using the address autocomplete to see their geographic
              distribution
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={className || "w-full"}>
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Map Container */}
          <div className="relative flex-1 h-[450px] rounded-lg overflow-hidden border shadow-lg">
            <BaseMap
              onLoad={(map) => {
                mapRef.current = map;
                setMapReady(true);
              }}
              initialViewState={{
                longitude: -98.5795,
                latitude: 39.8283,
                zoom: 3.5,
              }}
              style="mapbox://styles/mapbox/light-v11"
              showControls={false}
            />

            {/* Event Count Badge */}
            <div className="absolute top-4 left-4 bg-background/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-primary" />
                <p className="text-sm font-medium">
                  {locations.length} {locations.length === 1 ? terminology.event.lower : terminology.event.lowerPlural}
                </p>
              </div>
            </div>

            {/* Hover tooltip */}
            {hoveredState && (
              <div className="absolute top-4 right-4 bg-background/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border">
                <p className="text-sm font-semibold">{hoveredState}</p>
                <p className="text-xs text-muted-foreground">
                  {hoveredStateCount} {hoveredStateCount === 1 ? terminology.event.lower : terminology.event.lowerPlural}
                </p>
                {hoveredStateCount > 0 && (
                  <p className="text-xs text-primary mt-1">Click to view {terminology.event.lowerPlural}</p>
                )}
              </div>
            )}

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-background/95 backdrop-blur-sm px-4 py-3 rounded-lg shadow-lg border">
              <p className="text-xs font-semibold mb-2 text-foreground">{terminology.event.plural} per State</p>
              <div className="flex items-center gap-1">
                {[0.1, 0.3, 0.5, 0.7, 0.9].map((opacity, i) => (
                  <div
                    key={i}
                    className="w-6 h-4 rounded-sm"
                    style={{ backgroundColor: `rgba(59, 130, 246, ${opacity})` }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>Fewer</span>
                <span>More</span>
              </div>
            </div>
          </div>

          {/* Stats Sidebar */}
          {showStats && (
            <HeatMapSidebar
              terminology={terminology}
              totalLocations={locations.length}
              totalStates={stats.totalStates}
              totalCities={stats.totalCities}
              topCities={stats.byCity}
            />
          )}
        </div>
      </div>

      {/* State Events Modal */}
      <StateEventsModal
        open={stateModalOpen}
        onClose={() => setStateModalOpen(false)}
        stateName={selectedState}
        events={stateEvents}
        isLoading={isLoadingStateEvents}
        onViewEvent={handleViewEvent}
        terminology={terminology}
      />

      {/* View Event Modal */}
      <ViewEventModal
        eventId={viewEventId}
        open={viewEventModalOpen}
        onClose={() => {
          setViewEventModalOpen(false);
          setViewEventId(null);
        }}
      />
    </>
  );
}
