import { PrismaClient, Prisma, RequestMethod } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import type {
  CreateEventTemplateInput,
  UpdateEventTemplateInput,
  QueryEventTemplatesInput,
} from "@/lib/schemas/event-template.schema";

// Re-export types from schema for backwards compatibility
export type { CreateEventTemplateInput, QueryEventTemplatesInput };

// Update input type for service - manually define to avoid refinement type issues
export interface UpdateEventTemplateServiceInput {
  name?: string;
  description?: string | null;
  title?: string | null;
  eventDescription?: string | null;
  requirements?: string | null;
  privateComments?: string | null;
  clientId?: string | null;
  venueName?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  startDate?: Date | null;
  startTime?: string | null;
  endDate?: Date | null;
  endTime?: string | null;
  timezone?: string | null;
  fileLinks?: Array<{ name: string; link: string }> | null;
  // Request Information
  requestMethod?: RequestMethod | null;
  requestorName?: string | null;
  requestorPhone?: string | null;
  requestorEmail?: string | null;
  poNumber?: string | null;
  // Event Instructions & Documents
  preEventInstructions?: string | null;
  eventDocuments?: Array<{ name: string; url: string; type?: string; size?: number }> | null;
  // Onsite Contact & Meeting Point
  meetingPoint?: string | null;
  onsitePocName?: string | null;
  onsitePocPhone?: string | null;
  onsitePocEmail?: string | null;
}

// Select fields for event templates
const eventTemplateSelect = {
  id: true,
  name: true,
  description: true,
  title: true,
  eventDescription: true,
  requirements: true,
  privateComments: true,
  clientId: true,
  venueName: true,
  address: true,
  city: true,
  state: true,
  zipCode: true,
  latitude: true,
  longitude: true,
  startDate: true,
  startTime: true,
  endDate: true,
  endTime: true,
  timezone: true,
  fileLinks: true,
  // Request Information
  requestMethod: true,
  requestorName: true,
  requestorPhone: true,
  requestorEmail: true,
  poNumber: true,
  // Event Instructions & Documents
  preEventInstructions: true,
  eventDocuments: true,
  // Onsite Contact & Meeting Point
  meetingPoint: true,
  onsitePocName: true,
  onsitePocPhone: true,
  onsitePocEmail: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
  client: {
    select: {
      id: true,
      businessName: true,
    },
  },
  createdByUser: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} as const;

export type EventTemplateSelect = Prisma.EventTemplateGetPayload<{
  select: typeof eventTemplateSelect;
}>;

