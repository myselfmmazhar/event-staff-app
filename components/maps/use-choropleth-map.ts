"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { MapRef } from "react-map-gl/mapbox";

interface LocationData {
  city: string | null;
  state: string;
  latitude: number | null;
  longitude: number | null;
}

interface ChoroplethStats {
  byState: Map<string, number>;
  byCity: { location: string; count: number }[];
  totalCities: number;
  totalStates: number;
  maxCount: number;
}

interface UseChoroplethMapOptions {
  locations: LocationData[] | undefined;
  onStateClick?: (stateName: string) => void;
}

interface UseChoroplethMapReturn {
  mapRef: React.RefObject<MapRef | null>;
  mapReady: boolean;
  setMapReady: (ready: boolean) => void;
  hoveredState: string | null;
  hoveredStateCount: number;
  stats: ChoroplethStats;
}

/**
 * Custom hook for managing choropleth map state and interactions
 */
export function useChoroplethMap({
  locations,
  onStateClick,
}: UseChoroplethMapOptions): UseChoroplethMapReturn {
  const mapRef = useRef<MapRef | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const layersAddedRef = useRef(false);

  // Store callback in ref to avoid re-running effect
  const onStateClickRef = useRef(onStateClick);
  onStateClickRef.current = onStateClick;

  // Calculate stats from locations
  const stats = useMemo<ChoroplethStats>(() => {
    if (!locations || locations.length === 0) {
      return {
        byState: new Map<string, number>(),
        byCity: [],
        totalCities: 0,
        totalStates: 0,
        maxCount: 0,
      };
    }

    // Group by state
    const stateMap = new Map<string, number>();
    locations.forEach((loc) => {
      const state = loc.state;
      stateMap.set(state, (stateMap.get(state) || 0) + 1);
    });

    // Group by city
    const cityMap = new Map<string, number>();
    locations.forEach((loc) => {
      const key = `${loc.city}, ${loc.state}`;
      cityMap.set(key, (cityMap.get(key) || 0) + 1);
    });

    const byCity = Array.from(cityMap.entries())
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const maxCount = Math.max(...Array.from(stateMap.values()));

    return {
      byState: stateMap,
      byCity,
      totalCities: cityMap.size,
      totalStates: stateMap.size,
      maxCount,
    };
  }, [locations]);

  // Store stats in ref for use in event handlers
  const statsRef = useRef(stats);
  statsRef.current = stats;

  // Add choropleth layer when map is ready - only run once when data is available
  useEffect(() => {
    if (!mapReady || !mapRef.current || !locations || locations.length === 0) {
      return;
    }

    // Skip if layers already added
    if (layersAddedRef.current) {
      return;
    }

    const map = mapRef.current.getMap();

    const addChoroplethLayer = () => {
      if (!mapRef.current || !locations) return;
      const map = mapRef.current.getMap();
      const currentStats = statsRef.current;

      // Create expression for state colors based on event count
      const stateColors: (string | number | string[])[] = ["match", ["get", "name"]];

      currentStats.byState.forEach((count, stateName) => {
        const intensity = currentStats.maxCount > 0 ? count / currentStats.maxCount : 0;
        let color: string;

        if (intensity === 0) {
          color = "rgba(59, 130, 246, 0.1)";
        } else if (intensity <= 0.25) {
          color = "rgba(59, 130, 246, 0.3)";
        } else if (intensity <= 0.5) {
          color = "rgba(59, 130, 246, 0.5)";
        } else if (intensity <= 0.75) {
          color = "rgba(59, 130, 246, 0.7)";
        } else {
          color = "rgba(59, 130, 246, 0.9)";
        }

        stateColors.push(stateName, color);
      });

      stateColors.push("rgba(100, 116, 139, 0.1)");

      // Remove existing layers if they exist
      if (map.getLayer("state-fills")) map.removeLayer("state-fills");
      if (map.getLayer("state-borders")) map.removeLayer("state-borders");
      if (map.getLayer("state-hover")) map.removeLayer("state-hover");
      if (map.getSource("states")) map.removeSource("states");

      // Add states source
      map.addSource("states", {
        type: "geojson",
        data: "https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json",
      });

      // Add fill layer
      map.addLayer({
        id: "state-fills",
        type: "fill",
        source: "states",
        paint: {
          "fill-color": stateColors as any,
          "fill-opacity": 0.8,
        },
      });

      // Add border layer
      map.addLayer({
        id: "state-borders",
        type: "line",
        source: "states",
        paint: {
          "line-color": "rgba(255, 255, 255, 0.5)",
          "line-width": 1,
        },
      });

      // Add hover highlight layer
      map.addLayer({
        id: "state-hover",
        type: "line",
        source: "states",
        paint: {
          "line-color": "#3b82f6",
          "line-width": 2,
        },
        filter: ["==", "name", ""],
      });

      // Add hover interactions
      map.on("mousemove", "state-fills", (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          if (feature) {
            const stateName = feature.properties?.name;
            if (stateName) {
              setHoveredState(stateName);
              if (map.getLayer("state-hover")) {
                map.setFilter("state-hover", ["==", "name", stateName]);
              }
              map.getCanvas().style.cursor = "pointer";
            }
          }
        }
      });

      map.on("mouseleave", "state-fills", () => {
        setHoveredState(null);
        if (map.getLayer("state-hover")) {
          map.setFilter("state-hover", ["==", "name", ""]);
        }
        map.getCanvas().style.cursor = "";
      });

      // Add click handler - use ref to get latest callback
      map.on("click", "state-fills", (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          if (feature) {
            const stateName = feature.properties?.name;
            if (stateName && statsRef.current.byState.has(stateName) && onStateClickRef.current) {
              onStateClickRef.current(stateName);
            }
          }
        }
      });

      layersAddedRef.current = true;
    };

    if (!map.isStyleLoaded()) {
      map.once("style.load", addChoroplethLayer);
    } else {
      addChoroplethLayer();
    }

    return () => {
      layersAddedRef.current = false;
      if (mapRef.current) {
        try {
          const map = mapRef.current.getMap();
          if (map.getLayer("state-fills")) map.removeLayer("state-fills");
          if (map.getLayer("state-borders")) map.removeLayer("state-borders");
          if (map.getLayer("state-hover")) map.removeLayer("state-hover");
          if (map.getSource("states")) map.removeSource("states");
        } catch {
          // Map may have been disposed, ignore cleanup errors
        }
      }
    };
  }, [locations, mapReady]);

  const hoveredStateCount = hoveredState ? stats.byState.get(hoveredState) || 0 : 0;

  return {
    mapRef,
    mapReady,
    setMapReady,
    hoveredState,
    hoveredStateCount,
    stats,
  };
}
