import { z } from "zod";

// Enums matching Prisma
export const EstimateStatusSchema = z.enum([
    "DRAFT",
    "SENT",
    "APPROVED",
    "DECLINED",
    "EXPIRED",
    "CONVERTED",
]);

export const DiscountTypeSchema = z.enum(["AMOUNT", "PERCENT"]);

// Estimate Item Schema
export const EstimateItemSchema = z.object({
    id: z.string().optional(), // Optional for new items
    productId: z.string().optional().nullable(),
    serviceId: z.string().optional().nullable(),
    description: z.string().min(1, "Description is required"),
    quantity: z.coerce.number().min(0),
    price: z.coerce.number().min(0),
    amount: z.coerce.number().min(0),
    date: z.date().optional().nullable(),
});

// Base Estimate Schema
export const EstimateSchemaCtx = z.object({
    clientId: z.string().min(1, "Client is required"),
    estimateNo: z.string().min(1, "Estimate number is required"),
    status: EstimateStatusSchema.default("DRAFT"),
    estimateDate: z.coerce.date(),
    expirationDate: z.coerce.date().optional().nullable(),
    approvedBy: z.string().optional().nullable(),
    approvedDate: z.coerce.date().optional().nullable(),
    terms: z.string().optional().nullable(),
    customField1: z.string().optional().nullable(),
    customField2: z.string().optional().nullable(),
    customField3: z.string().optional().nullable(),
    discountType: DiscountTypeSchema.optional().nullable(),
    discountValue: z.coerce.number().optional().nullable(),
    depositAmount: z.coerce.number().optional().nullable(),
    shippingAmount: z.coerce.number().optional().nullable(),
    salesTaxAmount: z.coerce.number().optional().nullable(),
    isTaxable: z.boolean().default(false),
    notes: z.string().optional().nullable(),
    paymentDetails: z.string().optional().nullable(),
    items: z.array(EstimateItemSchema).optional(),
});

export const EstimateSchema = {
    create: EstimateSchemaCtx,
    update: EstimateSchemaCtx.extend({
        id: z.string().min(1, "ID is required"),
    }),
    id: z.object({
        id: z.string().min(1, "ID is required"),
    }),
    query: z.object({
        page: z.number().default(1),
        limit: z.number().default(10),
        search: z.string().optional(),
        status: EstimateStatusSchema.optional(),
        clientId: z.string().optional(),
        showArchived: z.boolean().default(false),
    }),
    deleteMany: z.object({
        ids: z.array(z.string()),
    }),
};

export type EstimateFormValues = z.infer<typeof EstimateSchemaCtx>;
export type EstimateItemFormValues = z.infer<typeof EstimateItemSchema>;
