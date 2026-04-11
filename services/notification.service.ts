import { PrismaClient, NotificationType, NotificationPriority, Prisma } from "@prisma/client";
import type { CreateNotificationInput, QueryNotificationsInput, UpdatePreferencesInput } from "@/lib/schemas/notification.schema";

// Define return types
interface PaginatedNotifications {
    notifications: Notification[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

interface Notification {
    id: string;
    userId: string;
    type: NotificationType;
    priority: NotificationPriority;
    title: string;
    message: string;
    actionUrl: string | null;
    actionLabel: string | null;
    relatedEntityType: string | null;
    relatedEntityId: string | null;
    batchKey: string | null;
    batchCount: number;
    isRead: boolean;
    readAt: Date | null;
    isArchived: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// Batch window for grouping notifications (5 minutes)
const BATCH_WINDOW_MS = 5 * 60 * 1000;

/**
 * Notification Service - Core CRUD operations for notifications
 */
export class NotificationService {
    constructor(private prisma: PrismaClient) { }

    /**
     * Create a notification with optional batching/grouping
     */
    async create(data: CreateNotificationInput): Promise<Notification> {
        // Check for existing batch if batchKey provided
        if (data.batchKey) {
            const existingBatch = await this.findRecentBatch(data.userId, data.batchKey);
            if (existingBatch) {
                // Increment batch count instead of creating new
                return await this.incrementBatch(existingBatch.id, data.message);
            }
        }

        // Create new notification
        const notification = await this.prisma.notification.create({
            data: {
                userId: data.userId,
                type: data.type,
                priority: data.priority,
                title: data.title,
                message: data.message,
                actionUrl: data.actionUrl,
                actionLabel: data.actionLabel,
                relatedEntityType: data.relatedEntityType,
                relatedEntityId: data.relatedEntityId,
                batchKey: data.batchKey,
                batchCount: 1,
            },
        });

        return notification;
    }

    /**
     * Create notifications for multiple users (bulk)
     */
    async createBulk(
        userIds: string[],
        data: Omit<CreateNotificationInput, "userId">
    ): Promise<Notification[]> {
        const notifications = await Promise.all(
            userIds.map((userId) =>
                this.create({
                    ...data,
                    userId,
                })
            )
        );
        return notifications;
    }

    /**
     * Find recent batch notification for grouping
     */
    private async findRecentBatch(userId: string, batchKey: string) {
        const batchWindowStart = new Date(Date.now() - BATCH_WINDOW_MS);

        return await this.prisma.notification.findFirst({
            where: {
                userId,
                batchKey,
                isRead: false,
                createdAt: {
                    gte: batchWindowStart,
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    }

    /**
     * Increment batch count and update message
     */
    private async incrementBatch(id: string, newMessage: string): Promise<Notification> {
        return await this.prisma.notification.update({
            where: { id },
            data: {
                batchCount: { increment: 1 },
                message: newMessage, // Update to latest message
                updatedAt: new Date(),
            },
        });
    }

    /**
     * Get notifications for a user with pagination
     */
    async getForUser(userId: string, query: QueryNotificationsInput = {}): Promise<PaginatedNotifications> {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;

        const where: Prisma.NotificationWhereInput = {
            userId,
            isArchived: query.isArchived ?? false,
        };

        if (query.isRead !== undefined) {
            where.isRead = query.isRead;
        }

        if (query.type) {
            where.type = query.type;
        }

        const [notifications, total] = await Promise.all([
            this.prisma.notification.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            this.prisma.notification.count({ where }),
        ]);

        return {
            notifications,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Get unread notification count for a user
     */
    async getUnreadCount(userId: string): Promise<number> {
        return await this.prisma.notification.count({
            where: {
                userId,
                isRead: false,
                isArchived: false,
            },
        });
    }

    /**
     * Mark a single notification as read
     */
    async markAsRead(id: string, userId: string): Promise<Notification> {
        // Verify ownership
        const notification = await this.prisma.notification.findFirst({
            where: { id, userId },
        });

        if (!notification) {
            throw new Error("Notification not found");
        }

        return await this.prisma.notification.update({
            where: { id },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });
    }

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId: string): Promise<number> {
        const result = await this.prisma.notification.updateMany({
            where: {
                userId,
                isRead: false,
                isArchived: false,
            },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });

        return result.count;
    }

    /**
     * Archive a notification
     */
    async archive(id: string, userId: string): Promise<Notification> {
        // Verify ownership
        const notification = await this.prisma.notification.findFirst({
            where: { id, userId },
        });

        if (!notification) {
            throw new Error("Notification not found");
        }

        return await this.prisma.notification.update({
            where: { id },
            data: {
                isArchived: true,
            },
        });
    }

    /**
     * Mark a single notification as unread
     */
    async markAsUnread(id: string, userId: string): Promise<Notification> {
        // Verify ownership
        const notification = await this.prisma.notification.findFirst({
            where: { id, userId },
        });

        if (!notification) {
            throw new Error("Notification not found");
        }

        return await this.prisma.notification.update({
            where: { id },
            data: {
                isRead: false,
                readAt: null,
            },
        });
    }

    /**
     * Delete a notification
     */
    async delete(id: string, userId: string): Promise<void> {
        // Verify ownership
        const notification = await this.prisma.notification.findFirst({
            where: { id, userId },
        });

        if (!notification) {
            throw new Error("Notification not found");
        }

        await this.prisma.notification.delete({
            where: { id },
        });
    }

    /**
     * Delete multiple notifications
     */
    async deleteMany(ids: string[], userId: string): Promise<number> {
        // Only delete notifications owned by the user
        const result = await this.prisma.notification.deleteMany({
            where: {
                id: { in: ids },
                userId,
            },
        });

        return result.count;
    }

    /**
     * Get notification preferences for a user
     */
    async getPreferences(userId: string) {
        // Get or create preferences with defaults
        const preferences = await this.prisma.notificationPreference.upsert({
            where: { userId },
            create: {
                userId,
                emailEnabled: true,
                emailCallTimeInvitations: true,
                emailEventUpdates: true,
                emailShiftReminders: true,
                inAppEnabled: true,
            },
            update: {},
        });

        return preferences;
    }

    /**
     * Update notification preferences for a user
     */
    async updatePreferences(userId: string, data: UpdatePreferencesInput) {
        return await this.prisma.notificationPreference.upsert({
            where: { userId },
            create: {
                userId,
                ...data,
            },
            update: data,
        });
    }
}

// Singleton instance
let notificationServiceInstance: NotificationService | null = null;

export function getNotificationService(prisma: PrismaClient): NotificationService {
    if (!notificationServiceInstance) {
        notificationServiceInstance = new NotificationService(prisma);
    }
    return notificationServiceInstance;
}
