/**
 * Event Template Import Schemas
 *
 * Zod schemas for validating imported event template data.
 */

import { z } from "zod";
import { RequestMethod } from "@prisma/client";

// Valid request methods for import
const REQUEST_METHOD_VALUES = ["EMAIL", "TEXT_SMS", "PHONE_CALL"] as const;
const REQUEST_METHOD_LABELS: Record<string, RequestMethod> = {
  email: "EMAIL",
  "text/sms": "TEXT_SMS",
  "text_sms": "TEXT_SMS",
  "textsms": "TEXT_SMS",
  sms: "TEXT_SMS",
  text: "TEXT_SMS",
  "phone call": "PHONE_CALL",
  "phone_call": "PHONE_CALL",
  phonecall: "PHONE_CALL",
  phone: "PHONE_CALL",
  call: "PHONE_CALL",
};

// Time format regex (HH:MM or TBD)
const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

// Date format regex (YYYY-MM-DD)
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

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
 * Schema for a single imported template row
 * All fields except name are optional
 */
export const importTemplateRowSchema = z.object({
  // Required
  name: z
    .string()
    .min(1, "Template name is required")
    .max(200, "Template name too long")
    .transform((val) => val.trim()),

  // Template metadata
  description: z
    .string()
    .max(500)
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),

  // Event fields
  title: z
    .string()
    .max(200)
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),
  eventDescription: z
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

  // Client (matched by name)
  clientName: z
    .string()
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),

  // Venue
  venueName: z
    .string()
    .max(200)
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),
  address: z
    .string()
    .max(300)
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),
  city: z
    .string()
    .max(100)
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),
  state: z
    .string()
    .max(50)
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),
  zipCode: z
    .string()
    .max(20)
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),
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

  // Date/Time
  startDate: z
    .union([z.date(), z.string()])
    .optional()
    .nullable()
    .transform((val) => {
      if (!val) return null;
      if (val instanceof Date) return val;
      if (typeof val === "string" && val.trim()) {
        const date = new Date(val);
        return isNaN(date.getTime()) ? null : date;
      }
      return null;
    }),
  endDate: z
    .union([z.date(), z.string()])
    .optional()
    .nullable()
    .transform((val) => {
      if (!val) return null;
      if (val instanceof Date) return val;
      if (typeof val === "string" && val.trim()) {
        const date = new Date(val);
        return isNaN(date.getTime()) ? null : date;
      }
      return null;
    }),
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
  timezone: z
    .string()
    .max(50)
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),

  // Request Information
  requestMethod: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (!val) return null;
      const normalized = val.trim().toLowerCase();
      // Check for exact enum match
      if (REQUEST_METHOD_VALUES.includes(val.toUpperCase() as any)) {
        return val.toUpperCase() as RequestMethod;
      }
      // Check for label match
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

export type ImportTemplateRow = z.infer<typeof importTemplateRowSchema>;

/**
 * Schema for bulk import input
 */
export const bulkImportSchema = z.object({
  templates: z.array(
    z.object({
      name: z.string().min(1).max(200),
      description: z.string().max(500).optional().nullable(),
      title: z.string().max(200).optional().nullable(),
      eventDescription: z.string().max(5000).optional().nullable(),
      requirements: z.string().max(500).optional().nullable(),
      privateComments: z.string().max(5000).optional().nullable(),
      clientId: z.string().uuid().optional().nullable(),
      venueName: z.string().max(200).optional().nullable(),
      address: z.string().max(300).optional().nullable(),
      city: z.string().max(100).optional().nullable(),
      state: z.string().max(50).optional().nullable(),
      zipCode: z.string().max(20).optional().nullable(),
      latitude: z.number().min(-90).max(90).optional().nullable(),
      longitude: z.number().min(-180).max(180).optional().nullable(),
      startDate: z.date().optional().nullable(),
      endDate: z.date().optional().nullable(),
      startTime: z.string().optional().nullable(),
      endTime: z.string().optional().nullable(),
      timezone: z.string().max(50).optional().nullable(),
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

export type BulkImportInput = z.infer<typeof bulkImportSchema>;
