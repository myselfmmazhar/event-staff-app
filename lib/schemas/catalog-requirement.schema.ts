import { z } from 'zod';
import { REQ_TEMPLATE_IDS } from '@/lib/requirement-templates';

const reqTemplateIdSchema = z.enum(REQ_TEMPLATE_IDS);

/** String literals match Prisma `CatalogRequirementExpiration` (avoid `z.nativeEnum` + `@prisma/client` in API bundles where the enum object can be undefined). */
const CATALOG_REQUIREMENT_EXPIRATION = [
  'NEVER',
  'CUSTOM_DATE',
] as const;

const expirationSchema = z.enum(CATALOG_REQUIREMENT_EXPIRATION);

export const CatalogRequirementSchema = {
  create: z
    .object({
      serviceCategoryId: z.string().uuid('Invalid category ID'),
      templateId: reqTemplateIdSchema,
      name: z
        .string()
        .min(1, 'Name is required')
        .max(200, 'Name must be 200 characters or less')
        .transform((v) => v.trim()),
      instructions: z
        .string()
        .max(5000)
        .transform((v) => v.trim())
        .optional()
        .nullable(),
      allowPdf: z.boolean().default(true),
      allowImage: z.boolean().default(true),
      allowOther: z.boolean().default(false),
      expirationType: expirationSchema.default('NEVER'),
      expirationDate: z.coerce.date().optional().nullable(),
      allowEarlyRenewal: z.boolean().default(false),
      requiresApproval: z.boolean().default(false),
      isTalentRequired: z.boolean().default(false),
    })
    .superRefine((data, ctx) => {
      if (data.templateId === 'upload' && !data.allowPdf && !data.allowImage && !data.allowOther) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select at least one accepted file format',
          path: ['allowPdf'],
        });
      }
      if (data.expirationType === 'CUSTOM_DATE' && !data.expirationDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please select an expiration date',
          path: ['expirationDate'],
        });
      }
    }),

  query: z.object({
    page: z.number().int().min(1).default(1).optional(),
    limit: z.number().int().min(1).max(100).default(10).optional(),
    search: z.string().optional(),
    serviceCategoryId: z.string().uuid().optional(),
  }),

  id: z.object({
    id: z.string().uuid('Invalid requirement ID'),
  }),
};

export type CreateCatalogRequirementInput = z.infer<typeof CatalogRequirementSchema.create>;
export type QueryCatalogRequirementsInput = z.infer<typeof CatalogRequirementSchema.query>;
export type CatalogRequirementIdInput = z.infer<typeof CatalogRequirementSchema.id>;
