import { z } from "zod";

export const EventUpdateRequestSchema = {
  submit: z.object({
    eventId: z.string().uuid(),
    note: z.string().min(10, "Please provide at least 10 characters describing the change.").max(2000),
  }),

  getMyUpdateRequests: z.object({
    page: z.number().int().min(1).default(1).optional(),
    limit: z.number().int().min(1).max(100).default(20).optional(),
  }),

  query: z.object({
    page: z.number().int().min(1).default(1).optional(),
    limit: z.number().int().min(1).max(100).default(20).optional(),
    status: z.enum(["PENDING", "REVIEWED", "DISMISSED", "ALL"]).default("ALL").optional(),
    search: z.string().optional(),
  }),

  markReviewed: z.object({
    id: z.string().uuid(),
    adminNote: z.string().max(2000).optional(),
  }),

  dismiss: z.object({
    id: z.string().uuid(),
  }),
};

export type EventUpdateRequestSubmitInput = z.infer<typeof EventUpdateRequestSchema.submit>;
export type EventUpdateRequestQueryInput = z.infer<typeof EventUpdateRequestSchema.query>;
export type EventUpdateRequestMarkReviewedInput = z.infer<typeof EventUpdateRequestSchema.markReviewed>;
export type EventUpdateRequestDismissInput = z.infer<typeof EventUpdateRequestSchema.dismiss>;
