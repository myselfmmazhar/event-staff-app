import { z } from "zod";
import { BusinessStructure } from "@prisma/client";

/**
 * StaffTaxDetails Zod Schemas for validation
 */
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
            .transform((val) => val?.trim())
            .optional()
            .nullable(),

        // Tax identifiers (sensitive)
        ssn: z
            .string()
            .max(11, "SSN must be 11 characters or less") // Format: XXX-XX-XXXX
            .transform((val) => val?.trim())
            .optional()
            .nullable(),
        ein: z
            .string()
            .max(10, "EIN must be 10 characters or less") // Format: XX-XXXXXXX
            .transform((val) => val?.trim())
            .optional()
            .nullable(),

        // ID verification documents
        identificationFrontUrl: z
            .string()
            .url("Invalid URL format")
            .optional()
            .nullable(),
        identificationBackUrl: z
            .string()
            .url("Invalid URL format")
            .optional()
            .nullable(),

        // Electronic consent
        electronic1099Consent: z.boolean().default(false),
        signatureUrl: z
            .string()
            .url("Invalid URL format")
            .optional()
            .nullable(),
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
            .transform((val) => val?.trim())
            .optional()
            .nullable(),

        // Tax identifiers (sensitive)
        ssn: z
            .string()
            .max(11, "SSN must be 11 characters or less")
            .transform((val) => val?.trim())
            .optional()
            .nullable(),
        ein: z
            .string()
            .max(10, "EIN must be 10 characters or less")
            .transform((val) => val?.trim())
            .optional()
            .nullable(),

        // ID verification documents
        identificationFrontUrl: z
            .string()
            .url("Invalid URL format")
            .optional()
            .nullable(),
        identificationBackUrl: z
            .string()
            .url("Invalid URL format")
            .optional()
            .nullable(),

        // Electronic consent
        electronic1099Consent: z.boolean().optional(),
        signatureUrl: z
            .string()
            .url("Invalid URL format")
            .optional()
            .nullable(),
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
