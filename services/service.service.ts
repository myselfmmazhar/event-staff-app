import { Prisma, PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import type {
  CreateServiceInput,
  QueryServicesInput,
  UpdateServiceInput,
} from '@/lib/schemas/service.schema';
import type { PaginatedResponse, ServiceSelect } from '@/lib/types/prisma-types';
import { generateServiceId } from '@/lib/utils/id-generator';

export type PaginatedServices = PaginatedResponse<ServiceSelect>;

export class ServiceService {
  constructor(private prisma: PrismaClient) { }

  private readonly serviceSelect = {
    id: true,
    serviceId: true,
    title: true,
    costUnitType: true,
    description: true,
    cost: true,
    price: true,
    minimum: true,
    expenditure: true,
    expenditureAmount: true,
    expenditureAmountType: true,
    travelInMinimum: true,
    isActive: true,
    createdBy: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  async create(data: CreateServiceInput, createdByUserId: string): Promise<ServiceSelect> {
    try {
      const serviceId = await generateServiceId(this.prisma);

      return await this.prisma.service.create({
        data: {
          serviceId,
          title: data.title.trim(),
          costUnitType: data.costUnitType ?? null,
          description: data.description?.trim() || null,
          cost: data.cost ?? null,
          price: data.price ?? null,
          minimum: data.minimum ?? null,
          expenditure: data.expenditure ?? false,
          expenditureAmount: data.expenditureAmount ?? null,
          expenditureAmountType: data.expenditureAmountType ?? null,
          travelInMinimum: data.travelInMinimum ?? false,
          createdBy: createdByUserId,
        },
        select: this.serviceSelect,
      });
    } catch (error) {
      console.error('Error creating service:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create service. Please try again.',
      });
    }
  }

  async findAll(query: QueryServicesInput): Promise<PaginatedServices> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ?? 'title';
    const sortOrder = query.sortOrder ?? 'asc';

    const where: Prisma.ServiceWhereInput = {};

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { serviceId: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Date range filters
    if (query.createdFrom || query.createdTo) {
      where.createdAt = {};
      if (query.createdFrom) {
        where.createdAt.gte = query.createdFrom;
      }
      if (query.createdTo) {
        // Add one day to include the entire end date
        const endDate = new Date(query.createdTo);
        endDate.setDate(endDate.getDate() + 1);
        where.createdAt.lte = endDate;
      }
    }

    const orderBy: Prisma.ServiceOrderByWithRelationInput =
      sortBy === 'title'
        ? { title: sortOrder }
        : sortBy === 'cost'
          ? { cost: sortOrder }
          : sortBy === 'price'
            ? { price: sortOrder }
            : { createdAt: sortOrder };

    const [data, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        select: this.serviceSelect,
        orderBy,
        take: limit,
        skip,
      }),
      this.prisma.service.count({ where }),
    ]);

    return {
      data: data as ServiceSelect[],
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findOne(id: string): Promise<ServiceSelect> {
    const service = await this.prisma.service.findUnique({
      where: { id },
      select: this.serviceSelect,
    });

    if (!service) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Service with ID ${id} not found`,
      });
    }

    return service as ServiceSelect;
  }

  async update(
    id: string,
    data: Omit<UpdateServiceInput, 'id'>
  ): Promise<ServiceSelect> {
    await this.findOne(id);

    try {
      return await this.prisma.service.update({
        where: { id },
        data: {
          title: data.title?.trim(),
          costUnitType:
            data.costUnitType === undefined ? undefined : data.costUnitType,
          description:
            data.description === null ? null : data.description?.trim(),
          cost: data.cost === undefined ? undefined : data.cost,
          price: data.price === undefined ? undefined : data.price,
          minimum: data.minimum === undefined ? undefined : data.minimum,
          expenditure: data.expenditure === undefined ? undefined : data.expenditure,
          expenditureAmount: data.expenditureAmount === undefined ? undefined : data.expenditureAmount,
          expenditureAmountType: data.expenditureAmountType === undefined ? undefined : data.expenditureAmountType,
          travelInMinimum: data.travelInMinimum === undefined ? undefined : data.travelInMinimum,
        },
        select: this.serviceSelect,
      }) as ServiceSelect;
    } catch (error) {
      console.error('Error updating service:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update service. Please try again.',
      });
    }
  }

  async remove(id: string): Promise<{ success: true }> {
    await this.findOne(id);

    try {
      await this.prisma.service.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      console.error('Error deleting service:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete service. Please try again.',
      });
    }
  }

  async deleteMany(ids: string[]): Promise<{ count: number }> {
    const result = await this.prisma.service.deleteMany({
      where: { id: { in: ids } },
    });

    return { count: result.count };
  }

  async toggleActive(id: string, isActive: boolean): Promise<ServiceSelect> {
    await this.findOne(id);

    return await this.prisma.service.update({
      where: { id },
      data: { isActive },
      select: this.serviceSelect,
    });
  }
}
