/**
 * Event Import Schemas
 *
 * Zod schemas for validating imported event data.
 * Events have more required fields than templates.
 */

import { z } from "zod";
import { RequestMethod, EventStatus } from "@prisma/client";

// Valid request methods for import
const REQUEST_METHOD_VALUES = ["EMAIL", "TEXT_SMS", "PHONE_CALL"] as const;
const REQUEST_METHOD_LABELS: Record<string, RequestMethod> = {
  email: "EMAIL",
  "text/sms": "TEXT_SMS",
  text_sms: "TEXT_SMS",
  textsms: "TEXT_SMS",
  sms: "TEXT_SMS",
  text: "TEXT_SMS",
  "phone call": "PHONE_CALL",
  phone_call: "PHONE_CALL",
  phonecall: "PHONE_CALL",
  phone: "PHONE_CALL",
  call: "PHONE_CALL",
};

// Valid status values for import
const STATUS_VALUES = ["DRAFT", "PUBLISHED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
const STATUS_LABELS: Record<string, EventStatus> = {
  draft: "DRAFT",
  published: "PUBLISHED",
  confirmed: "CONFIRMED",
  "in progress": "IN_PROGRESS",
  in_progress: "IN_PROGRESS",
  inprogress: "IN_PROGRESS",
  completed: "COMPLETED",
  cancelled: "CANCELLED",
  canceled: "CANCELLED",
};

// Time format regex (HH:MM or TBD)
const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

// File link schema for JSON parsing
const fileLinkSchema = z.object({
  name: z.string(),
  link: z.string(),
});

// Event document schema for JSON parsing
const eventDocumentSchema = z.object({
  name: z.string(),
  url: z.string(),
  type: z.string().optional(),
  size: z.number().optional(),
});

/**
 * Schema for a single imported event row
 * Events have required fields: title, venueName, address, city, state, zipCode, startDate, endDate, timezone
 */
export const importEventRowSchema = z.object({
  // Event ID (optional - used for upsert mode to match existing events)
  eventId: z
    .string()
    .max(50)
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),

  // Required fields
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title too long")
    .transform((val) => val.trim()),
  venueName: z
    .string()
    .min(1, "Venue name is required")
    .max(200, "Venue name too long")
    .transform((val) => val.trim()),
  address: z
    .string()
    .min(1, "Address is required")
    .max(300, "Address too long")
    .transform((val) => val.trim()),
  city: z
    .string()
    .min(1, "City is required")
    .max(100, "City too long")
    .transform((val) => val.trim()),
  state: z
    .string()
    .min(1, "State is required")
    .max(50, "State too long")
    .transform((val) => val.trim()),
  zipCode: z
    .string()
    .min(1, "ZIP code is required")
    .max(20, "ZIP code too long")
    .transform((val) => val.trim()),
  startDate: z
    .union([z.date(), z.string()])
    .refine((val) => {
      if (!val) return false;
      if (val instanceof Date) return !isNaN(val.getTime());
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, "Valid start date is required")
    .transform((val) => {
      if (val instanceof Date) return val;
      return new Date(val);
    }),
  endDate: z
    .union([z.date(), z.string()])
    .refine((val) => {
      if (!val) return false;
      if (val instanceof Date) return !isNaN(val.getTime());
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, "Valid end date is required")
    .transform((val) => {
      if (val instanceof Date) return val;
      return new Date(val);
    }),
  timezone: z
    .string()
    .min(1, "Timezone is required")
    .max(50, "Timezone too long")
    .transform((val) => val.trim()),

  // Optional fields
  description: z
    .string()
    .max(5000)
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),
  requirements: z
    .string()
    .max(500)
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),
  privateComments: z
    .string()
    .max(5000)
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),

  // Status (defaults to DRAFT)
  status: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (!val) return "DRAFT" as EventStatus;
      const normalized = val.trim().toLowerCase();
      // Check for exact enum match
      if (STATUS_VALUES.includes(val.toUpperCase() as any)) {
        return val.toUpperCase() as EventStatus;
      }
      // Check for label match
      if (STATUS_LABELS[normalized]) {
        return STATUS_LABELS[normalized];
      }
      return "DRAFT" as EventStatus;
    }),

  // Client (matched by name)
  clientName: z
    .string()
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),

  // Optional location fields
  latitude: z
    .union([z.number(), z.string()])
    .optional()
    .nullable()
    .transform((val) => {
      if (val === null || val === undefined || val === "") return null;
      const num = typeof val === "number" ? val : parseFloat(val);
      return isNaN(num) ? null : num;
    }),
  longitude: z
    .union([z.number(), z.string()])
    .optional()
    .nullable()
    .transform((val) => {
      if (val === null || val === undefined || val === "") return null;
      const num = typeof val === "number" ? val : parseFloat(val);
      return isNaN(num) ? null : num;
    }),

  // Optional time fields
  startTime: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (!val || val.trim() === "") return null;
      const trimmed = val.trim().toUpperCase();
      if (trimmed === "TBD") return "TBD";
      if (timeRegex.test(val.trim())) return val.trim();
      return null;
    }),
  endTime: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (!val || val.trim() === "") return null;
      const trimmed = val.trim().toUpperCase();
      if (trimmed === "TBD") return "TBD";
      if (timeRegex.test(val.trim())) return val.trim();
      return null;
    }),

  // Request Information
  requestMethod: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (!val) return null;
      const normalized = val.trim().toLowerCase();
      if (REQUEST_METHOD_VALUES.includes(val.toUpperCase() as any)) {
        return val.toUpperCase() as RequestMethod;
      }
      if (REQUEST_METHOD_LABELS[normalized]) {
        return REQUEST_METHOD_LABELS[normalized];
      }
      return null;
    }),
  requestorName: z
    .string()
    .max(200)
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),
  requestorPhone: z
    .string()
    .max(50)
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),
  requestorEmail: z
    .string()
    .max(255)
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),
  poNumber: z
    .string()
    .max(100)
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),

  // Pre-Event Instructions
  preEventInstructions: z
    .string()
    .max(10000)
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),

  // Onsite Contact
  meetingPoint: z
    .string()
    .max(300)
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),
  onsitePocName: z
    .string()
    .max(200)
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),
  onsitePocPhone: z
    .string()
    .max(50)
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),
  onsitePocEmail: z
    .string()
    .max(255)
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),

  // JSON fields (parsed from strings)
  fileLinks: z
    .union([z.string(), z.array(fileLinkSchema)])
    .optional()
    .nullable()
    .transform((val) => {
      if (!val) return null;
      if (Array.isArray(val)) return val;
      if (typeof val === "string" && val.trim()) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) return parsed;
        } catch {
          return null;
        }
      }
      return null;
    }),
  eventDocuments: z
    .union([z.string(), z.array(eventDocumentSchema)])
    .optional()
    .nullable()
    .transform((val) => {
      if (!val) return null;
      if (Array.isArray(val)) return val;
      if (typeof val === "string" && val.trim()) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) return parsed;
        } catch {
          return null;
        }
      }
      return null;
    }),
});

