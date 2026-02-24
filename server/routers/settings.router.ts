import { z } from "zod";
import { router, publicProcedure, adminProcedure } from "../trpc";
import { SettingsService } from "@/services/settings.service";
import { updateTerminologySchema } from "@/lib/schemas/settings.schema";
import {
    updateGlobalLabelsSchema,
    updatePageLabelsSchema,
    resetLabelsSchema,
} from "@/lib/schemas/labels.schema";

/**
 * Settings Router - Organization settings and terminology configuration
 */
export const settingsRouter = router({
    /**
     * Get current terminology configuration
     * Public endpoint - needed for middleware and client-side rendering
     */
    getTerminology: publicProcedure.query(async ({ ctx }) => {
        const settingsService = new SettingsService(ctx.prisma);
        return await settingsService.getTerminology();
    }),

    /**
     * Update terminology configuration
     * Admin-only endpoint - only SUPER_ADMIN and ADMIN can modify terminology
     */
    updateTerminology: adminProcedure
        .input(updateTerminologySchema)
        .mutation(async ({ ctx, input }) => {
            const settingsService = new SettingsService(ctx.prisma);
            return await settingsService.updateTerminology(input);
        }),

    /**
     * Reset terminology to default values (from environment variables)
     * Admin-only endpoint
     */
    resetTerminology: adminProcedure.mutation(async ({ ctx }) => {
        const settingsService = new SettingsService(ctx.prisma);
        return await settingsService.resetTerminology();
    }),

    /**
     * Get all organization settings
     * Admin-only endpoint
     */
    getSettings: adminProcedure.query(async ({ ctx }) => {
        const settingsService = new SettingsService(ctx.prisma);
        return await settingsService.getSettings();
    }),

    // ========== Labels Management ==========

    /**
     * Get all labels (global + page-specific)
     * Public endpoint - needed for client-side rendering
     */
    getLabels: publicProcedure.query(async ({ ctx }) => {
        const settingsService = new SettingsService(ctx.prisma);
        return await settingsService.getLabels();
    }),

    /**
     * Update global labels
     * Admin-only endpoint
     */
    updateGlobalLabels: adminProcedure
        .input(updateGlobalLabelsSchema)
        .mutation(async ({ ctx, input }) => {
            const settingsService = new SettingsService(ctx.prisma);
            return await settingsService.updateGlobalLabels(input);
        }),

    /**
     * Update page-specific labels
     * Admin-only endpoint
     */
    updatePageLabels: adminProcedure
        .input(updatePageLabelsSchema)
        .mutation(async ({ ctx, input }) => {
            const settingsService = new SettingsService(ctx.prisma);
            return await settingsService.updatePageLabels(input.page, input.labels);
        }),

    /**
     * Reset labels to defaults
     * Admin-only endpoint
     */
    resetLabels: adminProcedure
        .input(resetLabelsSchema)
        .mutation(async ({ ctx, input }) => {
            const settingsService = new SettingsService(ctx.prisma);
            return await settingsService.resetLabels(input);
        }),

    // ========== Company Profile ==========

    /**
     * Get company profile settings
     * Public endpoint - needed for login page branding
     */
    getCompanyProfile: publicProcedure.query(async ({ ctx }) => {
        const settingsService = new SettingsService(ctx.prisma);
        return await settingsService.getCompanyProfile();
    }),

    /**
     * Update company profile settings
     * Admin-only endpoint
     */
    updateCompanyProfile: adminProcedure
        .input(
            z.object({
                companyName: z.string().max(200).nullish(),
                companyLogoUrl: z.string().url().nullish(),
                companyTagline: z.string().max(500).nullish(),
                companyWebsite: z.string().url().nullish(),
                companyPhone: z.string().max(50).nullish(),
                companyAddress: z.string().max(500).nullish(),
                companyTimezone: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const settingsService = new SettingsService(ctx.prisma);
            return await settingsService.updateCompanyProfile(input);
        }),

    /**
     * Get communication settings (deprecated)
     * Admin-only endpoint
     */
    getCommunicationSettings: adminProcedure.query(async ({ ctx }) => {
        const settingsService = new SettingsService(ctx.prisma);
        return await settingsService.getCommunicationSettings();
    }),

    /**
     * Update communication settings (deprecated)
     * Admin-only endpoint
     */
    updateCommunicationSettings: adminProcedure
        .input(z.object({}))
        .mutation(async ({ ctx }) => {
            const settingsService = new SettingsService(ctx.prisma);
            return await settingsService.updateCommunicationSettings();
        }),

    // ========== SMTP Configuration ==========

    listSmtpConfigs: adminProcedure.query(async ({ ctx }) => {
        const settingsService = new SettingsService(ctx.prisma);
        return await settingsService.listSmtpConfigs();
    }),

    createSmtpConfig: adminProcedure
        .input(
            z.object({
                name: z.string(),
                host: z.string(),
                port: z.number(),
                user: z.string(),
                pass: z.string(),
                from: z.string().email(),
                security: z.string().default("TLS").optional(),
                isDefault: z.boolean().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const settingsService = new SettingsService(ctx.prisma);
            return await settingsService.createSmtpConfig(input);
        }),

    updateSmtpConfig: adminProcedure
        .input(
            z.object({
                id: z.string().uuid(),
                name: z.string().optional(),
                host: z.string().optional(),
                port: z.number().optional(),
                user: z.string().optional(),
                pass: z.string().optional(),
                from: z.string().email().optional(),
                security: z.string().optional(),
                isDefault: z.boolean().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const settingsService = new SettingsService(ctx.prisma);
            const { id, ...data } = input;
            return await settingsService.updateSmtpConfig(id, data);
        }),

    deleteSmtpConfig: adminProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
            const settingsService = new SettingsService(ctx.prisma);
            return await settingsService.deleteSmtpConfig(input.id);
        }),

    setDefaultSmtpConfig: adminProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
            const settingsService = new SettingsService(ctx.prisma);
            return await settingsService.setDefaultSmtpConfig(input.id);
        }),

    // ========== Messaging Configuration ==========

    listMessagingConfigs: adminProcedure.query(async ({ ctx }) => {
        const settingsService = new SettingsService(ctx.prisma);
        return await settingsService.listMessagingConfigs();
    }),

    createMessagingConfig: adminProcedure
        .input(
            z.object({
                name: z.string(),
                provider: z.string(),
                apiKey: z.string(),
                workspaceId: z.string().optional(),
                channelId: z.string().optional(),
                isDefault: z.boolean().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const settingsService = new SettingsService(ctx.prisma);
            return await settingsService.createMessagingConfig(input);
        }),

    updateMessagingConfig: adminProcedure
        .input(
            z.object({
                id: z.string().uuid(),
                name: z.string().optional(),
                provider: z.string().optional(),
                apiKey: z.string().optional(),
                workspaceId: z.string().optional(),
                channelId: z.string().optional(),
                isDefault: z.boolean().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const settingsService = new SettingsService(ctx.prisma);
            const { id, ...data } = input;
            return await settingsService.updateMessagingConfig(id, data);
        }),

    deleteMessagingConfig: adminProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
            const settingsService = new SettingsService(ctx.prisma);
            return await settingsService.deleteMessagingConfig(input.id);
        }),

    setDefaultMessagingConfig: adminProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
            const settingsService = new SettingsService(ctx.prisma);
            return await settingsService.setDefaultMessagingConfig(input.id);
        }),
});
