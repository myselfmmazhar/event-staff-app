import { router, protectedProcedure } from "../trpc";
import { EstimateSchema } from "@/lib/schemas/estimate.schema";
import { EstimateService } from "@/services/estimate.service";

export const estimateRouter = router({
    getAll: protectedProcedure
        .input(EstimateSchema.query)
        .query(async ({ ctx, input }) => {
            const estimateService = new EstimateService(ctx.prisma);
            return await estimateService.findAll(input);
        }),

    getById: protectedProcedure
        .input(EstimateSchema.id)
        .query(async ({ ctx, input }) => {
            const estimateService = new EstimateService(ctx.prisma);
            return await estimateService.findOne(input.id);
        }),

    create: protectedProcedure
        .input(EstimateSchema.create)
        .mutation(async ({ ctx, input }) => {
            const estimateService = new EstimateService(ctx.prisma);
            return await estimateService.create(input, ctx.userId!);
        }),

    update: protectedProcedure
        .input(EstimateSchema.update)
        .mutation(async ({ ctx, input }) => {
            const { id, ...data } = input;
            const estimateService = new EstimateService(ctx.prisma);
            return await estimateService.update(id, data);
        }),

    delete: protectedProcedure
        .input(EstimateSchema.id)
        .mutation(async ({ ctx, input }) => {
            const estimateService = new EstimateService(ctx.prisma);
            return await estimateService.delete(input.id);
        }),

    deleteMany: protectedProcedure
        .input(EstimateSchema.deleteMany)
        .mutation(async ({ ctx, input }) => {
            const estimateService = new EstimateService(ctx.prisma);
            return await estimateService.deleteMany(input.ids);
        }),

    restore: protectedProcedure
        .input(EstimateSchema.id)
        .mutation(async ({ ctx, input }) => {
            const estimateService = new EstimateService(ctx.prisma);
            return await estimateService.restore(input.id);
        }),

    hardDelete: protectedProcedure
        .input(EstimateSchema.id)
        .mutation(async ({ ctx, input }) => {
            const estimateService = new EstimateService(ctx.prisma);
            return await estimateService.hardDelete(input.id);
        }),
});
