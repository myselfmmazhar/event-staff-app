import { z } from "zod";
import { NotificationType, NotificationPriority } from "@prisma/client";

/**
 * Notification Zod Schemas for validation
 */
export class NotificationSchema {
    /**
     * Create Notification Schema (internal use by service)
     */
    static create = z.object({
        userId: z.string().min(1, "User ID is required"),
        type: z.nativeEnum(NotificationType),
        priority: z.nativeEnum(NotificationPriority).default(NotificationPriority.NORMAL),
        title: z.string().min(1, "Title is required").max(200, "Title must be 200 characters or less"),
        message: z.string().min(1, "Message is required").max(2000, "Message must be 2000 characters or less"),
        actionUrl: z.string().url("Invalid action URL").optional().nullable(),
        actionLabel: z.string().max(50, "Action label must be 50 characters or less").optional().nullable(),
        relatedEntityType: z.string().max(50).optional().nullable(),
        relatedEntityId: z.string().uuid("Invalid entity ID").optional().nullable(),
        batchKey: z.string().max(255).optional().nullable(),
    });

    /**
     * Query Notifications Schema
     */
    static query = z.object({
        page: z.number().int().min(1).default(1).optional(),
        limit: z.number().int().min(1).max(50).default(20).optional(),
        isRead: z.boolean().optional(),
        isArchived: z.boolean().default(false).optional(),
        type: z.nativeEnum(NotificationType).optional(),
    });

    /**
     * Notification ID Schema
     */
    static id = z.object({
        id: z.string().uuid("Invalid notification ID"),
    });

    /**
     * Mark As Read Schema
     */
    static markAsRead = z.object({
        id: z.string().uuid("Invalid notification ID"),
    });

    /**
     * Update Preferences Schema
     */
    static preferences = z.object({
        emailEnabled: z.boolean().optional(),
        emailCallTimeInvitations: z.boolean().optional(),
        emailEventUpdates: z.boolean().optional(),
        emailShiftReminders: z.boolean().optional(),
        inAppEnabled: z.boolean().optional(),
    });

    /**
     * Bulk Create Notifications Schema (for internal use)
     */
    static bulkCreate = z.object({
        userIds: z.array(z.string().min(1)).min(1, "At least one user ID is required"),
        type: z.nativeEnum(NotificationType),
        priority: z.nativeEnum(NotificationPriority).default(NotificationPriority.NORMAL),
        title: z.string().min(1, "Title is required").max(200),
        message: z.string().min(1, "Message is required").max(2000),
        actionUrl: z.string().url().optional().nullable(),
        actionLabel: z.string().max(50).optional().nullable(),
        relatedEntityType: z.string().max(50).optional().nullable(),
        relatedEntityId: z.string().uuid().optional().nullable(),
        batchKey: z.string().max(255).optional().nullable(),
    });

    /**
     * Delete Multiple Notifications Schema
     */
    static deleteMany = z.object({
        ids: z.array(z.string().uuid("Invalid notification ID")).min(1, "At least one ID is required"),
    });
}

/**
 * TypeScript types inferred from Zod schemas
 */
export type CreateNotificationInput = z.infer<typeof NotificationSchema.create>;
export type QueryNotificationsInput = z.infer<typeof NotificationSchema.query>;
export type NotificationIdInput = z.infer<typeof NotificationSchema.id>;
export type UpdatePreferencesInput = z.infer<typeof NotificationSchema.preferences>;
export type BulkCreateNotificationInput = z.infer<typeof NotificationSchema.bulkCreate>;
