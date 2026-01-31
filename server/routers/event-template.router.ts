import { router, protectedProcedure } from "../trpc";
import { EventTemplateService } from "@/services/event-template.service";
import { EventTemplateSchema, type CreateEventTemplateInput } from "@/lib/schemas/event-template.schema";
import { bulkImportSchema, type BulkImportInput } from "@/lib/schemas/event-template-import.schema";

/**
 * Convert null values to undefined for CreateEventTemplateInput compatibility
 */
function normalizeTemplate(template: BulkImportInput["templates"][number]): CreateEventTemplateInput {
  return {
    name: template.name,
    description: template.description ?? undefined,
    title: template.title ?? undefined,
    eventDescription: template.eventDescription ?? undefined,
    requirements: template.requirements ?? undefined,
    privateComments: template.privateComments ?? undefined,
    clientId: template.clientId ?? undefined,
    venueName: template.venueName ?? undefined,
    address: template.address ?? undefined,
    city: template.city ?? undefined,
    state: template.state ?? undefined,
    zipCode: template.zipCode ?? undefined,
    latitude: template.latitude ?? undefined,
    longitude: template.longitude ?? undefined,
    startDate: template.startDate ?? undefined,
    endDate: template.endDate ?? undefined,
    startTime: template.startTime ?? undefined,
    endTime: template.endTime ?? undefined,
    timezone: template.timezone ?? undefined,
    requestMethod: template.requestMethod ?? undefined,
    requestorName: template.requestorName ?? undefined,
    requestorPhone: template.requestorPhone ?? undefined,
    requestorEmail: template.requestorEmail ?? undefined,
    poNumber: template.poNumber ?? undefined,
    preEventInstructions: template.preEventInstructions ?? undefined,
    meetingPoint: template.meetingPoint ?? undefined,
    onsitePocName: template.onsitePocName ?? undefined,
    onsitePocPhone: template.onsitePocPhone ?? undefined,
    onsitePocEmail: template.onsitePocEmail ?? undefined,
    fileLinks: template.fileLinks ?? undefined,
    eventDocuments: template.eventDocuments ?? undefined,
  };
}

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

  /**
   * Delete multiple event templates
   * Requires: Authentication
   */
  deleteMany: protectedProcedure
    .input(EventTemplateSchema.deleteMany)
    .mutation(async ({ ctx, input }) => {
      const service = new EventTemplateService(ctx.prisma);
      return await service.deleteMany(input.ids);
    }),

  /**
   * Get all templates for export (no pagination)
   * Requires: Authentication
   */
  getAllForExport: protectedProcedure.query(async ({ ctx }) => {
    const service = new EventTemplateService(ctx.prisma);
    return await service.findAllForExport();
  }),

  /**
   * Bulk import templates
   * Supports create-only or upsert (create/update) modes
   * Requires: Authentication
   */
  bulkImport: protectedProcedure
    .input(bulkImportSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new EventTemplateService(ctx.prisma);
      const normalizedTemplates = input.templates.map(normalizeTemplate);

      if (input.mode === "upsert") {
        return await service.upsertMany(normalizedTemplates, ctx.userId!);
      } else {
        return await service.createMany(normalizedTemplates, ctx.userId!);
      }
    }),
});
