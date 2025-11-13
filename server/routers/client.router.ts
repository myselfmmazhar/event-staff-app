import { router, protectedProcedure } from "../trpc";
import { ClientSchema } from "@/lib/schemas/client.schema";

/**
 * Client Router - All client-related tRPC procedures
 * All procedures use protectedProcedure (authenticated users manage their own clients)
 * ClientService is injected via context for efficient resource management
 */
export const clientRouter = router({
  /**
   * Get all clients with pagination, search, and filters
   * Users can only see their own clients
   */
  getAll: protectedProcedure
    .input(ClientSchema.query)
    .query(async ({ ctx, input }) => {
      return await ctx.clientService.findAll(input, ctx.userId!);
    }),

  /**
   * Get a single client by ID
   */
  getById: protectedProcedure
    .input(ClientSchema.id)
    .query(async ({ ctx, input }) => {
      return await ctx.clientService.findOne(input.id);
    }),

  /**
   * Create a new client
   */
  create: protectedProcedure
    .input(ClientSchema.create)
    .mutation(async ({ ctx, input }) => {
      return await ctx.clientService.create(input, ctx.userId!);
    }),

  /**
   * Update a client
   * Handles login access changes
   */
  update: protectedProcedure
    .input(ClientSchema.update)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return await ctx.clientService.update(id, data);
    }),

  /**
   * Delete a client
   */
  delete: protectedProcedure
    .input(ClientSchema.id)
    .mutation(async ({ ctx, input }) => {
      return await ctx.clientService.remove(input.id);
    }),

  /**
   * Grant login access to a client
   * Creates User account and returns temporary password
   */
  grantLoginAccess: protectedProcedure
    .input(ClientSchema.id)
    .mutation(async ({ ctx, input }) => {
      return await ctx.clientService.grantLoginAccess(input.id, ctx.userId!);
    }),

  /**
   * Revoke login access from a client
   * Deactivates associated User account
   */
  revokeLoginAccess: protectedProcedure
    .input(ClientSchema.id)
    .mutation(async ({ ctx, input }) => {
      return await ctx.clientService.revokeLoginAccess(input.id);
    }),

  /**
   * Get client statistics for dashboard
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.clientService.getStats();
  }),
});
