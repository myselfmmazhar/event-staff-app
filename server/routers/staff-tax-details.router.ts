import { router, protectedProcedure } from "../trpc";
import { StaffTaxDetailsService } from "@/services/staff-tax-details.service";
import { StaffTaxDetailsSchema } from "@/lib/schemas/staff-tax-details.schema";
import { TRPCError } from "@trpc/server";

/**
 * Staff Tax Details Router - All staff tax details related tRPC procedures
 * All procedures are protected (require authentication)
 */
export const staffTaxDetailsRouter = router({
    /**
     * Get tax details for a staff member
     * Requires: Authentication
     */
    getByStaffId: protectedProcedure
        .input(StaffTaxDetailsSchema.getByStaffId)
        .query(async ({ ctx, input }) => {
            const taxDetailsService = new StaffTaxDetailsService(ctx.prisma);
            return await taxDetailsService.getByStaffId(input.staffId);
        }),

    /**
     * Create or update tax details for a staff member
     * Requires: Authentication (Admin only)
     */
    upsert: protectedProcedure
        .input(StaffTaxDetailsSchema.upsert)
        .mutation(async ({ ctx, input }) => {
            const taxDetailsService = new StaffTaxDetailsService(ctx.prisma);
            return await taxDetailsService.upsert(input);
        }),

    /**
     * Staff self-service update of their own tax details
     * Requires: Authentication
     */
    updateMyTaxDetails: protectedProcedure
        .input(StaffTaxDetailsSchema.selfUpdate)
        .mutation(async ({ ctx, input }) => {
            // Get the staff record linked to this user
            const staff = await ctx.prisma.staff.findUnique({
                where: { userId: ctx.userId! },
                select: { id: true },
            });

            if (!staff) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "No staff record found for this user",
                });
            }

            const taxDetailsService = new StaffTaxDetailsService(ctx.prisma);
            return await taxDetailsService.selfUpdate(staff.id, input);
        }),

    /**
     * Get my own tax details (for staff self-service)
     * Requires: Authentication
     */
    getMyTaxDetails: protectedProcedure.query(async ({ ctx }) => {
        // Get the staff record linked to this user
        const staff = await ctx.prisma.staff.findUnique({
            where: { userId: ctx.userId! },
            select: { id: true },
        });

        if (!staff) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "No staff record found for this user",
            });
        }

        const taxDetailsService = new StaffTaxDetailsService(ctx.prisma);
        return await taxDetailsService.getByStaffId(staff.id);
    }),

    /**
     * Delete tax details for a staff member
     * Requires: Authentication (Admin only)
     */
    delete: protectedProcedure
        .input(StaffTaxDetailsSchema.delete)
        .mutation(async ({ ctx, input }) => {
            const taxDetailsService = new StaffTaxDetailsService(ctx.prisma);
            await taxDetailsService.delete(input.staffId);
            return { success: true };
        }),

    /**
     * Check if staff has tax details
     * Requires: Authentication
     */
    hasTaxDetails: protectedProcedure
        .input(StaffTaxDetailsSchema.getByStaffId)
        .query(async ({ ctx, input }) => {
            const taxDetailsService = new StaffTaxDetailsService(ctx.prisma);
            return await taxDetailsService.hasTaxDetails(input.staffId);
        }),

    /**
     * Get masked SSN for display (last 4 digits only)
     * Requires: Authentication
     */
    getMaskedSsn: protectedProcedure
        .input(StaffTaxDetailsSchema.getByStaffId)
        .query(async ({ ctx, input }) => {
            const taxDetailsService = new StaffTaxDetailsService(ctx.prisma);
            return await taxDetailsService.getMaskedSsn(input.staffId);
        }),

    /**
     * Get masked EIN for display
     * Requires: Authentication
     */
    getMaskedEin: protectedProcedure
        .input(StaffTaxDetailsSchema.getByStaffId)
        .query(async ({ ctx, input }) => {
            const taxDetailsService = new StaffTaxDetailsService(ctx.prisma);
            return await taxDetailsService.getMaskedEin(input.staffId);
        }),
});
