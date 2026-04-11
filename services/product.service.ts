import { Prisma, PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import type {
  CreateProductInput,
  QueryProductsInput,
  UpdateProductInput,
} from '@/lib/schemas/product.schema';
import type { PaginatedResponse, ProductSelect } from '@/lib/types/prisma-types';
import { generateProductId } from '@/lib/utils/id-generator';

export type PaginatedProducts = PaginatedResponse<ProductSelect>;

export class ProductService {
  constructor(private prisma: PrismaClient) { }

  private readonly productSelect = {
    id: true,
    productId: true,
    title: true,
    description: true,
    priceUnitType: true,
    minimumPurchase: true,
    trackInventory: true,
    supplier: true,
    brand: true,
    category: true,
    cost: true,
    price: true,
    isActive: true,
    createdBy: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  async create(data: CreateProductInput, createdByUserId: string): Promise<ProductSelect> {
    try {
      const productId = await generateProductId(this.prisma);

      return await this.prisma.product.create({
        data: {
          productId,
          title: data.title.trim(),
          description: data.description?.trim() || null,
          priceUnitType: data.priceUnitType ?? undefined,
          minimumPurchase: data.minimumPurchase ?? null,
          trackInventory: data.trackInventory ?? false,
          supplier: data.supplier?.trim() || null,
          brand: data.brand?.trim() || null,
          category: data.category?.trim() || null,
          cost: data.cost ?? null,
          price: data.price ?? null,
          createdBy: createdByUserId,
        },
        select: this.productSelect,
      });
    } catch (error) {
      console.error('Error creating product:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create product. Please try again.',
      });
    }
  }

  async findAll(query: QueryProductsInput): Promise<PaginatedProducts> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ?? 'title';
    const sortOrder = query.sortOrder ?? 'asc';

    const where: Prisma.ProductWhereInput = {};

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.category) {
      where.category = { equals: query.category, mode: 'insensitive' };
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { productId: { contains: query.search, mode: 'insensitive' } },
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

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sortBy === 'title'
        ? { title: sortOrder }
        : sortBy === 'cost'
          ? { cost: sortOrder }
          : sortBy === 'price'
            ? { price: sortOrder }
            : sortBy === 'category'
              ? { category: sortOrder }
              : { createdAt: sortOrder };

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        select: this.productSelect,
        orderBy,
        take: limit,
        skip,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findOne(id: string): Promise<ProductSelect> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: this.productSelect,
    });

    if (!product) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Product with ID ${id} not found`,
      });
    }

    return product;
  }

  async update(id: string, data: Omit<UpdateProductInput, 'id'>): Promise<ProductSelect> {
    await this.findOne(id);

    try {
      return await this.prisma.product.update({
        where: { id },
        data: {
          title: data.title?.trim(),
          description: data.description === null ? null : data.description?.trim(),
          priceUnitType:
            data.priceUnitType === undefined ? undefined : (data.priceUnitType ?? undefined),
          minimumPurchase:
            data.minimumPurchase === undefined ? undefined : data.minimumPurchase,
          trackInventory:
            data.trackInventory === undefined ? undefined : data.trackInventory,
          supplier: data.supplier === null ? null : data.supplier?.trim(),
          brand: data.brand === null ? null : data.brand?.trim(),
          category: data.category === null ? null : data.category?.trim(),
          cost: data.cost === undefined ? undefined : data.cost,
          price: data.price === undefined ? undefined : data.price,
        },
        select: this.productSelect,
      });
    } catch (error) {
      console.error('Error updating product:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update product. Please try again.',
      });
    }
  }

  async remove(id: string): Promise<{ success: true }> {
    await this.findOne(id);

    try {
      await this.prisma.product.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      console.error('Error deleting product:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete product. Please try again.',
      });
    }
  }

  async deleteMany(ids: string[]): Promise<{ count: number }> {
    const result = await this.prisma.product.deleteMany({
      where: { id: { in: ids } },
    });

    return { count: result.count };
  }

  async toggleActive(id: string, isActive: boolean): Promise<ProductSelect> {
    await this.findOne(id);

    return await this.prisma.product.update({
      where: { id },
      data: { isActive },
      select: this.productSelect,
    });
  }
}

