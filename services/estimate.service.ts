import { PrismaClient, Prisma } from "@prisma/client";
import { EstimateSchema } from "@/lib/schemas/estimate.schema";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

type CreateEstimateInput = z.infer<typeof EstimateSchema.create>;
type UpdateEstimateInput = z.infer<typeof EstimateSchema.update>;

export class EstimateService {
    constructor(private prisma: PrismaClient) { }

    async findAll(query: z.infer<typeof EstimateSchema.query>) {
        const { page, limit, search, status, clientId, showArchived } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.EstimateWhereInput = {
            isArchived: showArchived,
            ...(status && { status }),
            ...(clientId && { clientId }),
            ...(search && {
                OR: [
                    { estimateNo: { contains: search, mode: "insensitive" } },
                    { client: { businessName: { contains: search, mode: "insensitive" } } },
                ],
            }),
        };

        const [data, total] = await Promise.all([
            this.prisma.estimate.findMany({
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
            this.prisma.estimate.count({ where }),
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
        return this.prisma.estimate.findUnique({
            where: { id },
            include: {
                items: true,
                client: true,
            },
        });
    }

    async create(data: CreateEstimateInput, userId: string) {
        const { items, ...estimateData } = data;

        const existingEstimate = await this.prisma.estimate.findUnique({
            where: { estimateNo: estimateData.estimateNo },
        });

        if (existingEstimate) {
            throw new TRPCError({
                code: "CONFLICT",
                message: "Estimate number already exists",
            });
        }

        return this.prisma.estimate.create({
            data: {
                ...estimateData,
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

    async update(id: string, data: Omit<UpdateEstimateInput, "id">) {
        const { items, ...estimateData } = data;

        return this.prisma.$transaction(async (tx) => {
            // Update estimate details
            const estimate = await tx.estimate.update({
                where: { id },
                data: estimateData,
            });

            if (items) {
                // Delete existing items
                await tx.estimateItem.deleteMany({
                    where: { estimateId: id },
                });

                // Create new items
                if (items.length > 0) {
                    await tx.estimateItem.createMany({
                        data: items.map((item) => ({
                            estimateId: id,
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

            return tx.estimate.findUnique({
                where: { id },
                include: { items: true },
            });
        });
    }

    async archive(id: string) {
        return this.prisma.estimate.update({
            where: { id },
            data: {
                isArchived: true,
                archivedAt: new Date(),
            },
        });
    }

    async restore(id: string) {
        return this.prisma.estimate.update({
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
        return this.prisma.estimate.updateMany({
            where: {
                id: { in: ids },
            },
            data: {
                isArchived: true,
                archivedAt: new Date(),
            },
        });
    }

    async hardDelete(id: string) {
        return this.prisma.estimate.delete({
            where: { id },
        });
    }
}
