import { router, protectedProcedure } from "../trpc";
import { ContactSchema } from "@/lib/schemas/contact.schema";

export const contactRouter = router({
    getAll: protectedProcedure
        .input(ContactSchema.query)
        .query(async ({ ctx, input }) => {
            return await ctx.contactService.findAll(input, ctx.userId!);
        }),

    getById: protectedProcedure
        .input(ContactSchema.id)
        .query(async ({ ctx, input }) => {
            return await ctx.contactService.findOne(input.id);
        }),

    create: protectedProcedure
        .input(ContactSchema.create)
        .mutation(async ({ ctx, input }) => {
            return await ctx.contactService.create(input, ctx.userId!);
        }),

    update: protectedProcedure
        .input(ContactSchema.update)
        .mutation(async ({ ctx, input }) => {
            const { id, ...data } = input;
            return await ctx.contactService.update(id, data);
        }),

    updateNotes: protectedProcedure
        .input(ContactSchema.updateNotes)
        .mutation(async ({ ctx, input }) => {
            const { id, ...data } = input;
            return await ctx.contactService.update(id, data);
        }),

    delete: protectedProcedure
        .input(ContactSchema.id)
        .mutation(async ({ ctx, input }) => {
            return await ctx.contactService.remove(input.id);
        }),
});
