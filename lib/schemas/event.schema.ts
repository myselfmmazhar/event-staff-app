import { z } from "zod";
import { EventStatus, RequestMethod, AmountType } from "@prisma/client";

/**
 * Common timezone values for validation
 */
export const TIMEZONES: readonly string[] = [
  "UTC",
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
 * Event document schema for validation (uploaded files)
 */
const eventDocumentSchema = z.object({
  name: z.string().min(1, "Document name is required").max(100, "Document name too long"),
  url: z.string().url("Invalid document URL"),
  type: z.string().optional(),
  size: z.number().optional(),
});

/**
 * Custom field schema for validation
 */
const customFieldSchema = z.object({
  label: z.string().min(1, "Label is required").max(100, "Label too long"),
  value: z.string().max(1000, "Value too long"),
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
      clientId: z
        .string()
        .uuid("Invalid client ID")
        .optional()
        .or(z.literal("")),

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

      // Location Coordinates (optional, can be auto-filled by geocoding)
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

      // Date and Time (nullable for UBD support)
      // Preprocess empty strings to null so the union validates correctly
      startDate: z.preprocess(
        (val) => (val === '' || val === undefined ? null : val),
        z.union([z.null(), z.coerce.date()])
      ).optional(),
      startTime: z
        .string()
        .refine(
          (val) => !val || val === "TBD" || timeRegex.test(val),
          { message: "Start time must be in HH:MM format or TBD" }
        )
        .optional(),
      endDate: z.preprocess(
        (val) => (val === '' || val === undefined ? null : val),
        z.union([z.null(), z.coerce.date()])
      ).optional(),
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
            TIMEZONES.includes(val) ||
            /^[A-Z][a-z]+\/[A-Z][a-z_]+$/.test(val),
          { message: "Invalid timezone format" }
        ),

      // Settings
      status: z.nativeEnum(EventStatus).default(EventStatus.DRAFT),

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

      // Custom Fields
      customFields: z
        .array(customFieldSchema)
        .max(20, "Maximum 20 custom fields allowed")
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
        // Only validate if both dates are provided (not UBD)
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
   * Update Event Schema (all fields optional except ID)
   */
  static update = z
    .object({
      id: z.string().uuid("Invalid event ID"),
      eventId: z
        .string()
        .min(1, "Event ID is required")
        .optional(),
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
      clientId: z
        .string()
        .uuid("Invalid client ID")
        .optional()
        .or(z.literal("")),

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

      // Location Coordinates (optional, can be auto-filled by geocoding)
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

      // Date and Time (nullable for UBD support)
      // Preprocess empty strings to null so the union validates correctly
      startDate: z.preprocess(
        (val) => (val === '' || val === undefined ? null : val),
        z.union([z.null(), z.coerce.date()])
      ).optional(),
      startTime: z
        .string()
        .refine(
          (val) => !val || val === "TBD" || timeRegex.test(val),
          { message: "Start time must be in HH:MM format or TBD" }
        )
        .optional(),
      endDate: z.preprocess(
        (val) => (val === '' || val === undefined ? null : val),
        z.union([z.null(), z.coerce.date()])
      ).optional(),
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
            TIMEZONES.includes(val) ||
            /^[A-Z][a-z]+\/[A-Z][a-z_]+$/.test(val),
          { message: "Invalid timezone format" }
        )
        .optional(),

      // Settings
      status: z.nativeEnum(EventStatus).optional(),

      // File Links
      fileLinks: z
        .array(fileLinkSchema)
        .max(20, "Maximum 20 file links allowed")
        .optional(),

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
        .optional(),

      // Custom Fields
      customFields: z
        .array(customFieldSchema)
        .max(20, "Maximum 20 custom fields allowed")
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
    // Single value filters (deprecated, kept for backwards compatibility)
    status: z.nativeEnum(EventStatus).optional(),
    clientId: z.string().optional(),
    // Multi-select filters (preferred)
    statuses: z.array(z.nativeEnum(EventStatus)).optional(),
    clientIds: z.array(z.string()).optional(),
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
   * Archive / Restore Schemas
   */
  static archive = z.object({
    id: z.string().uuid("Invalid event ID"),
  });

  static archiveMany = z.object({
    ids: z.array(z.string().uuid("Invalid event ID")).min(1, "At least one event ID is required"),
  });

  static restore = z.object({
    id: z.string().uuid("Invalid event ID"),
  });

  static restoreMany = z.object({
    ids: z.array(z.string().uuid("Invalid event ID")).min(1, "At least one event ID is required"),
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

  /**
   * Date Range Schema (for calendar queries)
   */
  static dateRange = z.object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    // Single value filters (deprecated, kept for backwards compatibility)
    status: z.nativeEnum(EventStatus).optional(),
    clientId: z.string().optional(),
    // Multi-select filters (preferred)
    statuses: z.array(z.nativeEnum(EventStatus)).optional(),
    clientIds: z.array(z.string()).optional(),
    search: z.string().optional(),
    startDateFrom: z.coerce.date().optional(),
    startDateTo: z.coerce.date().optional(),
    endDateFrom: z.coerce.date().optional(),
    endDateTo: z.coerce.date().optional(),
  });

  /**
   * Bulk Update Events Schema
   * Each field has an enabled flag - only enabled fields get updated
   * Fields: Status, Client
   */
  static bulkUpdate = z.object({
    eventIds: z
      .array(z.string().uuid("Invalid event ID"))
      .min(1, "At least one event must be selected"),
    status: z
      .object({
        enabled: z.boolean(),
        value: z.nativeEnum(EventStatus).optional(),
      })
      .optional(),
    clientId: z
      .object({
        enabled: z.boolean(),
        value: z.string().uuid("Invalid client ID").optional().nullable(),
      })
      .optional(),
  });

  /**
   * Bulk Delete Events Schema
   * For permanently deleting multiple archived events
   */
  static deleteMany = z.object({
    ids: z.array(z.string().uuid("Invalid event ID")).min(1, "At least one event ID is required"),
  });

  /**
   * Send Message Schema (for task messaging)
   */
  static sendMessage = z.object({
    eventId: z.string().uuid("Invalid event ID"),
    recipients: z.array(z.string().email("Invalid email address")).min(1, "At least one recipient is required"),
    subject: z.string().min(1, "Subject is required"),
    body: z.string().min(1, "Message body is required"),
    attachments: z.array(z.object({ filename: z.string(), path: z.string() })).optional(),
    statusToUpdate: z.nativeEnum(EventStatus).optional(),
  });
}

/**
 * TypeScript types inferred from Zod schemas
 */
export type CreateEventInput = z.infer<typeof EventSchema.create>;
export type UpdateEventInput = z.infer<typeof EventSchema.update>;
export type QueryEventsInput = z.infer<typeof EventSchema.query>;
export type EventIdInput = z.infer<typeof EventSchema.id>;
export type ArchiveEventInput = z.infer<typeof EventSchema.archive>;
export type ArchiveManyEventsInput = z.infer<typeof EventSchema.archiveMany>;
export type RestoreEventInput = z.infer<typeof EventSchema.restore>;
export type RestoreManyEventsInput = z.infer<typeof EventSchema.restoreMany>;
export type UpdateEventStatusInput = z.infer<typeof EventSchema.updateStatus>;
export type DateRangeInput = z.infer<typeof EventSchema.dateRange>;
export type BulkUpdateEventsInput = z.infer<typeof EventSchema.bulkUpdate>;
export type DeleteManyEventsInput = z.infer<typeof EventSchema.deleteMany>;
export type SendMessageInput = z.infer<typeof EventSchema.sendMessage>;

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

/**
 * Export common timezones for frontend use
 */


/**
 * Export RequestMethod enum values for frontend use
 */
export const REQUEST_METHODS = Object.values(RequestMethod);
