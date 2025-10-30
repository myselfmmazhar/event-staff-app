import { z } from "zod";
import { EventStatus } from "@prisma/client";

/**
 * Event Zod Schemas for validation
 */
export class EventSchema {
  /**
   * Create Event Schema
   */
  static create = z.object({
    name: z.string().min(1, "Event name is required"),
    description: z.string().optional(),
    eventType: z.string().optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    status: z.nativeEnum(EventStatus).default(EventStatus.DRAFT),
    venueName: z.string().optional(),
    venueAddress: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
    specialInstructions: z.string().optional(),
    budget: z.number().positive().optional(),
    clientName: z.string().optional(),
    clientEmail: z.string().email({ message: "Invalid client email" }).optional(),
    clientPhone: z.string().optional(),
  }).refine(
    (data) => data.endDate >= data.startDate,
    {
      message: "End date must be after or equal to start date",
      path: ["endDate"],
    }
  );

  /**
   * Update Event Schema (all fields optional except ID)
   */
  static update = z.object({
    id: z.string().uuid("Invalid event ID"),
    name: z.string().min(1, "Event name is required").optional(),
    description: z.string().optional(),
    eventType: z.string().optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    status: z.nativeEnum(EventStatus).optional(),
    venueName: z.string().optional(),
    venueAddress: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
    specialInstructions: z.string().optional(),
    budget: z.number().positive().optional(),
    clientName: z.string().optional(),
    clientEmail: z.string().email({ message: "Invalid client email" }).optional(),
    clientPhone: z.string().optional(),
  }).refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    {
      message: "End date must be after or equal to start date",
      path: ["endDate"],
    }
  );

  /**
   * Query Events Schema (for pagination, search, filters)
   */
  static query = z.object({
    page: z.number().int().min(1).default(1).optional(),
    limit: z.number().int().min(1).max(100).default(10).optional(),
    search: z.string().optional(),
    sortBy: z
      .enum(["createdAt", "updatedAt", "name", "startDate", "endDate", "status"])
      .default("createdAt")
      .optional(),
    sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
    status: z.nativeEnum(EventStatus).optional(),
    startDateFrom: z.coerce.date().optional(),
    startDateTo: z.coerce.date().optional(),
  });

  /**
   * Event ID Schema (for get, delete)
   */
  static id = z.object({
    id: z.string().uuid("Invalid event ID"),
  });
}

/**
 * TypeScript types inferred from Zod schemas
 */
export type CreateEventInput = z.infer<typeof EventSchema.create>;
export type UpdateEventInput = z.infer<typeof EventSchema.update>;
export type QueryEventsInput = z.infer<typeof EventSchema.query>;
export type EventIdInput = z.infer<typeof EventSchema.id>;
