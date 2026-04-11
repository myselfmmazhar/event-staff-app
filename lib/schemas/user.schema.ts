import { z } from "zod";
import { UserRole } from "@prisma/client";
import { emailValidation, phoneValidation, passwordValidation } from "@/lib/utils/validation";
import { FieldErrors } from "@/lib/utils/error-messages";

/**
 * User Zod Schemas for validation
 */
export class UserSchema {
  /**
   * Invite User Schema (invitation-based registration)
   * User will set their own password after accepting invitation
   */
  static invite = z.object({
    email: z
      .string()
      .min(1, FieldErrors.email.required)
      .email({ message: FieldErrors.email.invalid })
      .transform((val) => val.trim().toLowerCase())
      .refine(
        (email) => emailValidation.hasValidDomain(email),
        { message: FieldErrors.email.disposable }
      ),
    firstName: z
      .string()
      .min(1, FieldErrors.firstName.required)
      .max(50, FieldErrors.firstName.maxLength)
      .transform((val) => val.trim()),
    lastName: z
      .string()
      .min(1, FieldErrors.lastName.required)
      .max(50, FieldErrors.lastName.maxLength)
      .transform((val) => val.trim()),
    role: z.nativeEnum(UserRole),
    phone: z
      .string()
      .optional()
      .transform((val) => val?.trim())
      .refine(
        (phone) => !phone || phoneValidation.isValid(phone),
        { message: FieldErrors.phone.invalid }
      ),
  });

  /**
   * Accept User Invitation Schema
   * User sets their password to complete registration
   */
  static acceptInvitation = z.object({
    token: z.string().min(1, "Invitation token is required"),
    password: z
      .string()
      .min(8, FieldErrors.password.minLength)
      .max(128, FieldErrors.password.maxLength)
      .refine(
        (pwd) => passwordValidation.hasUpperCase(pwd),
        { message: FieldErrors.password.uppercase }
      )
      .refine(
        (pwd) => passwordValidation.hasLowerCase(pwd),
        { message: FieldErrors.password.lowercase }
      )
      .refine(
        (pwd) => passwordValidation.hasNumber(pwd),
        { message: FieldErrors.password.number }
      )
      .refine(
        (pwd) => passwordValidation.hasSpecialChar(pwd),
        { message: FieldErrors.password.special }
      ),
  });

  /**
   * Create User Schema (legacy - for direct user creation with password)
   * @deprecated Use invite schema for new users
   */
  static create = z.object({
    email: z
      .string()
      .min(1, FieldErrors.email.required)
      .email({ message: FieldErrors.email.invalid })
      .transform((val) => val.trim().toLowerCase())
      .refine(
        (email) => emailValidation.hasValidDomain(email),
        { message: FieldErrors.email.disposable }
      ),
    password: z
      .string()
      .min(8, FieldErrors.password.minLength)
      .max(128, FieldErrors.password.maxLength)
      .refine(
        (pwd) => passwordValidation.hasUpperCase(pwd),
        { message: FieldErrors.password.uppercase }
      )
      .refine(
        (pwd) => passwordValidation.hasLowerCase(pwd),
        { message: FieldErrors.password.lowercase }
      )
      .refine(
        (pwd) => passwordValidation.hasNumber(pwd),
        { message: FieldErrors.password.number }
      )
      .refine(
        (pwd) => passwordValidation.hasSpecialChar(pwd),
        { message: FieldErrors.password.special }
      ),
    firstName: z
      .string()
      .min(1, FieldErrors.firstName.required)
      .max(50, FieldErrors.firstName.maxLength)
      .transform((val) => val.trim()),
    lastName: z
      .string()
      .min(1, FieldErrors.lastName.required)
      .max(50, FieldErrors.lastName.maxLength)
      .transform((val) => val.trim()),
    role: z.nativeEnum(UserRole),
    phone: z
      .string()
      .optional()
      .transform((val) => val?.trim())
      .refine(
        (phone) => !phone || phoneValidation.isValid(phone),
        { message: FieldErrors.phone.invalid }
      ),
  });

