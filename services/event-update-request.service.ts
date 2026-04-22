import { PrismaClient, EventUpdateRequestStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import type {
  EventUpdateRequestSubmitInput,
  EventUpdateRequestQueryInput,
  EventUpdateRequestMarkReviewedInput,
  EventUpdateRequestDismissInput,
} from "@/lib/schemas/event-update-request.schema";

export class EventUpdateRequestService {
  constructor(private prisma: PrismaClient) {}

  private generateRequestId(): string {
    const today = new Date().toISOString().substring(0, 10).replace(/-/g, "");
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `EUR-${today}-${random}`;
  }

  async submit(data: EventUpdateRequestSubmitInput, clientId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: data.eventId },
      select: { id: true, clientId: true, title: true, status: true },
    });

    if (!event) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
    }

    if (event.clientId !== clientId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this event." });
    }

    const requestId = this.generateRequestId();

    return this.prisma.eventUpdateRequest.create({
      data: {
        requestId,
        eventId: data.eventId,
        clientId,
        note: data.note.trim(),
        status: "PENDING",
      },
      include: {
        event: { select: { id: true, eventId: true, title: true } },
      },
    });
  }

  async getMyUpdateRequests(clientId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.eventUpdateRequest.findMany({
        where: { clientId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          event: { select: { id: true, eventId: true, title: true, startDate: true, venueName: true } },
        },
      }),
      this.prisma.eventUpdateRequest.count({ where: { clientId } }),
    ]);
    return { data, total, page, limit };
  }

  async getAll(input: EventUpdateRequestQueryInput) {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (input.status && input.status !== "ALL") {
      where.status = input.status as EventUpdateRequestStatus;
    }
    if (input.search) {
      where.OR = [
        { event: { title: { contains: input.search, mode: "insensitive" } } },
        { event: { eventId: { contains: input.search, mode: "insensitive" } } },
        { client: { businessName: { contains: input.search, mode: "insensitive" } } },
        { client: { firstName: { contains: input.search, mode: "insensitive" } } },
        { client: { lastName: { contains: input.search, mode: "insensitive" } } },
        { requestId: { contains: input.search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.eventUpdateRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          event: { select: { id: true, eventId: true, title: true, startDate: true, startTime: true, venueName: true, city: true, state: true } },
          client: { select: { id: true, businessName: true, firstName: true, lastName: true, email: true } },
          reviewer: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.eventUpdateRequest.count({ where }),
    ]);

    const [pendingCount, reviewedCount, dismissedCount] = await Promise.all([
      this.prisma.eventUpdateRequest.count({ where: { status: "PENDING" } }),
      this.prisma.eventUpdateRequest.count({ where: { status: "REVIEWED" } }),
      this.prisma.eventUpdateRequest.count({ where: { status: "DISMISSED" } }),
    ]);

    return { data, total, page, limit, counts: { pending: pendingCount, reviewed: reviewedCount, dismissed: dismissedCount } };
  }

  async markReviewed(input: EventUpdateRequestMarkReviewedInput, reviewedBy: string) {
    const req = await this.prisma.eventUpdateRequest.findUnique({ where: { id: input.id } });
    if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Update request not found." });

    return this.prisma.eventUpdateRequest.update({
      where: { id: input.id },
      data: {
        status: "REVIEWED",
        adminNote: input.adminNote?.trim() || null,
        reviewedAt: new Date(),
        reviewedBy,
      },
      include: {
        event: { select: { id: true, eventId: true, title: true } },
        client: { select: { id: true, businessName: true, firstName: true, lastName: true } },
      },
    });
  }

  async dismiss(input: EventUpdateRequestDismissInput, reviewedBy: string) {
    const req = await this.prisma.eventUpdateRequest.findUnique({ where: { id: input.id } });
    if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Update request not found." });

    return this.prisma.eventUpdateRequest.update({
      where: { id: input.id },
      data: {
        status: "DISMISSED",
        reviewedAt: new Date(),
        reviewedBy,
      },
      include: {
        event: { select: { id: true, eventId: true, title: true } },
        client: { select: { id: true, businessName: true, firstName: true, lastName: true } },
      },
    });
  }
}
