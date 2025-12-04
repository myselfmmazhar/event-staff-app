import { router, publicProcedure, adminProcedure } from "../trpc";
import { SettingsService } from "@/services/settings.service";
import { updateTerminologySchema } from "@/lib/schemas/settings.schema";

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
});
