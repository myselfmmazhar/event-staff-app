import { z } from "zod";
import {
    AccountStatus,
    StaffType,
    RateType,
    SkillLevel,
    StaffRating,
} from "@prisma/client";
import { emailValidation, phoneValidation } from "@/lib/utils/validation";
import { FieldErrors } from "@/lib/utils/error-messages";

/**
 * Reusable field schemas to eliminate duplication
 */
const baseFields = {
    // Account Details
    accountStatus: z.nativeEnum(AccountStatus).default(AccountStatus.PENDING),
    staffType: z.nativeEnum(StaffType).default(StaffType.EMPLOYEE),

    // Staff Information
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
    phone: z
        .string()
        .min(1, "Phone number is required")
        .refine(
            (phone) => phoneValidation.isValid(phone),
            { message: FieldErrors.phone.invalid }
        )
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
    dateOfBirth: z
        .date()
        .refine(
            (date) => {
                const eighteenYearsAgo = new Date();
                eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
                return date <= eighteenYearsAgo;
            },
            { message: "Must be at least 18 years old" }
        ),

    // Rate Information (single rateType for both)
    payRate: z
        .number()
        .min(0, "Pay rate must be positive")
        .max(999999.99, "Pay rate is too high"),
    billRate: z
        .number()
        .min(0, "Bill rate must be positive")
        .max(999999.99, "Bill rate is too high"),
    rateType: z.nativeEnum(RateType).default(RateType.HOURLY),

    // Skill Level
    skillLevel: z.nativeEnum(SkillLevel).default(SkillLevel.BEGINNER),

    // Address Information
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

    // Custom Admin Fields
    experience: z
        .string()
        .max(5000, "Experience must be 5000 characters or less")
        .transform((val) => val?.trim())
        .optional(),
    staffRating: z.nativeEnum(StaffRating).default(StaffRating.NA),
    internalNotes: z
        .string()
        .max(5000, "Internal notes must be 5000 characters or less")
        .transform((val) => val?.trim())
        .optional(),

    // Contractor ID (nullable for employees who may not belong to a contractor)
    contractorId: z.string().uuid("Invalid contractor ID").optional().nullable(),

    // Position and Work Type IDs (multi-select)
    positionIds: z
        .array(z.string().uuid("Invalid position ID"))
        .min(1, "At least one position must be selected")
        .default([]),
    workTypeIds: z
        .array(z.string().uuid("Invalid work type ID"))
        .min(1, "At least one work type must be selected")
        .default([]),
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
 * Staff Zod Schemas for validation
 */
export class StaffSchema {
    /**
     * Create Staff Schema
     * Note: staffId is auto-generated on backend, not required from client
     */
    static create = z.object(baseFields);

    /**
     * Update Staff Schema (all fields optional except ID)
     */
    static update = z.object({
        id: z.string().uuid("Invalid staff ID"),
        ...optionalFields,
    });

    /**
     * Query Staff Schema (for pagination, search, filters)
     */
    static query = z.object({
        page: z.number().int().min(1).default(1).optional(),
        limit: z.number().int().min(1).max(100).default(10).optional(),
        search: z.string().optional(),
        sortBy: z
            .enum([
                "createdAt",
                "updatedAt",
                "staffId",
                "firstName",
                "lastName",
                "email",
                "accountStatus",
                "staffType",
                "skillLevel",
            ])
            .default("createdAt")
            .optional(),
        sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
        accountStatus: z.nativeEnum(AccountStatus).optional(),
        staffType: z.nativeEnum(StaffType).optional(),
        skillLevel: z.nativeEnum(SkillLevel).optional(),
        contractorId: z.string().uuid("Invalid contractor ID").optional(),
        positionId: z.string().uuid("Invalid position ID").optional(),
        workTypeId: z.string().uuid("Invalid work type ID").optional(),
        createdFrom: z.coerce.date().optional(),
        createdTo: z.coerce.date().optional(),
    });

    /**
     * Staff ID Schema (for get, delete by UUID)
     */
    static id = z.object({
        id: z.string().uuid("Invalid staff ID"),
    });

    /**
     * Bulk Disable Staff Schema
     */
    static bulkDisable = z.object({
        staffIds: z
            .array(z.string().uuid("Invalid staff ID"))
            .min(1, "At least one staff member must be selected"),
    });
}

/**
 * TypeScript types inferred from Zod schemas
 */
export type CreateStaffInput = z.infer<typeof StaffSchema.create>;
export type UpdateStaffInput = z.infer<typeof StaffSchema.update>;
export type QueryStaffInput = z.infer<typeof StaffSchema.query>;
export type StaffIdInput = z.infer<typeof StaffSchema.id>;
export type BulkDisableStaffInput = z.infer<typeof StaffSchema.bulkDisable>;
