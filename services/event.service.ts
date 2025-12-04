import { PrismaClient, EventStatus, Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import type {
  CreateEventInput,
  UpdateEventInput as UpdateEventInputType,
  QueryEventsInput,
  DateRangeInput,
} from "@/lib/schemas/event.schema";
import { SettingsService } from "./settings.service";

// Re-export types from schema for backwards compatibility
export type { CreateEventInput, QueryEventsInput };

// Update input type for service (Zod already validates, service receives validated data)
export interface UpdateEventInput extends Omit<UpdateEventInputType, "id"> {
  // id is handled separately in the method signature
}

type EventSelect = {
  id: string;
  eventId: string;
  title: string;
  description: string | null;
  dressCode: string | null;
  privateComments: string | null;
  clientId: string | null;
  client?: {
    id: string;
    businessName: string;
  } | null;
  venueName: string;
  address: string;
  room: string;
  city: string;
  state: string;
  zipCode: string;
  startDate: Date;
  startTime: string | null;
  endDate: Date;
  endTime: string | null;
  timezone: string;
  dailyDigestMode: boolean;
  requireStaff: boolean;
  status: EventStatus;
  fileLinks: Prisma.JsonValue;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export interface PaginatedEvents {
  data: EventSelect[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface EventStats {
  total: number;
  upcoming: number; // Events starting in next 30 days
  byStatus: {
    DRAFT: number;
    PUBLISHED: number;
    CONFIRMED: number;
    IN_PROGRESS: number;
    COMPLETED: number;
    CANCELLED: number;
  };
}

/**
 * Event Service - Business logic layer for event operations
 */
export class EventService {
  private settingsService: SettingsService;

  constructor(private prisma: PrismaClient) {
    this.settingsService = new SettingsService(prisma);
  }

  /**
   * Generate a unique Event ID in format [PREFIX]-YYYY-NNN
   * Prefix is dynamically determined from terminology settings
   */
  private async generateEventId(): Promise<string> {
    // Get current terminology to determine prefix
    const terminology = await this.settingsService.getTerminology();
    const year = new Date().getFullYear();
    const prefix = `${terminology.eventIdPrefix}-${year}-`;

    // Get the count of events created this year
    const count = await this.prisma.event.count({
      where: {
        eventId: {
          startsWith: prefix,
        },
      },
    });

    // Generate the next number (pad with zeros to 3 digits)
    const nextNumber = (count + 1).toString().padStart(3, "0");
    const eventId = `${prefix}${nextNumber}`;

    // Check if this ID already exists (race condition protection)
    const existing = await this.prisma.event.findUnique({
      where: { eventId },
    });

    if (existing) {
      // Recursively try the next number
      return this.generateEventId();
    }

    return eventId;
  }

  /**
   * Create a new event
   */
  async create(data: CreateEventInput, userId: string) {
    try {
      // Generate unique event ID
      const eventId = await this.generateEventId();

      // Sanitize input data
      const sanitizedData = {
        eventId,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        dressCode: data.dressCode?.trim() || null,
        privateComments: data.privateComments?.trim() || null,
        clientId: data.clientId && data.clientId !== '' ? data.clientId : null,
        venueName: data.venueName.trim(),
        address: data.address.trim(),
        room: data.room.trim(),
        city: data.city.trim(),
        state: data.state.trim(),
        zipCode: data.zipCode.trim(),
        startDate: data.startDate,
        startTime: data.startTime || null,
        endDate: data.endDate,
        endTime: data.endTime || null,
        timezone: data.timezone,
        dailyDigestMode: data.dailyDigestMode ?? false,
        requireStaff: data.requireStaff ?? false,
        status: data.status ?? EventStatus.DRAFT,
        fileLinks: data.fileLinks ? JSON.parse(JSON.stringify(data.fileLinks)) : null,
        createdBy: userId,
      };

      // Create the event
      const event = await this.prisma.event.create({
        data: sanitizedData,
        select: {
          id: true,
          eventId: true,
          title: true,
          description: true,
          dressCode: true,
          privateComments: true,
          clientId: true,
          venueName: true,
          address: true,
          room: true,
          city: true,
          state: true,
          zipCode: true,
          startDate: true,
          startTime: true,
          endDate: true,
          endTime: true,
          timezone: true,
          dailyDigestMode: true,
          requireStaff: true,
          status: true,
          fileLinks: true,
          createdBy: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return event;
    } catch (error) {
      // Re-throw TRPCError as is
      if (error instanceof TRPCError) {
        throw error;
      }

      // Log and throw formatted error for Prisma errors
      console.error("Error creating event:", error);
      const terminology = await this.settingsService.getTerminology();
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to create ${terminology.event.lower}. Please try again.`,
      });
    }
  }

  /**
   * Get all events with pagination, search, and filters
   * Users can only see their own events (ownership check)
   */
  async findAll(query: QueryEventsInput, userId: string): Promise<PaginatedEvents> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100); // Max 100 items per page
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ?? "createdAt";
    const sortOrder = query.sortOrder ?? "desc";

    // Build where clause - IMPORTANT: Only show user's own events
    const where: Prisma.EventWhereInput = {
      createdBy: userId,
    };

    // Status filter
    if (query.status) {
      where.status = query.status;
    }

    // Client filter
    if (query.clientId) {
      if (query.clientId === 'NONE') {
        // Filter for events without a client
        where.clientId = null;
      } else {
        // Filter for specific client
        where.clientId = query.clientId;
      }
    }

    // Timezone filter
    if (query.timezone) {
      where.timezone = query.timezone;
    }

    // Start date range filter
    if (query.startDateFrom || query.startDateTo) {
      where.startDate = {};
      if (query.startDateFrom) {
        where.startDate.gte = query.startDateFrom;
      }
      if (query.startDateTo) {
        where.startDate.lte = query.startDateTo;
      }
    }

    // End date range filter
    if (query.endDateFrom || query.endDateTo) {
      where.endDate = {};
      if (query.endDateFrom) {
        where.endDate.gte = query.endDateFrom;
      }
      if (query.endDateTo) {
        where.endDate.lte = query.endDateTo;
      }
    }

    // Search filter (title, description, venueName, city)
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
        { venueName: { contains: query.search, mode: "insensitive" } },
        { city: { contains: query.search, mode: "insensitive" } },
        { eventId: { contains: query.search, mode: "insensitive" } },
      ];
    }

    // Execute query
    const [data, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        select: {
          id: true,
          eventId: true,
          title: true,
          description: true,
          dressCode: true,
          privateComments: true,
          clientId: true,
          client: {
            select: {
              id: true,
              businessName: true,
            },
          },
          venueName: true,
          address: true,
          room: true,
          city: true,
          state: true,
          zipCode: true,
          startDate: true,
          startTime: true,
          endDate: true,
          endTime: true,
          timezone: true,
          dailyDigestMode: true,
          requireStaff: true,
          status: true,
          fileLinks: true,
          createdBy: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip,
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get a single event by ID
   * Includes ownership check
   */
  async findOne(id: string, userId: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        id,
        createdBy: userId, // Ownership check
      },
      select: {
        id: true,
        eventId: true,
        title: true,
        description: true,
        dressCode: true,
        privateComments: true,
        clientId: true,
        client: {
          select: {
            id: true,
            businessName: true,
          },
        },
        venueName: true,
        address: true,
        room: true,
        city: true,
        state: true,
        zipCode: true,
        startDate: true,
        startTime: true,
        endDate: true,
        endTime: true,
        timezone: true,
        dailyDigestMode: true,
        requireStaff: true,
        status: true,
        fileLinks: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!event) {
      const terminology = await this.settingsService.getTerminology();
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `${terminology.event.singular} with ID ${id} not found or you don't have permission to access it`,
      });
    }

    return event;
  }

  /**
   * Update an event
   * Includes ownership check
   */
  async update(id: string, data: UpdateEventInput, userId: string) {
    try {
      // Check if event exists and user owns it
      await this.findOne(id, userId);

      // Sanitize input data
      const sanitizedData: any = {};
      if (data.title !== undefined) sanitizedData.title = data.title.trim();
      if (data.description !== undefined) sanitizedData.description = data.description?.trim() || null;
      if (data.dressCode !== undefined) sanitizedData.dressCode = data.dressCode?.trim() || null;
      if (data.privateComments !== undefined) sanitizedData.privateComments = data.privateComments?.trim() || null;
      if (data.clientId !== undefined) sanitizedData.clientId = data.clientId && data.clientId !== '' ? data.clientId : null;
      if (data.venueName !== undefined) sanitizedData.venueName = data.venueName.trim();
      if (data.address !== undefined) sanitizedData.address = data.address.trim();
      if (data.room !== undefined) sanitizedData.room = data.room.trim();
      if (data.city !== undefined) sanitizedData.city = data.city.trim();
      if (data.state !== undefined) sanitizedData.state = data.state.trim();
      if (data.zipCode !== undefined) sanitizedData.zipCode = data.zipCode.trim();
      if (data.startDate !== undefined) sanitizedData.startDate = data.startDate;
      if (data.startTime !== undefined) sanitizedData.startTime = data.startTime || null;
      if (data.endDate !== undefined) sanitizedData.endDate = data.endDate;
      if (data.endTime !== undefined) sanitizedData.endTime = data.endTime || null;
      if (data.timezone !== undefined) sanitizedData.timezone = data.timezone;
      if (data.dailyDigestMode !== undefined) sanitizedData.dailyDigestMode = data.dailyDigestMode;
      if (data.requireStaff !== undefined) sanitizedData.requireStaff = data.requireStaff;
      if (data.status !== undefined) sanitizedData.status = data.status;
      if (data.fileLinks !== undefined) {
        sanitizedData.fileLinks = data.fileLinks ? JSON.parse(JSON.stringify(data.fileLinks)) : null;
      }

      // Update the event
      const updatedEvent = await this.prisma.event.update({
        where: { id },
        data: sanitizedData,
        select: {
          id: true,
          eventId: true,
          title: true,
          description: true,
          dressCode: true,
          privateComments: true,
          clientId: true,
          venueName: true,
          address: true,
          room: true,
          city: true,
          state: true,
          zipCode: true,
          startDate: true,
          startTime: true,
          endDate: true,
          endTime: true,
          timezone: true,
          dailyDigestMode: true,
          requireStaff: true,
          status: true,
          fileLinks: true,
          createdBy: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return updatedEvent;
    } catch (error) {
      // Re-throw TRPCError as is
      if (error instanceof TRPCError) {
        throw error;
      }

      // Log and throw formatted error for Prisma errors
      console.error("Error updating event:", error);
      const terminology = await this.settingsService.getTerminology();
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to update ${terminology.event.lower}. Please try again.`,
      });
    }
  }

  /**
   * Delete an event (hard delete)
   * Includes ownership check
   */
  async remove(id: string, userId: string) {
    // Check if event exists and user owns it
    await this.findOne(id, userId);

    // Delete the event
    await this.prisma.event.delete({
      where: { id },
    });

    const terminology = await this.settingsService.getTerminology();
    return { success: true, message: `${terminology.event.singular} deleted successfully` };
  }

  /**
   * Update event status
   * Includes ownership check
   */
  async updateStatus(id: string, status: EventStatus, userId: string) {
    // Check if event exists and user owns it
    await this.findOne(id, userId);

    const event = await this.prisma.event.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        eventId: true,
        title: true,
        description: true,
        dressCode: true,
        privateComments: true,
        venueName: true,
        address: true,
        room: true,
        city: true,
        state: true,
        zipCode: true,
        startDate: true,
        startTime: true,
        endDate: true,
        endTime: true,
        timezone: true,
        dailyDigestMode: true,
        requireStaff: true,
        status: true,
        fileLinks: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return event;
  }

  /**
   * Get upcoming events (starting in next 30 days)
   */
  async getUpcoming(userId: string) {
    const today = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(today.getDate() + 30);

    const events = await this.prisma.event.findMany({
      where: {
        createdBy: userId,
        startDate: {
          gte: today,
          lte: thirtyDaysLater,
        },
        status: {
          notIn: [EventStatus.CANCELLED, EventStatus.COMPLETED],
        },
      },
      select: {
        id: true,
        eventId: true,
        title: true,
        venueName: true,
        city: true,
        state: true,
        startDate: true,
        startTime: true,
        endDate: true,
        endTime: true,
        status: true,
        timezone: true,
        client: {
          select: {
            id: true,
            businessName: true,
          },
        },
      },
      orderBy: {
        startDate: "asc",
      },
      take: 10,
    });

    return events;
  }

  /**
   * Get event statistics for dashboard
   */
  async getStats(userId: string): Promise<EventStats> {
    const today = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(today.getDate() + 30);

    const [total, upcoming, byStatus] = await Promise.all([
      this.prisma.event.count({ where: { createdBy: userId } }),
      this.prisma.event.count({
        where: {
          createdBy: userId,
          startDate: {
            gte: today,
            lte: thirtyDaysLater,
          },
          status: {
            notIn: [EventStatus.CANCELLED, EventStatus.COMPLETED],
          },
        },
      }),
      Promise.all([
        this.prisma.event.count({ where: { createdBy: userId, status: EventStatus.DRAFT } }),
        this.prisma.event.count({ where: { createdBy: userId, status: EventStatus.PUBLISHED } }),
        this.prisma.event.count({ where: { createdBy: userId, status: EventStatus.CONFIRMED } }),
        this.prisma.event.count({ where: { createdBy: userId, status: EventStatus.IN_PROGRESS } }),
        this.prisma.event.count({ where: { createdBy: userId, status: EventStatus.COMPLETED } }),
        this.prisma.event.count({ where: { createdBy: userId, status: EventStatus.CANCELLED } }),
      ]),
    ]);

    return {
      total,
      upcoming,
      byStatus: {
        DRAFT: byStatus[0],
        PUBLISHED: byStatus[1],
        CONFIRMED: byStatus[2],
        IN_PROGRESS: byStatus[3],
        COMPLETED: byStatus[4],
        CANCELLED: byStatus[5],
      },
    };
  }

  /**
   * Get events by date range (for calendar view)
   * Returns events that overlap with the specified date range
   */
  async getByDateRange(input: DateRangeInput, userId: string) {
    const where: Prisma.EventWhereInput = {
      createdBy: userId,
      // Event overlaps with the date range if:
      // - Event starts before or on range end AND
      // - Event ends on or after range start
      startDate: { lte: input.endDate },
      endDate: { gte: input.startDate },
    };

    // Optional status filter
    if (input.status) {
      where.status = input.status;
    }

    const events = await this.prisma.event.findMany({
      where,
      select: {
        id: true,
        eventId: true,
        title: true,
        startDate: true,
        startTime: true,
        endDate: true,
        endTime: true,
        status: true,
        timezone: true,
        venueName: true,
        client: {
          select: {
            businessName: true,
          },
        },
      },
      orderBy: {
        startDate: "asc",
      },
    });

    return events;
  }
}
