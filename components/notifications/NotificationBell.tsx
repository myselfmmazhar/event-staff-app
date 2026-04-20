"use client";

import { useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotificationStore } from "@/store/notifications.store";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { NotificationDropdown } from "./NotificationDropdown";

/**
 * Notification Bell component for the header
 * Shows unread count badge and dropdown on click
 */
export function NotificationBell() {
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { unreadCount, isDropdownOpen, toggleDropdown, closeDropdown } = useNotificationStore();

    // Initialize notifications hook (handles WebSocket connection)
    useNotifications();

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                closeDropdown();
            }
        }

        if (isDropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isDropdownOpen, closeDropdown]);

    // Close on escape key
    useEffect(() => {
        function handleEscape(event: KeyboardEvent) {
            if (event.key === "Escape") {
                closeDropdown();
            }
        }

        if (isDropdownOpen) {
            document.addEventListener("keydown", handleEscape);
        }

        return () => {
            document.removeEventListener("keydown", handleEscape);
        };
    }, [isDropdownOpen, closeDropdown]);

    return (
        <div className="relative" ref={dropdownRef}>
            <Button
                variant="ghost"
                size="sm"
                onClick={toggleDropdown}
                className="relative p-2"
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
            >
                <Bell className="h-5 w-5 text-white" />

                {/* Unread count badge */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </Button>

            {/* Dropdown */}
            {isDropdownOpen && <NotificationDropdown />}
        </div>
    );
}
