import { router, protectedProcedure } from "../trpc";
import { InvoiceSchema } from "@/lib/schemas/invoice.schema";
import { InvoiceService } from "@/services/invoice.service";

export const invoiceRouter = router({
    getAll: protectedProcedure
        .input(InvoiceSchema.query)
        .query(async ({ ctx, input }) => {
            const invoiceService = new InvoiceService(ctx.prisma);
            return await invoiceService.findAll(input);
        }),

    getById: protectedProcedure
        .input(InvoiceSchema.id)
        .query(async ({ ctx, input }) => {
            const invoiceService = new InvoiceService(ctx.prisma);
            return await invoiceService.findOne(input.id);
        }),

    create: protectedProcedure
        .input(InvoiceSchema.create)
        .mutation(async ({ ctx, input }) => {
            const invoiceService = new InvoiceService(ctx.prisma);
            return await invoiceService.create(input, ctx.userId!);
        }),

    update: protectedProcedure
        .input(InvoiceSchema.update)
        .mutation(async ({ ctx, input }) => {
            const { id, ...data } = input;
            const invoiceService = new InvoiceService(ctx.prisma);
            return await invoiceService.update(id, data);
        }),

    delete: protectedProcedure
        .input(InvoiceSchema.id)
        .mutation(async ({ ctx, input }) => {
            const invoiceService = new InvoiceService(ctx.prisma);
            return await invoiceService.delete(input.id);
        }),

    deleteMany: protectedProcedure
        .input(InvoiceSchema.deleteMany)
        .mutation(async ({ ctx, input }) => {
            const invoiceService = new InvoiceService(ctx.prisma);
            return await invoiceService.deleteMany(input.ids);
        }),

    restore: protectedProcedure
        .input(InvoiceSchema.id)
        .mutation(async ({ ctx, input }) => {
            const invoiceService = new InvoiceService(ctx.prisma);
            return await invoiceService.restore(input.id);
        }),

    hardDelete: protectedProcedure
        .input(InvoiceSchema.id)
        .mutation(async ({ ctx, input }) => {
            const invoiceService = new InvoiceService(ctx.prisma);
            return await invoiceService.hardDelete(input.id);
        }),
});
