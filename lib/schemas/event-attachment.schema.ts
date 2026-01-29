import { z } from 'zod';

/**
 * Schema for a service attachment (used in arrays)
 */
export const eventServiceSchema = z.object({
  serviceId: z.string().uuid('Invalid service ID'),
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
 * Schema for a product attachment (used in arrays)
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
 * Event Attachment Zod Schemas
 */
export class EventAttachmentSchema {
  /**
   * Add a service to an event
   */
  static addService = z.object({
    eventId: z.string().uuid('Invalid event ID'),
    serviceId: z.string().uuid('Invalid service ID'),
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
   * Update an attached service
   */
  static updateService = z.object({
    eventId: z.string().uuid('Invalid event ID'),
    serviceId: z.string().uuid('Invalid service ID'),
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
   * Remove a service from an event
   */
  static removeService = z.object({
    eventId: z.string().uuid('Invalid event ID'),
    serviceId: z.string().uuid('Invalid service ID'),
  });

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
   * Bulk update services on an event (replaces all)
   */
  static bulkUpdateServices = z.object({
    eventId: z.string().uuid('Invalid event ID'),
    services: z.array(eventServiceSchema),
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
export type EventServiceInput = z.infer<typeof eventServiceSchema>;
export type EventProductInput = z.infer<typeof eventProductSchema>;
export type AddServiceInput = z.infer<typeof EventAttachmentSchema.addService>;
export type UpdateServiceInput = z.infer<typeof EventAttachmentSchema.updateService>;
export type RemoveServiceInput = z.infer<typeof EventAttachmentSchema.removeService>;
export type AddProductInput = z.infer<typeof EventAttachmentSchema.addProduct>;
export type UpdateProductInput = z.infer<typeof EventAttachmentSchema.updateProduct>;
export type RemoveProductInput = z.infer<typeof EventAttachmentSchema.removeProduct>;
export type BulkUpdateServicesInput = z.infer<typeof EventAttachmentSchema.bulkUpdateServices>;
export type BulkUpdateProductsInput = z.infer<typeof EventAttachmentSchema.bulkUpdateProducts>;
export type GetByEventIdInput = z.infer<typeof EventAttachmentSchema.getByEventId>;
