import { z } from "zod";
import { EventStatus } from "@prisma/client";

/**
 * Common timezone values for validation
 */
const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Australia/Sydney",
] as const;

/**
 * File link schema for validation
 */
const fileLinkSchema = z.object({
  name: z.string().min(1, "File name is required").max(100, "File name too long"),
  link: z.string().url("Invalid file link URL"),
});

/**
 * Event ID format validation (EVT-YYYY-NNN)
 */
const eventIdRegex = /^EVT-\d{4}-\d{3}$/;

/**
 * Time format validation (HH:MM or TBD)
 */
const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

/**
 * Event Zod Schemas for validation
 */
export class EventSchema {
  /**
   * Create Event Schema
   * Note: eventId is auto-generated on backend, not required from client
   */
  static create = z
    .object({
      title: z
        .string()
        .min(1, "Event title is required")
        .max(200, "Title must be 200 characters or less")
        .transform((val) => val.trim()),
      description: z
        .string()
        .max(5000, "Description must be 5000 characters or less")
        .optional()
        .transform((val) => val?.trim()),
      dressCode: z
        .string()
        .max(200, "Dress code must be 200 characters or less")
        .optional()
        .transform((val) => val?.trim()),
      privateComments: z
        .string()
        .max(5000, "Private comments must be 5000 characters or less")
        .optional()
        .transform((val) => val?.trim()),

      // Venue Information (all required)
      venueName: z
        .string()
        .min(1, "Venue name is required")
        .max(200, "Venue name must be 200 characters or less")
        .transform((val) => val.trim()),
      address: z
        .string()
        .min(1, "Address is required")
        .max(300, "Address must be 300 characters or less")
        .transform((val) => val.trim()),
      room: z
        .string()
        .min(1, "Room/Place is required")
        .max(100, "Room/Place must be 100 characters or less")
        .transform((val) => val.trim()),
      city: z
        .string()
        .min(1, "City is required")
        .max(100, "City must be 100 characters or less")
        .transform((val) => val.trim()),
      state: z
        .string()
        .min(1, "State is required")
        .max(50, "State must be 50 characters or less")
        .transform((val) => val.trim()),
      zipCode: z
        .string()
        .min(1, "ZIP code is required")
        .max(20, "ZIP code must be 20 characters or less")
        .transform((val) => val.trim()),

      // Date and Time
      startDate: z.coerce.date({ message: "Start date is required" }),
      startTime: z
        .string()
        .refine(
          (val) => !val || val === "TBD" || timeRegex.test(val),
          { message: "Start time must be in HH:MM format or TBD" }
        )
        .optional(),
      endDate: z.coerce.date({ message: "End date is required" }),
      endTime: z
        .string()
        .refine(
          (val) => !val || val === "TBD" || timeRegex.test(val),
          { message: "End time must be in HH:MM format or TBD" }
        )
        .optional(),
      timezone: z
        .string()
        .min(1, "Timezone is required")
        .refine(
          (val) =>
            COMMON_TIMEZONES.includes(val as any) ||
            /^[A-Z][a-z]+\/[A-Z][a-z_]+$/.test(val),
          { message: "Invalid timezone format" }
        ),

      // Settings
      dailyDigestMode: z.boolean().default(false),
      requireStaff: z.boolean().default(false),
      status: z.nativeEnum(EventStatus).default(EventStatus.DRAFT),

      // File Links
      fileLinks: z
        .array(fileLinkSchema)
        .max(20, "Maximum 20 file links allowed")
        .optional(),
    })
    .refine((data) => data.endDate >= data.startDate, {
      message: "End date must be after or equal to start date",
      path: ["endDate"],
    });

