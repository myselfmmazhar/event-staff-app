import { z } from 'zod';
import { MinimumPurchase, PriceUnitType } from '@prisma/client';

export const ProductSchema = {
  create: z.object({
    title: z
      .string()
      .min(1, 'Product title is required')
      .max(200, 'Product title must be 200 characters or less')
      .transform((value) => value.trim()),
    description: z
      .string()
      .max(1000, 'Description must be 1000 characters or less')
      .transform((value) => value.trim())
      .optional()
      .nullable(),
    priceUnitType: z.nativeEnum(PriceUnitType).optional().nullable(),
    minimumPurchase: z.nativeEnum(MinimumPurchase).optional().nullable(),
    trackInventory: z.boolean().optional().default(false),
    supplier: z
      .string()
      .max(200, 'Supplier must be 200 characters or less')
      .transform((value) => value.trim())
      .optional()
      .nullable(),
    brand: z
      .string()
      .max(200, 'Brand must be 200 characters or less')
      .transform((value) => value.trim())
      .optional()
      .nullable(),
    category: z
      .string()
      .max(200, 'Category must be 200 characters or less')
      .transform((value) => value.trim())
      .optional()
      .nullable(),
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
    id: z.string().uuid('Invalid product ID'),
    title: z
      .string()
      .min(1, 'Product title is required')
      .max(200, 'Product title must be 200 characters or less')
      .transform((value) => value.trim())
      .optional(),
    description: z
      .string()
      .max(1000, 'Description must be 1000 characters or less')
      .transform((value) => value.trim())
      .optional()
      .nullable(),
    priceUnitType: z.nativeEnum(PriceUnitType).optional().nullable(),
    minimumPurchase: z.nativeEnum(MinimumPurchase).optional().nullable(),
    trackInventory: z.boolean().optional(),
    supplier: z
      .string()
      .max(200, 'Supplier must be 200 characters or less')
      .transform((value) => value.trim())
      .optional()
      .nullable(),
    brand: z
      .string()
      .max(200, 'Brand must be 200 characters or less')
      .transform((value) => value.trim())
      .optional()
      .nullable(),
    category: z
      .string()
      .max(200, 'Category must be 200 characters or less')
      .transform((value) => value.trim())
      .optional()
      .nullable(),
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
    sortBy: z.enum(['title', 'cost', 'price', 'category', 'createdAt']).default('title').optional(),
    sortOrder: z.enum(['asc', 'desc']).default('asc').optional(),
    isActive: z.boolean().optional(),
    category: z.string().optional(),
  }),

  id: z.object({
    id: z.string().uuid('Invalid product ID'),
  }),

  toggleActive: z.object({
    id: z.string().uuid('Invalid product ID'),
    isActive: z.boolean(),
  }),
};

export type CreateProductInput = z.infer<typeof ProductSchema.create>;
export type UpdateProductInput = z.infer<typeof ProductSchema.update>;
export type QueryProductsInput = z.infer<typeof ProductSchema.query>;
export type ProductIdInput = z.infer<typeof ProductSchema.id>;
export type ToggleProductActiveInput = z.infer<typeof ProductSchema.toggleActive>;

