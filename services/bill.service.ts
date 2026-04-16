import { PrismaClient, Prisma } from "@prisma/client";
import { BillSchema } from "@/lib/schemas/bill.schema";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

type CreateBillInput = z.infer<typeof BillSchema.create>;
type UpdateBillInput = z.infer<typeof BillSchema.update>;

export class BillService {
    constructor(private prisma: PrismaClient) { }

    async findAll(query: z.infer<typeof BillSchema.query>) {
        const { page, limit, search, status, staffId, showArchived, sortBy = "createdAt", sortOrder = "desc" } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.BillWhereInput = {
            isArchived: showArchived,
            ...(status && { status }),
            ...(staffId && { staffId }),
            ...(search && {
                OR: [
                    { billNo: { contains: search, mode: "insensitive" } },
                    { staff: { firstName: { contains: search, mode: "insensitive" } } },
                    { staff: { lastName: { contains: search, mode: "insensitive" } } },
                ],
            }),
        };

        const orderBy: Prisma.BillOrderByWithRelationInput =
            sortBy === "staff"
                ? { staff: { firstName: sortOrder } }
                : { [sortBy]: sortOrder };

        const [data, total] = await Promise.all([
            this.prisma.bill.findMany({
                where,
                skip,
                take: limit,
                include: {
                    staff: true,
                    items: true,
                    createdByUser: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
                orderBy,
            }),
            this.prisma.bill.count({ where }),
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
        return this.prisma.bill.findUnique({
            where: { id },
            include: {
                items: true,
                staff: true,
            },
        });
    }

    async create(data: CreateBillInput, userId: string) {
        const { items, ...billData } = data;

        const existingBill = await this.prisma.bill.findUnique({
            where: { billNo: billData.billNo },
        });

        if (existingBill) {
            throw new TRPCError({
                code: "CONFLICT",
                message: "Bill number already exists",
            });
        }

        return this.prisma.bill.create({
            data: {
                ...billData,
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
                        scheduledStart: item.scheduledStart,
                        scheduledEnd: item.scheduledEnd,
                        scheduledHours: item.scheduledHours,
                        actualStart: item.actualStart,
                        actualEnd: item.actualEnd,
                        actualHours: item.actualHours,
                        scheduleShiftDetail: item.scheduleShiftDetail,
                        actualShiftDetails: item.actualShiftDetails,
                        internalNotes: item.internalNotes,
                    })),
                },
            },
            include: {
                items: true,
            },
        });
    }

    async update(id: string, data: Omit<UpdateBillInput, "id">) {
        const { items, ...billData } = data;

        return this.prisma.$transaction(async (tx) => {
            // Update bill details
            const bill = await tx.bill.update({
                where: { id },
                data: billData,
            });

            if (items) {
                // Delete existing items
                await tx.billItem.deleteMany({
                    where: { billId: id },
                });

                // Create new items
                if (items.length > 0) {
                    await tx.billItem.createMany({
                        data: items.map((item) => ({
                            billId: id,
                            description: item.description,
                            quantity: item.quantity,
                            price: item.price,
                            amount: item.amount,
                            productId: item.productId,
                            serviceId: item.serviceId,
                            date: item.date,
                            scheduledStart: item.scheduledStart,
                            scheduledEnd: item.scheduledEnd,
                            scheduledHours: item.scheduledHours,
                            actualStart: item.actualStart,
                            actualEnd: item.actualEnd,
                            actualHours: item.actualHours,
                            scheduleShiftDetail: item.scheduleShiftDetail,
                            actualShiftDetails: item.actualShiftDetails,
                            internalNotes: item.internalNotes,
                        })),
                    });
                }
            }

            return tx.bill.findUnique({
                where: { id },
                include: { items: true },
            });
        });
    }

    async archive(id: string) {
        return this.prisma.bill.update({
            where: { id },
            data: {
                isArchived: true,
                archivedAt: new Date(),
            },
        });
    }

    async restore(id: string) {
        return this.prisma.bill.update({
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
        return this.prisma.bill.updateMany({
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
        return this.prisma.bill.delete({
            where: { id },
        });
    }
}
