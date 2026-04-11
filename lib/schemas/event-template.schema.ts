import { z } from "zod";
import { RequestMethod, AmountType } from "@prisma/client";

/**
 * Common timezone values for validation
 */
const COMMON_TIMEZONES: readonly string[] = [
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
  name: z
    .string()
    .min(1, "File name is required")
    .max(100, "File name too long"),
  link: z.string().url("Invalid file link URL"),
});

/**
 * Event document schema for validation (uploaded files)
 */
const eventDocumentSchema = z.object({
  name: z.string().min(1, "Document name is required").max(100, "Document name too long"),
  url: z.string().url("Invalid document URL"),
  type: z.string().optional(),
  size: z.number().optional(),
});

/**
 * Time format validation (HH:MM)
 */
const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

/**
 * Custom field schema for validation
 */
const customFieldSchema = z.object({
  label: z.string().min(1, "Label is required").max(100, "Label too long"),
  value: z.string().max(1000, "Value too long"),
});

/**
 * Event Template Zod Schemas for validation
 */
export class EventTemplateSchema {
  /**
   * Create Event Template Schema
   */
  static create = z
    .object({
      // Template metadata
      name: z
        .string()
        .min(1, "Template name is required")
        .max(200, "Name must be 200 characters or less")
        .transform((val) => val.trim()),
      description: z
        .string()
        .max(500, "Description must be 500 characters or less")
        .optional()
        .transform((val) => val?.trim()),

      // Event fields to prefill
      title: z
        .string()
        .max(200, "Title must be 200 characters or less")
        .optional()
        .transform((val) => val?.trim()),
      eventDescription: z
        .string()
        .max(5000, "Description must be 5000 characters or less")
        .optional()
        .transform((val) => val?.trim()),
      requirements: z
        .string()
        .max(200, "Requirements must be 200 characters or less")
        .optional()
        .transform((val) => val?.trim()),
      privateComments: z
        .string()
        .max(5000, "Private comments must be 5000 characters or less")
        .optional()
        .transform((val) => val?.trim()),

      // Client relationship (optional)
      clientId: z.string().uuid("Invalid client ID").optional().or(z.literal("")),

      // Venue Information
      venueName: z
        .string()
        .max(200, "Venue name must be 200 characters or less")
        .optional()
        .transform((val) => val?.trim()),
      address: z
        .string()
        .max(300, "Address must be 300 characters or less")
        .optional()
        .transform((val) => val?.trim()),
      addressLine2: z
        .string()
        .max(200, "Address Line 2 must be 200 characters or less")
        .optional()
        .transform((val) => val?.trim()),
      city: z
        .string()
        .max(100, "City must be 100 characters or less")
        .optional()
        .transform((val) => val?.trim()),
      state: z
        .string()
        .max(50, "State must be 50 characters or less")
        .optional()
        .transform((val) => val?.trim()),
      zipCode: z
        .string()
        .max(20, "ZIP code must be 20 characters or less")
        .optional()
        .transform((val) => val?.trim()),

      // Location Coordinates
      latitude: z
        .number()
        .min(-90, "Latitude must be between -90 and 90")
        .max(90, "Latitude must be between -90 and 90")
        .optional(),
      longitude: z
        .number()
        .min(-180, "Longitude must be between -180 and 180")
        .max(180, "Longitude must be between -180 and 180")
        .optional(),

      // Date and Time
      startDate: z.coerce.date().optional(),
      startTime: z
        .string()
        .refine((val) => !val || val === "TBD" || timeRegex.test(val), {
          message: "Start time must be in HH:MM format or TBD",
        })
        .optional(),
      endDate: z.coerce.date().optional(),
      endTime: z
        .string()
        .refine((val) => !val || val === "TBD" || timeRegex.test(val), {
          message: "End time must be in HH:MM format or TBD",
        })
        .optional(),
      timezone: z
        .string()
        .refine(
          (val) =>
            !val ||
            COMMON_TIMEZONES.includes(val) ||
            /^[A-Z][a-z]+\/[A-Z][a-z_]+$/.test(val),
          { message: "Invalid timezone format" }
        )
        .optional(),

      // File Links
      fileLinks: z
        .array(fileLinkSchema)
        .max(20, "Maximum 20 file links allowed")
        .optional(),

      // Request Information
      requestMethod: z.nativeEnum(RequestMethod).optional(),
      requestorName: z
        .string()
        .max(200, "Requestor name must be 200 characters or less")
        .optional()
        .transform((val) => val?.trim()),
      requestorPhone: z
        .string()
        .max(50, "Requestor phone must be 50 characters or less")
        .optional()
        .transform((val) => val?.trim()),
      requestorEmail: z
        .string()
        .email("Invalid requestor email")
        .max(255, "Requestor email must be 255 characters or less")
        .optional()
        .or(z.literal("")),
      poNumber: z
        .string()
        .max(100, "PO number must be 100 characters or less")
        .optional()
        .transform((val) => val?.trim()),

      // Event Instructions & Documents
      preEventInstructions: z
        .string()
        .max(10000, "Pre-event instructions must be 10000 characters or less")
        .optional()
        .transform((val) => val?.trim()),
      eventDocuments: z
        .array(eventDocumentSchema)
        .max(20, "Maximum 20 event documents allowed")
        .optional(),

      // Onsite Contact & Meeting Point
      meetingPoint: z
        .string()
        .max(300, "Meeting point must be 300 characters or less")
        .optional()
        .transform((val) => val?.trim()),
      onsitePocName: z
        .string()
        .max(200, "POC name must be 200 characters or less")
        .optional()
        .transform((val) => val?.trim()),
      onsitePocPhone: z
        .string()
        .max(50, "POC phone must be 50 characters or less")
        .optional()
        .transform((val) => val?.trim()),
      onsitePocEmail: z
        .string()
        .email("Invalid POC email")
        .max(255, "POC email must be 255 characters or less")
        .optional()
        .or(z.literal("")),

      // Custom Fields
      customFields: z
        .array(customFieldSchema)
        .max(20, "Maximum 20 custom fields allowed")
        .optional(),

      // Billing & Rate Settings
      estimate: z.boolean().optional(),
      taskRateType: z.nativeEnum(AmountType).optional(),
      commission: z.boolean().optional(),
      commissionAmount: z
        .number()
        .min(0, "Commission amount must be positive")
        .optional(),
      commissionAmountType: z.nativeEnum(AmountType).optional(),
      approveForOvertime: z.boolean().optional(),
      overtimeRate: z
        .number()
        .min(0, "Overtime rate must be positive")
        .optional(),
      overtimeRateType: z.nativeEnum(AmountType).optional(),
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
   * Update Event Template Schema (all fields optional except ID)
   */
  static update = z
    .object({
      id: z.string().uuid("Invalid template ID"),

      // Template metadata
      name: z
        .string()
        .min(1, "Template name is required")
        .max(200, "Name must be 200 characters or less")
        .transform((val) => val.trim())
        .optional(),
      description: z
        .string()
        .max(500, "Description must be 500 characters or less")
        .transform((val) => val?.trim())
        .optional(),

      // Event fields to prefill
      title: z
        .string()
        .max(200, "Title must be 200 characters or less")
        .transform((val) => val?.trim())
        .optional(),
      eventDescription: z
        .string()
        .max(5000, "Description must be 5000 characters or less")
        .transform((val) => val?.trim())
        .optional(),
      requirements: z
        .string()
        .max(200, "Requirements must be 200 characters or less")
        .transform((val) => val?.trim())
        .optional(),
      privateComments: z
        .string()
        .max(5000, "Private comments must be 5000 characters or less")
        .transform((val) => val?.trim())
        .optional(),

      // Client relationship (optional)
      clientId: z.string().uuid("Invalid client ID").optional().or(z.literal("")),

      // Venue Information
      venueName: z
        .string()
        .max(200, "Venue name must be 200 characters or less")
        .transform((val) => val?.trim())
        .optional(),
      address: z
        .string()
        .max(300, "Address must be 300 characters or less")
        .transform((val) => val?.trim())
        .optional(),
      addressLine2: z
        .string()
        .max(200, "Address Line 2 must be 200 characters or less")
        .transform((val) => val?.trim())
        .optional(),
      city: z
        .string()
        .max(100, "City must be 100 characters or less")
        .transform((val) => val?.trim())
        .optional(),
      state: z
        .string()
        .max(50, "State must be 50 characters or less")
        .transform((val) => val?.trim())
        .optional(),
      zipCode: z
        .string()
        .max(20, "ZIP code must be 20 characters or less")
        .transform((val) => val?.trim())
        .optional(),

      // Location Coordinates
      latitude: z
        .number()
        .min(-90, "Latitude must be between -90 and 90")
        .max(90, "Latitude must be between -90 and 90")
        .optional()
        .nullable(),
      longitude: z
        .number()
        .min(-180, "Longitude must be between -180 and 180")
        .max(180, "Longitude must be between -180 and 180")
        .optional()
        .nullable(),

      // Date and Time
      startDate: z.coerce.date().optional().nullable(),
      startTime: z
        .string()
        .refine((val) => !val || val === "TBD" || timeRegex.test(val), {
          message: "Start time must be in HH:MM format or TBD",
        })
        .optional()
        .nullable(),
      endDate: z.coerce.date().optional().nullable(),
      endTime: z
        .string()
        .refine((val) => !val || val === "TBD" || timeRegex.test(val), {
          message: "End time must be in HH:MM format or TBD",
        })
        .optional()
        .nullable(),
      timezone: z
        .string()
        .refine(
          (val) =>
            !val ||
            COMMON_TIMEZONES.includes(val) ||
            /^[A-Z][a-z]+\/[A-Z][a-z_]+$/.test(val),
          { message: "Invalid timezone format" }
        )
        .optional()
        .nullable(),

      // File Links
      fileLinks: z
        .array(fileLinkSchema)
        .max(20, "Maximum 20 file links allowed")
        .optional()
        .nullable(),

      // Request Information
      requestMethod: z.nativeEnum(RequestMethod).optional().nullable(),
      requestorName: z
        .string()
        .max(200, "Requestor name must be 200 characters or less")
        .optional()
        .transform((val) => val?.trim()),
      requestorPhone: z
        .string()
        .max(50, "Requestor phone must be 50 characters or less")
        .optional()
        .transform((val) => val?.trim()),
      requestorEmail: z
        .string()
        .email("Invalid requestor email")
        .max(255, "Requestor email must be 255 characters or less")
        .optional()
        .or(z.literal("")),
      poNumber: z
        .string()
        .max(100, "PO number must be 100 characters or less")
        .optional()
        .transform((val) => val?.trim()),

      // Event Instructions & Documents
      preEventInstructions: z
        .string()
        .max(10000, "Pre-event instructions must be 10000 characters or less")
        .optional()
        .transform((val) => val?.trim()),
      eventDocuments: z
        .array(eventDocumentSchema)
        .max(20, "Maximum 20 event documents allowed")
        .optional()
        .nullable(),

      // Onsite Contact & Meeting Point
      meetingPoint: z
        .string()
        .max(300, "Meeting point must be 300 characters or less")
        .optional()
        .transform((val) => val?.trim()),
      onsitePocName: z
        .string()
        .max(200, "POC name must be 200 characters or less")
        .optional()
        .transform((val) => val?.trim()),
      onsitePocPhone: z
        .string()
        .max(50, "POC phone must be 50 characters or less")
        .optional()
        .transform((val) => val?.trim()),
      onsitePocEmail: z
        .string()
        .email("Invalid POC email")
        .max(255, "POC email must be 255 characters or less")
        .optional()
        .or(z.literal("")),

      // Custom Fields
      customFields: z
        .array(customFieldSchema)
        .max(20, "Maximum 20 custom fields allowed")
        .optional()
        .nullable(),

      // Billing & Rate Settings
      estimate: z.boolean().optional().nullable(),
      taskRateType: z.nativeEnum(AmountType).optional().nullable(),
      commission: z.boolean().optional().nullable(),
      commissionAmount: z
        .number()
        .min(0, "Commission amount must be positive")
        .optional()
        .nullable(),
      commissionAmountType: z.nativeEnum(AmountType).optional().nullable(),
      approveForOvertime: z.boolean().optional().nullable(),
      overtimeRate: z
        .number()
        .min(0, "Overtime rate must be positive")
        .optional()
        .nullable(),
      overtimeRateType: z.nativeEnum(AmountType).optional().nullable(),
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
   * Query Event Templates Schema (for pagination, search)
   */
  static query = z.object({
    page: z.number().int().min(1).default(1).optional(),
    limit: z.number().int().min(1).max(100).default(10).optional(),
    search: z.string().optional(),
    sortBy: z
      .enum(["createdAt", "updatedAt", "name"])
      .default("createdAt")
      .optional(),
    sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
  });

  /**
   * Template ID Schema (for get, delete by UUID)
   */
  static id = z.object({
    id: z.string().uuid("Invalid template ID"),
  });

  /**
   * Bulk Delete Schema
   */
  static deleteMany = z.object({
    ids: z.array(z.string().uuid("Invalid template ID")).min(1, "At least one template ID is required"),
  });
}

/**
 * TypeScript types inferred from Zod schemas
 */
export type CreateEventTemplateInput = z.infer<typeof EventTemplateSchema.create>;
export type UpdateEventTemplateInput = z.infer<typeof EventTemplateSchema.update>;
export type QueryEventTemplatesInput = z.infer<typeof EventTemplateSchema.query>;
export type EventTemplateIdInput = z.infer<typeof EventTemplateSchema.id>;
export type DeleteManyTemplatesInput = z.infer<typeof EventTemplateSchema.deleteMany>;

/**
 * File link type
 */
export type FileLink = z.infer<typeof fileLinkSchema>;

/**
 * Event document type
 */
export type EventDocument = z.infer<typeof eventDocumentSchema>;

/**
 * Custom field type
 */
export type CustomField = z.infer<typeof customFieldSchema>;
