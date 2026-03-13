import { PrismaClient, EventStatus, Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import type {
  CreateEventInput,
  UpdateEventInput as UpdateEventInputType,
  QueryEventsInput,
  DateRangeInput,
  BulkUpdateEventsInput,
} from "@/lib/schemas/event.schema";
import { SettingsService } from "./settings.service";
import { generateEventId } from "@/lib/utils/id-generator";
import { getNotificationTriggerService } from "@/services/notification-trigger.service";
import { checkAndUpdateEventStatus, checkAndUpdateMultipleEventStatuses } from "@/lib/utils/event-status-checker";
import type { EventSelect, PaginatedResponse } from "@/lib/types/prisma-types";

// Re-export types from schema for backwards compatibility
export type { CreateEventInput, QueryEventsInput };

// Update input type for service (Zod already validates, service receives validated data)
export type UpdateEventInput = Omit<UpdateEventInputType, "id">;

export type PaginatedEvents = PaginatedResponse<EventSelect>;

export interface EventStats {
  total: number;
  upcoming: number; // Events starting in next 30 days
  byStatus: {
    DRAFT: number;
    PUBLISHED: number;
    ASSIGNED: number;
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

  private async getOwnedEventMeta(id: string, userId: string, userRole?: string) {
    const isSuperAdmin = userRole === 'SUPER_ADMIN';
    const isAdmin = userRole === 'ADMIN';

    const event = await this.prisma.event.findFirst({
      where: {
        id,
        ...(isSuperAdmin ? {} : 
           isAdmin ? { createdByUser: { role: { not: 'SUPER_ADMIN' } } } : 
           { createdBy: userId }),
      },
      select: {
        id: true,
        eventId: true,
        title: true,
        isArchived: true,
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
   * Create a new event
   */
  async create(data: CreateEventInput, userId: string) {
    try {
      // Generate unique event ID using shared utility
      const terminology = await this.settingsService.getTerminology();
      const eventId = await generateEventId(this.prisma, terminology.eventIdPrefix);

      // Sanitize input data
      const sanitizedData = {
        eventId,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        requirements: data.requirements?.trim() || null,
        privateComments: data.privateComments?.trim() || null,
        clientId: data.clientId && data.clientId !== '' ? data.clientId : null,
        venueName: data.venueName.trim(),
        address: data.address.trim(),
        addressLine2: data.addressLine2?.trim() || null,
        city: data.city.trim(),
        state: data.state.trim(),
        zipCode: data.zipCode.trim(),
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        geocodedAt: data.latitude && data.longitude ? new Date() : null,
        startDate: data.startDate,
        startTime: data.startTime || null,
        endDate: data.endDate,
        endTime: data.endTime || null,
        timezone: data.timezone,
        status: data.status ?? EventStatus.DRAFT,
        fileLinks: data.fileLinks ? JSON.parse(JSON.stringify(data.fileLinks)) : null,
        // Request Information
        requestMethod: data.requestMethod ?? null,
        requestorName: data.requestorName?.trim() || null,
        requestorPhone: data.requestorPhone?.trim() || null,
        requestorEmail: data.requestorEmail?.trim() || null,
        poNumber: data.poNumber?.trim() || null,
        // Event Instructions & Documents
        preEventInstructions: data.preEventInstructions?.trim() || null,
        eventDocuments: data.eventDocuments ? JSON.parse(JSON.stringify(data.eventDocuments)) : null,
        // Custom Fields
        customFields: data.customFields ? JSON.parse(JSON.stringify(data.customFields)) : null,
        // Onsite Contact & Meeting Point
        meetingPoint: data.meetingPoint?.trim() || null,
        onsitePocName: data.onsitePocName?.trim() || null,
        onsitePocPhone: data.onsitePocPhone?.trim() || null,
        onsitePocEmail: data.onsitePocEmail?.trim() || null,
        // Billing & Rate Settings
        estimate: data.estimate ?? null,
        taskRateType: data.taskRateType ?? null,
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
          requirements: true,
          privateComments: true,
          clientId: true,
          venueName: true,
          address: true,
          addressLine2: true,
          city: true,
          state: true,
          zipCode: true,
          latitude: true,
          longitude: true,
          geocodedAt: true,
          startDate: true,
          startTime: true,
          endDate: true,
          endTime: true,
          timezone: true,
          status: true,
          fileLinks: true,
          isArchived: true,
          archivedAt: true,
          requestMethod: true,
          requestorName: true,
          requestorPhone: true,
          requestorEmail: true,
          poNumber: true,
          preEventInstructions: true,
          eventDocuments: true,
          customFields: true,
          meetingPoint: true,
          onsitePocName: true,
          onsitePocPhone: true,
          onsitePocEmail: true,
          estimate: true,
          taskRateType: true,
          commission: true,
          commissionAmount: true,
          commissionAmountType: true,
          approveForOvertime: true,
          overtimeRate: true,
          overtimeRateType: true,
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
  async findAll(query: QueryEventsInput, userId: string, userRole?: string): Promise<PaginatedEvents> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100); // Max 100 items per page
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ?? "createdAt";
    const sortOrder = query.sortOrder ?? "desc";

    const isSuperAdmin = userRole === 'SUPER_ADMIN';
    const isAdmin = userRole === 'ADMIN';

    // Build where clause
    const where: Prisma.EventWhereInput = {
      isArchived: false,
    };

    if (isSuperAdmin) {
      // Super Admin sees everything
    } else if (isAdmin) {
      // Admin sees everything EXCEPT what was created by a SUPER_ADMIN
      where.createdByUser = {
        role: { not: 'SUPER_ADMIN' }
      };
    } else {
      // Others see only their own
      where.createdBy = userId;
    }

    // Status filter - support both single and array
    if (query.statuses && query.statuses.length > 0) {
      where.status = { in: query.statuses };
    } else if (query.status) {
      where.status = query.status;
    }

    // Client filter - support both single and array
    if (query.clientIds && query.clientIds.length > 0) {
      where.clientId = { in: query.clientIds };
    } else if (query.clientId) {
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
          requirements: true,
          privateComments: true,
          clientId: true,
          client: {
            select: {
              id: true,
              clientId: true,
              businessName: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          callTimes: {
            select: {
              id: true,
              numberOfStaffRequired: true,
              service: {
                select: {
                  id: true,
                  title: true,
                },
              },
              invitations: {
                select: {
                  id: true,
                  status: true,
                  isConfirmed: true,
                  staff: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      email: true,
                      phone: true,
                    },
                  },
                },
              },
            },
          },
          venueName: true,
          address: true,
          addressLine2: true,
          city: true,
          state: true,
          zipCode: true,
          startDate: true,
          startTime: true,
          endDate: true,
          endTime: true,
          timezone: true,
          status: true,
          fileLinks: true,
          isArchived: true,
          archivedAt: true,
          requestMethod: true,
          requestorName: true,
          requestorPhone: true,
          requestorEmail: true,
          poNumber: true,
          preEventInstructions: true,
          eventDocuments: true,
          customFields: true,
          meetingPoint: true,
          onsitePocName: true,
          onsitePocPhone: true,
          onsitePocEmail: true,
          estimate: true,
          taskRateType: true,
          commission: true,
          commissionAmount: true,
          commissionAmountType: true,
          approveForOvertime: true,
          overtimeRate: true,
          overtimeRateType: true,
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

    // Trigger-based status update: check and update statuses for listed events
    const eventIds = data.map((e) => e.id);
    const updatedStatuses = await checkAndUpdateMultipleEventStatuses(this.prisma, eventIds);

    // Apply updated statuses to data (only if any were updated)
    const dataWithUpdatedStatus = updatedStatuses.size > 0
      ? data.map((e) => ({
        ...e,
        status: updatedStatuses.get(e.id) ?? e.status,
      }))
      : data;

    return {
      data: dataWithUpdatedStatus,
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
  async findOne(id: string, userId: string, userRole?: string) {
    const isSuperAdmin = userRole === 'SUPER_ADMIN';
    const isAdmin = userRole === 'ADMIN';

    const event = await this.prisma.event.findFirst({
      where: {
        id,
        ...(isSuperAdmin ? {} : 
           isAdmin ? { createdByUser: { role: { not: 'SUPER_ADMIN' } } } : 
           { createdBy: userId }),
      },
      select: {
        id: true,
        eventId: true,
        title: true,
        description: true,
        requirements: true,
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
        addressLine2: true,
        city: true,
        state: true,
        zipCode: true,
        startDate: true,
        startTime: true,
        endDate: true,
        endTime: true,
        timezone: true,
        status: true,
        fileLinks: true,
        isArchived: true,
        archivedAt: true,
        requestMethod: true,
        requestorName: true,
        requestorPhone: true,
        requestorEmail: true,
        poNumber: true,
        preEventInstructions: true,
        eventDocuments: true,
        customFields: true,
        meetingPoint: true,
        onsitePocName: true,
        onsitePocPhone: true,
        onsitePocEmail: true,
        estimate: true,
        taskRateType: true,
        commission: true,
        commissionAmount: true,
        commissionAmountType: true,
        approveForOvertime: true,
        overtimeRate: true,
        overtimeRateType: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        // CallTimes now hold service assignments (formerly EventService)
        callTimes: {
          select: {
            id: true,
            callTimeId: true,
            serviceId: true,
            numberOfStaffRequired: true,
            skillLevel: true,
            startDate: true,
            startTime: true,
            endDate: true,
            endTime: true,
            payRate: true,
            payRateType: true,
            billRate: true,
            billRateType: true,
            customCost: true,
            customPrice: true,
            ratingRequired: true,
            approveOvertime: true,
            commission: true,
            notes: true,
            service: {
              select: {
                id: true,
                serviceId: true,
                title: true,
                cost: true,
                price: true,
                costUnitType: true,
              },
            },
          },
        },
        eventProducts: {
          select: {
            id: true,
            productId: true,
            quantity: true,
            customPrice: true,
            notes: true,
            product: {
              select: {
                id: true,
                productId: true,
                title: true,
                cost: true,
                priceUnitType: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      const terminology = await this.settingsService.getTerminology();
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `${terminology.event.singular} with ID ${id} not found or you don't have permission to access it`,
      });
    }

    // Trigger-based status update: check if status needs updating based on current time
    const statusResult = await checkAndUpdateEventStatus(this.prisma, id);
    if (statusResult.updated && statusResult.newStatus) {
      // Return updated status in the event object
      return { ...event, status: statusResult.newStatus };
    }

    return event;
  }

  /**
   * Update an event
   * Includes ownership check
   */
  async update(id: string, data: UpdateEventInput, userId: string, userRole?: string) {
    try {
      const eventMeta = await this.getOwnedEventMeta(id, userId, userRole);
      if (eventMeta.isArchived) {
        const terminology = await this.settingsService.getTerminology();
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${terminology.event.singular} is archived and cannot be modified`,
        });
      }

      // Sanitize input data
      const sanitizedData: Prisma.EventUncheckedUpdateInput = {};
      if (data.eventId !== undefined) sanitizedData.eventId = data.eventId.trim();
      if (data.title !== undefined) sanitizedData.title = data.title.trim();
      if (data.description !== undefined) sanitizedData.description = data.description?.trim() || null;
      if (data.requirements !== undefined) sanitizedData.requirements = data.requirements?.trim() || null;
      if (data.privateComments !== undefined) sanitizedData.privateComments = data.privateComments?.trim() || null;
      if (data.clientId !== undefined) sanitizedData.clientId = data.clientId && data.clientId !== '' ? data.clientId : null;
      if (data.venueName !== undefined) sanitizedData.venueName = data.venueName.trim();
      if (data.address !== undefined) sanitizedData.address = data.address.trim();
      if ((data as any).addressLine2 !== undefined) sanitizedData.addressLine2 = (data as any).addressLine2?.trim() || null;
      if (data.city !== undefined) sanitizedData.city = data.city.trim();
      if (data.state !== undefined) sanitizedData.state = data.state.trim();
      if (data.zipCode !== undefined) sanitizedData.zipCode = data.zipCode.trim();
      if (data.latitude !== undefined) sanitizedData.latitude = data.latitude ?? null;
      if (data.longitude !== undefined) sanitizedData.longitude = data.longitude ?? null;
      if (data.latitude !== undefined && data.longitude !== undefined && data.latitude && data.longitude) {
        sanitizedData.geocodedAt = new Date();
      }
      if (data.startDate !== undefined) sanitizedData.startDate = data.startDate;
      if (data.startTime !== undefined) sanitizedData.startTime = data.startTime || null;
      if (data.endDate !== undefined) sanitizedData.endDate = data.endDate;
      if (data.endTime !== undefined) sanitizedData.endTime = data.endTime || null;
      if (data.timezone !== undefined) sanitizedData.timezone = data.timezone;
      if (data.status !== undefined) sanitizedData.status = data.status;
      if (data.fileLinks !== undefined) {
        sanitizedData.fileLinks = data.fileLinks ? JSON.parse(JSON.stringify(data.fileLinks)) : null;
      }
      // Request Information
      if (data.requestMethod !== undefined) sanitizedData.requestMethod = data.requestMethod ?? null;
      if (data.requestorName !== undefined) sanitizedData.requestorName = data.requestorName?.trim() || null;
      if (data.requestorPhone !== undefined) sanitizedData.requestorPhone = data.requestorPhone?.trim() || null;
      if (data.requestorEmail !== undefined) sanitizedData.requestorEmail = data.requestorEmail?.trim() || null;
      if (data.poNumber !== undefined) sanitizedData.poNumber = data.poNumber?.trim() || null;
      // Event Instructions & Documents
      if (data.preEventInstructions !== undefined) sanitizedData.preEventInstructions = data.preEventInstructions?.trim() || null;
      if (data.eventDocuments !== undefined) {
        sanitizedData.eventDocuments = data.eventDocuments ? JSON.parse(JSON.stringify(data.eventDocuments)) : null;
      }
      // Custom Fields
      if (data.customFields !== undefined) {
        sanitizedData.customFields = data.customFields ? JSON.parse(JSON.stringify(data.customFields)) : null;
      }
      // Onsite Contact & Meeting Point
      if (data.meetingPoint !== undefined) sanitizedData.meetingPoint = data.meetingPoint?.trim() || null;
      if (data.onsitePocName !== undefined) sanitizedData.onsitePocName = data.onsitePocName?.trim() || null;
      if (data.onsitePocPhone !== undefined) sanitizedData.onsitePocPhone = data.onsitePocPhone?.trim() || null;
      if (data.onsitePocEmail !== undefined) sanitizedData.onsitePocEmail = data.onsitePocEmail?.trim() || null;
      if (data.estimate !== undefined) sanitizedData.estimate = data.estimate ?? null;
      if (data.taskRateType !== undefined) sanitizedData.taskRateType = data.taskRateType ?? null;

      // Update the event
      const updatedEvent = await this.prisma.event.update({
        where: { id },
        data: sanitizedData,
        select: {
          id: true,
          eventId: true,
          title: true,
          description: true,
          requirements: true,
          privateComments: true,
          clientId: true,
          venueName: true,
          address: true,
          addressLine2: true,
          city: true,
          state: true,
          zipCode: true,
          latitude: true,
          longitude: true,
          geocodedAt: true,
          startDate: true,
          startTime: true,
          endDate: true,
          endTime: true,
          timezone: true,
          status: true,
          fileLinks: true,
          isArchived: true,
          archivedAt: true,
          requestMethod: true,
          requestorName: true,
          requestorPhone: true,
          requestorEmail: true,
          poNumber: true,
          preEventInstructions: true,
          eventDocuments: true,
          customFields: true,
          meetingPoint: true,
          onsitePocName: true,
          onsitePocPhone: true,
          onsitePocEmail: true,
          estimate: true,
          taskRateType: true,
          commission: true,
          commissionAmount: true,
          commissionAmountType: true,
          approveForOvertime: true,
          overtimeRate: true,
          overtimeRateType: true,
          createdBy: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Notify assigned staff about event update (only for meaningful changes)
      const meaningfulChanges: string[] = [];
      if (data.title !== undefined) meaningfulChanges.push('title');
      if (data.startDate !== undefined || data.startTime !== undefined) meaningfulChanges.push('date/time');
      if (data.venueName !== undefined || data.address !== undefined) meaningfulChanges.push('location');
      if (data.requirements !== undefined) meaningfulChanges.push('requirements');

      if (meaningfulChanges.length > 0) {
        const triggerService = getNotificationTriggerService(this.prisma);
        await triggerService.onEventUpdated(id, updatedEvent.title, meaningfulChanges);
      }

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
  async remove(id: string, userId: string, userRole?: string) {
    const event = await this.getOwnedEventMeta(id, userId, userRole);
    if (!event.isArchived) {
      const terminology = await this.settingsService.getTerminology();
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `${terminology.event.singular} must be archived before it can be permanently deleted`,
      });
    }

    // Delete the event
    await this.prisma.event.delete({
      where: { id },
    });

    const terminology = await this.settingsService.getTerminology();
    return { success: true, message: `${terminology.event.singular} deleted successfully` };
  }

  /**
   * Permanently delete multiple archived events
   * Only archived events owned by the user can be deleted
   */
  async deleteMany(ids: string[], userId: string): Promise<{ count: number }> {
    // Fetch all events to validate ownership and archived status
    const events = await this.prisma.event.findMany({
      where: { id: { in: ids } },
      select: { id: true, createdBy: true, isArchived: true },
    });

    // Filter to only owned and archived events
    const validIds = events
      .filter((e) => e.createdBy === userId && e.isArchived)
      .map((e) => e.id);

    if (validIds.length === 0) {
      return { count: 0 };
    }

    // Delete the events
    const result = await this.prisma.event.deleteMany({
      where: { id: { in: validIds } },
    });

    return { count: result.count };
  }

  /**
   * Update event status
   * Includes ownership check
   */
  async updateStatus(id: string, status: EventStatus, userId: string, userRole?: string) {
    const eventMeta = await this.getOwnedEventMeta(id, userId, userRole);
    if (eventMeta.isArchived) {
      const terminology = await this.settingsService.getTerminology();
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `${terminology.event.singular} is archived and cannot be modified`,
      });
    }

    const event = await this.prisma.event.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        eventId: true,
        title: true,
        description: true,
        requirements: true,
        privateComments: true,
        venueName: true,
        address: true,
        addressLine2: true,
        city: true,
        state: true,
        zipCode: true,
        startDate: true,
        startTime: true,
        endDate: true,
        endTime: true,
        timezone: true,
        status: true,
        fileLinks: true,
        isArchived: true,
        archivedAt: true,
        requestMethod: true,
        requestorName: true,
        requestorPhone: true,
        requestorEmail: true,
        poNumber: true,
        preEventInstructions: true,
        eventDocuments: true,
        customFields: true,
        meetingPoint: true,
        onsitePocName: true,
        onsitePocPhone: true,
        onsitePocEmail: true,
        estimate: true,
        taskRateType: true,
        commission: true,
        commissionAmount: true,
        commissionAmountType: true,
        approveForOvertime: true,
        overtimeRate: true,
        overtimeRateType: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Notify assigned staff if event is cancelled
    if (status === 'CANCELLED') {
      const triggerService = getNotificationTriggerService(this.prisma);
      await triggerService.onEventCancelled(id, event.title);
    }

    return event;
  }

  async getUpcoming(userId: string, userRole?: string) {
    const isAdminPlus = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';
    const today = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(today.getDate() + 30);

    const events = await this.prisma.event.findMany({
      where: {
        ...(isAdminPlus ? {} : { createdBy: userId }),
        isArchived: false,
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

  async getStats(userId: string, userRole?: string): Promise<EventStats> {
    const isAdminPlus = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';
    const today = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(today.getDate() + 30);

    const [total, upcoming, byStatus] = await Promise.all([
      this.prisma.event.count({ where: { ...(isAdminPlus ? {} : { createdBy: userId }), isArchived: false } }),
      this.prisma.event.count({
        where: {
          ...(isAdminPlus ? {} : { createdBy: userId }),
          isArchived: false,
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
        this.prisma.event.count({ where: { ...(isAdminPlus ? {} : { createdBy: userId }), isArchived: false, status: EventStatus.DRAFT } }),
        this.prisma.event.count({ where: { ...(isAdminPlus ? {} : { createdBy: userId }), isArchived: false, status: EventStatus.PUBLISHED } }),
        this.prisma.event.count({ where: { ...(isAdminPlus ? {} : { createdBy: userId }), isArchived: false, status: EventStatus.ASSIGNED } }),
        this.prisma.event.count({ where: { ...(isAdminPlus ? {} : { createdBy: userId }), isArchived: false, status: EventStatus.IN_PROGRESS } }),
        this.prisma.event.count({ where: { ...(isAdminPlus ? {} : { createdBy: userId }), isArchived: false, status: EventStatus.COMPLETED } }),
        this.prisma.event.count({ where: { ...(isAdminPlus ? {} : { createdBy: userId }), isArchived: false, status: EventStatus.CANCELLED } }),
      ]),
    ]);

    return {
      total,
      upcoming,
      byStatus: {
        DRAFT: byStatus[0],
        PUBLISHED: byStatus[1],
        ASSIGNED: byStatus[2],
        IN_PROGRESS: byStatus[3],
        COMPLETED: byStatus[4],
        CANCELLED: byStatus[5],
      },
    };
  }

  async getByDateRange(input: DateRangeInput, userId: string, userRole?: string) {
    const isAdminPlus = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';
    const where: Prisma.EventWhereInput = {
      ...(isAdminPlus ? {} : { createdBy: userId }),
      isArchived: false,
      // Event overlaps with the date range if:
      // - Event starts before or on range end AND
      // - Event ends on or after range start
      startDate: { lte: input.endDate },
      endDate: { gte: input.startDate },
    };

    // Optional date filters (further restrict within the calendar window)
    if (input.startDateFrom) {
      where.startDate = { ...(where.startDate as Prisma.DateTimeFilter), gte: input.startDateFrom };
    }
    if (input.startDateTo) {
      where.startDate = { ...(where.startDate as Prisma.DateTimeFilter), lte: input.startDateTo };
    }
    if (input.endDateFrom) {
      where.endDate = { ...(where.endDate as Prisma.DateTimeFilter), gte: input.endDateFrom };
    }
    if (input.endDateTo) {
      where.endDate = { ...(where.endDate as Prisma.DateTimeFilter), lte: input.endDateTo };
    }

    // Optional status filter - support both single and array
    if (input.statuses && input.statuses.length > 0) {
      where.status = { in: input.statuses };
    } else if (input.status) {
      where.status = input.status;
    }

    // Optional client filter - support both single and array
    if (input.clientIds && input.clientIds.length > 0) {
      where.clientId = { in: input.clientIds };
    } else if (input.clientId) {
      where.clientId = input.clientId;
    }

    // Optional search filter
    if (input.search) {
      where.OR = [
        { title: { contains: input.search, mode: "insensitive" } },
        { venueName: { contains: input.search, mode: "insensitive" } },
        { city: { contains: input.search, mode: "insensitive" } },
        { eventId: { contains: input.search, mode: "insensitive" } },
      ];
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

  async findAllForExport(userId: string, userRole?: string) {
    const isAdminPlus = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';
    const events = await this.prisma.event.findMany({
      where: { ...(isAdminPlus ? {} : { createdBy: userId }), isArchived: false },
      select: {
        id: true,
        eventId: true,
        title: true,
        description: true,
        requirements: true,
        privateComments: true,
        status: true,
        clientId: true,
        client: {
          select: {
            businessName: true,
          },
        },
        venueName: true,
        address: true,
        addressLine2: true,
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
        requestMethod: true,
        requestorName: true,
        requestorPhone: true,
        requestorEmail: true,
        poNumber: true,
        preEventInstructions: true,
        meetingPoint: true,
        onsitePocName: true,
        onsitePocPhone: true,
        onsitePocEmail: true,
        estimate: true,
        taskRateType: true,
        commission: true,
        commissionAmount: true,
        commissionAmountType: true,
        approveForOvertime: true,
        overtimeRate: true,
        overtimeRateType: true,
        fileLinks: true,
        eventDocuments: true,
        customFields: true,
        createdAt: true,
      },
      orderBy: { startDate: 'desc' },
    });

    return events;
  }

  async archive(id: string, userId: string, userRole?: string) {
    const event = await this.getOwnedEventMeta(id, userId, userRole);
    if (event.isArchived) {
      return await this.prisma.event.findUniqueOrThrow({
        where: { id },
        select: { id: true, eventId: true, title: true, isArchived: true, archivedAt: true, status: true },
      });
    }

    return await this.prisma.event.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        status: EventStatus.CANCELLED,
      },
      select: { id: true, eventId: true, title: true, isArchived: true, archivedAt: true, status: true },
    });
  }

  async archiveMany(ids: string[], userId: string, userRole?: string): Promise<{ count: number }> {
    const isAdminPlus = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';
    const result = await this.prisma.event.updateMany({
      where: {
        id: { in: ids },
        ...(isAdminPlus ? {} : { createdBy: userId }),
        isArchived: false,
      },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        status: EventStatus.CANCELLED,
      },
    });

    return { count: result.count };
  }

  async restore(id: string, userId: string, userRole?: string) {
    const event = await this.getOwnedEventMeta(id, userId, userRole);
    if (!event.isArchived) {
      return await this.prisma.event.findUniqueOrThrow({
        where: { id },
        select: { id: true, eventId: true, title: true, isArchived: true, archivedAt: true, status: true },
      });
    }

    // Determine the appropriate status based on criteria
    const newStatus = await this.determineEventStatus(id);

    return await this.prisma.event.update({
      where: { id },
      data: {
        isArchived: false,
        archivedAt: null,
        status: newStatus,
      },
      select: { id: true, eventId: true, title: true, isArchived: true, archivedAt: true, status: true },
    });
  }

  /**
   * Determine the appropriate event status based on criteria:
   * - COMPLETED: End date/time has passed
   * - IN_PROGRESS: Currently between start and end date/time
   * - ASSIGNED: All required talent positions are filled
   * - DRAFT: Default (not all positions filled)
   */
  private async determineEventStatus(eventId: string): Promise<EventStatus> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        startDate: true,
        startTime: true,
        endDate: true,
        endTime: true,
        timezone: true,
        callTimes: {
          select: {
            numberOfStaffRequired: true,
            invitations: {
              where: {
                status: 'ACCEPTED',
                isConfirmed: true,
              },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!event) {
      return EventStatus.DRAFT;
    }

    const now = new Date();

    // Build start and end DateTime with timezone
    const startDateTime = this.buildDateTime(event.startDate, event.startTime, event.timezone);
    const endDateTime = this.buildDateTime(event.endDate, event.endTime, event.timezone);

    // Check if event has ended
    if (endDateTime && now > endDateTime) {
      return EventStatus.COMPLETED;
    }

    // Check if event is in progress
    if (startDateTime && now >= startDateTime && (!endDateTime || now <= endDateTime)) {
      return EventStatus.IN_PROGRESS;
    }

    // Check if all positions are filled (event is fully staffed)
    const isFullyStaffed =
      event.callTimes.length > 0 &&
      event.callTimes.every(
        (ct) => ct.invitations.length >= ct.numberOfStaffRequired
      );

    if (isFullyStaffed) {
      return EventStatus.ASSIGNED;
    }

    return EventStatus.DRAFT;
  }

  /**
   * Build a Date object from date, time, and timezone strings
   * Returns a UTC Date that represents the correct moment in time for the given timezone
   */
  private buildDateTime(
    date: Date | null,
    time: string | null,
    timezone?: string | null
  ): Date | null {
    if (!date) return null;

    // Extract year, month, day from the date
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    // Parse time or default to midnight
    let hours = 0;
    let minutes = 0;
    if (time) {
      const [h, m] = time.split(':').map(Number);
      hours = h || 0;
      minutes = m || 0;
    }

    // If no timezone provided, create date in local time
    if (!timezone) {
      return new Date(year, month, day, hours, minutes, 0, 0);
    }

    // Create a date string in ISO format and parse it in the given timezone
    // Format: YYYY-MM-DDTHH:mm:ss
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

    try {
      // Use Intl.DateTimeFormat to get the timezone offset
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      // Create a date assuming the input is in the specified timezone
      // We need to find what UTC time corresponds to this local time in the given timezone
      const localDate = new Date(dateStr);

      // Get the parts in the target timezone for a reference point
      const parts = formatter.formatToParts(localDate);
      const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0';

      // Calculate offset by comparing local interpretation vs timezone interpretation
      const tzDate = new Date(
        parseInt(getPart('year')),
        parseInt(getPart('month')) - 1,
        parseInt(getPart('day')),
        parseInt(getPart('hour')),
        parseInt(getPart('minute')),
        parseInt(getPart('second'))
      );

      const offsetMs = localDate.getTime() - tzDate.getTime();

      // Adjust the date by the offset to get the correct UTC time
      return new Date(localDate.getTime() + offsetMs);
    } catch {
      // If timezone is invalid, fall back to local time
      return new Date(year, month, day, hours, minutes, 0, 0);
    }
  }

  async restoreMany(ids: string[], userId: string, userRole?: string): Promise<{ count: number }> {
    const isAdminPlus = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';
    // For bulk restore, we need to determine status for each event individually
    const events = await this.prisma.event.findMany({
      where: {
        id: { in: ids },
        ...(isAdminPlus ? {} : { createdBy: userId }),
        isArchived: true,
      },
      select: { id: true },
    });

    let restoredCount = 0;
    for (const event of events) {
      const newStatus = await this.determineEventStatus(event.id);
      await this.prisma.event.update({
        where: { id: event.id },
        data: {
          isArchived: false,
          archivedAt: null,
          status: newStatus,
        },
      });
      restoredCount++;
    }

    return { count: restoredCount };
  }

  async findAllArchived(query: QueryEventsInput, userId: string, userRole?: string): Promise<PaginatedEvents> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ?? "createdAt";
    const sortOrder = query.sortOrder ?? "desc";

    const isAdminPlus = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';

    const where: Prisma.EventWhereInput = {
      ...(isAdminPlus ? {} : { createdBy: userId }),
      isArchived: true,
    };

    if (query.statuses && query.statuses.length > 0) {
      where.status = { in: query.statuses };
    } else if (query.status) {
      where.status = query.status;
    }

    if (query.clientIds && query.clientIds.length > 0) {
      where.clientId = { in: query.clientIds };
    } else if (query.clientId) {
      if (query.clientId === 'NONE') {
        where.clientId = null;
      } else {
        where.clientId = query.clientId;
      }
    }

    if (query.timezone) {
      where.timezone = query.timezone;
    }

    if (query.startDateFrom || query.startDateTo) {
      where.startDate = {};
      if (query.startDateFrom) {
        where.startDate.gte = query.startDateFrom;
      }
      if (query.startDateTo) {
        where.startDate.lte = query.startDateTo;
      }
    }

    if (query.endDateFrom || query.endDateTo) {
      where.endDate = {};
      if (query.endDateFrom) {
        where.endDate.gte = query.endDateFrom;
      }
      if (query.endDateTo) {
        where.endDate.lte = query.endDateTo;
      }
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
        { venueName: { contains: query.search, mode: "insensitive" } },
        { city: { contains: query.search, mode: "insensitive" } },
        { eventId: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        select: {
          id: true,
          eventId: true,
          title: true,
          description: true,
          requirements: true,
          privateComments: true,
          clientId: true,
          client: {
            select: {
              id: true,
              clientId: true,
              businessName: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          callTimes: {
            select: {
              id: true,
              numberOfStaffRequired: true,
              service: {
                select: {
                  id: true,
                  title: true,
                },
              },
              invitations: {
                select: {
                  id: true,
                  status: true,
                  isConfirmed: true,
                },
              },
            },
          },
          venueName: true,
          address: true,
          addressLine2: true,
          city: true,
          state: true,
          zipCode: true,
          startDate: true,
          startTime: true,
          endDate: true,
          endTime: true,
          timezone: true,
          status: true,
          fileLinks: true,
          isArchived: true,
          archivedAt: true,
          requestMethod: true,
          requestorName: true,
          requestorPhone: true,
          requestorEmail: true,
          poNumber: true,
          preEventInstructions: true,
          eventDocuments: true,
          customFields: true,
          meetingPoint: true,
          onsitePocName: true,
          onsitePocPhone: true,
          onsitePocEmail: true,
          estimate: true,
          taskRateType: true,
          commission: true,
          commissionAmount: true,
          commissionAmountType: true,
          approveForOvertime: true,
          overtimeRate: true,
          overtimeRateType: true,
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

  async getArchivedCount(userId: string, userRole?: string): Promise<number> {
    const isAdminPlus = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';
    return await this.prisma.event.count({
      where: {
        ...(isAdminPlus ? {} : { createdBy: userId }),
        isArchived: true,
      },
    });
  }

  /**
   * Bulk create events (create-only mode)
   * Each event gets a unique eventId auto-generated
   */
  async createMany(
    events: Array<Partial<CreateEventInput> & Pick<CreateEventInput, 'title' | 'venueName' | 'address' | 'city' | 'state' | 'zipCode' | 'startDate' | 'endDate' | 'timezone'>>,
    userId: string
  ): Promise<{ created: number; errors: { index: number; message: string }[] }> {
    const results = { created: 0, errors: [] as { index: number; message: string }[] };

    for (let i = 0; i < events.length; i++) {
      const eventData = events[i]!;
      try {
        await this.create(eventData as CreateEventInput, userId);
        results.created++;
      } catch (error) {
        results.errors.push({
          index: i,
          message: error instanceof Error ? error.message : 'Failed to create event',
        });
      }
    }

    return results;
  }

  /**
   * Bulk upsert events (create or update by eventId match)
   * If eventId is provided and matches an existing event, updates it.
   * Otherwise, creates a new event.
   */
  async upsertMany(
    events: Array<Partial<CreateEventInput> & Pick<CreateEventInput, 'title' | 'venueName' | 'address' | 'city' | 'state' | 'zipCode' | 'startDate' | 'endDate' | 'timezone'> & { eventId?: string | null }>,
    userId: string
  ): Promise<{ created: number; updated: number; errors: { index: number; message: string }[] }> {
    const results = { created: 0, updated: 0, errors: [] as { index: number; message: string }[] };

    // Collect all eventIds from import data
    const importEventIds = events
      .map((e) => e.eventId)
      .filter((id): id is string => !!id);

    // Build a map of existing events by eventId
    const existingEvents = importEventIds.length > 0
      ? await this.prisma.event.findMany({
        where: {
          createdBy: userId,
          eventId: { in: importEventIds },
        },
        select: {
          id: true,
          eventId: true,
        },
      })
      : [];

    // Map eventId -> database id
    const existingMap = new Map<string, string>();
    for (const event of existingEvents) {
      existingMap.set(event.eventId, event.id);
    }

    for (let i = 0; i < events.length; i++) {
      const eventData = events[i]!;
      try {
        // Check if this event has an eventId that matches an existing event
        const existingId = eventData.eventId ? existingMap.get(eventData.eventId) : undefined;

        // Remove eventId from data before create/update (it's auto-generated)
        const { eventId: _, ...dataWithoutEventId } = eventData;

        if (existingId) {
          // Update existing event
          await this.update(existingId, dataWithoutEventId as CreateEventInput, userId);
          results.updated++;
        } else {
          // Create new event
          await this.create(dataWithoutEventId as CreateEventInput, userId);
          results.created++;
        }
      } catch (error) {
        results.errors.push({
          index: i,
          message: error instanceof Error ? error.message : 'Failed to process event',
        });
      }
    }

    return results;
  }

  /**
   * Bulk update events
   * Only updates fields that have enabled: true
   * @param input Bulk update input with field flags
   * @param userId ID of user performing the operation
   * @returns Result with success count and failed items
   */
  async bulkUpdate(
    input: BulkUpdateEventsInput,
    userId: string
  ): Promise<{
    success: number;
    failed: Array<{ id: string; eventId: string; reason: string }>;
  }> {
    const { eventIds, ...fields } = input;
    const terminology = await this.settingsService.getTerminology();

    try {
      // Fetch all events to validate ownership
      const events = await this.prisma.event.findMany({
        where: { id: { in: eventIds } },
        select: {
          id: true,
          eventId: true,
          title: true,
          createdBy: true,
          isArchived: true,
        },
      });

      // Track failures and valid IDs
      const failed: Array<{ id: string; eventId: string; reason: string }> = [];
      const validIds: string[] = [];

      // Check for non-existent or unauthorized IDs
      const foundIds = events.map((e) => e.id);
      for (const id of eventIds) {
        if (!foundIds.includes(id)) {
          failed.push({
            id,
            eventId: "Unknown",
            reason: `${terminology.event.singular} not found`,
          });
        }
      }

      // Validate ownership and archived status
      for (const event of events) {
        if (event.createdBy !== userId) {
          failed.push({
            id: event.id,
            eventId: event.eventId,
            reason: `You don't have permission to update this ${terminology.event.lower}`,
          });
        } else if (event.isArchived) {
          failed.push({
            id: event.id,
            eventId: event.eventId,
            reason: `${terminology.event.singular} is archived and cannot be modified`,
          });
        } else {
          validIds.push(event.id);
        }
      }

      // Build the update data object from enabled fields
      const updateData: Prisma.EventUncheckedUpdateManyInput = {};

      if (fields.status?.enabled && fields.status.value !== undefined) {
        updateData.status = fields.status.value;
      }
      if (fields.clientId?.enabled) {
        // Allow setting to null (removing client) or to a specific client
        updateData.clientId = fields.clientId.value ?? null;
      }

      const hasFieldUpdates = Object.keys(updateData).length > 0;
      let successCount = 0;

      if (validIds.length === 0) {
        return { success: 0, failed };
      }

      if (hasFieldUpdates) {
        // Bulk update all valid events
        const result = await this.prisma.event.updateMany({
          where: { id: { in: validIds } },
          data: {
            ...updateData,
            updatedAt: new Date(),
          },
        });
        successCount = result.count;
      } else {
        // No fields to update
        successCount = validIds.length;
      }

      return { success: successCount, failed };
    } catch (error) {
      console.error("Error bulk updating events:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to update ${terminology.event.lowerPlural}`,
      });
    }
  }

  /**
   * Update event statuses based on current time (for cron job)
   * - ASSIGNED → IN_PROGRESS: when start datetime is reached
   * - IN_PROGRESS → COMPLETED: when end datetime has passed
   * Returns counts of updated events and sends notifications
   */
  async updateStatusesBasedOnTime(): Promise<{
    toInProgress: number;
    toCompleted: number;
  }> {
    const now = new Date();
    const triggerService = getNotificationTriggerService(this.prisma);

    // Find events that should be IN_PROGRESS (start time reached, currently ASSIGNED)
    const eventsToStartQuery = await this.prisma.event.findMany({
      where: {
        status: EventStatus.ASSIGNED,
        isArchived: false,
        startDate: { not: null },
      },
      select: {
        id: true,
        title: true,
        createdBy: true,
        startDate: true,
        startTime: true,
        timezone: true,
      },
    });

    // Filter events where start datetime has been reached
    const eventsToStart = eventsToStartQuery.filter((event) => {
      const startDateTime = this.buildDateTime(event.startDate, event.startTime, event.timezone);
      return startDateTime && now >= startDateTime;
    });

    // Update to IN_PROGRESS and send notifications
    let toInProgress = 0;
    if (eventsToStart.length > 0) {
      const result = await this.prisma.event.updateMany({
        where: {
          id: { in: eventsToStart.map((e) => e.id) },
        },
        data: {
          status: EventStatus.IN_PROGRESS,
          updatedAt: now,
        },
      });
      toInProgress = result.count;

      // Send notifications for each started event
      for (const event of eventsToStart) {
        await triggerService.onEventStarted(event.id, {
          eventTitle: event.title,
          createdBy: event.createdBy,
        });
      }
    }

    // Find events that should be COMPLETED (end time passed, currently IN_PROGRESS)
    const eventsToCompleteQuery = await this.prisma.event.findMany({
      where: {
        status: EventStatus.IN_PROGRESS,
        isArchived: false,
        endDate: { not: null },
      },
      select: {
        id: true,
        title: true,
        createdBy: true,
        endDate: true,
        endTime: true,
        timezone: true,
      },
    });

    // Filter events where end datetime has passed
    const eventsToComplete = eventsToCompleteQuery.filter((event) => {
      const endDateTime = this.buildDateTime(event.endDate, event.endTime, event.timezone);
      return endDateTime && now > endDateTime;
    });

    // Update to COMPLETED and send notifications
    let toCompleted = 0;
    if (eventsToComplete.length > 0) {
      const result = await this.prisma.event.updateMany({
        where: {
          id: { in: eventsToComplete.map((e) => e.id) },
        },
        data: {
          status: EventStatus.COMPLETED,
          updatedAt: now,
        },
      });
      toCompleted = result.count;

      // Send notifications for each completed event
      for (const event of eventsToComplete) {
        await triggerService.onEventCompleted(event.id, {
          eventTitle: event.title,
          createdBy: event.createdBy,
        });
      }
    }

    return { toInProgress, toCompleted };
  }
}
