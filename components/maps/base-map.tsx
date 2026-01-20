"use client";

import React, { useRef, useEffect } from "react";
import Map, {
  MapRef,
  NavigationControl,
  FullscreenControl,
  ScaleControl,
  GeolocateControl,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

interface BaseMapProps {
  children?: React.ReactNode;
  initialViewState?: {
    longitude: number;
    latitude: number;
    zoom: number;
  };
  onLoad?: (map: MapRef) => void;
  style?: string;
  className?: string;
  showControls?: boolean;
}

/**
 * Base Map Component
 * Reusable wrapper for Mapbox GL with common controls
 */
export function BaseMap({
  children,
  initialViewState = {
    longitude: -98.5795,
    latitude: 39.8283,
    zoom: 4, // USA center
  },
  onLoad,
  style = "mapbox://styles/mapbox/streets-v12",
  className = "w-full h-full",
  showControls = true,
}: BaseMapProps) {
  const mapRef = useRef<MapRef>(null);

  const handleMapLoad = () => {
    if (mapRef.current && onLoad) {
      onLoad(mapRef.current);
    }
  };

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-muted rounded-lg">
        <div className="text-center p-6">
          <p className="text-muted-foreground">
            Mapbox token not configured. Please add NEXT_PUBLIC_MAPBOX_TOKEN to
            your .env file.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={initialViewState}
        style={{ width: "100%", height: "100%" }}
        mapStyle={style}
        attributionControl={false}
        onLoad={handleMapLoad}
      >
        {showControls && (
          <>
            <NavigationControl position="top-right" />
            <FullscreenControl position="top-right" />
            <GeolocateControl position="top-right" />
            <ScaleControl />
          </>
        )}
        {children}
      </Map>
    </div>
  );
}
