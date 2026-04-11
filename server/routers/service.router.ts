import { router, protectedProcedure, adminProcedure } from '../trpc';
import { ServiceSchema } from '@/lib/schemas/service.schema';
import { ServiceService } from '@/services/service.service';

export const serviceRouter = router({
  getAll: protectedProcedure
    .input(ServiceSchema.query)
    .query(async ({ ctx, input }) => {
      const serviceService = new ServiceService(ctx.prisma);
      return await serviceService.findAll(input);
    }),

  getById: protectedProcedure
    .input(ServiceSchema.id)
    .query(async ({ ctx, input }) => {
      const serviceService = new ServiceService(ctx.prisma);
      return await serviceService.findOne(input.id);
    }),

  create: adminProcedure
    .input(ServiceSchema.create)
    .mutation(async ({ ctx, input }) => {
      const serviceService = new ServiceService(ctx.prisma);
      return await serviceService.create(input, ctx.userId!);
    }),

  update: adminProcedure
    .input(ServiceSchema.update)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const serviceService = new ServiceService(ctx.prisma);
      return await serviceService.update(id, data);
    }),

  delete: adminProcedure
    .input(ServiceSchema.id)
    .mutation(async ({ ctx, input }) => {
      const serviceService = new ServiceService(ctx.prisma);
      return await serviceService.remove(input.id);
    }),

  deleteMany: adminProcedure
    .input(ServiceSchema.deleteMany)
    .mutation(async ({ ctx, input }) => {
      const serviceService = new ServiceService(ctx.prisma);
      return await serviceService.deleteMany(input.ids);
    }),

  toggleActive: adminProcedure
    .input(ServiceSchema.toggleActive)
    .mutation(async ({ ctx, input }) => {
      const serviceService = new ServiceService(ctx.prisma);
      return await serviceService.toggleActive(input.id, input.isActive);
    }),
});

