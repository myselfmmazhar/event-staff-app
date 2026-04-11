import { z } from "zod";

/**
 * Client Location Zod Schemas for validation
 */
export class ClientLocationSchema {
  /**
   * Create Client Location Schema
   */
  static create = z.object({
    clientId: z.string().uuid("Invalid client ID"),
    venueName: z
      .string()
      .min(1, "Venue name is required")
      .max(200, "Venue name must be 200 characters or less")
      .transform((val) => val.trim()),
    meetingPoint: z
      .string()
      .max(300, "Meeting point must be 300 characters or less")
      .transform((val) => val?.trim())
      .optional(),
    venueAddress: z
      .string()
      .min(1, "Venue address is required")
      .max(300, "Venue address must be 300 characters or less")
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
  });

  /**
   * Update Client Location Schema (all fields optional except ID)
   */
  static update = z.object({
    id: z.string().uuid("Invalid location ID"),
    venueName: z
      .string()
      .min(1, "Venue name is required")
      .max(200, "Venue name must be 200 characters or less")
      .transform((val) => val.trim())
      .optional(),
    meetingPoint: z
      .string()
      .max(300, "Meeting point must be 300 characters or less")
      .transform((val) => val?.trim())
      .optional(),
    venueAddress: z
      .string()
      .min(1, "Venue address is required")
      .max(300, "Venue address must be 300 characters or less")
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
  });

  /**
   * Get Locations by Client ID Schema
   */
  static byClient = z.object({
    clientId: z.string().uuid("Invalid client ID"),
  });

  /**
   * Location ID Schema (for get, delete)
   */
  static id = z.object({
    id: z.string().uuid("Invalid location ID"),
  });
}

/**
 * TypeScript types inferred from Zod schemas
 */
export type CreateClientLocationInput = z.infer<typeof ClientLocationSchema.create>;
export type UpdateClientLocationInput = z.infer<typeof ClientLocationSchema.update>;
export type ClientLocationByClientInput = z.infer<typeof ClientLocationSchema.byClient>;
export type ClientLocationIdInput = z.infer<typeof ClientLocationSchema.id>;
