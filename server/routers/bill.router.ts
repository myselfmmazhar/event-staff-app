import { router, protectedProcedure } from "../trpc";
import { BillSchema } from "@/lib/schemas/bill.schema";
import { BillService } from "@/services/bill.service";

export const billRouter = router({
    getAll: protectedProcedure
        .input(BillSchema.query)
        .query(async ({ ctx, input }) => {
            const billService = new BillService(ctx.prisma);
            return await billService.findAll(input);
        }),

    getById: protectedProcedure
        .input(BillSchema.id)
        .query(async ({ ctx, input }) => {
            const billService = new BillService(ctx.prisma);
            return await billService.findOne(input.id);
        }),

    create: protectedProcedure
        .input(BillSchema.create)
        .mutation(async ({ ctx, input }) => {
            const billService = new BillService(ctx.prisma);
            return await billService.create(input, ctx.userId!);
        }),

    update: protectedProcedure
        .input(BillSchema.update)
        .mutation(async ({ ctx, input }) => {
            const { id, ...data } = input;
            const billService = new BillService(ctx.prisma);
            return await billService.update(id, data);
        }),

    delete: protectedProcedure
        .input(BillSchema.id)
        .mutation(async ({ ctx, input }) => {
            const billService = new BillService(ctx.prisma);
            return await billService.delete(input.id);
        }),

    deleteMany: protectedProcedure
        .input(BillSchema.deleteMany)
        .mutation(async ({ ctx, input }) => {
            const billService = new BillService(ctx.prisma);
            return await billService.deleteMany(input.ids);
        }),

    restore: protectedProcedure
        .input(BillSchema.id)
        .mutation(async ({ ctx, input }) => {
            const billService = new BillService(ctx.prisma);
            return await billService.restore(input.id);
        }),

    hardDelete: protectedProcedure
        .input(BillSchema.id)
        .mutation(async ({ ctx, input }) => {
            const billService = new BillService(ctx.prisma);
            return await billService.hardDelete(input.id);
        }),
});
