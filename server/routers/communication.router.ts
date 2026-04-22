import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure, protectedProcedure } from "../trpc";
import { CommunicationService } from "@/services/communication.service";
import {
    queryCommunicationLogsSchema,
    getConversationsSchema,
    queryPortalLogsSchema,
    getPortalConversationsSchema,
    getPortalChatHistorySchema,
} from "@/lib/schemas/communication.schema";
import { sendEmail } from "@/lib/utils/email";
import { sendMessage } from "@/lib/utils/messaging";
import type { SessionUser } from "@/lib/types/auth.types";

export const communicationRouter = router({
    /**
     * Get communication logs
     * Admin-only endpoint
     */
    getLogs: adminProcedure
        .input(queryCommunicationLogsSchema)
        .query(async ({ ctx, input }) => {
            const communicationService = new CommunicationService(ctx.prisma);
            return await communicationService.getLogs(input);
        }),

    /**
     * Send a test email to verify SMTP settings
     */
    sendTestEmail: adminProcedure
        .input(z.object({
            to: z.string().trim().email(),
            configId: z.string().uuid(),
        }))
        .mutation(async ({ ctx, input }) => {
            const communicationService = new CommunicationService(ctx.prisma);

            try {
                await sendEmail(
                    ctx.prisma,
                    input.to,
                    "Test Email - Staff App",
                    "<h1>Email Verification</h1><p>Congratulations! Your SMTP settings are working correctly.</p>",
                    input.configId
                );

                // Log the success
                await communicationService.logMessage({
                    type: 'EMAIL',
                    recipient: input.to,
                    subject: 'Test Email - Staff App',
                    content: 'Email verification success',
                    status: 'SENT',
                    senderId: ctx.userId as string,
                });

                return { success: true };
            } catch (error) {
                console.error("Test email failed:", error);

                // Log the failure
                await communicationService.logMessage({
                    type: 'EMAIL',
                    recipient: input.to,
                    subject: 'Test Email - Staff App',
                    content: 'Email verification failed',
                    status: 'FAILED',
                    error: error instanceof Error ? error.message : String(error),
                    senderId: ctx.userId as string,
                });

                throw new Error(error instanceof Error ? error.message : "Failed to send test email");
            }
        }),
    /**
     * Send an ad-hoc email
     */
    sendEmailAdHoc: adminProcedure
        .input(z.object({
            to: z.string().trim().email(),
            subject: z.string(),
            content: z.string(),
            configId: z.string().uuid().optional(),
            fileLinks: z.array(z.object({
                name: z.string(),
                url: z.string(),
                size: z.number().optional(),
                type: z.string().optional(),
            })).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const communicationService = new CommunicationService(ctx.prisma);

            try {
                await sendEmail(
                    ctx.prisma,
                    input.to,
                    input.subject,
                    input.content,
                    input.configId
                );

                // Log the success
                await communicationService.logMessage({
                    type: 'EMAIL',
                    recipient: input.to,
                    subject: input.subject,
                    content: input.content,
                    status: 'SENT',
                    senderId: ctx.userId as string,
                    fileLinks: input.fileLinks,
                });

                return { success: true };
            } catch (error) {
                console.error("Email sending failed:", error);

                // Log the failure
                await communicationService.logMessage({
                    type: 'EMAIL',
                    recipient: input.to,
                    subject: input.subject,
                    content: input.content,
                    status: 'FAILED',
                    error: error instanceof Error ? error.message : String(error),
                    senderId: ctx.userId as string,
                    fileLinks: input.fileLinks,
                });

                throw new Error(error instanceof Error ? error.message : "Failed to send email");
            }
        }),

    /**
     * Send a test message (Bird) to verify messaging settings
     */
    sendTestMessage: adminProcedure
        .input(z.object({
            to: z.string(),
            configId: z.string().uuid(),
        }))
        .mutation(async ({ ctx, input }) => {
            const communicationService = new CommunicationService(ctx.prisma);

            try {
                await sendMessage(
                    ctx.prisma,
                    input.to,
                    "Test Message from Staff App. Your Bird settings are working!",
                    input.configId
                );

                // Log the success
                await communicationService.logMessage({
                    type: 'MESSAGE',
                    recipient: input.to,
                    content: 'Messaging verification success',
                    status: 'SENT',
                    senderId: ctx.userId as string,
                });

                return { success: true };
            } catch (error) {
                console.error("Test message failed:", error);

                // Log the failure
                await communicationService.logMessage({
                    type: 'MESSAGE',
                    recipient: input.to,
                    content: 'Messaging verification failed',
                    status: 'FAILED',
                    error: error instanceof Error ? error.message : String(error),
                    senderId: ctx.userId as string,
                });

                throw new Error(error instanceof Error ? error.message : "Failed to send test message");
            }
        }),

    /**
     * Send an ad-hoc message (Bird)
     */
    sendMessageAdHoc: adminProcedure
        .input(z.object({
            to: z.string(),
            content: z.string(),
            type: z.enum(['SMS', 'WHATSAPP', 'MESSAGE']).default('MESSAGE'),
            configId: z.string().uuid().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const communicationService = new CommunicationService(ctx.prisma);

            try {
                await sendMessage(
                    ctx.prisma,
                    input.to,
                    input.content,
                    input.configId
                );

                // Log the success
                await communicationService.logMessage({
                    type: input.type,
                    recipient: input.to,
                    content: input.content,
                    status: 'SENT',
                    senderId: ctx.userId as string,
                });

                return { success: true };
            } catch (error) {
                console.error("Message sending failed:", error);

                // Log the failure
                await communicationService.logMessage({
                    type: input.type,
                    recipient: input.to,
                    content: input.content,
                    status: 'FAILED',
                    error: error instanceof Error ? error.message : String(error),
                    senderId: ctx.userId as string,
                });

                throw new Error(error instanceof Error ? error.message : "Failed to send message");
            }
        }),
    /**
     * Get distinct conversation recipients (for Messaging list)
     */
    getConversations: adminProcedure
        .input(getConversationsSchema)
        .query(async ({ ctx, input }) => {
            const communicationService = new CommunicationService(ctx.prisma);
            return await communicationService.getConversations(input.type, input.contactType);
        }),

    /**
     * Get chat history for a specific recipient
     */
    getChatHistory: adminProcedure
        .input(z.object({
            recipient: z.string(),
            type: z.enum(['EMAIL', 'SMS', 'MESSAGE'])
        }))
        .query(async ({ ctx, input }) => {
            const communicationService = new CommunicationService(ctx.prisma);
            return await communicationService.getChatHistory(input.recipient, input.type);
        }),

    /**
     * Move logs to trash
     */
    trashLogs: adminProcedure
        .input(z.object({ ids: z.array(z.string().uuid()) }))
        .mutation(async ({ ctx, input }) => {
            const communicationService = new CommunicationService(ctx.prisma);
            return await communicationService.trashLogs(input.ids);
        }),

    /**
     * Restore logs from trash
     */
    restoreLogs: adminProcedure
        .input(z.object({ ids: z.array(z.string().uuid()) }))
        .mutation(async ({ ctx, input }) => {
            const communicationService = new CommunicationService(ctx.prisma);
            return await communicationService.restoreLogs(input.ids);
        }),

    /**
     * Permanently delete logs
     */
    deleteLogsPermanently: adminProcedure
        .input(z.object({ ids: z.array(z.string().uuid()) }))
        .mutation(async ({ ctx, input }) => {
            const communicationService = new CommunicationService(ctx.prisma);
            return await communicationService.deleteLogsPermanently(input.ids);
        }),

    // ─── Portal procedures (protectedProcedure – staff & client) ──────────────

    /**
     * Get admin team members available for messaging
     */
    getAdminTeam: protectedProcedure
        .query(async ({ ctx }) => {
            const communicationService = new CommunicationService(ctx.prisma);
            return await communicationService.getAdminTeam();
        }),

    /**
     * Get portal conversations for current user (with admin team only)
     */
    getPortalConversations: protectedProcedure
        .input(getPortalConversationsSchema)
        .query(async ({ ctx, input }) => {
            const sessionUser = ctx.session!.user as SessionUser;
            const communicationService = new CommunicationService(ctx.prisma);
            return await communicationService.getPortalConversations(
                ctx.userId as string,
                sessionUser.email,
                sessionUser.phone ?? null,
                input.type,
            );
        }),

    /**
     * Get bidirectional chat history with one admin team member
     */
    getPortalChatHistory: protectedProcedure
        .input(getPortalChatHistorySchema)
        .query(async ({ ctx, input }) => {
            const sessionUser = ctx.session!.user as SessionUser;
            const communicationService = new CommunicationService(ctx.prisma);
            return await communicationService.getPortalChatHistory(
                ctx.userId as string,
                sessionUser.email,
                sessionUser.phone ?? null,
                input.recipient,
                input.type,
            );
        }),

    /**
     * Send email from portal user to an admin team member
     */
    sendPortalEmail: protectedProcedure
        .input(z.object({
            to: z.string().trim().email(),
            subject: z.string(),
            content: z.string(),
            configId: z.string().uuid().optional(),
            fileLinks: z.array(z.object({
                name: z.string(),
                url: z.string(),
                size: z.number().optional(),
                type: z.string().optional(),
            })).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const communicationService = new CommunicationService(ctx.prisma);

            const adminTeam = await communicationService.getAdminTeam();
            if (!adminTeam.some(a => a.email === input.to)) {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only message admin team members' });
            }

            try {
                await sendEmail(ctx.prisma, input.to, input.subject, input.content, input.configId);
                await communicationService.logMessage({
                    type: 'EMAIL',
                    recipient: input.to,
                    subject: input.subject,
                    content: input.content,
                    status: 'SENT',
                    senderId: ctx.userId as string,
                    fileLinks: input.fileLinks,
                });
                return { success: true };
            } catch (error) {
                await communicationService.logMessage({
                    type: 'EMAIL',
                    recipient: input.to,
                    subject: input.subject,
                    content: input.content,
                    status: 'FAILED',
                    error: error instanceof Error ? error.message : String(error),
                    senderId: ctx.userId as string,
                    fileLinks: input.fileLinks,
                });
                throw new Error(error instanceof Error ? error.message : 'Failed to send email');
            }
        }),

    /**
     * Send SMS/WhatsApp/Message from portal user to an admin team member
     */
    sendPortalMessage: protectedProcedure
        .input(z.object({
            to: z.string(),
            content: z.string(),
            type: z.enum(['SMS', 'WHATSAPP', 'MESSAGE']).default('MESSAGE'),
            configId: z.string().uuid().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const communicationService = new CommunicationService(ctx.prisma);

            const adminTeam = await communicationService.getAdminTeam();
            const isAdminRecipient = adminTeam.some(a => a.phone === input.to || a.email === input.to);
            if (!isAdminRecipient) {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only message admin team members' });
            }

            try {
                await sendMessage(ctx.prisma, input.to, input.content, input.configId);
                await communicationService.logMessage({
                    type: input.type,
                    recipient: input.to,
                    content: input.content,
                    status: 'SENT',
                    senderId: ctx.userId as string,
                });
                return { success: true };
            } catch (error) {
                await communicationService.logMessage({
                    type: input.type,
                    recipient: input.to,
                    content: input.content,
                    status: 'FAILED',
                    error: error instanceof Error ? error.message : String(error),
                    senderId: ctx.userId as string,
                });
                throw new Error(error instanceof Error ? error.message : 'Failed to send message');
            }
        }),

    /**
     * Get portal logs (current user's outbound messages only)
     */
    getPortalLogs: protectedProcedure
        .input(queryPortalLogsSchema)
        .query(async ({ ctx, input }) => {
            const communicationService = new CommunicationService(ctx.prisma);
            return await communicationService.getPortalLogs(ctx.userId as string, input);
        }),

    /**
     * Move portal logs to trash (own messages only)
     */
    trashPortalLogs: protectedProcedure
        .input(z.object({ ids: z.array(z.string().uuid()) }))
        .mutation(async ({ ctx, input }) => {
            const communicationService = new CommunicationService(ctx.prisma);
            return await communicationService.trashPortalLogs(input.ids, ctx.userId as string);
        }),

    /**
     * Restore portal logs from trash (own messages only)
     */
    restorePortalLogs: protectedProcedure
        .input(z.object({ ids: z.array(z.string().uuid()) }))
        .mutation(async ({ ctx, input }) => {
            const communicationService = new CommunicationService(ctx.prisma);
            return await communicationService.restorePortalLogs(input.ids, ctx.userId as string);
        }),

    /**
     * Permanently delete portal logs (own messages only)
     */
    deletePortalLogs: protectedProcedure
        .input(z.object({ ids: z.array(z.string().uuid()) }))
        .mutation(async ({ ctx, input }) => {
            const communicationService = new CommunicationService(ctx.prisma);
            return await communicationService.deletePortalLogsPermanently(input.ids, ctx.userId as string);
        }),
});
