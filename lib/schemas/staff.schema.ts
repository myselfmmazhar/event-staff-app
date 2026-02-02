import { z } from "zod";
import {
    AccountStatus,
    StaffType,
    SkillLevel,
    StaffRating,
    AvailabilityStatus,
} from "@prisma/client";
import { emailValidation, phoneValidation, passwordValidation } from "@/lib/utils/validation";
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
        .refine(
            (phone) => !phone || phoneValidation.isValid(phone),
            { message: FieldErrors.phone.invalid }
        )
        .transform((val) => val?.trim())
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
    dateOfBirth: z
        .date()
        .refine(
            (date) => {
                if (!date) return true; // Allow null/undefined
                const eighteenYearsAgo = new Date();
                eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
                return date <= eighteenYearsAgo;
            },
            { message: "Must be at least 18 years old" }
        )
        .optional()
        .nullable(), // DB allows null

    // Skill Level (displayed as "Experience" in UI)
    skillLevel: z.nativeEnum(SkillLevel).default(SkillLevel.BEGINNER),

    // Availability Status (staff self-service)
    availabilityStatus: z.nativeEnum(AvailabilityStatus).default(AvailabilityStatus.OPEN_TO_OFFERS),
    timeOffStart: z.date().optional().nullable(),
    timeOffEnd: z.date().optional().nullable(),

    // Address Information (optional - staff provides during invitation acceptance)
    streetAddress: z
        .string()
        .max(300, "Street address must be 300 characters or less")
        .transform((val) => val?.trim())
        .optional(),
    aptSuiteUnit: z
        .string()
        .max(50, "Apt/Suite/Unit must be 50 characters or less")
        .transform((val) => val?.trim())
        .optional(),
    city: z
        .string()
        .max(100, "City must be 100 characters or less")
        .transform((val) => val?.trim())
        .optional(),
    country: z
        .string()
        .max(100, "Country must be 100 characters or less")
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

    // Service IDs (multi-select)
    serviceIds: z
        .array(z.string().uuid("Invalid service ID"))
        .min(1, "At least one service must be selected")
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
                "availabilityStatus",
            ])
            .default("createdAt")
            .optional(),
        sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
        // Multi-select filters (arrays)
        accountStatuses: z.array(z.nativeEnum(AccountStatus)).optional(),
        staffTypes: z.array(z.nativeEnum(StaffType)).optional(),
        skillLevels: z.array(z.nativeEnum(SkillLevel)).optional(),
        availabilityStatus: z.nativeEnum(AvailabilityStatus).optional(),
        contractorId: z.string().uuid("Invalid contractor ID").optional(),
        serviceId: z.string().uuid("Invalid service ID").optional(),
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

    /**
     * Bulk Delete Staff Schema
     */
    static bulkDelete = z.object({
        staffIds: z
            .array(z.string().uuid("Invalid staff ID"))
            .min(1, "At least one staff member must be selected"),
    });

    /**
     * Invite Staff Schema (minimal data for invitation)
     * Staff will complete their profile after accepting invitation
     */
    static invite = z.object({
        email: z
            .string()
            .min(1, "Email is required")
            .email({ message: FieldErrors.email.invalid })
            .transform((val) => val.trim().toLowerCase())
            .refine(
                (email) => emailValidation.hasValidDomain(email),
                { message: FieldErrors.email.disposable }
            ),
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
        staffType: z.nativeEnum(StaffType).default(StaffType.EMPLOYEE),
        serviceIds: z
            .array(z.string().uuid("Invalid service ID"))
            .min(1, "At least one service must be selected"),
    });

    /**
     * Accept Staff Invitation Schema
     * Staff completes their profile and creates password
     */
    static acceptInvitation = z.object({
        token: z.string().min(1, "Invitation token is required"),
        password: z
            .string()
            .min(8, FieldErrors.password.minLength)
            .max(128, FieldErrors.password.maxLength)
            .refine(
                (password) => passwordValidation.meetsComplexityRequirements(password),
                { message: FieldErrors.password.complexity }
            ),
        phone: z
            .string()
            .min(1, "Phone number is required")
            .refine(
                (phone) => phoneValidation.isValid(phone),
                { message: FieldErrors.phone.invalid }
            )
            .transform((val) => val.trim()),
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
        country: z
            .string()
            .min(1, "Country is required")
            .max(100, "Country must be 100 characters or less")
            .transform((val) => val.trim()),
    });

    /**
     * Staff Self-Update Schema
     * Fields staff can update about themselves
     */
    static selfUpdate = z.object({
        // Personal Information (editable by staff)
        firstName: z
            .string()
            .min(1, "First name is required")
            .max(50, "First name must be 50 characters or less")
            .transform((val) => val.trim())
            .optional(),
        lastName: z
            .string()
            .min(1, "Last name is required")
            .max(50, "Last name must be 50 characters or less")
            .transform((val) => val.trim())
            .optional(),
        phone: z
            .string()
            .refine(
                (phone) => !phone || phoneValidation.isValid(phone),
                { message: FieldErrors.phone.invalid }
            )
            .transform((val) => val?.trim())
            .optional(),
        dateOfBirth: z
            .date()
            .refine(
                (date) => {
                    if (!date) return true;
                    const eighteenYearsAgo = new Date();
                    eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
                    return date <= eighteenYearsAgo;
                },
                { message: "Must be at least 18 years old" }
            )
            .optional()
            .nullable(),
        // Address Information
        streetAddress: z
            .string()
            .max(300, "Street address must be 300 characters or less")
            .transform((val) => val?.trim())
            .optional(),
        aptSuiteUnit: z
            .string()
            .max(50, "Apt/Suite/Unit must be 50 characters or less")
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
        country: z
            .string()
            .max(100, "Country must be 100 characters or less")
            .transform((val) => val?.trim())
            .optional(),
        // Availability
        availabilityStatus: z.nativeEnum(AvailabilityStatus).optional(),
        timeOffStart: z.date().optional().nullable(),
        timeOffEnd: z.date().optional().nullable(),
    });

    /**
     * Staff Deactivate Self Schema
     */
    static deactivateSelf = z.object({
        reason: z
            .string()
            .max(500, "Reason must be 500 characters or less")
            .transform((val) => val?.trim())
            .optional(),
    });

    /**
     * Resend Invitation Schema
     */
    static resendInvitation = z.object({
        id: z.string().uuid("Invalid staff ID"),
    });

    /**
     * Grant Login Access Schema
     */
    static grantLoginAccess = z.object({
        id: z.string().uuid("Invalid staff ID"),
    });

    /**
     * Bulk Update Staff Schema
     * Each field has an enabled flag - only enabled fields get updated
     * Fields: Account Status, Talent Type, Experience, Availability Status, Rating
     */
    static bulkUpdate = z.object({
        staffIds: z
            .array(z.string().uuid("Invalid staff ID"))
            .min(1, "At least one staff member must be selected"),
        accountStatus: z
            .object({
                enabled: z.boolean(),
                value: z.nativeEnum(AccountStatus).optional(),
            })
            .optional(),
        staffType: z
            .object({
                enabled: z.boolean(),
                value: z.nativeEnum(StaffType).optional(),
            })
            .optional(),
        skillLevel: z
            .object({
                enabled: z.boolean(),
                value: z.nativeEnum(SkillLevel).optional(),
            })
            .optional(),
        availabilityStatus: z
            .object({
                enabled: z.boolean(),
                value: z.nativeEnum(AvailabilityStatus).optional(),
            })
            .optional(),
        staffRating: z
            .object({
                enabled: z.boolean(),
                value: z.nativeEnum(StaffRating).optional(),
            })
            .optional(),
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
export type BulkDeleteStaffInput = z.infer<typeof StaffSchema.bulkDelete>;
export type InviteStaffInput = z.infer<typeof StaffSchema.invite>;
export type AcceptStaffInvitationInput = z.infer<typeof StaffSchema.acceptInvitation>;
export type StaffSelfUpdateInput = z.infer<typeof StaffSchema.selfUpdate>;
export type StaffDeactivateSelfInput = z.infer<typeof StaffSchema.deactivateSelf>;
export type ResendStaffInvitationInput = z.infer<typeof StaffSchema.resendInvitation>;
export type GrantStaffLoginAccessInput = z.infer<typeof StaffSchema.grantLoginAccess>;
export type BulkUpdateStaffInput = z.infer<typeof StaffSchema.bulkUpdate>;
