import { router, protectedProcedure } from "../trpc";
import { EventService } from "@/services/event.service";
import { EventSchema } from "@/lib/schemas/event.schema";
import { EventStatus, RequestMethod } from "@prisma/client";
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
      return await eventService.findAll(input, ctx.userId!, ctx.userRole as string);
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
      return await eventService.findOne(input.id, ctx.userId!, ctx.userRole as string);
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
      return await eventService.update(id, data, ctx.userId!, ctx.userRole as string);
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
      return await eventService.remove(input.id, ctx.userId!, ctx.userRole as string);
    }),

  /**
   * Delete multiple archived events
   * Users can only delete their own archived events
   * Requires: Authentication
   */
  deleteMany: protectedProcedure
    .input(EventSchema.deleteMany)
    .mutation(async ({ ctx, input }) => {
      const eventService = new EventService(ctx.prisma);
      return await eventService.deleteMany(input.ids, ctx.userId!, ctx.userRole as string);
    }),

  /**
   * Archive an event
   * Users can only archive their own events
   * Requires: Authentication
   */
  archive: protectedProcedure
    .input(EventSchema.archive)
    .mutation(async ({ ctx, input }) => {
      const eventService = new EventService(ctx.prisma);
      return await eventService.archive(input.id, ctx.userId!, ctx.userRole as string);
    }),

  /**
   * Bulk archive events
   */
  archiveMany: protectedProcedure
    .input(EventSchema.archiveMany)
    .mutation(async ({ ctx, input }) => {
      const eventService = new EventService(ctx.prisma);
      return await eventService.archiveMany(input.ids, ctx.userId!, ctx.userRole as string);
    }),

  /**
   * Restore an event
   */
  restore: protectedProcedure
    .input(EventSchema.restore)
    .mutation(async ({ ctx, input }) => {
      const eventService = new EventService(ctx.prisma);
      return await eventService.restore(input.id, ctx.userId!, ctx.userRole as string);
    }),

  /**
   * Bulk restore events
   */
  restoreMany: protectedProcedure
    .input(EventSchema.restoreMany)
    .mutation(async ({ ctx, input }) => {
      const eventService = new EventService(ctx.prisma);
      return await eventService.restoreMany(input.ids, ctx.userId!, ctx.userRole as string);
    }),

  /**
   * Get archived events with pagination/filters
   */
  getArchived: protectedProcedure
    .input(EventSchema.query)
    .query(async ({ ctx, input }) => {
      const eventService = new EventService(ctx.prisma);
      return await eventService.findAllArchived(input, ctx.userId!, ctx.userRole as string);
    }),

  /**
   * Get archived event count
   */
  getArchivedCount: protectedProcedure.query(async ({ ctx }) => {
    const eventService = new EventService(ctx.prisma);
    return await eventService.getArchivedCount(ctx.userId!, ctx.userRole as string);
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
      return await eventService.updateStatus(input.id, input.status, ctx.userId!, ctx.userRole as string);
    }),

  /**
   * Get upcoming events (next 30 days)
   * Users can only see their own events
   * Requires: Authentication
   */
  getUpcoming: protectedProcedure.query(async ({ ctx }) => {
    const eventService = new EventService(ctx.prisma);
    return await eventService.getUpcoming(ctx.userId!, ctx.userRole as string);
  }),

  /**
   * Get event statistics for dashboard
   * Users can only see stats for their own events
   * Requires: Authentication
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const eventService = new EventService(ctx.prisma);
    return await eventService.getStats(ctx.userId!, ctx.userRole as string);
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
      return await eventService.getByDateRange(input, ctx.userId!, ctx.userRole as string);
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
        statuses: z.array(z.nativeEnum(EventStatus)).optional(),
        clientIds: z.array(z.string()).optional(),
        search: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const isAdminPlus = ctx.userRole === 'SUPER_ADMIN' || ctx.userRole === 'ADMIN';

      // Build where clause
      const where: any = {
        ...(isAdminPlus ? {} : { createdBy: ctx.userId! }),
        isArchived: false,
        AND: [
          // Only events with coordinates
          {
            latitude: { not: null },
            longitude: { not: null },
          },
        ],
      };

      // Status filter - support both single and array
      if (input?.statuses && input.statuses.length > 0) {
        where.status = { in: input.statuses };
      } else if (input?.status) {
        where.status = input.status;
      }

      // Client filter - support both single and array
      if (input?.clientIds && input.clientIds.length > 0) {
        where.clientId = { in: input.clientIds };
      } else if (input?.clientId) {
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
      const isAdminPlus = ctx.userRole === 'SUPER_ADMIN' || ctx.userRole === 'ADMIN';

      // Build where clause
      const where: any = {
        ...(isAdminPlus ? {} : { createdBy: ctx.userId! }),
        isArchived: false,
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
      const isAdminPlus = ctx.userRole === 'SUPER_ADMIN' || ctx.userRole === 'ADMIN';

      const events = await ctx.prisma.event.findMany({
        where: {
          ...(isAdminPlus ? {} : { createdBy: ctx.userId! }),
          isArchived: false,
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

  /**
   * Get all events for export (no pagination)
   * Returns all events owned by the user
   * Requires: Authentication
   */
  getAllForExport: protectedProcedure.query(async ({ ctx }) => {
    const eventService = new EventService(ctx.prisma);
    return await eventService.findAllForExport(ctx.userId!, ctx.userRole as string);
  }),

  /**
   * Bulk import events
   * Supports create-only or upsert modes
   * Events are created with createdBy = authenticated user
   * In upsert mode, eventId is used to match existing events for update
   * Requires: Authentication
   */
  bulkImport: protectedProcedure
    .input(
      z.object({
        events: z.array(
          z.object({
            // For upsert matching - optional eventId to match existing events
            eventId: z.string().max(50).optional().nullable(),
            // Required fields
            title: z.string().min(1).max(200),
            venueName: z.string().min(1).max(200),
            address: z.string().min(1).max(300),
            city: z.string().min(1).max(100),
            state: z.string().min(1).max(50),
            zipCode: z.string().min(1).max(20),
            startDate: z.coerce.date(),
            endDate: z.coerce.date(),
            timezone: z.string().min(1).max(50),
            // Optional fields
            description: z.string().max(5000).optional(),
            requirements: z.string().max(200).optional(),
            privateComments: z.string().max(5000).optional(),
            status: z.nativeEnum(EventStatus).optional().default("DRAFT"),
            clientId: z.string().uuid().optional().nullable(),
            latitude: z.number().optional().nullable(),
            longitude: z.number().optional().nullable(),
            startTime: z.string().optional().nullable(),
            endTime: z.string().optional().nullable(),
            requestMethod: z.nativeEnum(RequestMethod).optional().nullable(),
            requestorName: z.string().max(200).optional().nullable(),
            requestorPhone: z.string().max(50).optional().nullable(),
            requestorEmail: z.string().max(255).optional().nullable(),
            poNumber: z.string().max(100).optional().nullable(),
            preEventInstructions: z.string().max(10000).optional().nullable(),
            meetingPoint: z.string().max(300).optional().nullable(),
            onsitePocName: z.string().max(200).optional().nullable(),
            onsitePocPhone: z.string().max(50).optional().nullable(),
            onsitePocEmail: z.string().max(255).optional().nullable(),
            fileLinks: z.array(z.object({ name: z.string(), link: z.string() })).optional().nullable(),
            eventDocuments: z.array(z.object({ name: z.string(), url: z.string(), type: z.string().optional(), size: z.number().optional() })).optional().nullable(),
          })
        ),
        mode: z.enum(["create", "upsert"]).default("create"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const eventService = new EventService(ctx.prisma);

      // Transform null values to undefined for service compatibility
      const transformedEvents = input.events.map((event) => {
        const transformed: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(event)) {
          transformed[key] = value === null ? undefined : value;
        }
        return transformed;
      });

      if (input.mode === "upsert") {
        return await eventService.upsertMany(transformedEvents as Parameters<typeof eventService.upsertMany>[0], ctx.userId!);
      } else {
        return await eventService.createMany(transformedEvents as Parameters<typeof eventService.createMany>[0], ctx.userId!);
      }
    }),

  /**
   * Bulk update events
   * Updates only fields that have enabled: true
   * Users can only update their own events
   * Requires: Authentication
   */
  bulkUpdate: protectedProcedure
    .input(EventSchema.bulkUpdate)
    .mutation(async ({ ctx, input }) => {
      const eventService = new EventService(ctx.prisma);
      return await eventService.bulkUpdate(input, ctx.userId!);
    }),

  /**
   * Send Message
   * Sends an email message and optionally updates event status
   * Requires: Authentication
   */
  sendMessage: protectedProcedure
    .input(EventSchema.sendMessage)
    .mutation(async ({ ctx, input }) => {
      const eventService = new EventService(ctx.prisma);

      // 1. Update status if provided
      if (input.statusToUpdate) {
        await eventService.updateStatus(input.eventId, input.statusToUpdate, ctx.userId!, ctx.userRole as string);
      }

      // 2. Send messages
      const { sendEmail } = await import('@/lib/utils/email');
      const { sendMessage } = await import('@/lib/utils/messaging');

      const results = await Promise.all(
        input.recipients.map(async (to) => {
          try {
            if (input.commMethod === 'EMAIL') {
              await sendEmail(ctx.prisma, to, input.subject, input.body, undefined, input.attachments);
            } else {
              // SMS or WHATSAPP (Uses Bird API)
              await sendMessage(
                ctx.prisma,
                to,
                // Include subject in sms/whatsapp body if provided
                input.subject ? `${input.subject}\n\n${input.body}` : input.body
              );
            }
            return { email: to, success: true };
          } catch (error) {
            console.error(`Failed to send message to ${to}:`, error);
            return { email: to, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
          }
        })
      );

      // 3. Cleanup temporary attachments if they are local
      if (input.attachments && input.attachments.length > 0) {
        const fs = await import('fs');
        input.attachments.forEach(att => {
          try {
            // Only delete if it's a local path (starts with D: or / or whatever local format is)
            // In Windows absolute paths might start with drive letter
            if (!att.path.startsWith('http')) {
              if (fs.existsSync(att.path)) {
                fs.unlinkSync(att.path);
              }
            }
          } catch (err) {
            console.error('Failed to cleanup attachment:', att.path, err);
          }
        });
      }

      return { results };
    }),
});
