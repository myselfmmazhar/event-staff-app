import { Prisma, PrismaClient, type CatalogRequirementExpiration } from '@prisma/client';
import { CATEGORY_REQUIREMENT_TYPE } from '@/lib/category-requirements';
import {
  deriveRequirementTypeFromTemplateIds,
  isTalentSubmissionTemplateId,
  normalizeReqTemplateIds,
  type ReqTemplateId,
} from '@/lib/requirement-templates';
import { TRPCError } from '@trpc/server';
import type {
  CreateCatalogRequirementInput,
  QueryCatalogRequirementsInput,
} from '@/lib/schemas/catalog-requirement.schema';
import type { PaginatedResponse } from '@/lib/types/prisma-types';

export type CatalogRequirementListRow = {
  id: string;
  name: string;
  templateId: string;
  expirationType: CatalogRequirementExpiration;
  requiresApproval: boolean;
  isTalentRequired: boolean;
  createdAt: Date;
  serviceCategory: {
    id: string;
    categoryId: string;
    name: string;
  };
};

export type PaginatedCatalogRequirements = PaginatedResponse<CatalogRequirementListRow>;

export class CatalogRequirementService {
  constructor(private prisma: PrismaClient) {}

  private readonly listSelect = {
    id: true,
    name: true,
    templateId: true,
    expirationType: true,
    requiresApproval: true,
    isTalentRequired: true,
    createdAt: true,
    serviceCategory: {
      select: { id: true, categoryId: true, name: true },
    },
  } as const;

  /** Keeps `service_categories.requirementTemplateIds` / type / isRequired aligned with requirement rows. */
  async syncCategoryFromRequirements(serviceCategoryId: string): Promise<void> {
    const reqs = await this.prisma.catalogRequirement.findMany({
      where: { serviceCategoryId },
      select: { templateId: true, isTalentRequired: true },
    });

    const templateIds = normalizeReqTemplateIds(reqs.map((r) => r.templateId));
    const requirementType = deriveRequirementTypeFromTemplateIds(templateIds);

    const isRequired =
      requirementType === CATEGORY_REQUIREMENT_TYPE.STANDARD
        ? false
        : reqs.some(
            (r) =>
              r.isTalentRequired &&
              isTalentSubmissionTemplateId(r.templateId as ReqTemplateId)
          );

    await this.prisma.serviceCategory.update({
      where: { id: serviceCategoryId },
      data: {
        requirementTemplateIds: templateIds,
        requirementType,
        isRequired,
      },
    });
  }

  async create(data: CreateCatalogRequirementInput, createdByUserId: string): Promise<CatalogRequirementListRow> {
    const category = await this.prisma.serviceCategory.findUnique({
      where: { id: data.serviceCategoryId },
      select: { id: true },
    });
    if (!category) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Category not found' });
    }

    try {
      // Avoid interactive `$transaction(async (tx) => …)` here: with PrismaPg + Prisma 7, `tx.catalogRequirement`
      // can be undefined in the transaction callback. Use the main client instead.
      const created = await this.prisma.catalogRequirement.create({
        data: {
          serviceCategoryId: data.serviceCategoryId,
          templateId: data.templateId,
          name: data.name,
          instructions: data.instructions?.trim() || null,
          allowPdf: data.allowPdf,
          allowImage: data.allowImage,
          allowOther: data.allowOther,
          expirationType: data.expirationType,
          expirationDate: data.expirationType === 'CUSTOM_DATE' ? (data.expirationDate ?? null) : null,
          allowEarlyRenewal: data.allowEarlyRenewal,
          requiresApproval: data.requiresApproval,
          isTalentRequired: data.isTalentRequired,
          createdBy: createdByUserId,
        },
        select: this.listSelect,
      });
      try {
        await this.syncCategoryFromRequirements(data.serviceCategoryId);
      } catch (syncErr) {
        await this.prisma.catalogRequirement.delete({ where: { id: created.id } }).catch(() => {});
        throw syncErr;
      }
      return created as CatalogRequirementListRow;
    } catch (error: unknown) {
      if (error instanceof TRPCError) throw error;
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error creating catalog requirement:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to create requirement: ${message}`,
      });
    }
  }

  async findAll(query: QueryCatalogRequirementsInput): Promise<PaginatedCatalogRequirements> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.CatalogRequirementWhereInput = {};
    if (query.serviceCategoryId) {
      where.serviceCategoryId = query.serviceCategoryId;
    }
    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { serviceCategory: { name: { contains: q, mode: 'insensitive' } } },
        { serviceCategory: { categoryId: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.catalogRequirement.findMany({
        where,
        select: this.listSelect,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.catalogRequirement.count({ where }),
    ]);

    return {
      data: data as CatalogRequirementListRow[],
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async remove(id: string): Promise<{ success: true; serviceCategoryId: string }> {
    const existing = await this.prisma.catalogRequirement.findUnique({
      where: { id },
      select: { id: true, serviceCategoryId: true },
    });
    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Requirement not found' });
    }

    try {
      await this.prisma.catalogRequirement.delete({ where: { id } });
      await this.syncCategoryFromRequirements(existing.serviceCategoryId);
      return { success: true, serviceCategoryId: existing.serviceCategoryId };
    } catch (error) {
      console.error('Error deleting catalog requirement:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete requirement',
      });
    }
  }
}
