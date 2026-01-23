import { router, protectedProcedure } from "../trpc";
import { EventTemplateService } from "@/services/event-template.service";
import { EventTemplateSchema } from "@/lib/schemas/event-template.schema";

/**
 * Event Template Router - All event template-related tRPC procedures
 * Organization-wide: All authenticated users can see and use templates
 */
export const eventTemplateRouter = router({
  /**
   * Get all event templates with pagination and search
   * Organization-wide: All users can see all templates
   * Requires: Authentication
   */
  getAll: protectedProcedure
    .input(EventTemplateSchema.query)
    .query(async ({ ctx, input }) => {
      const service = new EventTemplateService(ctx.prisma);
      return await service.findAll(input);
    }),

  /**
   * Get a single event template by ID
   * Requires: Authentication
   */
  getById: protectedProcedure
    .input(EventTemplateSchema.id)
    .query(async ({ ctx, input }) => {
      const service = new EventTemplateService(ctx.prisma);
      return await service.findOne(input.id);
    }),

  /**
   * Get templates for dropdown selection (simplified)
   * Requires: Authentication
   */
  getForSelection: protectedProcedure.query(async ({ ctx }) => {
    const service = new EventTemplateService(ctx.prisma);
    return await service.getForSelection();
  }),

  /**
   * Create a new event template
   * Requires: Authentication
   */
  create: protectedProcedure
    .input(EventTemplateSchema.create)
    .mutation(async ({ ctx, input }) => {
      const service = new EventTemplateService(ctx.prisma);
      return await service.create(input, ctx.userId!);
    }),

  /**
   * Update an event template
   * Requires: Authentication
   */
  update: protectedProcedure
    .input(EventTemplateSchema.update)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const service = new EventTemplateService(ctx.prisma);
      return await service.update(id, data);
    }),

  /**
   * Delete an event template
   * Requires: Authentication
   */
  delete: protectedProcedure
    .input(EventTemplateSchema.id)
    .mutation(async ({ ctx, input }) => {
      const service = new EventTemplateService(ctx.prisma);
      return await service.remove(input.id);
    }),
});
