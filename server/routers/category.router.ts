import { router, protectedProcedure, adminProcedure } from '../trpc';
import { CategorySchema } from '@/lib/schemas/category.schema';
import { CategoryService } from '@/services/category.service';

export const categoryRouter = router({
  getAll: protectedProcedure
    .input(CategorySchema.query)
    .query(async ({ ctx, input }) => {
      const categoryService = new CategoryService(ctx.prisma);
      return await categoryService.findAll(input);
    }),

  getAllActive: protectedProcedure
    .query(async ({ ctx }) => {
      const categoryService = new CategoryService(ctx.prisma);
      return await categoryService.findAllActive();
    }),

  getById: protectedProcedure
    .input(CategorySchema.id)
    .query(async ({ ctx, input }) => {
      const categoryService = new CategoryService(ctx.prisma);
      return await categoryService.findOne(input.id);
    }),

  create: adminProcedure
    .input(CategorySchema.create)
    .mutation(async ({ ctx, input }) => {
      const categoryService = new CategoryService(ctx.prisma);
      return await categoryService.create(input, ctx.userId!);
    }),

  update: adminProcedure
    .input(CategorySchema.update)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const categoryService = new CategoryService(ctx.prisma);
      return await categoryService.update(id, data);
    }),

  delete: adminProcedure
    .input(CategorySchema.id)
    .mutation(async ({ ctx, input }) => {
      const categoryService = new CategoryService(ctx.prisma);
      return await categoryService.remove(input.id);
    }),

  deleteMany: adminProcedure
    .input(CategorySchema.deleteMany)
    .mutation(async ({ ctx, input }) => {
      const categoryService = new CategoryService(ctx.prisma);
      return await categoryService.deleteMany(input.ids);
    }),

  toggleActive: adminProcedure
    .input(CategorySchema.toggleActive)
    .mutation(async ({ ctx, input }) => {
      const categoryService = new CategoryService(ctx.prisma);
      return await categoryService.toggleActive(input.id, input.isActive);
    }),
});
