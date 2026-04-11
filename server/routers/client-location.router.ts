import { router, protectedProcedure } from "../trpc";
import { ClientLocationSchema } from "@/lib/schemas/client-location.schema";
import { ClientLocationService } from "@/services/client-location.service";

/**
 * Client Location Router - CRUD operations for client saved locations
 */
export const clientLocationRouter = router({
  /**
   * Get all locations for a client
   */
  getByClient: protectedProcedure
    .input(ClientLocationSchema.byClient)
    .query(async ({ ctx, input }) => {
      const service = new ClientLocationService(ctx.prisma);
      return await service.findByClient(input.clientId);
    }),

  /**
   * Get a single location by ID
   */
  getById: protectedProcedure
    .input(ClientLocationSchema.id)
    .query(async ({ ctx, input }) => {
      const service = new ClientLocationService(ctx.prisma);
      return await service.findOne(input.id);
    }),

  /**
   * Create a new client location
   */
  create: protectedProcedure
    .input(ClientLocationSchema.create)
    .mutation(async ({ ctx, input }) => {
      const service = new ClientLocationService(ctx.prisma);
      return await service.create(input);
    }),

  /**
   * Update a client location
   */
  update: protectedProcedure
    .input(ClientLocationSchema.update)
    .mutation(async ({ ctx, input }) => {
      const service = new ClientLocationService(ctx.prisma);
      const { id, ...data } = input;
      return await service.update(id, data);
    }),

  /**
   * Delete a client location
   */
  delete: protectedProcedure
    .input(ClientLocationSchema.id)
    .mutation(async ({ ctx, input }) => {
      const service = new ClientLocationService(ctx.prisma);
      return await service.remove(input.id);
    }),
});
