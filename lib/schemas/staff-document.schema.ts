import { z } from "zod";
import { REQ_TEMPLATE_IDS } from "@/lib/requirement-templates";

const requirementTemplateIdSchema = z.enum(REQ_TEMPLATE_IDS);

const fileSchema = z.object({
    name: z.string().min(1).max(500),
    url: z.string().url(),
    type: z.string().max(200).optional(),
    size: z.number().int().nonnegative().optional(),
});

export const StaffDocumentSchema = {
    uploadUpdate: z.object({
        requirementTemplateId: requirementTemplateIdSchema,
        name: fileSchema.shape.name,
        url: fileSchema.shape.url,
        type: fileSchema.shape.type,
        size: fileSchema.shape.size,
        expiresAt: z.string().optional().nullable(),
    }),
    listForStaff: z.object({
        staffId: z.string().uuid(),
    }),
    listPendingForStaff: z.object({
        staffId: z.string().uuid(),
    }),
    approve: z.object({
        documentId: z.string().uuid(),
        expiresAt: z.string().optional().nullable(),
    }),
    reject: z.object({
        documentId: z.string().uuid(),
        reason: z.string().min(1).max(1000),
    }),
    categorizeLegacy: z.object({
        staffId: z.string().uuid(),
        legacyIndex: z.number().int().nonnegative(),
        requirementTemplateId: requirementTemplateIdSchema,
        expiresAt: z.string().optional().nullable(),
    }),
};

export type UploadUpdateInput = z.infer<typeof StaffDocumentSchema.uploadUpdate>;
export type ApproveInput = z.infer<typeof StaffDocumentSchema.approve>;
export type RejectInput = z.infer<typeof StaffDocumentSchema.reject>;
export type CategorizeLegacyInput = z.infer<typeof StaffDocumentSchema.categorizeLegacy>;
