import { router, protectedProcedure } from "../trpc";
import { EventService } from "@/services/event.service";
import { EventSchema } from "@/lib/schemas/event.schema";

/**
 * Event Router - All event-related tRPC procedures
 * Note: All procedures use protectedProcedure (authenticated users can manage their own events)
 */
export const eventRouter = router({
  /**
   * Get all events with pagination, search, and filters
   * Users can only see their own events
   * Requires: Authentication
   */
  getAll: protectedProcedure
    .input(EventSchema.query)
    .query(async ({ ctx, input }) => {
      const eventService = new EventService(ctx.prisma);
      return await eventService.findAll(input, ctx.userId);
    }),

  /**
   * Get a single event by ID
   * Users can only access their own events
   * Requires: Authentication
   */
  getById: protectedProcedure
    .input(EventSchema.id)
    .query(async ({ ctx, input }) => {
      const eventService = new EventService(ctx.prisma);
      return await eventService.findOne(input.id, ctx.userId);
    }),

  /**
   * Create a new event
   * Requires: Authentication
   */
  create: protectedProcedure
    .input(EventSchema.create)
    .mutation(async ({ ctx, input }) => {
      const eventService = new EventService(ctx.prisma);
      return await eventService.create(input, ctx.userId);
    }),

  /**
   * Update an event
   * Users can only update their own events
   * Requires: Authentication
   */
  update: protectedProcedure
    .input(EventSchema.update)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const eventService = new EventService(ctx.prisma);
      return await eventService.update(id, data, ctx.userId);
    }),

  /**
   * Delete an event
   * Users can only delete their own events
   * Requires: Authentication
   */
  delete: protectedProcedure
    .input(EventSchema.id)
    .mutation(async ({ ctx, input }) => {
      const eventService = new EventService(ctx.prisma);
      return await eventService.remove(input.id, ctx.userId);
    }),

  /**
   * Update event status
   * Users can only update status of their own events
   * Requires: Authentication
   */
  updateStatus: protectedProcedure
    .input(EventSchema.updateStatus)
    .mutation(async ({ ctx, input }) => {
      const eventService = new EventService(ctx.prisma);
      return await eventService.updateStatus(input.id, input.status, ctx.userId);
    }),

  /**
   * Get upcoming events (next 30 days)
   * Users can only see their own events
   * Requires: Authentication
   */
  getUpcoming: protectedProcedure.query(async ({ ctx }) => {
    const eventService = new EventService(ctx.prisma);
    return await eventService.getUpcoming(ctx.userId);
  }),

  /**
   * Get event statistics for dashboard
   * Users can only see stats for their own events
   * Requires: Authentication
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const eventService = new EventService(ctx.prisma);
    return await eventService.getStats(ctx.userId);
  }),
});
