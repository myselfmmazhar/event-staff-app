import { PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import type {
  AddServiceInput,
  AddProductInput,
  BulkUpdateServicesInput,
  BulkUpdateProductsInput,
} from '@/lib/schemas/event-attachment.schema';

/**
 * Event Attachment Service - Business logic for managing services and products attached to events
 */
export class EventAttachmentService {
  constructor(private prisma: PrismaClient) { }

  /**
   * Select object for event services with service details
   */
  private readonly eventServiceSelect = {
    id: true,
    eventId: true,
    serviceId: true,
    quantity: true,
    customPrice: true,
    notes: true,
    createdAt: true,
    updatedAt: true,
    service: {
      select: {
        id: true,
        serviceId: true,
        title: true,
        cost: true,
        price: true,
        costUnitType: true,
        description: true,
        isActive: true,
      },
    },
  } as const;

  /**
   * Select object for event products with product details
   */
  private readonly eventProductSelect = {
    id: true,
    eventId: true,
    productId: true,
    quantity: true,
    customPrice: true,
    notes: true,
    createdAt: true,
    updatedAt: true,
    product: {
      select: {
        id: true,
        productId: true,
        title: true,
        cost: true,
        price: true,
        priceUnitType: true,
        description: true,
        category: true,
        isActive: true,
      },
    },
  } as const;

  /**
   * Verify event ownership
   */
  private async verifyEventOwnership(eventId: string, userId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, createdBy: userId },
      select: { id: true },
    });

    if (!event) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event not found or you do not have permission',
      });
    }

    return event;
  }

  /**
   * Get all services and products attached to an event
   */
  async getByEventId(eventId: string, userId: string) {
    await this.verifyEventOwnership(eventId, userId);

    const [services, products] = await Promise.all([
      this.prisma.eventService.findMany({
        where: { eventId },
        select: this.eventServiceSelect,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.eventProduct.findMany({
        where: { eventId },
        select: this.eventProductSelect,
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return { services, products };
  }

  /**
   * Add a service to an event
   */
  async addService(input: AddServiceInput, userId: string) {
    await this.verifyEventOwnership(input.eventId, userId);

    // Verify service exists
    const service = await this.prisma.service.findUnique({
      where: { id: input.serviceId },
    });

    if (!service) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Service not found',
      });
    }

    // Check if already attached
    const existing = await this.prisma.eventService.findUnique({
      where: {
        eventId_serviceId: {
          eventId: input.eventId,
          serviceId: input.serviceId,
        },
      },
    });

    if (existing) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Service is already attached to this event',
      });
    }

    return await this.prisma.eventService.create({
      data: {
        eventId: input.eventId,
        serviceId: input.serviceId,
        quantity: input.quantity,
        customPrice: input.customPrice ?? null,
        notes: input.notes ?? null,
      },
      select: this.eventServiceSelect,
    });
  }

  /**
   * Update an attached service
   */
  async updateService(
    eventId: string,
    serviceId: string,
    data: { quantity?: number; customPrice?: number | null; notes?: string | null },
    userId: string
  ) {
    await this.verifyEventOwnership(eventId, userId);

    // Verify attachment exists
    const existing = await this.prisma.eventService.findUnique({
      where: {
        eventId_serviceId: { eventId, serviceId },
      },
    });

    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Service attachment not found',
      });
    }

    return await this.prisma.eventService.update({
      where: {
        eventId_serviceId: { eventId, serviceId },
      },
      data: {
        quantity: data.quantity,
        customPrice: data.customPrice,
        notes: data.notes,
      },
      select: this.eventServiceSelect,
    });
  }

  /**
   * Remove a service from an event
   */
  async removeService(eventId: string, serviceId: string, userId: string) {
    await this.verifyEventOwnership(eventId, userId);

    // Verify attachment exists
    const existing = await this.prisma.eventService.findUnique({
      where: {
        eventId_serviceId: { eventId, serviceId },
      },
    });

    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Service attachment not found',
      });
    }

    await this.prisma.eventService.delete({
      where: {
        eventId_serviceId: { eventId, serviceId },
      },
    });

    return { success: true };
  }

  /**
   * Bulk update services on an event (replace all)
   */
  async bulkUpdateServices(input: BulkUpdateServicesInput, userId: string) {
    await this.verifyEventOwnership(input.eventId, userId);

    // Verify all services exist
    if (input.services.length > 0) {
      const serviceIds = input.services.map((s) => s.serviceId);
      const existingServices = await this.prisma.service.findMany({
        where: { id: { in: serviceIds } },
        select: { id: true },
      });

      const existingIds = new Set(existingServices.map((s) => s.id));
      const missingIds = serviceIds.filter((id) => !existingIds.has(id));

      if (missingIds.length > 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Services not found: ${missingIds.join(', ')}`,
        });
      }
    }

    // Use transaction for atomicity
    return await this.prisma.$transaction(async (tx) => {
      // Delete all existing
      await tx.eventService.deleteMany({
        where: { eventId: input.eventId },
      });

      // Create new ones
      if (input.services.length > 0) {
        await tx.eventService.createMany({
          data: input.services.map((s) => ({
            eventId: input.eventId,
            serviceId: s.serviceId,
            quantity: s.quantity,
            customPrice: s.customPrice ?? null,
            notes: s.notes ?? null,
          })),
        });
      }

      // Return updated list
      return await tx.eventService.findMany({
        where: { eventId: input.eventId },
        select: this.eventServiceSelect,
        orderBy: { createdAt: 'asc' },
      });
    });
  }

  /**
   * Add a product to an event
   */
  async addProduct(input: AddProductInput, userId: string) {
    await this.verifyEventOwnership(input.eventId, userId);

    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: input.productId },
    });

    if (!product) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Product not found',
      });
    }

    // Check if already attached
    const existing = await this.prisma.eventProduct.findUnique({
      where: {
        eventId_productId: {
          eventId: input.eventId,
          productId: input.productId,
        },
      },
    });

    if (existing) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Product is already attached to this event',
      });
    }

    return await this.prisma.eventProduct.create({
      data: {
        eventId: input.eventId,
        productId: input.productId,
        quantity: input.quantity,
        customPrice: input.customPrice ?? null,
        notes: input.notes ?? null,
      },
      select: this.eventProductSelect,
    });
  }

  /**
   * Update an attached product
   */
  async updateProduct(
    eventId: string,
    productId: string,
    data: { quantity?: number; customPrice?: number | null; notes?: string | null },
    userId: string
  ) {
    await this.verifyEventOwnership(eventId, userId);

    // Verify attachment exists
    const existing = await this.prisma.eventProduct.findUnique({
      where: {
        eventId_productId: { eventId, productId },
      },
    });

    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Product attachment not found',
      });
    }

    return await this.prisma.eventProduct.update({
      where: {
        eventId_productId: { eventId, productId },
      },
      data: {
        quantity: data.quantity,
        customPrice: data.customPrice,
        notes: data.notes,
      },
      select: this.eventProductSelect,
    });
  }

  /**
   * Remove a product from an event
   */
  async removeProduct(eventId: string, productId: string, userId: string) {
    await this.verifyEventOwnership(eventId, userId);

    // Verify attachment exists
    const existing = await this.prisma.eventProduct.findUnique({
      where: {
        eventId_productId: { eventId, productId },
      },
    });

    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Product attachment not found',
      });
    }

    await this.prisma.eventProduct.delete({
      where: {
        eventId_productId: { eventId, productId },
      },
    });

    return { success: true };
  }

  /**
   * Bulk update products on an event (replace all)
   */
  async bulkUpdateProducts(input: BulkUpdateProductsInput, userId: string) {
    await this.verifyEventOwnership(input.eventId, userId);

    // Verify all products exist
    if (input.products.length > 0) {
      const productIds = input.products.map((p) => p.productId);
      const existingProducts = await this.prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true },
      });

      const existingIds = new Set(existingProducts.map((p) => p.id));
      const missingIds = productIds.filter((id) => !existingIds.has(id));

      if (missingIds.length > 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Products not found: ${missingIds.join(', ')}`,
        });
      }
    }

    // Use transaction for atomicity
    return await this.prisma.$transaction(async (tx) => {
      // Delete all existing
      await tx.eventProduct.deleteMany({
        where: { eventId: input.eventId },
      });

      // Create new ones
      if (input.products.length > 0) {
        await tx.eventProduct.createMany({
          data: input.products.map((p) => ({
            eventId: input.eventId,
            productId: p.productId,
            quantity: p.quantity,
            customPrice: p.customPrice ?? null,
            notes: p.notes ?? null,
          })),
        });
      }

      // Return updated list
      return await tx.eventProduct.findMany({
        where: { eventId: input.eventId },
        select: this.eventProductSelect,
        orderBy: { createdAt: 'asc' },
      });
    });
  }
}
