import { z } from "zod";
import { BusinessStructure, TaxFilledBy } from "@prisma/client";

/**
 * StaffTaxDetails Zod Schemas for validation
 * Based on IRS Form W-9 (Rev. March 2024)
 */

/**
 * Helper: transform empty/whitespace-only strings to null
 */
const emptyToNull = (val: string | undefined | null) => {
    if (val == null) return null;
    return val.trim() === '' ? null : val.trim();
};

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
     * Create/Update Tax Details Schema (admin upsert)
     * All fields are optional except staffId
     */
    static upsert = z.object({
        staffId: z.string().uuid("Invalid staff ID"),

        // Who fills out tax details
        taxFilledBy: z.nativeEnum(TaxFilledBy).default(TaxFilledBy.TALENT),

        // W-9 Line 1: Name of entity/individual
        taxName: z
            .string()
            .max(200, "Name must be 200 characters or less")
            .transform(emptyToNull)
            .optional()
            .nullable(),

        // W-9 Line 2: Business name / disregarded entity name
        businessName: z
            .string()
            .max(200, "Business name must be 200 characters or less")
            .transform(emptyToNull)
            .optional()
            .nullable(),

        // W-9 Line 3a: Federal tax classification
        businessStructure: z.nativeEnum(BusinessStructure).default(BusinessStructure.INDIVIDUAL),
        // LLC sub-classification (C, S, or P)
        llcClassification: z
            .string()
            .max(1)
            .transform(emptyToNull)
            .optional()
            .nullable(),

        // W-9 Line 4: Exemptions
        exemptPayeeCode: z
            .string()
            .max(10)
            .transform(emptyToNull)
            .optional()
            .nullable(),
        fatcaExemptionCode: z
            .string()
            .max(10)
            .transform(emptyToNull)
            .optional()
            .nullable(),

        // W-9 Lines 5-6: Address
        taxAddress: z
            .string()
            .max(300, "Address must be 300 characters or less")
            .transform(emptyToNull)
            .optional()
            .nullable(),
        taxCity: z
            .string()
            .max(100)
            .transform(emptyToNull)
            .optional()
            .nullable(),
        taxState: z
            .string()
            .max(50)
            .transform(emptyToNull)
            .optional()
            .nullable(),
        taxZip: z
            .string()
            .max(20)
            .transform(emptyToNull)
            .optional()
            .nullable(),

        // W-9 Line 7: Account numbers (optional)
        accountNumbers: z
            .string()
            .max(100)
            .transform(emptyToNull)
            .optional()
            .nullable(),

        // W-9 Part I: Tax identifiers (sensitive)
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

        // W-9 Part II: Certification
        signatureUrl: optionalStringField(),
        certificationDate: z.date().optional().nullable(),
        w4FirstName: z.string().max(100).transform(emptyToNull).optional().nullable(),
        w4LastName: z.string().max(100).transform(emptyToNull).optional().nullable(),
        w4Status: z.string().max(100).transform(emptyToNull).optional().nullable(),
        w4EmployerName: z.string().max(200).transform(emptyToNull).optional().nullable(),
        w4EmployerAddress: z.string().max(300).transform(emptyToNull).optional().nullable(),
        w4EmploymentDate: z.date().optional().nullable(),
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
     * Staff self-service Tax Details update (talent fills their own W-9)
     */
    static selfUpdate = z.object({
        // W-9 Line 1: Name
        taxName: z
            .string()
            .max(200)
            .transform(emptyToNull)
            .optional()
            .nullable(),

        // W-9 Line 2: Business name
        businessName: z
            .string()
            .max(200)
            .transform(emptyToNull)
            .optional()
            .nullable(),

        // W-9 Line 3a: Classification
        businessStructure: z.nativeEnum(BusinessStructure).optional(),
        llcClassification: z
            .string()
            .max(1)
            .transform(emptyToNull)
            .optional()
            .nullable(),

        // W-9 Line 4: Exemptions
        exemptPayeeCode: z
            .string()
            .max(10)
            .transform(emptyToNull)
            .optional()
            .nullable(),
        fatcaExemptionCode: z
            .string()
            .max(10)
            .transform(emptyToNull)
            .optional()
            .nullable(),

        // W-9 Lines 5-6: Address
        taxAddress: z.string().max(300).transform(emptyToNull).optional().nullable(),
        taxCity: z.string().max(100).transform(emptyToNull).optional().nullable(),
        taxState: z.string().max(50).transform(emptyToNull).optional().nullable(),
        taxZip: z.string().max(20).transform(emptyToNull).optional().nullable(),

        // W-9 Line 7: Account numbers
        accountNumbers: z.string().max(100).transform(emptyToNull).optional().nullable(),

        // W-9 Part I: Tax identifiers
        ssn: z.string().max(11).transform(emptyToNull).optional().nullable(),
        ein: z.string().max(10).transform(emptyToNull).optional().nullable(),

        // W-9 Part II: Certification
        signatureUrl: optionalStringField(),
        certificationDate: z.date().optional().nullable(),
        w4FirstName: z.string().max(100).transform(emptyToNull).optional().nullable(),
        w4LastName: z.string().max(100).transform(emptyToNull).optional().nullable(),
        w4Status: z.string().max(100).transform(emptyToNull).optional().nullable(),
        w4EmployerName: z.string().max(200).transform(emptyToNull).optional().nullable(),
        w4EmployerAddress: z.string().max(300).transform(emptyToNull).optional().nullable(),
        w4EmploymentDate: z.date().optional().nullable(),
    });
}

/**
 * TypeScript types inferred from Zod schemas
 */
export type UpsertStaffTaxDetailsInput = z.infer<typeof StaffTaxDetailsSchema.upsert>;
export type GetStaffTaxDetailsByStaffIdInput = z.infer<typeof StaffTaxDetailsSchema.getByStaffId>;
export type DeleteStaffTaxDetailsInput = z.infer<typeof StaffTaxDetailsSchema.delete>;
export type StaffTaxDetailsSelfUpdateInput = z.infer<typeof StaffTaxDetailsSchema.selfUpdate>;
