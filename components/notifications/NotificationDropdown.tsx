"use client";

import Link from "next/link";
import { CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { useNotificationStore } from "@/store/notifications.store";
import { NotificationItem } from "./NotificationItem";

/**
 * Notification dropdown panel
 * Shows recent notifications with mark all as read action
 */
export function NotificationDropdown() {
    const { closeDropdown } = useNotificationStore();
    const {
        notifications,
        isLoading,
        markAllAsRead,
        isMarkingAllAsRead,
        unreadCount,
    } = useNotifications();

    return (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-border bg-background shadow-lg z-50">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h3 className="font-semibold">Notifications</h3>
                {unreadCount > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={markAllAsRead}
                        disabled={isMarkingAllAsRead}
                        className="h-7 text-xs"
                    >
                        {isMarkingAllAsRead ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                            <>
                                <CheckCheck className="mr-1 h-3 w-3" />
                                Mark all read
                            </>
                        )}
                    </Button>
                )}
            </div>

            {/* Notifications list */}
            <div className="max-h-96 overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                        No notifications yet
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {notifications.map((notification) => (
                            <NotificationItem
                                key={notification.id}
                                notification={notification}
                                onRead={closeDropdown}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
                <div className="border-t border-border px-4 py-2">
                    <Link
                        href="/notifications"
                        onClick={closeDropdown}
                        className="block text-center text-sm text-primary hover:underline"
                    >
                        View all notifications
                    </Link>
                </div>
            )}
        </div>
    );
}
