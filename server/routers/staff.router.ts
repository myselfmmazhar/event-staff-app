import { router, protectedProcedure, publicProcedure } from "../trpc";
import { z } from "zod";
import { StaffService } from "@/services/staff.service";
import { StaffSchema } from "@/lib/schemas/staff.schema";
import { emailService } from "@/services/email.service";
import { SettingsService } from "@/services/settings.service";

/**
 * Staff Router - All staff-related tRPC procedures
 * Includes protected procedures (admin), public procedures (invitation acceptance), and self-service procedures
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
     * Create a new staff member (full form)
     * Creates staff with PENDING status and sends invitation email
     * Requires: Authentication
     */
    create: protectedProcedure
        .input(StaffSchema.create)
        .mutation(async ({ ctx, input }) => {
            const staffService = new StaffService(ctx.prisma);
            const settingsService = new SettingsService(ctx.prisma);

            // Create the staff record with invitation token
            const result = await staffService.create(input, ctx.userId!);

            // Get terminology for email
            const terminology = await settingsService.getTerminology();

            // Send invitation emails
            for (const invitation of result.invitations) {
                await emailService.sendStaffInvitation(
                    invitation.email,
                    invitation.firstName,
                    invitation.token,
                    terminology.staff.singular,
                    ctx.userId!
                );
            }

            return result.staff;
        }),

    /**
     * Invite a new staff member (invitation flow)
     * Requires: Authentication
     */
    invite: protectedProcedure
        .input(StaffSchema.invite)
        .mutation(async ({ ctx, input }) => {
            const staffService = new StaffService(ctx.prisma);
            const settingsService = new SettingsService(ctx.prisma);

            // Create the staff record with invitation token
            const staff = await staffService.invite(input, ctx.userId!);

            // Get terminology for email
            const terminology = await settingsService.getTerminology();

            // Send invitation email
            if (staff.invitationToken) {
                await emailService.sendStaffInvitation(
                    staff.staff.email,
                    staff.staff.firstName,
                    staff.invitationToken,
                    terminology.staff.singular,
                    ctx.userId!
                );
            }

            return staff.staff;
        }),

    /**
     * Resend staff invitation email
     * Requires: Authentication
     */
    resendInvitation: protectedProcedure
        .input(StaffSchema.resendInvitation)
        .mutation(async ({ ctx, input }) => {
            const staffService = new StaffService(ctx.prisma);
            const settingsService = new SettingsService(ctx.prisma);

            // Regenerate invitation token
            const result = await staffService.resendInvitation(input.id);

            // Get terminology for email
            const terminology = await settingsService.getTerminology();

            // Send invitation email
            if (result.invitationToken) {
                await emailService.sendStaffInvitation(
                    result.staff.email,
                    result.staff.firstName,
                    result.invitationToken,
                    terminology.staff.singular,
                    ctx.userId!
                );
            }

            return result.staff;
        }),

    /**
     * Grant login access to existing staff member
     * Requires: Authentication
     */
    grantLoginAccess: protectedProcedure
        .input(StaffSchema.grantLoginAccess)
        .mutation(async ({ ctx, input }) => {
            const staffService = new StaffService(ctx.prisma);
            const settingsService = new SettingsService(ctx.prisma);

            // Grant login access and get temporary password
            const result = await staffService.grantLoginAccess(input.id);

            // Get terminology for email
            const terminology = await settingsService.getTerminology();

            // Send credentials email
            if (result.tempPassword) {
                await emailService.sendStaffCredentials(
                    result.staff.email,
                    result.staff.firstName,
                    result.tempPassword,
                    terminology.staff.singular
                );
            }

            return result.staff;
        }),

    /**
     * Get invitation info by token (public - for invitation acceptance page)
     */
    getInvitationInfo: publicProcedure
        .input(z.object({ token: z.string() }))
        .query(async ({ ctx, input }) => {
            const staffService = new StaffService(ctx.prisma);
            return await staffService.getInvitationInfo(input.token);
        }),

    /**
     * Accept staff invitation (public - staff completes their profile)
     */
    acceptInvitation: publicProcedure
        .input(StaffSchema.acceptInvitation)
        .mutation(async ({ ctx, input }) => {
            const staffService = new StaffService(ctx.prisma);
            return await staffService.acceptInvitation(input);
        }),

    /**
     * Get my staff profile (self-service)
     * Requires: Authentication
     */
    getMyProfile: protectedProcedure.query(async ({ ctx }) => {
        const staffService = new StaffService(ctx.prisma);
        return await staffService.getMyStaffProfile(ctx.userId!);
    }),

    /**
     * Update my staff profile (self-service)
     * Requires: Authentication
     */
    updateMyProfile: protectedProcedure
        .input(StaffSchema.selfUpdate)
        .mutation(async ({ ctx, input }) => {
            const staffService = new StaffService(ctx.prisma);
            return await staffService.selfUpdate(ctx.userId!, input);
        }),

    /**
     * Deactivate my staff profile (self-service)
     * Requires: Authentication
     */
    deactivateMyProfile: protectedProcedure
        .input(StaffSchema.deactivateSelf)
        .mutation(async ({ ctx, input }) => {
            const staffService = new StaffService(ctx.prisma);
            return await staffService.deactivateSelf(ctx.userId!, input.reason);
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
     * Get all companies (for dropdown selection when assigning contractors/employees)
     * Requires: Authentication
     */
    getCompanies: protectedProcedure.query(async ({ ctx }) => {
        const staffService = new StaffService(ctx.prisma);
        return await staffService.getCompanies();
    }),

    /**
     * Get all services (for staff assignment dropdown)
     * Requires: Authentication
     */
    getServices: protectedProcedure.query(async ({ ctx }) => {
        return await ctx.prisma.service.findMany({
            where: { isActive: true },
            select: {
                id: true,
                title: true,
                description: true,
            },
            orderBy: { title: "asc" },
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

    /**
     * Bulk delete staff members
     * Requires: Authentication
     */
    bulkDelete: protectedProcedure
        .input(StaffSchema.bulkDelete)
        .mutation(async ({ ctx, input }) => {
            const staffService = new StaffService(ctx.prisma);
            return await staffService.bulkDelete(input.staffIds);
        }),

    /**
     * Bulk update staff members
     * Only updates fields that have enabled: true
     * Requires: Authentication
     */
    bulkUpdate: protectedProcedure
        .input(StaffSchema.bulkUpdate)
        .mutation(async ({ ctx, input }) => {
            const staffService = new StaffService(ctx.prisma);
            return await staffService.bulkUpdate(input, ctx.userId!);
        }),
});
