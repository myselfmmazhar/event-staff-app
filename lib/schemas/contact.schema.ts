import { z } from "zod";
import { emailValidation, phoneValidation } from "@/lib/utils/validation";
import { FieldErrors } from "@/lib/utils/error-messages";

/**
 * Contact ID format validation (CON-YYYY-NNN)
 */
const contactIdRegex = /^CON-\d{4}-\d{3}$/;

/**
 * Contact Zod Schemas for validation
 */
export const ContactSchema = {
    create: z.object({
        firstName: z.string().min(1, "First name is required").max(50).transform(val => val.trim()),
        lastName: z.string().min(1, "Last name is required").max(50).transform(val => val.trim()),
        email: z.string().email({ message: FieldErrors.email.invalid }).transform(val => val.trim().toLowerCase()),
        phone: z.string().refine(phone => phoneValidation.isValid(phone), { message: FieldErrors.phone.invalid }).transform(val => val.trim()),
        dateOfBirth: z.preprocess((val) => (val === "" ? null : val), z.coerce.date().optional().nullable()),
        transactionType: z.preprocess((val) => (val === "" ? null : val), z.string().max(100).optional().nullable()),
        ricsSurveyAccount: z.boolean().optional().default(false),
        correspondingAddress: z.preprocess((val) => (val === "" ? null : val), z.string().max(500).optional().nullable()),
        contactSource: z.preprocess((val) => (val === "" ? null : val), z.string().max(100).optional().nullable()),
        contactType: z.preprocess((val) => (val === "" ? null : val), z.string().max(100).optional().nullable()),
        internalNotes: z.string().optional().nullable(),
    }),

    update: z.object({
        id: z.string().uuid("Invalid contact ID"),
        firstName: z.string().min(1).max(50).optional(),
        lastName: z.string().min(1).max(50).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        dateOfBirth: z.preprocess((val) => (val === "" ? null : val), z.coerce.date().optional().nullable()),
        transactionType: z.preprocess((val) => (val === "" ? null : val), z.string().max(100).optional().nullable()),
        ricsSurveyAccount: z.boolean().optional(),
        correspondingAddress: z.preprocess((val) => (val === "" ? null : val), z.string().max(500).optional().nullable()),
        contactSource: z.preprocess((val) => (val === "" ? null : val), z.string().max(100).optional().nullable()),
        contactType: z.preprocess((val) => (val === "" ? null : val), z.string().max(100).optional().nullable()),
        internalNotes: z.string().optional().nullable(),
    }),

    updateNotes: z.object({
        id: z.string().uuid("Invalid contact ID"),
        contactType: z.preprocess((val) => (val === "" ? null : val), z.string().max(100).optional().nullable()),
        internalNotes: z.string().optional().nullable(),
    }),

    query: z.object({
        page: z.number().int().min(1).default(1).optional(),
        limit: z.number().int().min(1).max(100).default(10).optional(),
        search: z.string().optional(),
        sortBy: z.enum(["firstName", "lastName", "email", "createdAt"]).default("createdAt").optional(),
        sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
        contactType: z.string().optional(),
    }),

    id: z.object({
        id: z.string().uuid("Invalid contact ID"),
    }),
};

export type CreateContactInput = z.infer<typeof ContactSchema.create>;
export type UpdateContactInput = z.infer<typeof ContactSchema.update>;
export type UpdateContactNotesInput = z.infer<typeof ContactSchema.updateNotes>;
export type QueryContactsInput = z.infer<typeof ContactSchema.query>;
