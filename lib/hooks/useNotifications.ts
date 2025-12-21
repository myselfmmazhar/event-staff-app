"use client";

import { useEffect, useCallback } from "react";
import { trpc } from "@/lib/client/trpc";
import { useSession } from "@/lib/client/auth";
import { useNotificationStore } from "@/store/notifications.store";
import { supabase } from "@/lib/client/supabase";
import { toast } from "@/components/ui/use-toast";
import type { NotificationType, NotificationPriority } from "@prisma/client";
import type { RealtimePostgresInsertPayload } from "@supabase/supabase-js";

/**
 * Database notification record from Supabase Realtime
 */
interface NotificationRecord {
    id: string;
    userId: string;
    type: NotificationType;
    priority: NotificationPriority;
    title: string;
    message: string;
    actionUrl: string | null;
    actionLabel: string | null;
    batchCount: number;
    isRead: boolean;
    createdAt: string;
}

/**
 * Hook for managing notifications
 * Uses Supabase Realtime for real-time updates (Vercel-compatible)
 */
export function useNotifications(options?: { enabled?: boolean }) {
    const { data: session } = useSession();
    const userId = session?.user?.id;
    const utils = trpc.useUtils();

    const {
        unreadCount,
        setUnreadCount,
        incrementUnread,
        setConnected,
        closeDropdown,
    } = useNotificationStore();

    // Fetch notifications
    const {
        data: notificationsData,
        isLoading,
        refetch: refetchNotifications,
    } = trpc.notification.getAll.useQuery(
        { limit: 10 },
        {
            enabled: options?.enabled !== false && !!userId,
            staleTime: 30000, // 30 seconds
        }
    );

    // Fetch unread count
    const { data: countData, refetch: refetchCount } = trpc.notification.getUnreadCount.useQuery(
        undefined,
        {
            enabled: options?.enabled !== false && !!userId,
            staleTime: 30000,
            refetchInterval: 60000, // Fallback polling every 60 seconds
        }
    );

    // Update store when count changes
    useEffect(() => {
        if (countData?.count !== undefined) {
            setUnreadCount(countData.count);
        }
    }, [countData?.count, setUnreadCount]);

    // Mark as read mutation
    const markAsReadMutation = trpc.notification.markAsRead.useMutation({
        onSuccess: () => {
            utils.notification.getAll.invalidate();
            utils.notification.getUnreadCount.invalidate();
        },
    });

    // Mark all as read mutation
    const markAllAsReadMutation = trpc.notification.markAllAsRead.useMutation({
        onSuccess: () => {
            utils.notification.getAll.invalidate();
            utils.notification.getUnreadCount.invalidate();
            setUnreadCount(0);
        },
    });

    // Archive mutation
    const archiveMutation = trpc.notification.archive.useMutation({
        onSuccess: () => {
            utils.notification.getAll.invalidate();
        },
    });

    // Supabase Realtime subscription
    useEffect(() => {
        if (!userId || options?.enabled === false) return;

        // Subscribe to new notifications for this user
        const channel = supabase
            .channel(`notifications:${userId}`)
            .on<NotificationRecord>(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    filter: `userId=eq.${userId}`,
                },
                (payload: RealtimePostgresInsertPayload<NotificationRecord>) => {
                    const notification = payload.new;
                    console.log("[Notifications] New notification received:", notification);

                    // Increment unread count
                    incrementUnread();

                    // Invalidate queries to refresh data
                    utils.notification.getAll.invalidate();

                    // Show toast notification
                    toast({
                        title: notification.title,
                        description: notification.message,
                    });
                }
            )
            .subscribe((status) => {
                console.log("[Notifications] Subscription status:", status);
                setConnected(status === "SUBSCRIBED");
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, options?.enabled, setConnected, incrementUnread, utils]);

    // Mark single notification as read
    const markAsRead = useCallback(
        async (id: string) => {
            await markAsReadMutation.mutateAsync({ id });
        },
        [markAsReadMutation]
    );

    // Mark all notifications as read
    const markAllAsRead = useCallback(async () => {
        await markAllAsReadMutation.mutateAsync();
        closeDropdown();
    }, [markAllAsReadMutation, closeDropdown]);

    // Archive notification
    const archive = useCallback(
        async (id: string) => {
            await archiveMutation.mutateAsync({ id });
        },
        [archiveMutation]
    );

    return {
        notifications: notificationsData?.notifications ?? [],
        totalNotifications: notificationsData?.total ?? 0,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
        archive,
        refetch: () => {
            refetchNotifications();
            refetchCount();
        },
        isMarkingAsRead: markAsReadMutation.isPending,
        isMarkingAllAsRead: markAllAsReadMutation.isPending,
    };
}
