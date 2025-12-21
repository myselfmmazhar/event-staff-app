import { router, protectedProcedure } from "../trpc";
import { NotificationService } from "@/services/notification.service";
import { NotificationSchema } from "@/lib/schemas/notification.schema";
import { TRPCError } from "@trpc/server";

/**
 * Notification Router - All notification-related tRPC procedures
 */
export const notificationRouter = router({
    /**
     * Get all notifications for the current user
     * Requires: Authentication
     */
    getAll: protectedProcedure
        .input(NotificationSchema.query)
        .query(async ({ ctx, input }) => {
            const service = new NotificationService(ctx.prisma);
            return await service.getForUser(ctx.userId!, input);
        }),

    /**
     * Get unread notification count
     * Requires: Authentication
     */
    getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
        const service = new NotificationService(ctx.prisma);
        const count = await service.getUnreadCount(ctx.userId!);
        return { count };
    }),

    /**
     * Mark a single notification as read
     * Requires: Authentication
     */
    markAsRead: protectedProcedure
        .input(NotificationSchema.markAsRead)
        .mutation(async ({ ctx, input }) => {
            const service = new NotificationService(ctx.prisma);
            try {
                return await service.markAsRead(input.id, ctx.userId!);
            } catch (error) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Notification not found",
                });
            }
        }),

    /**
     * Mark all notifications as read
     * Requires: Authentication
     */
    markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
        const service = new NotificationService(ctx.prisma);
        const count = await service.markAllAsRead(ctx.userId!);
        return { count };
    }),

    /**
     * Archive a notification
     * Requires: Authentication
     */
    archive: protectedProcedure
        .input(NotificationSchema.id)
        .mutation(async ({ ctx, input }) => {
            const service = new NotificationService(ctx.prisma);
            try {
                return await service.archive(input.id, ctx.userId!);
            } catch (error) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Notification not found",
                });
            }
        }),

    /**
     * Delete a notification
     * Requires: Authentication
     */
    delete: protectedProcedure
        .input(NotificationSchema.id)
        .mutation(async ({ ctx, input }) => {
            const service = new NotificationService(ctx.prisma);
            try {
                await service.delete(input.id, ctx.userId!);
                return { success: true };
            } catch (error) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Notification not found",
                });
            }
        }),

    /**
     * Mark a single notification as unread
     * Requires: Authentication
     */
    markAsUnread: protectedProcedure
        .input(NotificationSchema.id)
        .mutation(async ({ ctx, input }) => {
            const service = new NotificationService(ctx.prisma);
            try {
                return await service.markAsUnread(input.id, ctx.userId!);
            } catch (error) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Notification not found",
                });
            }
        }),

    /**
     * Delete multiple notifications
     * Requires: Authentication
     */
    deleteMany: protectedProcedure
        .input(NotificationSchema.deleteMany)
        .mutation(async ({ ctx, input }) => {
            const service = new NotificationService(ctx.prisma);
            const count = await service.deleteMany(input.ids, ctx.userId!);
            return { count };
        }),

    /**
     * Get notification preferences
     * Requires: Authentication
     */
    getPreferences: protectedProcedure.query(async ({ ctx }) => {
        const service = new NotificationService(ctx.prisma);
        return await service.getPreferences(ctx.userId!);
    }),

    /**
     * Update notification preferences
     * Requires: Authentication
     */
    updatePreferences: protectedProcedure
        .input(NotificationSchema.preferences)
        .mutation(async ({ ctx, input }) => {
            const service = new NotificationService(ctx.prisma);
            return await service.updatePreferences(ctx.userId!, input);
        }),
});
