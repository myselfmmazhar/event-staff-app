import { z } from 'zod';
import { router, managerProcedure } from '../trpc';
import { TimeEntryService } from '@/services/time-entry.service';

export const timeEntryRouter = router({
    /**
     * Get all Time Manager rows (one per accepted staff per call time)
     */
    getTimeManagerRows: managerProcedure
        .input(z.object({
            dateFrom: z.string().optional(),
            dateTo: z.string().optional(),
            eventId: z.string().uuid().optional(),
            staffId: z.string().uuid().optional(),
            search: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            const service = new TimeEntryService(ctx.prisma);
            return await service.getTimeManagerRows({
                dateFrom: input.dateFrom ? new Date(input.dateFrom) : undefined,
                dateTo: input.dateTo ? new Date(input.dateTo) : undefined,
                eventId: input.eventId,
                staffId: input.staffId,
                search: input.search,
            });
        }),

    /**
     * Upsert a time entry (clock in / clock out)
     */
    upsert: managerProcedure
        .input(z.object({
            invitationId: z.string().nullable().optional(),
            staffId: z.string().nullable().optional(),
            callTimeId: z.string().uuid(),
            clockIn: z.string().optional().nullable(),
            clockOut: z.string().optional().nullable(),
            breakMinutes: z.number().int().min(0).default(0),
            overtimeCost: z.number().optional().nullable(),
            overtimePrice: z.number().optional().nullable(),
            shiftCost: z.number().optional().nullable(),
            shiftPrice: z.number().optional().nullable(),
            travelCost: z.number().optional().nullable(),
            travelPrice: z.number().optional().nullable(),
            notes: z.string().optional(),
            commission: z.boolean().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const service = new TimeEntryService(ctx.prisma);
            return await service.upsertTimeEntry({
                invitationId: input.invitationId || null,
                staffId: input.staffId || null,
                callTimeId: input.callTimeId,
                clockIn: input.clockIn ? new Date(input.clockIn) : null,
                clockOut: input.clockOut ? new Date(input.clockOut) : null,
                breakMinutes: input.breakMinutes,
                overtimeCost: input.overtimeCost,
                overtimePrice: input.overtimePrice,
                shiftCost: input.shiftCost,
                shiftPrice: input.shiftPrice,
                travelCost: input.travelCost,
                travelPrice: input.travelPrice,
                notes: input.notes,
                commission: input.commission,
                createdBy: ctx.userId as string,
            });
        }),

    /**
     * Delete a time entry
     */
    delete: managerProcedure
        .input(z.object({ invitationId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
            const service = new TimeEntryService(ctx.prisma);
            return await service.deleteTimeEntry(input.invitationId);
        }),

    /**
     * Generate invoices for selected assignments
     */
    generateInvoices: managerProcedure
        .input(z.object({ invitationIds: z.array(z.string().uuid()) }))
        .mutation(async ({ ctx, input }) => {
            const service = new TimeEntryService(ctx.prisma);
            return await service.generateInvoices(input.invitationIds, ctx.userId as string);
        }),

    /**
     * Approve / reject an invitation for invoicing/time manager.
     * Uses CallTimeInvitation.internalReviewRating as the persisted decision.
     */
    reviewInvitation: managerProcedure
        .input(z.object({
            invitationIds: z.array(z.string().uuid()),
            decision: z.enum(['APPROVE', 'REJECT', 'REVIEW', 'PENDING']),
        }))
        .mutation(async ({ ctx, input }) => {
            const service = new TimeEntryService(ctx.prisma);
            return await service.reviewInvitation({
                invitationIds: input.invitationIds,
                decision: input.decision,
                reviewerId: ctx.userId as string,
            });
        }),
});
