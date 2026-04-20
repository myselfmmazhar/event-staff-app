import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import { EventRequestService } from "@/services/event-request.service";
import {
  EventRequestSchema,
  type EventRequestCreateInput,
  type EventRequestUpdateInput,
  type EventRequestQueryInput,
  type EventRequestApproveInput,
  type EventRequestRejectInput,
} from "@/lib/schemas/event-request.schema";
import { ClientService } from "@/services/client.service";

export const eventRequestRouter = router({
  /**
   * Create a new event request (client only)
   * Protected procedure - requires authentication
   * Client must be verified
   */
  create: protectedProcedure
    .input(EventRequestSchema.create)
    .mutation(async ({ ctx, input }) => {
      const eventRequestService = new EventRequestService(ctx.prisma);
      const clientService = new ClientService(ctx.prisma);

      // Verify that the logged-in user is a client
      const client = await clientService.findByUserId(ctx.userId!);

      if (!client) {
        throw new Error("You must be a client to create event requests");
      }

      return await eventRequestService.create(input as EventRequestCreateInput, client.id);
    }),

  /**
   * Update a pending event request (client only)
   */
  update: protectedProcedure
    .input(EventRequestSchema.update)
    .mutation(async ({ ctx, input }) => {
      const eventRequestService = new EventRequestService(ctx.prisma);
      const clientService = new ClientService(ctx.prisma);

      const client = await clientService.findByUserId(ctx.userId!);
      if (!client) {
        throw new Error("You must be a client to edit event requests");
      }

      return await eventRequestService.update(input as EventRequestUpdateInput, client.id);
    }),

  /**
   * Get my event requests (client only)
   * Returns all event requests created by the logged-in client
   */
  getMyRequests: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1).optional(),
        limit: z.number().int().min(1).max(100).default(10).optional(),
        status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const eventRequestService = new EventRequestService(ctx.prisma);
      const clientService = new ClientService(ctx.prisma);

      // Verify that the logged-in user is a client
      const client = await clientService.findByUserId(ctx.userId!);

      if (!client) {
        throw new Error("You must be a client to view event requests");
      }

      const requests = await eventRequestService.findByClient(
        client.id,
        input.status as any
      );

      // Apply pagination
      const page = input.page ?? 1;
      const limit = input.limit ?? 10;
      const skip = (page - 1) * limit;
      const paginated = requests.slice(skip, skip + limit);

      return {
        data: paginated,
        meta: {
          total: requests.length,
          page,
          limit,
        },
      };
    }),

  /**
   * Get all event requests (admin only)
   * Returns all event requests with pagination and filtering
   */
  getAll: adminProcedure
    .input(EventRequestSchema.query)
    .query(async ({ ctx, input }) => {
      const eventRequestService = new EventRequestService(ctx.prisma);
      return await eventRequestService.findAll(input as EventRequestQueryInput);
    }),

  /**
   * Get a single event request by ID (admin only)
   * Returns detailed information about a specific request
   */
  getById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const eventRequestService = new EventRequestService(ctx.prisma);
      return await eventRequestService.findById(input.id);
    }),

  /**
   * Approve an event request (admin only)
   * Converts the request into a published event
   * Auto-creates the event in PUBLISHED status
   */
  approve: adminProcedure
    .input(EventRequestSchema.approve)
    .mutation(async ({ ctx, input }) => {
      const eventRequestService = new EventRequestService(ctx.prisma);
      return await eventRequestService.approve(
        input as EventRequestApproveInput,
        ctx.userId!
      );
    }),

  /**
   * Reject an event request (admin only)
   * Marks the request as rejected with a reason
   */
  reject: adminProcedure
    .input(EventRequestSchema.reject)
    .mutation(async ({ ctx, input }) => {
      const eventRequestService = new EventRequestService(ctx.prisma);
      return await eventRequestService.reject(
        input as EventRequestRejectInput,
        ctx.userId!
      );
    }),

  /**
   * Get status counts for all event requests (admin only)
   * Returns counts per status and total
   */
  getCounts: adminProcedure.query(async ({ ctx }) => {
    const eventRequestService = new EventRequestService(ctx.prisma);
    return await eventRequestService.getCounts();
  }),
});
