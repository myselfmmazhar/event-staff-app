import { z } from 'zod';
import { REQ_TEMPLATE_IDS } from '@/lib/requirement-templates';

const reqTemplateIdSchema = z.enum(REQ_TEMPLATE_IDS);

export const CategorySchema = {
  create: z.object({
    name: z
      .string()
      .min(1, 'Category name is required')
      .max(200, 'Category name must be 200 characters or less')
      .transform((value) => value.trim()),
    description: z
      .string()
      .max(1000, 'Description must be 1000 characters or less')
      .transform((value) => value.trim())
      .optional()
      .nullable(),
    requirementTemplateIds: z.array(reqTemplateIdSchema).default([]),
    isRequired: z.boolean().default(false),
  }),

  update: z.object({
    id: z.string().uuid('Invalid category ID'),
    name: z
      .string()
      .min(1, 'Category name is required')
      .max(200, 'Category name must be 200 characters or less')
      .transform((value) => value.trim())
      .optional(),
    description: z
      .string()
      .max(1000, 'Description must be 1000 characters or less')
      .transform((value) => value.trim())
      .optional()
      .nullable(),
    requirementTemplateIds: z.array(reqTemplateIdSchema).optional(),
    isRequired: z.boolean().optional(),
  }),

  query: z.object({
    page: z.number().int().min(1).default(1).optional(),
    limit: z.number().int().min(1).max(100).default(10).optional(),
    search: z.string().optional(),
    sortBy: z.enum(['name', 'createdAt']).default('name').optional(),
    sortOrder: z.enum(['asc', 'desc']).default('asc').optional(),
    isActive: z.boolean().optional(),
    createdFrom: z.coerce.date().optional(),
    createdTo: z.coerce.date().optional(),
  }),

  id: z.object({
    id: z.string().uuid('Invalid category ID'),
  }),

  toggleActive: z.object({
    id: z.string().uuid('Invalid category ID'),
    isActive: z.boolean(),
  }),

  deleteMany: z.object({
    ids: z.array(z.string().uuid('Invalid category ID')).min(1, 'At least one category ID is required'),
  }),
};

export type CreateCategoryInput = z.infer<typeof CategorySchema.create>;
export type UpdateCategoryInput = z.infer<typeof CategorySchema.update>;
export type QueryCategoriesInput = z.infer<typeof CategorySchema.query>;
export type CategoryIdInput = z.infer<typeof CategorySchema.id>;
export type ToggleCategoryActiveInput = z.infer<typeof CategorySchema.toggleActive>;
export type DeleteManyCategoriesInput = z.infer<typeof CategorySchema.deleteMany>;
