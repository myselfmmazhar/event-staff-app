"use client";

import React, { useState } from "react";
import { Marker } from "react-map-gl/mapbox";
import { EventStatus } from "@prisma/client";

interface EventMarkerProps {
  latitude: number;
  longitude: number;
  status: EventStatus;
  title?: string;
  onClick?: () => void;
}

/**
 * Color mapping for event statuses
 */
const STATUS_COLORS: Record<EventStatus, { fill: string; bg: string; ring: string }> = {
  DRAFT: { fill: "#6b7280", bg: "bg-gray-500", ring: "ring-gray-400" },
  PUBLISHED: { fill: "#10b981", bg: "bg-emerald-500", ring: "ring-emerald-400" },
  ASSIGNED: { fill: "#3b82f6", bg: "bg-blue-500", ring: "ring-blue-400" },
  IN_PROGRESS: { fill: "#f59e0b", bg: "bg-amber-500", ring: "ring-amber-400" },
  COMPLETED: { fill: "#10b981", bg: "bg-emerald-500", ring: "ring-emerald-400" },
  CANCELLED: { fill: "#ef4444", bg: "bg-red-500", ring: "ring-red-400" },
};

/**
 * Event Marker Component
 * Displays a colored pin on the map based on event status with hover tooltip
 */
export function EventMarker({
  latitude,
  longitude,
  status,
  title,
  onClick,
}: EventMarkerProps) {
  const [isHovered, setIsHovered] = useState(false);
  const colors = STATUS_COLORS[status] || STATUS_COLORS.DRAFT;

  return (
    <Marker
      latitude={latitude}
      longitude={longitude}
      anchor="bottom"
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onClick?.();
      }}
    >
      <div
        className="relative cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Hover Tooltip */}
        {isHovered && title && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
            <div className="bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap max-w-[200px] truncate">
              {title}
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
              <div className="border-4 border-transparent border-t-gray-900" />
            </div>
          </div>
        )}

        {/* Marker Pin */}
        <div
          className={`relative transition-transform duration-200 ${isHovered ? "scale-125 -translate-y-1" : "scale-100"
            }`}
        >
          {/* Custom Pin Shape */}
          <svg
            width="32"
            height="40"
            viewBox="0 0 32 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
            }}
          >
            {/* Pin body */}
            <path
              d="M16 0C7.163 0 0 7.163 0 16c0 11.2 16 24 16 24s16-12.8 16-24C32 7.163 24.837 0 16 0z"
              fill={colors.fill}
            />
            {/* Inner white circle */}
            <circle cx="16" cy="14" r="6" fill="white" />
            {/* Inner colored dot */}
            <circle cx="16" cy="14" r="3.5" fill={colors.fill} />
          </svg>
        </div>
      </div>
    </Marker>
  );
}
