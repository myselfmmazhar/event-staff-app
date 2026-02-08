import { router, protectedProcedure, adminProcedure } from '../trpc';
import { ProductSchema } from '@/lib/schemas/product.schema';
import { ProductService } from '@/services/product.service';

export const productRouter = router({
  getAll: protectedProcedure
    .input(ProductSchema.query)
    .query(async ({ ctx, input }) => {
      const productService = new ProductService(ctx.prisma);
      return await productService.findAll(input);
    }),

  getById: protectedProcedure
    .input(ProductSchema.id)
    .query(async ({ ctx, input }) => {
      const productService = new ProductService(ctx.prisma);
      return await productService.findOne(input.id);
    }),

  create: adminProcedure
    .input(ProductSchema.create)
    .mutation(async ({ ctx, input }) => {
      const productService = new ProductService(ctx.prisma);
      return await productService.create(input, ctx.userId!);
    }),

  update: adminProcedure
    .input(ProductSchema.update)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const productService = new ProductService(ctx.prisma);
      return await productService.update(id, data);
    }),

  delete: adminProcedure
    .input(ProductSchema.id)
    .mutation(async ({ ctx, input }) => {
      const productService = new ProductService(ctx.prisma);
      return await productService.remove(input.id);
    }),

  deleteMany: adminProcedure
    .input(ProductSchema.deleteMany)
    .mutation(async ({ ctx, input }) => {
      const productService = new ProductService(ctx.prisma);
      return await productService.deleteMany(input.ids);
    }),

  toggleActive: adminProcedure
    .input(ProductSchema.toggleActive)
    .mutation(async ({ ctx, input }) => {
      const productService = new ProductService(ctx.prisma);
      return await productService.toggleActive(input.id, input.isActive);
    }),
});

