import { router, protectedProcedure } from "../trpc";
import { EventService } from "@/services/event.service";
import { EventSchema } from "@/lib/schemas/event.schema";
import { EventStatus } from "@prisma/client";
import { z } from "zod";

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
      return await eventService.findAll(input, ctx.userId!);
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
      return await eventService.findOne(input.id, ctx.userId!);
    }),

  /**
   * Create a new event
   * Requires: Authentication
   */
  create: protectedProcedure
    .input(EventSchema.create)
    .mutation(async ({ ctx, input }) => {
      const eventService = new EventService(ctx.prisma);
      return await eventService.create(input, ctx.userId!);
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
      return await eventService.update(id, data, ctx.userId!);
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
      return await eventService.remove(input.id, ctx.userId!);
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
      return await eventService.updateStatus(input.id, input.status, ctx.userId!);
    }),

  /**
   * Get upcoming events (next 30 days)
   * Users can only see their own events
   * Requires: Authentication
   */
  getUpcoming: protectedProcedure.query(async ({ ctx }) => {
    const eventService = new EventService(ctx.prisma);
    return await eventService.getUpcoming(ctx.userId!);
  }),

  /**
   * Get event statistics for dashboard
   * Users can only see stats for their own events
   * Requires: Authentication
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const eventService = new EventService(ctx.prisma);
    return await eventService.getStats(ctx.userId!);
  }),

  /**
   * Get events by date range (for calendar view)
   * Returns events that overlap with the specified date range
   * Users can only see their own events
   * Requires: Authentication
   */
  getByDateRange: protectedProcedure
    .input(EventSchema.dateRange)
    .query(async ({ ctx, input }) => {
      const eventService = new EventService(ctx.prisma);
      return await eventService.getByDateRange(input, ctx.userId!);
    }),

  /**
   * Get events for map view
   * Returns lightweight event data with coordinates for map rendering
   * Users can only see their own events
   * Requires: Authentication
   */
  getForMap: protectedProcedure
    .input(
      z.object({
        status: z.nativeEnum(EventStatus).optional(),
        clientId: z.string().optional(),
        search: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const eventService = new EventService(ctx.prisma);

      // Build where clause
      const where: any = {
        createdBy: ctx.userId!,
        AND: [
          // Only events with coordinates
          {
            latitude: { not: null },
            longitude: { not: null },
          },
        ],
      };

      if (input?.status) {
        where.status = input.status;
      }

      if (input?.clientId) {
        if (input.clientId === "NONE") {
          where.clientId = null;
        } else {
          where.clientId = input.clientId;
        }
      }

      if (input?.search) {
        where.OR = [
          { title: { contains: input.search, mode: "insensitive" } },
          { venueName: { contains: input.search, mode: "insensitive" } },
          { city: { contains: input.search, mode: "insensitive" } },
          { eventId: { contains: input.search, mode: "insensitive" } },
        ];
      }

      const events = await ctx.prisma.event.findMany({
        where,
        select: {
          id: true,
          title: true,
          venueName: true,
          city: true,
          state: true,
          startDate: true,
          status: true,
          latitude: true,
          longitude: true,
        },
        orderBy: {
          startDate: "asc",
        },
      });

      return events;
    }),

  /**
   * Get event location data for heat map analytics
   * Returns aggregated location data grouped by coordinates
   * Users can only see their own events
   * Requires: Authentication
   */
  getLocationData: protectedProcedure
    .input(
      z.object({
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      // Build where clause
      const where: any = {
        createdBy: ctx.userId!,
        latitude: { not: null },
        longitude: { not: null },
      };

      if (input?.startDate && input?.endDate) {
        where.startDate = {
          gte: input.startDate,
          lte: input.endDate,
        };
      }

      const events = await ctx.prisma.event.findMany({
        where,
        select: {
          id: true,
          latitude: true,
          longitude: true,
          city: true,
          state: true,
        },
      });

      return events;
    }),

  /**
   * Get events by state for choropleth map modal
   * Returns events in a specific state with basic details
   * Users can only see their own events
   * Requires: Authentication
   */
  getByState: protectedProcedure
    .input(
      z.object({
        state: z.string().min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const events = await ctx.prisma.event.findMany({
        where: {
          createdBy: ctx.userId!,
          state: input.state,
          latitude: { not: null },
          longitude: { not: null },
        },
        select: {
          id: true,
          eventId: true,
          title: true,
          venueName: true,
          city: true,
          state: true,
          startDate: true,
          endDate: true,
          status: true,
        },
        orderBy: {
          startDate: 'desc',
        },
      });

      return events;
    }),
});
