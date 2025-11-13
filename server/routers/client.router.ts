import { router, protectedProcedure } from "../trpc";
import { ClientService } from "@/services/client.service";
import { ClientSchema } from "@/lib/schemas/client.schema";

/**
 * Client Router - All client-related tRPC procedures
 * All procedures use protectedProcedure (authenticated users manage their own clients)
 */
export const clientRouter = router({
  /**
   * Get all clients with pagination, search, and filters
   * Users can only see their own clients
   */
  getAll: protectedProcedure
    .input(ClientSchema.query)
    .query(async ({ ctx, input }) => {
      const clientService = new ClientService(ctx.prisma);
      return await clientService.findAll(input, ctx.userId!);
    }),

  /**
   * Get a single client by ID
   */
  getById: protectedProcedure
    .input(ClientSchema.id)
    .query(async ({ ctx, input }) => {
      const clientService = new ClientService(ctx.prisma);
      return await clientService.findOne(input.id);
    }),

  /**
   * Create a new client
   */
  create: protectedProcedure
    .input(ClientSchema.create)
    .mutation(async ({ ctx, input }) => {
      const clientService = new ClientService(ctx.prisma);
      return await clientService.create(input, ctx.userId!);
    }),

  /**
   * Update a client
   * Handles login access changes
   */
  update: protectedProcedure
    .input(ClientSchema.update)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const clientService = new ClientService(ctx.prisma);
      return await clientService.update(id, data);
    }),

  /**
   * Delete a client
   */
  delete: protectedProcedure
    .input(ClientSchema.id)
    .mutation(async ({ ctx, input }) => {
      const clientService = new ClientService(ctx.prisma);
      return await clientService.remove(input.id);
    }),

  /**
   * Grant login access to a client
   * Creates User account and returns temporary password
   */
  grantLoginAccess: protectedProcedure
    .input(ClientSchema.id)
    .mutation(async ({ ctx, input }) => {
      const clientService = new ClientService(ctx.prisma);
      return await clientService.grantLoginAccess(input.id, ctx.userId!);
    }),

  /**
   * Revoke login access from a client
   * Deactivates associated User account
   */
  revokeLoginAccess: protectedProcedure
    .input(ClientSchema.id)
    .mutation(async ({ ctx, input }) => {
      const clientService = new ClientService(ctx.prisma);
      return await clientService.revokeLoginAccess(input.id);
    }),

  /**
   * Get client statistics for dashboard
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const clientService = new ClientService(ctx.prisma);
    return await clientService.getStats();
  }),
});
