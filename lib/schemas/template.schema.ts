import { z } from 'zod';

/**
 * Hex color validation regex
 */
const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

/**
 * Email template type enum
 */
export const emailTemplateTypeSchema = z.enum([
  'STAFF_INVITATION',
  'CLIENT_INVITATION',
  'CALL_TIME_INVITATION',
  'CALL_TIME_CONFIRMATION',
  'CALL_TIME_WAITLISTED',
  'STAFF_CREDENTIALS',
  'USER_INVITATION',
  'CALL_INVITATION_BATCH',
]);

/**
 * SMS template type enum
 */
export const smsTemplateTypeSchema = z.enum([
  'STAFF_INVITATION',
  'CLIENT_INVITATION',
  'CALL_TIME_INVITATION',
  'CALL_TIME_CONFIRMATION',
  'CALL_TIME_WAITLISTED',
  'STAFF_CREDENTIALS',
  'USER_INVITATION',
  'CALL_INVITATION_BATCH',
]);

/**
 * Update email template schema
 */
export const updateEmailTemplateSchema = z.object({
  type: emailTemplateTypeSchema,
  subject: z
    .string()
    .min(1, 'Subject is required')
    .max(200, 'Subject must be 200 characters or less'),
  bodyHtml: z
    .string()
    .min(1, 'Template body is required'),
});

/**
 * Update SMS template schema
 */
export const updateSmsTemplateSchema = z.object({
  type: smsTemplateTypeSchema,
  body: z
    .string()
    .min(1, 'Message body is required')
    .max(500, 'Message body must be 500 characters or less'),
});

/**
 * Button style options
 */
export const buttonStyleSchema = z.enum(['gradient', 'solid', 'outline']);

/**
 * Header background options
 */
export const headerBackgroundSchema = z.enum(['gradient', 'solid']);

/**
 * Update branding settings schema
 */
export const updateBrandingSchema = z.object({
  logoUrl: z
    .string()
    .url('Invalid URL format')
    .nullable()
    .optional(),
  primaryColor: z
    .string()
    .regex(hexColorRegex, 'Invalid hex color format (e.g., #667eea)')
    .optional(),
  secondaryColor: z
    .string()
    .regex(hexColorRegex, 'Invalid hex color format (e.g., #764ba2)')
    .optional(),
  buttonStyle: buttonStyleSchema.optional(),
  buttonBorderRadius: z
    .string()
    .regex(/^\d+px$/, 'Border radius must be in pixels (e.g., 8px)')
    .optional(),
  fontFamily: z
    .string()
    .min(1)
    .max(100)
    .optional(),
  headerBackground: headerBackgroundSchema.optional(),
  footerText: z
    .string()
    .max(500, 'Footer text must be 500 characters or less')
    .nullable()
    .optional(),
});

/**
 * Template preview schema
 */
export const templatePreviewSchema = z.object({
  type: emailTemplateTypeSchema,
  subject: z.string().optional(),
  bodyHtml: z.string().optional(),
});

/**
 * SMS template preview schema
 */
export const smsTemplatePreviewSchema = z.object({
  type: smsTemplateTypeSchema,
  body: z.string().optional(),
});

// Type exports
export type EmailTemplateType = z.infer<typeof emailTemplateTypeSchema>;
export type SmsTemplateType = z.infer<typeof smsTemplateTypeSchema>;
export type UpdateEmailTemplateInput = z.infer<typeof updateEmailTemplateSchema>;
export type UpdateSmsTemplateInput = z.infer<typeof updateSmsTemplateSchema>;
export type UpdateBrandingInput = z.infer<typeof updateBrandingSchema>;
export type ButtonStyle = z.infer<typeof buttonStyleSchema>;
export type HeaderBackground = z.infer<typeof headerBackgroundSchema>;
export type TemplatePreviewInput = z.infer<typeof templatePreviewSchema>;
export type SmsTemplatePreviewInput = z.infer<typeof smsTemplatePreviewSchema>;
