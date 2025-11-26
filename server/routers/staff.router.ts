import { router, protectedProcedure } from "../trpc";
import { StaffService } from "@/services/staff.service";
import { StaffSchema } from "@/lib/schemas/staff.schema";

/**
 * Staff Router - All staff-related tRPC procedures
 * All procedures use protectedProcedure (authenticated users manage staff)
 */
export const staffRouter = router({
    /**
     * Get all staff members with pagination, search, and filters
     * Requires: Authentication
     */
    getAll: protectedProcedure
        .input(StaffSchema.query)
        .query(async ({ ctx, input }) => {
            const staffService = new StaffService(ctx.prisma);
            return await staffService.findAll(input, ctx.userId!);
        }),

    /**
     * Get a single staff member by ID
     * Requires: Authentication
     */
    getById: protectedProcedure
        .input(StaffSchema.id)
        .query(async ({ ctx, input }) => {
            const staffService = new StaffService(ctx.prisma);
            return await staffService.findOne(input.id);
        }),

    /**
     * Create a new staff member
     * Requires: Authentication
     */
    create: protectedProcedure
        .input(StaffSchema.create)
        .mutation(async ({ ctx, input }) => {
            const staffService = new StaffService(ctx.prisma);
            return await staffService.create(input, ctx.userId!);
        }),

    /**
     * Update a staff member
     * Requires: Authentication
     */
    update: protectedProcedure
        .input(StaffSchema.update)
        .mutation(async ({ ctx, input }) => {
            const { id, ...data } = input;
            const staffService = new StaffService(ctx.prisma);
            return await staffService.update(id, data);
        }),

    /**
     * Delete a staff member
     * Requires: Authentication
     */
    delete: protectedProcedure
        .input(StaffSchema.id)
        .mutation(async ({ ctx, input }) => {
            const staffService = new StaffService(ctx.prisma);
            return await staffService.remove(input.id);
        }),

    /**
     * Get staff statistics for dashboard
     * Requires: Authentication
     */
    getStats: protectedProcedure.query(async ({ ctx }) => {
        const staffService = new StaffService(ctx.prisma);
        return await staffService.getStats();
    }),

    /**
     * Get all contractors (for dropdown selection)
     * Requires: Authentication
     */
    getContractors: protectedProcedure.query(async ({ ctx }) => {
        const staffService = new StaffService(ctx.prisma);
        return await staffService.getContractors();
    }),

    /**
     * Get all staff positions
     * Requires: Authentication
     */
    getPositions: protectedProcedure.query(async ({ ctx }) => {
        return await ctx.prisma.staffPosition.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                description: true,
            },
            orderBy: { name: "asc" },
        });
    }),

    /**
     * Get all work types
     * Requires: Authentication
     */
    getWorkTypes: protectedProcedure.query(async ({ ctx }) => {
        return await ctx.prisma.workType.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                description: true,
            },
            orderBy: { name: "asc" },
        });
    }),

    /**
     * Bulk disable staff members
     * Requires: Authentication
     */
    bulkDisable: protectedProcedure
        .input(StaffSchema.bulkDisable)
        .mutation(async ({ ctx, input }) => {
            const staffService = new StaffService(ctx.prisma);
            return await staffService.bulkDisable(input.staffIds, ctx.userId!);
        }),
});