  /**
   * Update User Schema (all fields optional except ID)
   */
  static update = z.object({
    id: z.string().min(1, "Invalid user ID"),
    email: z
      .string()
      .email({ message: FieldErrors.email.invalid })
      .transform((val) => val.trim().toLowerCase())
      .refine(
        (email) => emailValidation.hasValidDomain(email),
        { message: FieldErrors.email.disposable }
      )
      .optional(),
    password: z
      .string()
      .min(8, FieldErrors.password.minLength)
      .max(128, FieldErrors.password.maxLength)
      .refine(
        (pwd) => passwordValidation.hasUpperCase(pwd),
        { message: FieldErrors.password.uppercase }
      )
      .refine(
        (pwd) => passwordValidation.hasLowerCase(pwd),
        { message: FieldErrors.password.lowercase }
      )
      .refine(
        (pwd) => passwordValidation.hasNumber(pwd),
        { message: FieldErrors.password.number }
      )
      .refine(
        (pwd) => passwordValidation.hasSpecialChar(pwd),
        { message: FieldErrors.password.special }
      )
      .optional(),
    firstName: z
      .string()
      .min(1, FieldErrors.firstName.required)
      .max(50, FieldErrors.firstName.maxLength)
      .transform((val) => val.trim())
      .optional(),
    lastName: z
      .string()
      .min(1, FieldErrors.lastName.required)
      .max(50, FieldErrors.lastName.maxLength)
      .transform((val) => val.trim())
      .optional(),
    role: z
      .nativeEnum(UserRole)
      .optional(),
    phone: z
      .string()
      .transform((val) => val?.trim())
      .refine(
        (phone) => !phone || phoneValidation.isValid(phone),
        { message: FieldErrors.phone.invalid }
      )
      .optional(),
    profilePhoto: z
      .string()
      .nullable()
      .optional(),
  });

  /**
   * Resend User Invitation Schema
   */
  static resendInvitation = z.object({
    id: z.string().min(1, "Invalid user ID"),
  });

  /**
   * Query Users Schema (for pagination, search, filters)
   */
  static query = z.object({
    page: z.number().int().min(1).default(1).optional(),
    limit: z.number().int().min(1).max(100).default(10).optional(),
    search: z.string().optional(),
    sortBy: z
      .enum(["createdAt", "updatedAt", "firstName", "lastName", "email", "role"])
      .default("createdAt")
      .optional(),
    sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
    role: z
      .union([z.nativeEnum(UserRole), z.array(z.nativeEnum(UserRole)).min(1)])
      .optional(),
    isActive: z.boolean().optional(),
    emailVerified: z.boolean().optional(),
    hasPhone: z.boolean().optional(),
    createdFrom: z.string().optional(),
    createdTo: z.string().optional(),
  });

  /**
   * User ID Schema (for get, delete, activate, deactivate)
   */
  static id = z.object({
    id: z.string().min(1, "Invalid user ID"),
  });

  /**
   * Bulk Delete Schema
   */
  static deleteMany = z.object({
    ids: z.array(z.string().min(1, "Invalid user ID")).min(1, "At least one user ID is required"),
  });
}

/**
 * TypeScript types inferred from Zod schemas
 */
export type InviteUserInput = z.infer<typeof UserSchema.invite>;
export type AcceptUserInvitationInput = z.infer<typeof UserSchema.acceptInvitation>;
export type CreateUserInput = z.infer<typeof UserSchema.create>;
export type UpdateUserInput = z.infer<typeof UserSchema.update>;
export type QueryUsersInput = z.infer<typeof UserSchema.query>;
export type UserIdInput = z.infer<typeof UserSchema.id>;
export type ResendUserInvitationInput = z.infer<typeof UserSchema.resendInvitation>;
export type DeleteManyUsersInput = z.infer<typeof UserSchema.deleteMany>;
