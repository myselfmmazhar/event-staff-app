import { router, protectedProcedure, adminProcedure } from '../trpc';
import { CatalogRequirementSchema } from '@/lib/schemas/catalog-requirement.schema';
import { CatalogRequirementService } from '@/services/catalog-requirement.service';

export const catalogRequirementRouter = router({
  getAll: protectedProcedure
    .input(CatalogRequirementSchema.query)
    .query(async ({ ctx, input }) => {
      const svc = new CatalogRequirementService(ctx.prisma);
      return await svc.findAll(input);
    }),

  getById: protectedProcedure
    .input(CatalogRequirementSchema.id)
    .query(async ({ ctx, input }) => {
      const svc = new CatalogRequirementService(ctx.prisma);
      return await svc.findById(input.id);
    }),

  create: adminProcedure
    .input(CatalogRequirementSchema.create)
    .mutation(async ({ ctx, input }) => {
      const svc = new CatalogRequirementService(ctx.prisma);
      return await svc.create(input, ctx.userId!);
    }),

  update: adminProcedure
    .input(CatalogRequirementSchema.update)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const svc = new CatalogRequirementService(ctx.prisma);
      return await svc.update(id, data);
    }),

  delete: adminProcedure
    .input(CatalogRequirementSchema.id)
    .mutation(async ({ ctx, input }) => {
      const svc = new CatalogRequirementService(ctx.prisma);
      return await svc.remove(input.id);
    }),
});