  /**
   * Update Event Schema (all fields optional except ID)
   */
  static update = z
    .object({
      id: z.string().uuid("Invalid event ID"),
      eventId: z
        .string()
        .regex(eventIdRegex, "Event ID must be in format EVT-YYYY-NNN")
        .optional(), // Should not be updated normally
      title: z
        .string()
        .min(1, "Event title is required")
        .max(200, "Title must be 200 characters or less")
        .transform((val) => val.trim())
        .optional(),
      description: z
        .string()
        .max(5000, "Description must be 5000 characters or less")
        .transform((val) => val?.trim())
        .optional(),
      dressCode: z
        .string()
        .max(200, "Dress code must be 200 characters or less")
        .transform((val) => val?.trim())
        .optional(),
      privateComments: z
        .string()
        .max(5000, "Private comments must be 5000 characters or less")
        .transform((val) => val?.trim())
        .optional(),

      // Venue Information
      venueName: z
        .string()
        .min(1, "Venue name is required")
        .max(200, "Venue name must be 200 characters or less")
        .transform((val) => val.trim())
        .optional(),
      address: z
        .string()
        .min(1, "Address is required")
        .max(300, "Address must be 300 characters or less")
        .transform((val) => val.trim())
        .optional(),
      room: z
        .string()
        .min(1, "Room/Place is required")
        .max(100, "Room/Place must be 100 characters or less")
        .transform((val) => val.trim())
        .optional(),
      city: z
        .string()
        .min(1, "City is required")
        .max(100, "City must be 100 characters or less")
        .transform((val) => val.trim())
        .optional(),
      state: z
        .string()
        .min(1, "State is required")
        .max(50, "State must be 50 characters or less")
        .transform((val) => val.trim())
        .optional(),
      zipCode: z
        .string()
        .min(1, "ZIP code is required")
        .max(20, "ZIP code must be 20 characters or less")
        .transform((val) => val.trim())
        .optional(),

      // Date and Time
      startDate: z.coerce.date().optional(),
      startTime: z
        .string()
        .refine(
          (val) => !val || val === "TBD" || timeRegex.test(val),
          { message: "Start time must be in HH:MM format or TBD" }
        )
        .optional(),
      endDate: z.coerce.date().optional(),
      endTime: z
        .string()
        .refine(
          (val) => !val || val === "TBD" || timeRegex.test(val),
          { message: "End time must be in HH:MM format or TBD" }
        )
        .optional(),
      timezone: z
        .string()
        .refine(
          (val) =>
            !val ||
            COMMON_TIMEZONES.includes(val as any) ||
            /^[A-Z][a-z]+\/[A-Z][a-z_]+$/.test(val),
          { message: "Invalid timezone format" }
        )
        .optional(),

      // Settings
      dailyDigestMode: z.boolean().optional(),
      requireStaff: z.boolean().optional(),
      status: z.nativeEnum(EventStatus).optional(),

      // File Links
      fileLinks: z
        .array(fileLinkSchema)
        .max(20, "Maximum 20 file links allowed")
        .optional(),
    })
    .refine(
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
      .enum([
        "createdAt",
        "updatedAt",
        "title",
        "eventId",
        "startDate",
        "endDate",
        "status",
        "venueName",
      ])
      .default("createdAt")
      .optional(),
    sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
    status: z.nativeEnum(EventStatus).optional(),
    startDateFrom: z.coerce.date().optional(),
    startDateTo: z.coerce.date().optional(),
    endDateFrom: z.coerce.date().optional(),
    endDateTo: z.coerce.date().optional(),
    timezone: z.string().optional(),
  });

  /**
   * Event ID Schema (for get, delete by UUID)
   */
  static id = z.object({
    id: z.string().uuid("Invalid event ID"),
  });

  /**
   * Update Status Schema
   */
  static updateStatus = z.object({
    id: z.string().uuid("Invalid event ID"),
    status: z.nativeEnum(EventStatus, {
      message: "Status is required",
    }),
  });
}

/**
 * TypeScript types inferred from Zod schemas
 */
export type CreateEventInput = z.infer<typeof EventSchema.create>;
export type UpdateEventInput = z.infer<typeof EventSchema.update>;
export type QueryEventsInput = z.infer<typeof EventSchema.query>;
export type EventIdInput = z.infer<typeof EventSchema.id>;
export type UpdateEventStatusInput = z.infer<typeof EventSchema.updateStatus>;

/**
 * File link type
 */
export type FileLink = z.infer<typeof fileLinkSchema>;

/**
 * Export common timezones for frontend use
 */
export const TIMEZONES = COMMON_TIMEZONES;
