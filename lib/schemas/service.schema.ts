import { z } from 'zod';
import { CostUnitType, ExperienceRequirement, StaffRating } from '@prisma/client';

export const ServiceSchema = {
  create: z.object({
    title: z
      .string()
      .min(1, 'Service title is required')
      .max(200, 'Service title must be 200 characters or less')
      .transform((value) => value.trim()),
    costUnitType: z.nativeEnum(CostUnitType).optional().nullable(),
    description: z
      .string()
      .max(1000, 'Description must be 1000 characters or less')
      .transform((value) => value.trim())
      .optional()
      .nullable(),
    experienceRequirement: z.nativeEnum(ExperienceRequirement).optional().nullable(),
    ratingRequirement: z.nativeEnum(StaffRating).optional().nullable(),
    cost: z
      .number()
      .positive('Cost must be a positive number')
      .transform((value) => Number.parseFloat(value.toFixed(2)))
      .optional()
      .nullable(),
    price: z
      .number()
      .positive('Price must be a positive number')
      .transform((value) => Number.parseFloat(value.toFixed(2)))
      .optional()
      .nullable(),
  }),

  update: z.object({
    id: z.string().uuid('Invalid service ID'),
    title: z
      .string()
      .min(1, 'Service title is required')
      .max(200, 'Service title must be 200 characters or less')
      .transform((value) => value.trim())
      .optional(),
    costUnitType: z.nativeEnum(CostUnitType).optional().nullable(),
    description: z
      .string()
      .max(1000, 'Description must be 1000 characters or less')
      .transform((value) => value.trim())
      .optional()
      .nullable(),
    experienceRequirement: z.nativeEnum(ExperienceRequirement).optional().nullable(),
    ratingRequirement: z.nativeEnum(StaffRating).optional().nullable(),
    cost: z
      .number()
      .positive('Cost must be a positive number')
      .transform((value) => Number.parseFloat(value.toFixed(2)))
      .optional()
      .nullable(),
    price: z
      .number()
      .positive('Price must be a positive number')
      .transform((value) => Number.parseFloat(value.toFixed(2)))
      .optional()
      .nullable(),
  }),

  query: z.object({
    page: z.number().int().min(1).default(1).optional(),
    limit: z.number().int().min(1).max(100).default(10).optional(),
    search: z.string().optional(),
    sortBy: z.enum(['title', 'cost', 'price', 'createdAt']).default('title').optional(),
    sortOrder: z.enum(['asc', 'desc']).default('asc').optional(),
    isActive: z.boolean().optional(),
  }),

  id: z.object({
    id: z.string().uuid('Invalid service ID'),
  }),

  toggleActive: z.object({
    id: z.string().uuid('Invalid service ID'),
    isActive: z.boolean(),
  }),
};

export type CreateServiceInput = z.infer<typeof ServiceSchema.create>;
export type UpdateServiceInput = z.infer<typeof ServiceSchema.update>;
export type QueryServicesInput = z.infer<typeof ServiceSchema.query>;
export type ServiceIdInput = z.infer<typeof ServiceSchema.id>;
export type ToggleServiceActiveInput = z.infer<typeof ServiceSchema.toggleActive>;

