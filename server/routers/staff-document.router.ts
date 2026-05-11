import { router, protectedProcedure, adminProcedure } from "../trpc";
import { StaffDocumentSchema } from "@/lib/schemas/staff-document.schema";
import { StaffDocumentService } from "@/services/staff-document.service";

/**
 * Talent document tracking router.
 * - Talent procedures: upload an update, list own slots, fetch expiring.
 * - Admin procedures: list history, list pending, approve, reject, categorize legacy.
 */
export const staffDocumentRouter = router({
    /** Talent: list their per-requirement slots (current + pending + last rejected). */
    listMine: protectedProcedure.query(async ({ ctx }) => {
        const service = new StaffDocumentService(ctx.prisma);
        return service.getTalentSlots(ctx.userId!);
    }),

    /** Talent: upload an update for one requirement slot. */
    uploadUpdate: protectedProcedure
        .input(StaffDocumentSchema.uploadUpdate)
        .mutation(async ({ ctx, input }) => {
            const service = new StaffDocumentService(ctx.prisma);
            return service.uploadUpdate(ctx.userId!, input);
        }),

    /**
     * Talent: get documents expiring within the warning window.
     * Side-effect: stamps a one-time in-app notification per document.
     */
    getMyExpiring: protectedProcedure.query(async ({ ctx }) => {
        const service = new StaffDocumentService(ctx.prisma);
        return service.getExpiringForTalent(ctx.userId!);
    }),

    /** Admin: full history for a staff. */
    getHistoryForStaff: adminProcedure
        .input(StaffDocumentSchema.listForStaff)
        .query(async ({ ctx, input }) => {
            const service = new StaffDocumentService(ctx.prisma);
            return service.getHistoryForStaff(input.staffId);
        }),

    /** Admin: pending update requests for a single staff. */
    getPendingForStaff: adminProcedure
        .input(StaffDocumentSchema.listPendingForStaff)
        .query(async ({ ctx, input }) => {
            const service = new StaffDocumentService(ctx.prisma);
            return service.getPendingForStaff(input.staffId);
        }),

    /** Admin: approve a pending document. */
    approve: adminProcedure
        .input(StaffDocumentSchema.approve)
        .mutation(async ({ ctx, input }) => {
            const service = new StaffDocumentService(ctx.prisma);
            return service.approve(ctx.userId!, input);
        }),

    /** Admin: reject a pending document. */
    reject: adminProcedure
        .input(StaffDocumentSchema.reject)
        .mutation(async ({ ctx, input }) => {
            const service = new StaffDocumentService(ctx.prisma);
            return service.reject(ctx.userId!, input);
        }),

    /** Admin: promote a legacy JSON document entry to a categorized StaffDocument row. */
    categorizeLegacy: adminProcedure
        .input(StaffDocumentSchema.categorizeLegacy)
        .mutation(async ({ ctx, input }) => {
            const service = new StaffDocumentService(ctx.prisma);
            return service.categorizeLegacy(input);
        }),
});
