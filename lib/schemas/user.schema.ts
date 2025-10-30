import { z } from "zod";
import { UserRole } from "@prisma/client";
import { emailValidation, phoneValidation, passwordValidation } from "@/lib/utils/validation";
import { FieldErrors } from "@/lib/utils/error-messages";

/**
 * User Zod Schemas for validation
 */
export class UserSchema {
  /**
   * Create User Schema
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
    address: z
      .string()
      .optional()
      .transform((val) => val?.trim()),
    emergencyContact: z
      .string()
      .optional()
      .transform((val) => val?.trim()),
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
    address: z
      .string()
      .transform((val) => val?.trim())
      .optional(),
    emergencyContact: z
      .string()
      .transform((val) => val?.trim())
      .optional(),
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
    role: z.nativeEnum(UserRole).optional(),
    isActive: z.boolean().optional(),
  });

  /**
   * User ID Schema (for get, delete, activate, deactivate)
   */
  static id = z.object({
    id: z.string().min(1, "Invalid user ID"),
  });
}

/**
 * TypeScript types inferred from Zod schemas
 */
export type CreateUserInput = z.infer<typeof UserSchema.create>;
export type UpdateUserInput = z.infer<typeof UserSchema.update>;
export type QueryUsersInput = z.infer<typeof UserSchema.query>;
export type UserIdInput = z.infer<typeof UserSchema.id>;
