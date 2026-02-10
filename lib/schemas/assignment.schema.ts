/**
 * Assignment Validation Schemas
 *
 * Zod schemas for validating assignment form data.
 */

import { z } from 'zod';

/**
 * Assignment type enum
 */
export const assignmentTypeSchema = z.enum(['PRODUCT', 'SERVICE']);

/**
 * Experience requirement options (matches Prisma ExperienceRequirement enum)
 */
export const experienceRequiredSchema = z.enum(['ANY', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED']);

/**
 * Rating options including ANY (matches Prisma StaffRating enum + ANY)
 */
export const ratingRequiredSchema = z.enum(['ANY', 'NA', 'A', 'B', 'C']);

/**
 * Product assignment schema
 */
export const productAssignmentSchema = z.object({
  type: z.literal('PRODUCT'),
  productId: z.string().min(1, 'Select a product'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  customCost: z.number().min(0).nullable().optional(),
  customPrice: z.number().min(0).nullable().optional(),
  costUnitType: z.string().nullable().optional(),
  commission: z.boolean().default(false),
  description: z.string().max(1000, 'Description too long').nullable().optional(),
  instructions: z.string().max(2000, 'Instructions too long').nullable().optional(),
});

/**
 * Service assignment schema
 */
export const serviceAssignmentSchema = z.object({
  type: z.literal('SERVICE'),
  serviceId: z.string().min(1, 'Select a service'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  customCost: z.number().min(0).nullable().optional(),
  customPrice: z.number().min(0).nullable().optional(),
  costUnitType: z.string().nullable().optional(),
  commission: z.boolean().default(false),
  startDate: z.string().nullable().optional(),
  startTime: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  experienceRequired: experienceRequiredSchema.default('ANY'),
  ratingRequired: ratingRequiredSchema.default('ANY'),
  approveOvertime: z.boolean().default(false),
});

/**
 * Discriminated union schema for assignments
 */
export const assignmentSchema = z.discriminatedUnion('type', [
  productAssignmentSchema,
  serviceAssignmentSchema,
]);

/**
 * Form data schema (used for react-hook-form)
 */
export const assignmentFormSchema = z.object({
  type: assignmentTypeSchema,
  productId: z.string().optional(),
  serviceId: z.string().optional(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').default(1),
  customCost: z.number().min(0).nullable().optional(),
  customPrice: z.number().min(0).nullable().optional(),
  costUnitType: z.string().nullable().optional(),
  commission: z.boolean().default(false),
  // Product-specific
  description: z.string().max(1000).nullable().optional(),
  instructions: z.string().max(2000).nullable().optional(),
  // Service-specific
  startDate: z.string().nullable().optional(),
  startTime: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  experienceRequired: experienceRequiredSchema.default('ANY'),
  ratingRequired: ratingRequiredSchema.default('ANY'),
  approveOvertime: z.boolean().default(false),
}).superRefine((data, ctx) => {
  // Ensure productId is provided when type is PRODUCT
  if (data.type === 'PRODUCT' && !data.productId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Please select a product',
      path: ['productId'],
    });
  }
  // Ensure serviceId is provided when type is SERVICE
  if (data.type === 'SERVICE' && !data.serviceId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Please select a service',
      path: ['serviceId'],
    });
  }
});

/**
 * Type exports
 */
export type AssignmentType = z.infer<typeof assignmentTypeSchema>;
export type ProductAssignmentInput = z.infer<typeof productAssignmentSchema>;
export type ServiceAssignmentInput = z.infer<typeof serviceAssignmentSchema>;
export type AssignmentInput = z.infer<typeof assignmentSchema>;
export type AssignmentFormInput = z.infer<typeof assignmentFormSchema>;
