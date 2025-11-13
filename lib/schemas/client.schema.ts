import { z } from "zod";
import { emailValidation, phoneValidation } from "@/lib/utils/validation";
import { FieldErrors } from "@/lib/utils/error-messages";

/**
 * Client ID format validation (CLT-YYYY-NNN)
 */
const clientIdRegex = /^CLT-\d{4}-\d{3}$/;

/**
 * Reusable field schemas to eliminate duplication
 */
const baseFields = {
  businessName: z
    .string()
    .min(1, "Business name is required")
    .max(200, "Business name must be 200 characters or less")
    .transform((val) => val.trim()),
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name must be 50 characters or less")
    .transform((val) => val.trim()),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name must be 50 characters or less")
    .transform((val) => val.trim()),
  email: z
    .string()
    .min(1, "Email is required")
    .email({ message: FieldErrors.email.invalid })
    .transform((val) => val.trim().toLowerCase())
    .refine(
      (email) => emailValidation.hasValidDomain(email),
      { message: FieldErrors.email.disposable }
    ),
  cellPhone: z
    .string()
    .min(1, "Cell phone is required")
    .refine(
      (phone) => phoneValidation.isValid(phone),
      { message: FieldErrors.phone.invalid }
    )
    .transform((val) => val.trim()),
  businessPhone: z
    .string()
    .refine(
      (phone) => !phone || phoneValidation.isValid(phone),
      { message: FieldErrors.phone.invalid }
    )
    .transform((val) => val?.trim())
    .optional(),
  details: z
    .string()
    .max(5000, "Details must be 5000 characters or less")
    .transform((val) => val?.trim())
    .optional(),
  venueName: z
    .string()
    .max(200, "Venue name must be 200 characters or less")
    .transform((val) => val?.trim())
    .optional(),
  room: z
    .string()
    .max(100, "Room must be 100 characters or less")
    .transform((val) => val?.trim())
    .optional(),
  streetAddress: z
    .string()
    .min(1, "Street address is required")
    .max(300, "Street address must be 300 characters or less")
    .transform((val) => val.trim()),
  aptSuiteUnit: z
    .string()
    .max(50, "Apt/Suite/Unit must be 50 characters or less")
    .transform((val) => val?.trim())
    .optional(),
  city: z
    .string()
    .min(1, "City is required")
    .max(100, "City must be 100 characters or less")
    .transform((val) => val.trim()),
  country: z
    .string()
    .min(1, "Country is required")
    .max(100, "Country must be 100 characters or less")
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
};

/**
 * Helper to convert required fields to optional
 */
const optionalFields = Object.entries(baseFields).reduce(
  (acc, [key, schema]) => {
    acc[key] = schema.optional();
    return acc;
  },
  {} as Record<string, z.ZodType>
);

/**
 * Client Zod Schemas for validation
 */
export class ClientSchema {
  /**
   * Create Client Schema
   * Note: clientId is auto-generated on backend, not required from client
   */
  static create = z.object(baseFields);

  /**
   * Update Client Schema (all fields optional except ID)
   */
  static update = z.object({
    id: z.string().uuid("Invalid client ID"),
    ...optionalFields,
    hasLoginAccess: z.boolean().optional(),
  });

  /**
   * Query Clients Schema (for pagination, search, filters)
   */
  static query = z.object({
    page: z.number().int().min(1).default(1).optional(),
    limit: z.number().int().min(1).max(100).default(10).optional(),
    search: z.string().optional(),
    sortBy: z
      .enum([
        "createdAt",
        "updatedAt",
        "businessName",
        "clientId",
        "firstName",
        "lastName",
        "email",
        "city",
      ])
      .default("createdAt")
      .optional(),
    sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
    hasLoginAccess: z.boolean().optional(),
    createdFrom: z.coerce.date().optional(),
    createdTo: z.coerce.date().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    state: z.string().optional(),
  });

  /**
   * Client ID Schema (for get, delete by UUID)
   */
  static id = z.object({
    id: z.string().uuid("Invalid client ID"),
  });

  /**
   * Grant Login Access Schema
   */
  static grantLoginAccess = z.object({
    id: z.string().uuid("Invalid client ID"),
    hasLoginAccess: z.boolean(),
  });

  /**
   * Client ID Format Schema (for validation of generated clientId)
   */
  static clientId = z.object({
    clientId: z
      .string()
      .regex(clientIdRegex, "Client ID must be in format CLT-YYYY-NNN"),
  });
}

/**
 * TypeScript types inferred from Zod schemas
 */
export type CreateClientInput = z.infer<typeof ClientSchema.create>;
export type UpdateClientInput = z.infer<typeof ClientSchema.update>;
export type QueryClientsInput = z.infer<typeof ClientSchema.query>;
export type ClientIdInput = z.infer<typeof ClientSchema.id>;
export type GrantLoginAccessInput = z.infer<typeof ClientSchema.grantLoginAccess>;
export type ClientIdFormatInput = z.infer<typeof ClientSchema.clientId>;