export interface PaginatedEventTemplates {
  data: EventTemplateSelect[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Event Template Service - Business logic layer for event template operations
 */
export class EventTemplateService {
  constructor(private prisma: PrismaClient) { }

  /**
   * Create a new event template
   */
  async create(data: CreateEventTemplateInput, userId: string) {
    try {
      // Sanitize input data
      const sanitizedData = {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        title: data.title?.trim() || null,
        eventDescription: data.eventDescription?.trim() || null,
        requirements: data.requirements?.trim() || null,
        privateComments: data.privateComments?.trim() || null,
        clientId: data.clientId && data.clientId !== "" ? data.clientId : null,
        venueName: data.venueName?.trim() || null,
        address: data.address?.trim() || null,
        city: data.city?.trim() || null,
        state: data.state?.trim() || null,
        zipCode: data.zipCode?.trim() || null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        startDate: data.startDate ?? null,
        startTime: data.startTime || null,
        endDate: data.endDate ?? null,
        endTime: data.endTime || null,
        timezone: data.timezone || null,
        fileLinks: data.fileLinks
          ? JSON.parse(JSON.stringify(data.fileLinks))
          : null,
        // Request Information
        requestMethod: data.requestMethod ?? null,
        requestorName: data.requestorName?.trim() || null,
        requestorPhone: data.requestorPhone?.trim() || null,
        requestorEmail: data.requestorEmail?.trim() || null,
        poNumber: data.poNumber?.trim() || null,
        // Event Instructions & Documents
        preEventInstructions: data.preEventInstructions?.trim() || null,
        eventDocuments: data.eventDocuments
          ? JSON.parse(JSON.stringify(data.eventDocuments))
          : null,
        // Onsite Contact & Meeting Point
        meetingPoint: data.meetingPoint?.trim() || null,
        onsitePocName: data.onsitePocName?.trim() || null,
        onsitePocPhone: data.onsitePocPhone?.trim() || null,
        onsitePocEmail: data.onsitePocEmail?.trim() || null,
        createdBy: userId,
      };

      // Create the template
      const template = await this.prisma.eventTemplate.create({
        data: sanitizedData,
        select: eventTemplateSelect,
      });

      return template;
    } catch (error) {
      // Re-throw TRPCError as is
      if (error instanceof TRPCError) {
        throw error;
      }

      // Check for unique constraint violation
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A template with this name already exists.",
        });
      }

      // Log and throw formatted error for Prisma errors
      console.error("Error creating event template:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create template. Please try again.",
      });
    }
  }

  /**
   * Get all event templates with pagination and search
   * Organization-wide: All users see all templates
   */
  async findAll(query: QueryEventTemplatesInput): Promise<PaginatedEventTemplates> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100); // Max 100 items per page
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ?? "createdAt";
    const sortOrder = query.sortOrder ?? "desc";

    // Build where clause
    const where: Prisma.EventTemplateWhereInput = {};

    // Search filter
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
        { title: { contains: query.search, mode: "insensitive" } },
        { venueName: { contains: query.search, mode: "insensitive" } },
      ];
    }

    // Execute count and find in parallel
    const [total, templates] = await Promise.all([
      this.prisma.eventTemplate.count({ where }),
      this.prisma.eventTemplate.findMany({
        where,
        select: eventTemplateSelect,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: templates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single event template by ID
   */
  async findOne(id: string): Promise<EventTemplateSelect> {
    const template = await this.prisma.eventTemplate.findUnique({
      where: { id },
      select: eventTemplateSelect,
    });

    if (!template) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Template not found.",
      });
    }

    return template;
  }

  /**
   * Update an event template
   */
  async update(id: string, data: UpdateEventTemplateServiceInput) {
    // First check if template exists
    const existing = await this.prisma.eventTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Template not found.",
      });
    }

    try {
      // Build update data - only include fields that are provided
      const updateData: Prisma.EventTemplateUpdateInput = {};

      if (data.name !== undefined) updateData.name = data.name.trim();
      if (data.description !== undefined)
        updateData.description = data.description?.trim() || null;
      if (data.title !== undefined)
        updateData.title = data.title?.trim() || null;
      if (data.eventDescription !== undefined)
        updateData.eventDescription = data.eventDescription?.trim() || null;
      if (data.requirements !== undefined)
        updateData.requirements = data.requirements?.trim() || null;
      if (data.privateComments !== undefined)
        updateData.privateComments = data.privateComments?.trim() || null;
      if (data.clientId !== undefined) {
        if (data.clientId && data.clientId !== "") {
          updateData.client = { connect: { id: data.clientId } };
        } else {
          updateData.client = { disconnect: true };
        }
      }
      if (data.venueName !== undefined)
        updateData.venueName = data.venueName?.trim() || null;
      if (data.address !== undefined)
        updateData.address = data.address?.trim() || null;
      if (data.city !== undefined) updateData.city = data.city?.trim() || null;
      if (data.state !== undefined)
        updateData.state = data.state?.trim() || null;
      if (data.zipCode !== undefined)
        updateData.zipCode = data.zipCode?.trim() || null;
      if (data.latitude !== undefined) updateData.latitude = data.latitude;
      if (data.longitude !== undefined) updateData.longitude = data.longitude;
      if (data.startDate !== undefined) updateData.startDate = data.startDate;
      if (data.startTime !== undefined)
        updateData.startTime = data.startTime || null;
      if (data.endDate !== undefined) updateData.endDate = data.endDate;
      if (data.endTime !== undefined)
        updateData.endTime = data.endTime || null;
      if (data.timezone !== undefined)
        updateData.timezone = data.timezone || null;
      if (data.fileLinks !== undefined)
        updateData.fileLinks = data.fileLinks
          ? JSON.parse(JSON.stringify(data.fileLinks))
          : null;
      // Request Information
      if (data.requestMethod !== undefined) updateData.requestMethod = data.requestMethod;
      if (data.requestorName !== undefined) updateData.requestorName = data.requestorName?.trim() || null;
      if (data.requestorPhone !== undefined) updateData.requestorPhone = data.requestorPhone?.trim() || null;
      if (data.requestorEmail !== undefined) updateData.requestorEmail = data.requestorEmail?.trim() || null;
      if (data.poNumber !== undefined) updateData.poNumber = data.poNumber?.trim() || null;
      // Event Instructions & Documents
      if (data.preEventInstructions !== undefined) updateData.preEventInstructions = data.preEventInstructions?.trim() || null;
      if (data.eventDocuments !== undefined)
        updateData.eventDocuments = data.eventDocuments
          ? JSON.parse(JSON.stringify(data.eventDocuments))
          : null;
      // Onsite Contact & Meeting Point
      if (data.meetingPoint !== undefined) updateData.meetingPoint = data.meetingPoint?.trim() || null;
      if (data.onsitePocName !== undefined) updateData.onsitePocName = data.onsitePocName?.trim() || null;
      if (data.onsitePocPhone !== undefined) updateData.onsitePocPhone = data.onsitePocPhone?.trim() || null;
      if (data.onsitePocEmail !== undefined) updateData.onsitePocEmail = data.onsitePocEmail?.trim() || null;

      const template = await this.prisma.eventTemplate.update({
        where: { id },
        data: updateData,
        select: eventTemplateSelect,
      });

      return template;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      // Check for unique constraint violation
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A template with this name already exists.",
        });
      }

      console.error("Error updating event template:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update template. Please try again.",
      });
    }
  }

  /**
   * Delete an event template
   */
  async remove(id: string) {
    // First check if template exists
    const existing = await this.prisma.eventTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Template not found.",
      });
    }

    try {
      await this.prisma.eventTemplate.delete({
        where: { id },
      });

      return { message: "Template deleted successfully." };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error("Error deleting event template:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to delete template. Please try again.",
      });
    }
  }

  /**
   * Delete multiple event templates
   */
  async deleteMany(ids: string[]): Promise<{ count: number }> {
    const result = await this.prisma.eventTemplate.deleteMany({
      where: { id: { in: ids } },
    });

    return { count: result.count };
  }

  /**
   * Get all templates for dropdown selection (simplified)
   */
  async getForSelection() {
    const templates = await this.prisma.eventTemplate.findMany({
      select: {
        id: true,
        name: true,
        description: true,
      },
      orderBy: { name: "asc" },
    });

    return templates;
  }

  /**
   * Get all templates for export (no pagination)
   */
  async findAllForExport(): Promise<EventTemplateSelect[]> {
    const templates = await this.prisma.eventTemplate.findMany({
      select: eventTemplateSelect,
      orderBy: { name: "asc" },
    });

    return templates;
  }

  /**
   * Find templates by names (case-insensitive) for update matching
   */
  async findByNames(names: string[]): Promise<Map<string, { id: string; name: string }>> {
    const lowerNames = names.map((n) => n.toLowerCase());
    const templates = await this.prisma.eventTemplate.findMany({
      where: {
        name: {
          in: names,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const map = new Map<string, { id: string; name: string }>();
    for (const template of templates) {
      map.set(template.name.toLowerCase(), template);
    }
    return map;
  }

  /**
   * Sanitize input data for create/update
   */
  private sanitizeData(data: CreateEventTemplateInput) {
    return {
      name: data.name.trim(),
      description: data.description?.trim() || null,
      title: data.title?.trim() || null,
      eventDescription: data.eventDescription?.trim() || null,
      requirements: data.requirements?.trim() || null,
      privateComments: data.privateComments?.trim() || null,
      clientId: data.clientId && data.clientId !== "" ? data.clientId : null,
      venueName: data.venueName?.trim() || null,
      address: data.address?.trim() || null,
      city: data.city?.trim() || null,
      state: data.state?.trim() || null,
      zipCode: data.zipCode?.trim() || null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      startDate: data.startDate ?? null,
      startTime: data.startTime || null,
      endDate: data.endDate ?? null,
      endTime: data.endTime || null,
      timezone: data.timezone || null,
      fileLinks: data.fileLinks
        ? JSON.parse(JSON.stringify(data.fileLinks))
        : null,
      requestMethod: data.requestMethod ?? null,
      requestorName: data.requestorName?.trim() || null,
      requestorPhone: data.requestorPhone?.trim() || null,
      requestorEmail: data.requestorEmail?.trim() || null,
      poNumber: data.poNumber?.trim() || null,
      preEventInstructions: data.preEventInstructions?.trim() || null,
      eventDocuments: data.eventDocuments
        ? JSON.parse(JSON.stringify(data.eventDocuments))
        : null,
      meetingPoint: data.meetingPoint?.trim() || null,
      onsitePocName: data.onsitePocName?.trim() || null,
      onsitePocPhone: data.onsitePocPhone?.trim() || null,
      onsitePocEmail: data.onsitePocEmail?.trim() || null,
    };
  }

  /**
   * Bulk create templates
   */
  async createMany(
    templates: CreateEventTemplateInput[],
    userId: string
  ): Promise<{ created: number; errors: { index: number; message: string }[] }> {
    const results = { created: 0, errors: [] as { index: number; message: string }[] };

    for (let i = 0; i < templates.length; i++) {
      const template = templates[i]!;
      try {
        const sanitizedData = this.sanitizeData(template);
        await this.prisma.eventTemplate.create({
          data: {
            ...sanitizedData,
            createdBy: userId,
          },
        });
        results.created++;
      } catch (error) {
        let message = "Failed to create template";
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          message = `Template "${template.name}" already exists`;
        } else if (error instanceof Error) {
          message = error.message;
        }
        results.errors.push({ index: i, message });
      }
    }

    return results;
  }

  /**
   * Bulk upsert templates (create or update by name match)
   */
  async upsertMany(
    templates: CreateEventTemplateInput[],
    userId: string
  ): Promise<{ created: number; updated: number; errors: { index: number; message: string }[] }> {
    const results = {
      created: 0,
      updated: 0,
      errors: [] as { index: number; message: string }[],
    };

    // Find existing templates by name
    const existingByName = await this.findByNames(templates.map((t) => t.name));

    for (let i = 0; i < templates.length; i++) {
      const template = templates[i]!;
      try {
        const sanitizedData = this.sanitizeData(template);
        const existing = existingByName.get(template.name.toLowerCase());

        if (existing) {
          // Update existing template
          await this.prisma.eventTemplate.update({
            where: { id: existing.id },
            data: sanitizedData,
          });
          results.updated++;
        } else {
          // Create new template
          await this.prisma.eventTemplate.create({
            data: {
              ...sanitizedData,
              createdBy: userId,
            },
          });
          results.created++;
        }
      } catch (error) {
        let message = "Failed to process template";
        if (error instanceof Error) {
          message = error.message;
        }
        results.errors.push({ index: i, message });
      }
    }

    return results;
  }
}
