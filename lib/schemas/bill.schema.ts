import { z } from "zod";

// Enums matching Prisma
export const BillStatusSchema = z.enum([
    "DRAFT",
    "PENDING",
    "APPROVED",
    "PAID",
    "VOID",
    "CANCELLED",
]);

export const DiscountTypeSchema = z.enum(["AMOUNT", "PERCENT"]);

// Bill Item Schema
export const BillItemSchema = z.object({
    id: z.string().optional(), // Optional for new items
    productId: z.string().optional().nullable(),
    serviceId: z.string().optional().nullable(),
    description: z.string().min(1, "Description is required"),
    quantity: z.coerce.number().min(0),
    price: z.coerce.number().min(0),
    amount: z.coerce.number().min(0),
    date: z.coerce.date().optional().nullable(),
    scheduledStart: z.date().optional().nullable(),
    scheduledEnd: z.date().optional().nullable(),
    scheduledHours: z.coerce.number().optional().nullable(),
    actualStart: z.date().optional().nullable(),
    actualEnd: z.date().optional().nullable(),
    actualHours: z.coerce.number().optional().nullable(),
    scheduleShiftDetail: z.string().optional().nullable(),
    actualShiftDetails: z.string().optional().nullable(),
    internalNotes: z.string().optional().nullable(),
});


// Base Bill Schema
export const BillSchemaCtx = z.object({
    staffId: z.string().min(1, "Staff is required"),
    billNo: z.string().min(1, "Bill number is required"),
    status: BillStatusSchema.default("DRAFT"),
    billDate: z.coerce.date(),
    dueDate: z.coerce.date().optional().nullable(),
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
    items: z.array(BillItemSchema).optional(),
});

export const BillSchema = {
    create: BillSchemaCtx,
    update: BillSchemaCtx.extend({
        id: z.string().min(1, "ID is required"),
    }),
    id: z.object({
        id: z.string().min(1, "ID is required"),
    }),
    query: z.object({
        page: z.number().default(1),
        limit: z.number().default(10),
        search: z.string().optional(),
        status: BillStatusSchema.optional(),
        staffId: z.string().optional(),
        showArchived: z.boolean().default(false),
        sortBy: z.enum(["createdAt", "updatedAt", "billNo", "billDate", "status", "staff"]).default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
    }),
    deleteMany: z.object({
        ids: z.array(z.string()),
    }),
};

export type BillFormValues = z.infer<typeof BillSchemaCtx>;
export type BillItemFormValues = z.infer<typeof BillItemSchema>;
