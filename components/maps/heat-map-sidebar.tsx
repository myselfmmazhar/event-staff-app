"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Building2,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import { getEventRoute } from "@/lib/utils/route-helpers";
import { type TerminologyConfig } from "@/lib/config/terminology";

interface HeatMapSidebarProps {
  terminology: TerminologyConfig;
  totalLocations: number;
  totalStates: number;
  totalCities: number;
  topCities: { location: string; count: number }[];
}

/**
 * Event Summary Card - displays total events, states, and cities
 */
function EventSummaryCard({
  terminology,
  totalLocations,
  totalStates,
  totalCities,
}: {
  terminology: TerminologyConfig;
  totalLocations: number;
  totalStates: number;
  totalCities: number;
}) {
  return (
    <div className="bg-card border rounded-lg shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={18} className="text-primary" />
        <h4 className="font-semibold text-sm">{terminology.event.singular} Summary</h4>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total {terminology.event.plural}</span>
          <span className="text-lg font-bold text-foreground">{totalLocations}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">States Covered</span>
          <span className="text-lg font-bold text-foreground">{totalStates}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Cities Covered</span>
          <span className="text-lg font-bold text-foreground">{totalCities}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Top Cities Card - displays the top 5 cities by event count
 */
function TopCitiesCard({
  topCities,
}: {
  topCities: { location: string; count: number }[];
}) {
  return (
    <div className="bg-card border rounded-lg shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Building2 size={18} className="text-primary" />
        <h4 className="font-semibold text-sm">Top Cities</h4>
      </div>
      {topCities.length > 0 ? (
        <div className="space-y-2">
          {topCities.map((item, index) => (
            <div key={item.location} className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-medium text-muted-foreground w-4">
                  {index + 1}.
                </span>
                <span className="text-sm truncate">{item.location}</span>
              </div>
              <span className="text-sm font-semibold text-primary ml-2">{item.count}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No city data</p>
      )}
    </div>
  );
}

/**
 * Coverage Stats Card - displays US coverage percentage
 */
function CoverageStatsCard({
  terminology,
  totalStates,
}: {
  terminology: TerminologyConfig;
  totalStates: number;
}) {
  const coveragePercent = Math.round((totalStates / 50) * 100);

  return (
    <div className="bg-card border rounded-lg shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={18} className="text-primary" />
        <h4 className="font-semibold text-sm">US Coverage</h4>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">States with {terminology.event.lowerPlural}</span>
          <span className="font-medium">{totalStates} / 50</span>
        </div>
        <Progress value={coveragePercent} className="h-2" />
        <p className="text-xs text-muted-foreground">{coveragePercent}% of US states</p>
      </div>
    </div>
  );
}

/**
 * Quick Actions Card - navigation button to view all events on map
 */
function QuickActionsCard({
  terminology,
}: {
  terminology: TerminologyConfig;
}) {
  const router = useRouter();

  return (
    <div className="bg-card border rounded-lg shadow-sm p-4">
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => router.push(`${getEventRoute(terminology)}?view=map`)}
      >
        <ExternalLink size={14} className="mr-2" />
        View All {terminology.event.plural} on Map
      </Button>
    </div>
  );
}

/**
 * Heat Map Sidebar - displays stats and actions for the choropleth map
 */
export function HeatMapSidebar({
  terminology,
  totalLocations,
  totalStates,
  totalCities,
  topCities,
}: HeatMapSidebarProps) {
  return (
    <div className="lg:w-72 space-y-4">
      <EventSummaryCard
        terminology={terminology}
        totalLocations={totalLocations}
        totalStates={totalStates}
        totalCities={totalCities}
      />
      <TopCitiesCard topCities={topCities} />
      <CoverageStatsCard terminology={terminology} totalStates={totalStates} />
      <QuickActionsCard terminology={terminology} />
    </div>
  );
}
