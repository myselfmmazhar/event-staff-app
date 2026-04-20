import { PrismaClient, EventRequestStatus, Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { EventRequestCreateInput, EventRequestUpdateInput, EventRequestQueryInput, EventRequestApproveInput, EventRequestRejectInput } from "@/lib/schemas/event-request.schema";
import { EventService } from "./event.service";

/**
 * Event Request Service
 * Handles all business logic for event requests
 */
export class EventRequestService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generate a unique event request ID
   * Format: EVR-YYYYMMDD-XXXXX
   */
  private async generateEventRequestId(): Promise<string> {
    const today = new Date().toISOString().substring(0, 10).replace(/-/g, "");
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `EVR-${today}-${random}`;
  }

  /**
   * Create a new event request from a client
   */
  async create(
    data: EventRequestCreateInput,
    clientId: string
  ): Promise<any> {
    try {
      const eventRequestId = await this.generateEventRequestId();

      const eventRequest = await this.prisma.eventRequest.create({
        data: {
          eventRequestId,
          clientId,
          title: data.title,
          description: data.description?.trim() || null,
          requirements: data.requirements?.trim() || null,
          venueName: data.venueName?.trim() || null,
          address: data.address?.trim() || null,
          addressLine2: data.addressLine2?.trim() || null,
          city: data.city?.trim() || null,
          state: data.state?.trim() || null,
          zipCode: data.zipCode?.trim() || null,
          meetingPoint: data.meetingPoint?.trim() || null,
          onsitePocName: data.onsitePocName?.trim() || null,
          onsitePocPhone: data.onsitePocPhone?.trim() || null,
          onsitePocEmail: data.onsitePocEmail?.trim() || null,
          startDate: data.startDate ?? null,
          startTime: data.startTime || null,
          endDate: data.endDate ?? null,
          endTime: data.endTime || null,
          timezone: data.timezone || null,
          preEventInstructions: data.preEventInstructions?.trim() || null,
          requestMethod: data.requestMethod ?? null,
          poNumber: data.poNumber?.trim() || null,
          requestorName: data.requestorName?.trim() || null,
          requestorPhone: data.requestorPhone?.trim() || null,
          requestorEmail: data.requestorEmail?.trim() || null,
          fileLinks: data.fileLinks ?? undefined,
          eventDocuments: data.eventDocuments ?? undefined,
          customFields: data.customFields ?? undefined,
          estimate: data.estimate ?? null,
          status: EventRequestStatus.PENDING,
        },
        include: {
          client: {
            select: {
              id: true,
              businessName: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return eventRequest;
    } catch (error) {
      console.error("Error creating event request:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create event request",
      });
    }
  }

  /**
   * Update a pending event request (client only)
   */
  async update(data: EventRequestUpdateInput, clientId: string): Promise<any> {
    try {
      const existing = await this.prisma.eventRequest.findUnique({
        where: { id: data.id },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event request not found" });
      }

      if (existing.clientId !== clientId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only edit your own requests" });
      }

      if (existing.status !== EventRequestStatus.PENDING) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only pending requests can be edited",
        });
      }

      return await this.prisma.eventRequest.update({
        where: { id: data.id },
        data: {
          title: data.title,
          description: data.description?.trim() || null,
          requirements: data.requirements?.trim() || null,
          venueName: data.venueName.trim(),
          address: data.address.trim(),
          addressLine2: data.addressLine2?.trim() || null,
          city: data.city.trim(),
          state: data.state.trim(),
          zipCode: data.zipCode.trim(),
          meetingPoint: data.meetingPoint?.trim() || null,
          onsitePocName: data.onsitePocName?.trim() || null,
          onsitePocPhone: data.onsitePocPhone?.trim() || null,
          onsitePocEmail: data.onsitePocEmail?.trim() || null,
          startDate: data.startDate ?? null,
          startTime: data.startTime || null,
          endDate: data.endDate ?? null,
          endTime: data.endTime || null,
          timezone: data.timezone,
          preEventInstructions: data.preEventInstructions?.trim() || null,
          requestMethod: data.requestMethod ?? null,
          poNumber: data.poNumber?.trim() || null,
          requestorName: data.requestorName?.trim() || null,
          requestorPhone: data.requestorPhone?.trim() || null,
          requestorEmail: data.requestorEmail?.trim() || null,
          fileLinks: data.fileLinks ?? undefined,
          eventDocuments: data.eventDocuments ?? undefined,
          customFields: data.customFields ?? undefined,
          estimate: data.estimate ?? null,
        },
        include: {
          client: {
            select: { id: true, businessName: true, firstName: true, lastName: true, email: true },
          },
        },
      });
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error("Error updating event request:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update event request" });
    }
  }

  /**
   * Get all event requests (admin only)
   */
  async findAll(
    query: EventRequestQueryInput
  ): Promise<{ data: any[]; meta: { total: number; page: number; limit: number } }> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const skip = (page - 1) * limit;

    try {
      const where: Prisma.EventRequestWhereInput = {};

      if (query.status) {
        where.status = query.status;
      }

      if (query.clientId) {
        where.clientId = query.clientId;
      }

      if (query.search) {
        where.OR = [
          { title: { contains: query.search, mode: "insensitive" } },
          { description: { contains: query.search, mode: "insensitive" } },
          { eventRequestId: { contains: query.search, mode: "insensitive" } },
          {
            client: {
              OR: [
                {
                  businessName: {
                    contains: query.search,
                    mode: "insensitive",
                  },
                },
                {
                  firstName: { contains: query.search, mode: "insensitive" },
                },
                { lastName: { contains: query.search, mode: "insensitive" } },
                { email: { contains: query.search, mode: "insensitive" } },
              ],
            },
          },
        ];
      }

      const sortBy = query.sortBy ?? "createdAt";
      const sortOrder = query.sortOrder ?? "desc";

      const [data, total] = await Promise.all([
        this.prisma.eventRequest.findMany({
          where,
          select: {
            id: true,
            eventRequestId: true,
            title: true,
            description: true,
            status: true,
            createdAt: true,
            requestedAt: true,
            reviewedAt: true,
            venueName: true,
            city: true,
            state: true,
            startDate: true,
            startTime: true,
            endDate: true,
            endTime: true,
            client: {
              select: {
                id: true,
                businessName: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            reviewer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            createdEvent: {
              select: {
                id: true,
                eventId: true,
                title: true,
              },
            },
          },
          orderBy: { [sortBy]: sortOrder },
          take: limit,
          skip,
        }),
        this.prisma.eventRequest.count({ where }),
      ]);

      return {
        data,
        meta: { total, page, limit },
      };
    } catch (error) {
      console.error("Error fetching event requests:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch event requests",
      });
    }
  }

  /**
   * Get a single event request by ID
   */
  async findById(id: string): Promise<any> {
    try {
      const eventRequest = await this.prisma.eventRequest.findUnique({
        where: { id },
        include: {
          client: {
            select: {
              id: true,
              businessName: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          createdEvent: {
            select: {
              id: true,
              eventId: true,
              title: true,
              status: true,
            },
          },
        },
      });

      if (!eventRequest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event request not found",
        });
      }

      return eventRequest;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      console.error("Error fetching event request:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch event request",
      });
    }
  }

  /**
   * Get event requests for a specific client
   */
  async findByClient(clientId: string, status?: EventRequestStatus): Promise<any[]> {
    try {
      const where: Prisma.EventRequestWhereInput = { clientId };

      if (status) {
        where.status = status;
      }

      return await this.prisma.eventRequest.findMany({
        where,
        select: {
          id: true,
          eventRequestId: true,
          title: true,
          description: true,
          requirements: true,
          status: true,
          createdAt: true,
          requestedAt: true,
          reviewedAt: true,
          venueName: true,
          address: true,
          addressLine2: true,
          city: true,
          state: true,
          zipCode: true,
          meetingPoint: true,
          onsitePocName: true,
          onsitePocPhone: true,
          onsitePocEmail: true,
          startDate: true,
          startTime: true,
          endDate: true,
          endTime: true,
          timezone: true,
          estimate: true,
          preEventInstructions: true,
          requestMethod: true,
          poNumber: true,
          requestorName: true,
          requestorPhone: true,
          requestorEmail: true,
          fileLinks: true,
          eventDocuments: true,
          customFields: true,
          rejectionReason: true,
          createdEvent: {
            select: {
              id: true,
              eventId: true,
              title: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (error) {
      console.error("Error fetching client event requests:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch your event requests",
      });
    }
  }

  /**
   * Approve an event request and create an event from it
   */
  async approve(
    data: EventRequestApproveInput,
    userId: string
  ): Promise<{ eventRequest: any; event: any }> {
    try {
      const eventRequest = await this.prisma.eventRequest.findUnique({
        where: { id: data.id },
        include: { client: true },
      });

      if (!eventRequest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event request not found",
        });
      }

      if (eventRequest.status !== EventRequestStatus.PENDING) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot approve a ${eventRequest.status} request`,
        });
      }

      // Create an event from the request
      const eventService = new EventService(this.prisma);

      // Generate event ID
      const today = new Date().toISOString().substring(0, 10).replace(/-/g, "");
      const random = Math.random().toString(36).substring(2, 7).toUpperCase();
      const eventId = `EVT-${today}-${random}`;

      const createdEvent = await this.prisma.event.create({
        data: {
          eventId,
          title: eventRequest.title.trim(),
          description: eventRequest.description?.trim() || null,
          requirements: eventRequest.requirements?.trim() || null,
          venueName: eventRequest.venueName?.trim() || "To Be Determined",
          address: eventRequest.address?.trim() || "",
          addressLine2: eventRequest.addressLine2?.trim() || null,
          city: eventRequest.city?.trim() || '',
          state: eventRequest.state?.trim() || '',
          zipCode: eventRequest.zipCode?.trim() || '',
          meetingPoint: eventRequest.meetingPoint?.trim() || null,
          onsitePocName: eventRequest.onsitePocName?.trim() || null,
          onsitePocPhone: eventRequest.onsitePocPhone?.trim() || null,
          onsitePocEmail: eventRequest.onsitePocEmail?.trim() || null,
          startDate: eventRequest.startDate,
          startTime: eventRequest.startTime ?? 'TBD',
          endDate: eventRequest.endDate,
          endTime: eventRequest.endTime ?? 'TBD',
          timezone: eventRequest.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          status: "PUBLISHED",
          clientId: eventRequest.clientId,
          createdBy: userId,
          preEventInstructions: eventRequest.preEventInstructions || null,
          requestMethod: eventRequest.requestMethod || null,
          poNumber: eventRequest.poNumber?.trim() || null,
          requestorName: eventRequest.requestorName?.trim() || null,
          requestorPhone: eventRequest.requestorPhone?.trim() || null,
          requestorEmail: eventRequest.requestorEmail?.trim() || null,
          eventDocuments: eventRequest.eventDocuments ?? undefined,
          fileLinks: eventRequest.fileLinks ?? undefined,
          customFields: eventRequest.customFields ?? undefined,
        },
        select: {
          id: true,
          eventId: true,
          title: true,
          status: true,
          createdAt: true,
        },
      });

      // Update event request with approval details
      const updatedRequest = await this.prisma.eventRequest.update({
        where: { id: data.id },
        data: {
          status: EventRequestStatus.APPROVED,
          reviewedAt: new Date(),
          reviewedBy: userId,
          notes: data.notes,
          createdEventId: createdEvent.id,
        },
        include: {
          client: true,
          reviewer: true,
          createdEvent: true,
        },
      });

      return {
        eventRequest: updatedRequest,
        event: createdEvent,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      console.error("Error approving event request:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to approve event request",
      });
    }
  }

  /**
   * Get counts per status (admin only)
   */
  async getCounts(): Promise<{ PENDING: number; APPROVED: number; REJECTED: number; total: number }> {
    const [PENDING, APPROVED, REJECTED, total] = await Promise.all([
      this.prisma.eventRequest.count({ where: { status: EventRequestStatus.PENDING } }),
      this.prisma.eventRequest.count({ where: { status: EventRequestStatus.APPROVED } }),
      this.prisma.eventRequest.count({ where: { status: EventRequestStatus.REJECTED } }),
      this.prisma.eventRequest.count(),
    ]);
    return { PENDING, APPROVED, REJECTED, total };
  }

  /**
   * Reject an event request
   */
  async reject(
    data: EventRequestRejectInput,
    userId: string
  ): Promise<any> {
    try {
      const eventRequest = await this.prisma.eventRequest.findUnique({
        where: { id: data.id },
      });

      if (!eventRequest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event request not found",
        });
      }

      if (eventRequest.status !== EventRequestStatus.PENDING) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot reject a ${eventRequest.status} request`,
        });
      }

      const updatedRequest = await this.prisma.eventRequest.update({
        where: { id: data.id },
        data: {
          status: EventRequestStatus.REJECTED,
          reviewedAt: new Date(),
          reviewedBy: userId,
          rejectionReason: data.rejectionReason,
        },
        include: {
          client: true,
          reviewer: true,
        },
      });

      return updatedRequest;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      console.error("Error rejecting event request:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to reject event request",
      });
    }
  }
}
