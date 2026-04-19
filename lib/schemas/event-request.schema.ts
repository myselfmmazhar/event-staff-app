import { z } from "zod";
import { EventRequestStatus, RequestMethod } from "@prisma/client";

const dateTransform = (val: string | null | undefined) => {
  if (!val) return null;
  const date = new Date(val);
  return isNaN(date.getTime()) ? null : date;
};

const dateEndAfterStart = {
  check: (data: { startDate: Date | null; endDate: Date | null }) => {
    if (data.startDate && data.endDate) return data.endDate >= data.startDate;
    return true;
  },
  message: "End date must be after or equal to start date",
};

const fileLinkSchema = z.object({
  name: z.string().min(1, "File name is required"),
  link: z.string().url("Invalid URL"),
});

const eventDocumentSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  type: z.string().optional(),
  size: z.number().optional(),
});

const customFieldSchema = z.object({
  label: z.string().min(1, "Label is required").max(100),
  value: z.string().max(1000),
});

const sharedFields = {
  title: z
    .string()
    .min(1, "Event title is required")
    .max(200, "Title must be 200 characters or less"),
  description: z
    .string()
    .max(2000, "Description must be 2000 characters or less")
    .optional()
    .nullable(),
  requirements: z
    .string()
    .max(2000, "Requirements must be 2000 characters or less")
    .optional()
    .nullable(),
  // Venue
  venueName: z
    .string()
    .min(1, "Location name is required")
    .max(200, "Venue name must be 200 characters or less"),
  address: z
    .string()
    .min(1, "Address is required")
    .max(300, "Address must be 300 characters or less"),
  city: z
    .string()
    .min(1, "City is required")
    .max(100, "City must be 100 characters or less"),
  state: z
    .string()
    .min(1, "State is required")
    .max(50, "State must be 50 characters or less"),
  zipCode: z
    .string()
    .min(1, "ZIP code is required")
    .max(20, "Zip code must be 20 characters or less"),
  addressLine2: z.string().max(200).optional().nullable(),
  meetingPoint: z.string().max(300).optional().nullable(),
  onsitePocName: z.string().max(200).optional().nullable(),
  onsitePocPhone: z.string().max(50).optional().nullable(),
  onsitePocEmail: z
    .string()
    .email("Invalid email")
    .max(255)
    .optional()
    .nullable()
    .or(z.literal("")),
  // Date & Time
  startDate: z.string().optional().nullable().transform(dateTransform),
  startTime: z.string().max(5, "Invalid time format").optional().nullable(),
  endDate: z.string().optional().nullable().transform(dateTransform),
  endTime: z.string().max(5, "Invalid time format").optional().nullable(),
  timezone: z
    .string()
    .min(1, "Timezone is required")
    .max(50, "Timezone must be 50 characters or less"),
  // Instructions
  preEventInstructions: z.string().max(10000).optional().nullable(),
  requestMethod: z.nativeEnum(RequestMethod).optional().nullable(),
  poNumber: z.string().max(100).optional().nullable(),
  requestorName: z.string().max(200).optional().nullable(),
  requestorPhone: z.string().max(50).optional().nullable(),
  requestorEmail: z
    .string()
    .email("Invalid email")
    .max(255)
    .optional()
    .nullable()
    .or(z.literal("")),
  // Documents & custom data
  fileLinks: z.array(fileLinkSchema).optional().nullable(),
  eventDocuments: z.array(eventDocumentSchema).optional().nullable(),
  customFields: z.array(customFieldSchema).optional().nullable(),
  estimate: z.boolean().optional().nullable(),
};

/**
 * Event Request Validation Schemas
 */
export class EventRequestSchema {
  static create = z
    .object(sharedFields)
    .refine((data) => dateEndAfterStart.check(data as any), {
      message: dateEndAfterStart.message,
      path: ["endDate"],
    });

  static update = z
    .object({ id: z.string().uuid("Invalid request ID"), ...sharedFields })
    .refine((data) => dateEndAfterStart.check(data as any), {
      message: dateEndAfterStart.message,
      path: ["endDate"],
    });

  static query = z.object({
    page: z.number().int().min(1).default(1).optional(),
    limit: z.number().int().min(1).max(100).default(10).optional(),
    search: z.string().optional(),
    status: z.nativeEnum(EventRequestStatus).optional(),
    clientId: z.string().uuid().optional(),
    sortBy: z
      .enum(["createdAt", "requestedAt", "title", "status"])
      .default("createdAt")
      .optional(),
    sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
  });

  static approve = z.object({
    id: z.string().uuid("Invalid request ID"),
    notes: z
      .string()
      .max(1000, "Admin notes must be 1000 characters or less")
      .optional(),
  });

  static reject = z.object({
    id: z.string().uuid("Invalid request ID"),
    rejectionReason: z
      .string()
      .min(1, "Rejection reason is required")
      .max(500, "Rejection reason must be 500 characters or less"),
  });

  static getMyRequests = z.object({
    page: z.number().int().min(1).default(1).optional(),
    limit: z.number().int().min(1).max(100).default(10).optional(),
    status: z.nativeEnum(EventRequestStatus).optional(),
  });
}

// Type exports
export type EventRequestCreateInput = z.infer<typeof EventRequestSchema.create>;
export type EventRequestUpdateInput = z.infer<typeof EventRequestSchema.update>;
export type EventRequestQueryInput = z.infer<typeof EventRequestSchema.query>;
export type EventRequestApproveInput = z.infer<typeof EventRequestSchema.approve>;
export type EventRequestRejectInput = z.infer<typeof EventRequestSchema.reject>;
export type EventRequestGetMyRequestsInput = z.infer<
  typeof EventRequestSchema.getMyRequests
>;
