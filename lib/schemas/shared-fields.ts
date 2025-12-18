import { z } from 'zod';
import { emailValidation, phoneValidation } from '@/lib/utils/validation';
import { FieldErrors } from '@/lib/utils/error-messages';

/**
 * Shared Form Field Schemas
 * Reusable Zod schemas for common form fields
 */

/**
 * Email field with validation and normalization
 * - Validates email format
 * - Checks for disposable domains
 * - Normalizes to lowercase
 */
export const emailField = z
  .string()
  .min(1, FieldErrors.email.required)
  .email({ message: FieldErrors.email.invalid })
  .transform((val) => val.trim().toLowerCase())
  .refine((email) => emailValidation.hasValidDomain(email), {
    message: FieldErrors.email.disposable,
  });

/**
 * Optional email field
 */
export const optionalEmailField = z
  .string()
  .email({ message: FieldErrors.email.invalid })
  .transform((val) => val.trim().toLowerCase())
  .refine((email) => emailValidation.hasValidDomain(email), {
    message: FieldErrors.email.disposable,
  })
  .optional()
  .or(z.literal(''));

/**
 * Required phone field with validation
 */
export const phoneField = z
  .string()
  .min(1, FieldErrors.phone.invalid)
  .refine((phone) => phoneValidation.isValid(phone), {
    message: FieldErrors.phone.invalid,
  })
  .transform((val) => val.trim());

/**
 * Optional phone field with validation
 */
export const optionalPhoneField = z
  .string()
  .refine((phone) => !phone || phoneValidation.isValid(phone), {
    message: FieldErrors.phone.invalid,
  })
  .transform((val) => val?.trim())
  .optional()
  .or(z.literal(''));

/**
 * First name field
 */
export const firstNameField = z
  .string()
  .min(1, FieldErrors.firstName.required)
  .max(50, FieldErrors.firstName.maxLength)
  .transform((val) => val.trim());

/**
 * Last name field
 */
export const lastNameField = z
  .string()
  .min(1, FieldErrors.lastName.required)
  .max(50, FieldErrors.lastName.maxLength)
  .transform((val) => val.trim());

/**
 * Address field schemas
 */
export const addressFields = {
  streetAddress: z
    .string()
    .min(1, 'Street address is required')
    .max(300)
    .transform((val) => val.trim()),

  aptSuiteUnit: z
    .string()
    .max(50)
    .transform((val) => val?.trim())
    .optional(),

  city: z
    .string()
    .min(1, 'City is required')
    .max(100)
    .transform((val) => val.trim()),

  state: z
    .string()
    .min(1, 'State is required')
    .max(50)
    .transform((val) => val.trim()),

  zipCode: z
    .string()
    .min(1, 'ZIP code is required')
    .max(20)
    .transform((val) => val.trim()),

  country: z
    .string()
    .min(1, 'Country is required')
    .max(100)
    .transform((val) => val.trim()),
};

/**
 * Complete address schema
 */
export const addressSchema = z.object(addressFields);

/**
 * Time field in HH:MM format
 */
export const timeField = z
  .string()
  .refine(
    (val) => !val || /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(val),
    { message: 'Time must be in HH:MM format' }
  )
  .optional()
  .nullable();

/**
 * Text field with common options
 */
export function textField(options: {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  label?: string;
}) {
  const { required = false, minLength, maxLength = 200, label = 'Field' } = options;

  let schema = z.string();

  if (required) {
    schema = schema.min(minLength ?? 1, `${label} is required`);
  }

  if (maxLength) {
    schema = schema.max(maxLength, `${label} must not exceed ${maxLength} characters`);
  }

  return schema.transform((val) => val?.trim() || undefined);
}

/**
 * Textarea field with common options
 */
export function textareaField(options: {
  required?: boolean;
  maxLength?: number;
  label?: string;
}) {
  const { required = false, maxLength = 5000, label = 'Field' } = options;

  let schema = z.string();

  if (required) {
    schema = schema.min(1, `${label} is required`);
  }

  if (maxLength) {
    schema = schema.max(maxLength, `${label} must not exceed ${maxLength} characters`);
  }

  return schema.transform((val) => val?.trim() || undefined);
}
