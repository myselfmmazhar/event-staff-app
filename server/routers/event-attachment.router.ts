import { router, protectedProcedure } from '../trpc';
import { EventAttachmentSchema } from '@/lib/schemas/event-attachment.schema';
import { EventAttachmentService } from '@/services/event-attachment.service';

export const eventAttachmentRouter = router({
  /**
   * Get all services and products attached to an event
   */
  getByEventId: protectedProcedure
    .input(EventAttachmentSchema.getByEventId)
    .query(async ({ ctx, input }) => {
      const service = new EventAttachmentService(ctx.prisma);
      return await service.getByEventId(input.eventId, ctx.userId!);
    }),

  /**
   * Add a service to an event
   */
  addService: protectedProcedure
    .input(EventAttachmentSchema.addService)
    .mutation(async ({ ctx, input }) => {
      const service = new EventAttachmentService(ctx.prisma);
      return await service.addService(input, ctx.userId!);
    }),

  /**
   * Update an attached service
   */
  updateService: protectedProcedure
    .input(EventAttachmentSchema.updateService)
    .mutation(async ({ ctx, input }) => {
      const { eventId, serviceId, ...data } = input;
      const service = new EventAttachmentService(ctx.prisma);
      return await service.updateService(eventId, serviceId, data, ctx.userId!);
    }),

  /**
   * Remove a service from an event
   */
  removeService: protectedProcedure
    .input(EventAttachmentSchema.removeService)
    .mutation(async ({ ctx, input }) => {
      const service = new EventAttachmentService(ctx.prisma);
      return await service.removeService(input.eventId, input.serviceId, ctx.userId!);
    }),

  /**
   * Bulk update services on an event (replace all)
   */
  bulkUpdateServices: protectedProcedure
    .input(EventAttachmentSchema.bulkUpdateServices)
    .mutation(async ({ ctx, input }) => {
      const service = new EventAttachmentService(ctx.prisma);
      return await service.bulkUpdateServices(input, ctx.userId!);
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
});
