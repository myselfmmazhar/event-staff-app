import { router, protectedProcedure, adminProcedure } from "../trpc";
import { EventUpdateRequestService } from "@/services/event-update-request.service";
import { ClientService } from "@/services/client.service";
import { EventUpdateRequestSchema } from "@/lib/schemas/event-update-request.schema";

export const eventUpdateRequestRouter = router({
  submit: protectedProcedure
    .input(EventUpdateRequestSchema.submit)
    .mutation(async ({ ctx, input }) => {
      const clientService = new ClientService(ctx.prisma);
      const client = await clientService.findByUserId(ctx.userId!);
      if (!client) {
        throw new Error("You must be a client to submit update requests.");
      }
      const service = new EventUpdateRequestService(ctx.prisma);
      return service.submit(input, client.id);
    }),

  getMyUpdateRequests: protectedProcedure
    .input(EventUpdateRequestSchema.getMyUpdateRequests)
    .query(async ({ ctx, input }) => {
      const clientService = new ClientService(ctx.prisma);
      const client = await clientService.findByUserId(ctx.userId!);
      if (!client) {
        throw new Error("You must be a client to view update requests.");
      }
      const service = new EventUpdateRequestService(ctx.prisma);
      return service.getMyUpdateRequests(client.id, input.page, input.limit);
    }),

  getAll: adminProcedure
    .input(EventUpdateRequestSchema.query)
    .query(async ({ ctx, input }) => {
      const service = new EventUpdateRequestService(ctx.prisma);
      return service.getAll(input);
    }),

  markReviewed: adminProcedure
    .input(EventUpdateRequestSchema.markReviewed)
    .mutation(async ({ ctx, input }) => {
      const service = new EventUpdateRequestService(ctx.prisma);
      return service.markReviewed(input, ctx.userId!);
    }),

  dismiss: adminProcedure
    .input(EventUpdateRequestSchema.dismiss)
    .mutation(async ({ ctx, input }) => {
      const service = new EventUpdateRequestService(ctx.prisma);
      return service.dismiss(input, ctx.userId!);
    }),
});