export type ImportEventRow = z.infer<typeof importEventRowSchema>;

/**
 * Schema for bulk import input
 */
export const eventBulkImportSchema = z.object({
  events: z.array(
    z.object({
      eventId: z.string().max(50).optional().nullable(), // For upsert matching
      title: z.string().min(1).max(200),
      description: z.string().max(5000).optional().nullable(),
      requirements: z.string().max(500).optional().nullable(),
      privateComments: z.string().max(5000).optional().nullable(),
      status: z.nativeEnum(EventStatus).default("DRAFT"),
      clientId: z.string().uuid().optional().nullable(),
      venueName: z.string().min(1).max(200),
      address: z.string().min(1).max(300),
      city: z.string().min(1).max(100),
      state: z.string().min(1).max(50),
      zipCode: z.string().min(1).max(20),
      latitude: z.number().min(-90).max(90).optional().nullable(),
      longitude: z.number().min(-180).max(180).optional().nullable(),
      startDate: z.date(),
      endDate: z.date(),
      startTime: z.string().optional().nullable(),
      endTime: z.string().optional().nullable(),
      timezone: z.string().min(1).max(50),
      requestMethod: z.nativeEnum(RequestMethod).optional().nullable(),
      requestorName: z.string().max(200).optional().nullable(),
      requestorPhone: z.string().max(50).optional().nullable(),
      requestorEmail: z.string().max(255).optional().nullable(),
      poNumber: z.string().max(100).optional().nullable(),
      preEventInstructions: z.string().max(10000).optional().nullable(),
      meetingPoint: z.string().max(300).optional().nullable(),
      onsitePocName: z.string().max(200).optional().nullable(),
      onsitePocPhone: z.string().max(50).optional().nullable(),
      onsitePocEmail: z.string().max(255).optional().nullable(),
      fileLinks: z.array(fileLinkSchema).optional().nullable(),
      eventDocuments: z.array(eventDocumentSchema).optional().nullable(),
    })
  ),
  mode: z.enum(["create", "upsert"]).default("create"),
});

export type EventBulkImportInput = z.infer<typeof eventBulkImportSchema>;
