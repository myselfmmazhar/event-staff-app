import { router, protectedProcedure } from '../trpc';
import { EventAttachmentSchema } from '@/lib/schemas/event-attachment.schema';
import { EventAttachmentService } from '@/services/event-attachment.service';

/**
 * Event Attachment Router - Handles products attached to events
 *
 * NOTE: Service assignments are now handled by CallTime via call-time.router.ts
 */
export const eventAttachmentRouter = router({
  /**
   * Get all products attached to an event
   * (Services are now retrieved via CallTime)
   */
  getByEventId: protectedProcedure
    .input(EventAttachmentSchema.getByEventId)
    .query(async ({ ctx, input }) => {
      const service = new EventAttachmentService(ctx.prisma);
      return await service.getByEventId(input.eventId, ctx.userId!);
    }),

  /**
   * Add a product to an event
   */
  addProduct: protectedProcedure
    .input(EventAttachmentSchema.addProduct)
    .mutation(async ({ ctx, input }) => {
      const service = new EventAttachmentService(ctx.prisma);
      return await service.addProduct(input, ctx.userId!);
    }),

  /**
   * Update an attached product
   */
  updateProduct: protectedProcedure
    .input(EventAttachmentSchema.updateProduct)
    .mutation(async ({ ctx, input }) => {
      const { eventId, productId, ...data } = input;
      const service = new EventAttachmentService(ctx.prisma);
      return await service.updateProduct(eventId, productId, data, ctx.userId!);
    }),

  /**
   * Remove a product from an event
   */
  removeProduct: protectedProcedure
    .input(EventAttachmentSchema.removeProduct)
    .mutation(async ({ ctx, input }) => {
      const service = new EventAttachmentService(ctx.prisma);
      return await service.removeProduct(input.eventId, input.productId, ctx.userId!);
    }),

  /**
   * Bulk update products on an event (replace all)
   */
  bulkUpdateProducts: protectedProcedure
    .input(EventAttachmentSchema.bulkUpdateProducts)
    .mutation(async ({ ctx, input }) => {
      const service = new EventAttachmentService(ctx.prisma);
      return await service.bulkUpdateProducts(input, ctx.userId!);
    }),

  /**
   * Get products attached to an event (for Event Form edit mode)
   */
  getProductsByEventId: protectedProcedure
    .input(EventAttachmentSchema.getByEventId)
    .query(async ({ ctx, input }) => {
      const service = new EventAttachmentService(ctx.prisma);
      const result = await service.getByEventId(input.eventId, ctx.userId!);
      return result.products;
    }),
});
