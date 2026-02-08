import { PrismaClient, Prisma } from "@prisma/client";
import { InvoiceSchema } from "@/lib/schemas/invoice.schema";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

type CreateInvoiceInput = z.infer<typeof InvoiceSchema.create>;
type UpdateInvoiceInput = z.infer<typeof InvoiceSchema.update>;

export class InvoiceService {
    constructor(private prisma: PrismaClient) { }

    async findAll(query: z.infer<typeof InvoiceSchema.query>) {
        const { page, limit, search, status, clientId, showArchived } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.InvoiceWhereInput = {
            isArchived: showArchived,
            ...(status && { status }),
            ...(clientId && { clientId }),
            ...(search && {
                OR: [
                    { invoiceNo: { contains: search, mode: "insensitive" } },
                    { client: { businessName: { contains: search, mode: "insensitive" } } },
                ],
            }),
        };

        const [data, total] = await Promise.all([
            this.prisma.invoice.findMany({
                where,
                skip,
                take: limit,
                include: {
                    client: true,
                    items: true,
                    createdByUser: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
            }),
            this.prisma.invoice.count({ where }),
        ]);

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string) {
        return this.prisma.invoice.findUnique({
            where: { id },
            include: {
                items: true,
                client: true,
            },
        });
    }

    async create(data: CreateInvoiceInput, userId: string) {
        const { items, ...invoiceData } = data;

        const existingInvoice = await this.prisma.invoice.findUnique({
            where: { invoiceNo: invoiceData.invoiceNo },
        });

        if (existingInvoice) {
            throw new TRPCError({
                code: "CONFLICT",
                message: "Invoice number already exists",
            });
        }

        return this.prisma.invoice.create({
            data: {
                ...invoiceData,
                createdBy: userId,
                items: {
                    create: items?.map((item) => ({
                        description: item.description,
                        quantity: item.quantity,
                        price: item.price,
                        amount: item.amount,
                        productId: item.productId,
                        serviceId: item.serviceId,
                        date: item.date,
                    })),
                },
            },
            include: {
                items: true,
            },
        });
    }

    async update(id: string, data: Omit<UpdateInvoiceInput, "id">) {
        const { items, ...invoiceData } = data;

        // Transaction to handle items update (delete all and recreate for simplicity in this version, 
        // or use upsert if we want to keep IDs. For invoices, usually replacing lines is acceptable 
        // or checking for IDs)

        return this.prisma.$transaction(async (tx) => {
            // Update invoice details
            const invoice = await tx.invoice.update({
                where: { id },
                data: invoiceData,
            });

            if (items) {
                // Delete existing items
                await tx.invoiceItem.deleteMany({
                    where: { invoiceId: id },
                });

                // Create new items
                if (items.length > 0) {
                    await tx.invoiceItem.createMany({
                        data: items.map((item) => ({
                            invoiceId: id,
                            description: item.description,
                            quantity: item.quantity,
                            price: item.price,
                            amount: item.amount,
                            productId: item.productId,
                            serviceId: item.serviceId,
                            date: item.date,
                        })),
                    });
                }
            }

            return tx.invoice.findUnique({
                where: { id },
                include: { items: true },
            });
        });
    }

    async archive(id: string) {
        return this.prisma.invoice.update({
            where: { id },
            data: {
                isArchived: true,
                archivedAt: new Date(),
            },
        });
    }

    async restore(id: string) {
        return this.prisma.invoice.update({
            where: { id },
            data: {
                isArchived: false,
                archivedAt: null,
            },
        });
    }

    async delete(id: string) {
        return this.archive(id);
    }

    async deleteMany(ids: string[]) {
        return this.prisma.invoice.updateMany({
            where: {
                id: { in: ids },
            },
            data: {
                isArchived: true,
                archivedAt: new Date(),
            },
        });
    }
}
