import { Prisma, PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import type {
  CreateCategoryInput,
  QueryCategoriesInput,
  UpdateCategoryInput,
} from '@/lib/schemas/category.schema';
import type { PaginatedResponse, CategorySelect } from '@/lib/types/prisma-types';
import { generateCategoryId } from '@/lib/utils/id-generator';

export type PaginatedCategories = PaginatedResponse<CategorySelect>;

export class CategoryService {
  constructor(private prisma: PrismaClient) {}

  private readonly categorySelect = {
    id: true,
    categoryId: true,
    name: true,
    description: true,
    isActive: true,
    createdBy: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  async create(data: CreateCategoryInput, createdByUserId: string): Promise<CategorySelect> {
    try {
      const categoryId = await generateCategoryId(this.prisma);

      return await this.prisma.serviceCategory.create({
        data: {
          categoryId,
          name: data.name.trim(),
          description: data.description?.trim() || null,
          createdBy: createdByUserId,
        },
        select: this.categorySelect,
      });
    } catch (error: any) {
      console.error('Error creating category:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to create category: ${error.message || 'Unknown error'}`,
      });
    }
  }

  async findAll(query: QueryCategoriesInput): Promise<PaginatedCategories> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ?? 'name';
    const sortOrder = query.sortOrder ?? 'asc';

    const where: Prisma.ServiceCategoryWhereInput = {};

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { categoryId: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.createdFrom || query.createdTo) {
      where.createdAt = {};
      if (query.createdFrom) {
        where.createdAt.gte = query.createdFrom;
      }
      if (query.createdTo) {
        const endDate = new Date(query.createdTo);
        endDate.setDate(endDate.getDate() + 1);
        where.createdAt.lte = endDate;
      }
    }

    const orderBy: Prisma.ServiceCategoryOrderByWithRelationInput =
      sortBy === 'name' ? { name: sortOrder } : { createdAt: sortOrder };

    const [data, total] = await Promise.all([
      this.prisma.serviceCategory.findMany({
        where,
        select: this.categorySelect,
        orderBy,
        take: limit,
        skip,
      }),
      this.prisma.serviceCategory.count({ where }),
    ]);

    return {
      data: data as CategorySelect[],
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findOne(id: string): Promise<CategorySelect> {
    const category = await this.prisma.serviceCategory.findUnique({
      where: { id },
      select: this.categorySelect,
    });

    if (!category) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Category with ID ${id} not found`,
      });
    }

    return category as CategorySelect;
  }

  async update(id: string, data: Omit<UpdateCategoryInput, 'id'>): Promise<CategorySelect> {
    await this.findOne(id);

    try {
      return await this.prisma.serviceCategory.update({
        where: { id },
        data: {
          name: data.name?.trim(),
          description: data.description === null ? null : data.description?.trim(),
        },
        select: this.categorySelect,
      }) as CategorySelect;
    } catch (error) {
      console.error('Error updating category:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update category. Please try again.',
      });
    }
  }

  async remove(id: string): Promise<{ success: true }> {
    await this.findOne(id);

    try {
      await this.prisma.serviceCategory.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      console.error('Error deleting category:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete category. Please try again.',
      });
    }
  }

  async deleteMany(ids: string[]): Promise<{ count: number }> {
    const result = await this.prisma.serviceCategory.deleteMany({
      where: { id: { in: ids } },
    });
    return { count: result.count };
  }

  async toggleActive(id: string, isActive: boolean): Promise<CategorySelect> {
    await this.findOne(id);

    return await this.prisma.serviceCategory.update({
      where: { id },
      data: { isActive },
      select: this.categorySelect,
    }) as CategorySelect;
  }

  /** Return all active categories (for dropdown use in service form) */
  async findAllActive(): Promise<CategorySelect[]> {
    return (await this.prisma.serviceCategory.findMany({
      where: { isActive: true },
      select: this.categorySelect,
      orderBy: { name: 'asc' },
    })) as CategorySelect[];
  }
}
