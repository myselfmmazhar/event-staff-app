import { z } from "zod";
import { router, adminProcedure } from "../trpc";
import { CommunicationService } from "@/services/communication.service";
import { queryCommunicationLogsSchema } from "@/lib/schemas/communication.schema";
import { sendEmail } from "@/lib/utils/email";
import { sendMessage } from "@/lib/utils/messaging";

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
        .input(z.object({
            type: z.enum(['EMAIL', 'SMS', 'MESSAGE'])
        }))
        .query(async ({ ctx, input }) => {
            const communicationService = new CommunicationService(ctx.prisma);
            return await communicationService.getConversations(input.type);
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
});
