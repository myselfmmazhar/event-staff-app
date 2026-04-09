"use client";

import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
    Bell,
    Calendar,
    Check,
    X,
    Clock,
    Users,
    UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { NotificationType as NotificationTypeEnum } from "@prisma/client";
import type { NotificationPriority } from "@prisma/client";

/** Union derived from Prisma's runtime enum object (avoids stale `import type { NotificationType }` vs schema). */
type NotificationType = (typeof NotificationTypeEnum)[keyof typeof NotificationTypeEnum];

interface NotificationItemProps {
    notification: {
        id: string;
        type: NotificationType;
        priority: NotificationPriority;
        title: string;
        message: string;
        actionUrl: string | null;
        isRead: boolean;
        batchCount: number;
        createdAt: Date;
    };
    onRead?: () => void;
}

// Icon mapping for notification types (keys must match `NotificationTypeEnum` from Prisma generate)
const typeIcons: Record<
    keyof typeof NotificationTypeEnum,
    React.ComponentType<{ className?: string }>
> = {
    CALL_TIME_INVITATION: Calendar,
    INVITATION_RESPONSE: Check,
    INVITATION_CONFIRMED: Check,
    WAITLIST_UPDATE: Clock,
    EVENT_UPDATE: Calendar,
    EVENT_CANCELLED: X,
    SHIFT_REMINDER: Bell,
    STAFF_INVITATION: UserPlus,
    GENERAL: Bell,
    // Event status change notifications
    EVENT_FULLY_STAFFED: Check,
    EVENT_STARTED: Calendar,
    EVENT_COMPLETED: Check,
    INVITATION_BATCH: Users,
};

// Color mapping for notification types
const typeColors: Record<keyof typeof NotificationTypeEnum, string> = {
    CALL_TIME_INVITATION: "text-blue-500",
    INVITATION_RESPONSE: "text-green-500",
    INVITATION_CONFIRMED: "text-green-600",
    WAITLIST_UPDATE: "text-yellow-500",
    EVENT_UPDATE: "text-purple-500",
    EVENT_CANCELLED: "text-red-500",
    SHIFT_REMINDER: "text-orange-500",
    STAFF_INVITATION: "text-indigo-500",
    GENERAL: "text-gray-500",
    // Event status change notifications
    EVENT_FULLY_STAFFED: "text-green-500",
    EVENT_STARTED: "text-blue-600",
    EVENT_COMPLETED: "text-green-700",
    INVITATION_BATCH: "text-indigo-600",
};

/**
 * Single notification item component
 */
export function NotificationItem({ notification, onRead }: NotificationItemProps) {
    const router = useRouter();
    const { markAsRead } = useNotifications();

    const Icon = typeIcons[notification.type] || Bell;
    const iconColor = typeColors[notification.type] || "text-gray-500";

    const handleClick = async () => {
        // Mark as read if not already
        if (!notification.isRead) {
            await markAsRead(notification.id);
        }

        // Navigate if there's an action URL
        if (notification.actionUrl) {
            router.push(notification.actionUrl);
        }

        // Close dropdown
        onRead?.();
    };

    const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
        addSuffix: true,
    });

    return (
        <button
            onClick={handleClick}
            className={cn(
                "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                !notification.isRead && "bg-muted/30"
            )}
        >
            {/* Icon */}
            <div className={cn("mt-0.5 flex-shrink-0", iconColor)}>
                <Icon className="h-5 w-5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <p className={cn(
                        "text-sm font-medium line-clamp-1",
                        !notification.isRead && "font-semibold"
                    )}>
                        {notification.title}
                        {notification.batchCount > 1 && (
                            <span className="ml-1 text-xs text-muted-foreground">
                                (+{notification.batchCount - 1})
                            </span>
                        )}
                    </p>
                    {!notification.isRead && (
                        <span className="flex-shrink-0 h-2 w-2 rounded-full bg-blue-500" />
                    )}
                </div>

                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                    {notification.message}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                    {timeAgo}
                </p>
            </div>
        </button>
    );
}
