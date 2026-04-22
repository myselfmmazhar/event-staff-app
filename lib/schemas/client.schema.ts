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
    .max(200, "Business name must be 200 characters or less")
    .transform((val) => val.trim())
    .optional(),
  firstName: z
    .string()
    .max(50, "First name must be 50 characters or less")
    .transform((val) => val.trim())
    .optional(),
  lastName: z
    .string()
    .max(50, "Last name must be 50 characters or less")
    .transform((val) => val.trim())
    .optional(),
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
    .refine(
      (phone) => !phone || phoneValidation.isValid(phone),
      { message: FieldErrors.phone.invalid }
    )
    .transform((val) => val?.trim())
    .optional(),
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
  requirements: z
    .string()
    .max(200, "Requirements must be 200 characters or less")
    .transform((val) => val?.trim())
    .optional(),

  // Business Address (optional)
  businessAddress: z
    .string()
    .max(300, "Business address must be 300 characters or less")
    .transform((val) => val?.trim())
    .optional(),
  businessAddressLine2: z
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

  // CC Email
  ccEmail: z
    .string()
    .email({ message: FieldErrors.email.invalid })
    .transform((val) => val?.trim().toLowerCase())
    .optional()
    .or(z.literal("")),

  // Billing Contact
  billingFirstName: z
    .string()
    .max(50, "Billing first name must be 50 characters or less")
    .transform((val) => val?.trim())
    .optional(),
  billingLastName: z
    .string()
    .max(50, "Billing last name must be 50 characters or less")
    .transform((val) => val?.trim())
    .optional(),
  billingEmail: z
    .string()
    .email({ message: FieldErrors.email.invalid })
    .transform((val) => val?.trim().toLowerCase())
    .optional()
    .or(z.literal("")),
  billingPhone: z
    .string()
    .refine(
      (phone) => !phone || phoneValidation.isValid(phone),
      { message: FieldErrors.phone.invalid }
    )
    .transform((val) => val?.trim())
    .optional(),
  sameAsContact: z.boolean().optional(),
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
  static create = z.object({
    ...baseFields,
    hasLoginAccess: z.boolean().optional().default(true),
  });

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

  /**
   * Accept Client Invitation Schema
   */
  static acceptInvitation = z.object({
    token: z.string().min(1, "Token is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/,
        "Password must include uppercase, lowercase, number, and special character"
      ),
  });

  /**
   * Resend Client Invitation Schema
   */
  static resendInvitation = z.object({
    id: z.string().uuid("Invalid client ID"),
  });

  /**
   * Get Invitation Info Schema (by token)
   */
  static getInvitationInfo = z.object({
    token: z.string().min(1, "Token is required"),
  });

  /**
   * Bulk Delete Schema
   */
  static deleteMany = z.object({
    ids: z.array(z.string().uuid("Invalid client ID")).min(1, "At least one client ID is required"),
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
export type AcceptClientInvitationInput = z.infer<typeof ClientSchema.acceptInvitation>;
export type ResendClientInvitationInput = z.infer<typeof ClientSchema.resendInvitation>;
export type GetClientInvitationInfoInput = z.infer<typeof ClientSchema.getInvitationInfo>;
export type DeleteManyClientsInput = z.infer<typeof ClientSchema.deleteMany>;

