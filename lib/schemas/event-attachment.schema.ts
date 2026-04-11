import { z } from 'zod';

/**
 * Schema for a product attachment (used in arrays)
 *
 * NOTE: Service assignments are now handled by CallTime via call-time.schema.ts
 */
export const eventProductSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').default(1),
  customPrice: z
    .number()
    .min(0, 'Custom price must be non-negative')
    .transform((val) => parseFloat(val.toFixed(2)))
    .optional()
    .nullable(),
  notes: z.string().max(500, 'Notes must be 500 characters or less').optional().nullable(),
});

/**
 * Event Attachment Zod Schemas - Products only
 *
 * NOTE: Service assignments are now handled by CallTime via call-time.schema.ts
 */
export class EventAttachmentSchema {
  /**
   * Add a product to an event
   */
  static addProduct = z.object({
    eventId: z.string().uuid('Invalid event ID'),
    productId: z.string().uuid('Invalid product ID'),
    quantity: z.number().int().min(1, 'Quantity must be at least 1').default(1),
    customPrice: z
      .number()
      .min(0, 'Custom price must be non-negative')
      .transform((val) => parseFloat(val.toFixed(2)))
      .optional()
      .nullable(),
    notes: z.string().max(500, 'Notes must be 500 characters or less').optional().nullable(),
  });

  /**
   * Update an attached product
   */
  static updateProduct = z.object({
    eventId: z.string().uuid('Invalid event ID'),
    productId: z.string().uuid('Invalid product ID'),
    quantity: z.number().int().min(1, 'Quantity must be at least 1').optional(),
    customPrice: z
      .number()
      .min(0, 'Custom price must be non-negative')
      .transform((val) => parseFloat(val.toFixed(2)))
      .optional()
      .nullable(),
    notes: z.string().max(500, 'Notes must be 500 characters or less').optional().nullable(),
  });

  /**
   * Remove a product from an event
   */
  static removeProduct = z.object({
    eventId: z.string().uuid('Invalid event ID'),
    productId: z.string().uuid('Invalid product ID'),
  });

  /**
   * Bulk update products on an event (replaces all)
   */
  static bulkUpdateProducts = z.object({
    eventId: z.string().uuid('Invalid event ID'),
    products: z.array(eventProductSchema),
  });

  /**
   * Get attachments by event ID
   */
  static getByEventId = z.object({
    eventId: z.string().uuid('Invalid event ID'),
  });
}

/**
 * TypeScript types inferred from Zod schemas
 */
export type EventProductInput = z.infer<typeof eventProductSchema>;
export type AddProductInput = z.infer<typeof EventAttachmentSchema.addProduct>;
export type UpdateProductInput = z.infer<typeof EventAttachmentSchema.updateProduct>;
export type RemoveProductInput = z.infer<typeof EventAttachmentSchema.removeProduct>;
export type BulkUpdateProductsInput = z.infer<typeof EventAttachmentSchema.bulkUpdateProducts>;
export type GetByEventIdInput = z.infer<typeof EventAttachmentSchema.getByEventId>;
