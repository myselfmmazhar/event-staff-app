import { z } from "zod";

// Enums matching Prisma
export const InvoiceStatusSchema = z.enum([
    "DRAFT",
    "SENT",
    "PAID",
    "VOID",
    "OVERDUE",
    "CANCELLED",
]);

export const DiscountTypeSchema = z.enum(["AMOUNT", "PERCENT"]);

// Invoice Item Schema
export const InvoiceItemSchema = z.object({
    id: z.string().optional(), // Optional for new items
    productId: z.string().optional().nullable(),
    serviceId: z.string().optional().nullable(),
    description: z.string().min(1, "Description is required"),
    quantity: z.coerce.number().min(0),
    price: z.coerce.number().min(0),
    amount: z.coerce.number().min(0),
    date: z.date().optional().nullable(),
});

// Base Invoice Schema
export const InvoiceSchemaCtx = z.object({
    clientId: z.string().min(1, "Client is required"),
    invoiceNo: z.string().min(1, "Invoice number is required"),
    status: InvoiceStatusSchema.default("DRAFT"),
    invoiceDate: z.coerce.date(),
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
    items: z.array(InvoiceItemSchema).optional(),
});

export const InvoiceSchema = {
    create: InvoiceSchemaCtx,
    update: InvoiceSchemaCtx.extend({
        id: z.string().min(1, "ID is required"),
    }),
    id: z.object({
        id: z.string().min(1, "ID is required"),
    }),
    query: z.object({
        page: z.number().default(1),
        limit: z.number().default(10),
        search: z.string().optional(),
        status: InvoiceStatusSchema.optional(),
        clientId: z.string().optional(),
        showArchived: z.boolean().default(false),
    }),
    deleteMany: z.object({
        ids: z.array(z.string()),
    }),
};

export type InvoiceFormValues = z.infer<typeof InvoiceSchemaCtx>;
export type InvoiceItemFormValues = z.infer<typeof InvoiceItemSchema>;
