/**
 * Client Import Schemas
 *
 * Zod schemas for validating imported client data.
 */

import { z } from 'zod';
import { emailValidation, phoneValidation } from '@/lib/utils/validation';

function coerceTrimmedString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function coerceOptionalTrimmedString(value: unknown): string | undefined {
  const trimmed = coerceTrimmedString(value);
  return trimmed === '' ? undefined : trimmed;
}

const requiredText = (opts: { field: string; max: number }) =>
  z
    .preprocess(coerceTrimmedString, z.string().min(1, `${opts.field} is required`).max(opts.max))
    .transform((val) => val.trim());

const optionalText = (opts: { max: number }) =>
  z
    .preprocess(coerceOptionalTrimmedString, z.string().max(opts.max).optional())
    .optional();

const requiredEmail = () =>
  z
    .preprocess(
      (value) => coerceTrimmedString(value).toLowerCase(),
      z
        .string()
        .min(1, 'Email is required')
        .email('Invalid email')
        .refine((email) => emailValidation.hasValidDomain(email), {
          message: 'Disposable email domains are not allowed',
        })
    );

const optionalEmail = () =>
  z
    .preprocess(
      (value) => {
        const trimmed = coerceOptionalTrimmedString(value);
        return trimmed ? trimmed.toLowerCase() : undefined;
      },
      z.string().email('Invalid email').optional()
    )
    .refine((email) => email === undefined || emailValidation.hasValidDomain(email), {
      message: 'Disposable email domains are not allowed',
    })
    .optional();

const requiredPhone = (label: string) =>
  z
    .preprocess(coerceTrimmedString, z.string().min(1, `${label} is required`))
    .refine((phone) => phoneValidation.isValid(phone), { message: `Invalid ${label.toLowerCase()}` })
    .transform((val) => val.trim());

const optionalPhone = (label: string) =>
  z
    .preprocess(coerceOptionalTrimmedString, z.string().optional())
    .refine((phone) => phone === undefined || phoneValidation.isValid(phone), {
      message: `Invalid ${label.toLowerCase()}`,
    })
    .optional();

/**
 * Schema for a single imported client row
 * Required fields: businessName, firstName, lastName, email, cellPhone, city, state, zipCode
 */
export const importClientRowSchema = z.object({
  // Required
  businessName: requiredText({ field: 'Business name', max: 200 }),
  firstName: requiredText({ field: 'First name', max: 50 }),
  lastName: requiredText({ field: 'Last name', max: 50 }),
  email: requiredEmail(),
  cellPhone: requiredPhone('Cell phone'),
  city: requiredText({ field: 'City', max: 100 }),
  state: requiredText({ field: 'State', max: 50 }),
  zipCode: requiredText({ field: 'ZIP code', max: 20 }),

  // Optional
  businessPhone: optionalPhone('Business phone'),
  details: optionalText({ max: 5000 }),
  businessAddress: optionalText({ max: 300 }),
  ccEmail: optionalEmail(),
  billingFirstName: optionalText({ max: 50 }),
  billingLastName: optionalText({ max: 50 }),
  billingEmail: optionalEmail(),
  billingPhone: optionalPhone('Billing phone'),
});

export type ImportClientRow = z.infer<typeof importClientRowSchema>;

export const clientBulkImportSchema = z.object({
  clients: z.array(importClientRowSchema),
  mode: z.enum(['create', 'upsert']).default('create'),
});

export type ClientBulkImportInput = z.infer<typeof clientBulkImportSchema>;
