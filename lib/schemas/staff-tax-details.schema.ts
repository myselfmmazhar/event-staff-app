import { z } from "zod";
import { BusinessStructure } from "@prisma/client";

/**
 * StaffTaxDetails Zod Schemas for validation
 */
/**
 * Helper: transform empty/whitespace-only strings to null
 */
const emptyToNull = (val: string | undefined | null) => {
    if (val == null) return null;
    return val.trim() === '' ? null : val.trim();
};

/**
 * Helper: URL field that accepts empty strings (→ null), null, undefined, and valid URLs.
 * Accepts null/undefined at input stage and transforms empty strings to null.
 */
const optionalUrlField = (message = "Invalid URL format") =>
    z.union([z.string().url(message), z.literal(''), z.null(), z.undefined()])
        .transform((val) => (!val ? null : val === '' ? null : val))
        .optional()
        .nullable();

/**
 * Helper: string field that accepts data URIs, null, undefined, or any non-empty string (→ null if empty)
 * Used for signatureUrl which receives data:image/png;base64,... from the signature pad
 */
const optionalStringField = () =>
    z.union([z.string(), z.null(), z.undefined()])
        .transform((val) => {
            if (val == null) return null;
            return val.trim() === '' ? null : val.trim();
        })
        .optional()
        .nullable();

export class StaffTaxDetailsSchema {
    /**
     * Create/Update Tax Details Schema
     * All fields are optional except staffId
     */
    static upsert = z.object({
        staffId: z.string().uuid("Invalid staff ID"),

        // Tax collection preferences
        collectTaxDetails: z.boolean().default(false),
        trackFor1099: z.boolean().default(false),

        // Business info
        businessStructure: z.nativeEnum(BusinessStructure).default(BusinessStructure.INDIVIDUAL),
        businessName: z
            .string()
            .max(200, "Business name must be 200 characters or less")
            .transform(emptyToNull)
            .optional()
            .nullable(),

        // Tax identifiers (sensitive)
        ssn: z
            .string()
            .max(11, "SSN must be 11 characters or less") // Format: XXX-XX-XXXX
            .transform(emptyToNull)
            .optional()
            .nullable(),
        ein: z
            .string()
            .max(10, "EIN must be 10 characters or less") // Format: XX-XXXXXXX
            .transform(emptyToNull)
            .optional()
            .nullable(),

        // ID verification documents
        identificationFrontUrl: optionalUrlField(),
        identificationBackUrl: optionalUrlField(),

        // Electronic consent
        electronic1099Consent: z.boolean().default(false),
        // signatureUrl accepts data URIs (data:image/png;base64,...) from signature pad
        signatureUrl: optionalStringField(),
        consentDate: z.date().optional().nullable(),
    });

    /**
     * Get Tax Details by Staff ID
     */
    static getByStaffId = z.object({
        staffId: z.string().uuid("Invalid staff ID"),
    });

    /**
     * Delete Tax Details Schema
     */
    static delete = z.object({
        staffId: z.string().uuid("Invalid staff ID"),
    });

    /**
     * Staff self-service Tax Details update
     * Staff completing their tax information
     */
    static selfUpdate = z.object({
        // Tax collection preferences
        collectTaxDetails: z.boolean().optional(),
        trackFor1099: z.boolean().optional(),

        // Business info
        businessStructure: z.nativeEnum(BusinessStructure).optional(),
        businessName: z
            .string()
            .max(200, "Business name must be 200 characters or less")
            .transform(emptyToNull)
            .optional()
            .nullable(),

        // Tax identifiers (sensitive)
        ssn: z
            .string()
            .max(11, "SSN must be 11 characters or less")
            .transform(emptyToNull)
            .optional()
            .nullable(),
        ein: z
            .string()
            .max(10, "EIN must be 10 characters or less")
            .transform(emptyToNull)
            .optional()
            .nullable(),

        // ID verification documents
        identificationFrontUrl: optionalUrlField(),
        identificationBackUrl: optionalUrlField(),

        // Electronic consent
        electronic1099Consent: z.boolean().optional(),
        // signatureUrl accepts data URIs (data:image/png;base64,...) from signature pad
        signatureUrl: optionalStringField(),
        consentDate: z.date().optional().nullable(),
    });
}

/**
 * TypeScript types inferred from Zod schemas
 */
export type UpsertStaffTaxDetailsInput = z.infer<typeof StaffTaxDetailsSchema.upsert>;
export type GetStaffTaxDetailsByStaffIdInput = z.infer<typeof StaffTaxDetailsSchema.getByStaffId>;
export type DeleteStaffTaxDetailsInput = z.infer<typeof StaffTaxDetailsSchema.delete>;
export type StaffTaxDetailsSelfUpdateInput = z.infer<typeof StaffTaxDetailsSchema.selfUpdate>;
