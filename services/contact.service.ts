import { PrismaClient, Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { generateContactId } from "@/lib/utils/id-generator";
import type { CreateContactInput, UpdateContactInput, QueryContactsInput } from "@/lib/schemas/contact.schema";
import type { ContactSelect, PaginatedResponse } from "@/lib/types/prisma-types";

// Last updated: 2026-02-25T13:52:00Z - Forcing reload after schema sync
export type PaginatedContacts = PaginatedResponse<ContactSelect>;

export class ContactService {
    constructor(private prisma: PrismaClient) { }

    private readonly contactSelect = {
        id: true,
        contactId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        transactionType: true,
        ricsSurveyAccount: true,
        correspondingAddress: true,
        contactSource: true,
        contactType: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
    } as const;

    async create(data: CreateContactInput, createdByUserId: string) {
        try {
            const contactId = await generateContactId(this.prisma);
            return await this.prisma.contact.create({
                data: {
                    ...data,
                    contactId,
                    createdBy: createdByUserId,
                },
                select: this.contactSelect,
            });
        } catch (error) {
            console.error("DEBUG: Error creating contact:", error);
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                console.error("DEBUG: Prisma error code:", error.code);
                console.error("DEBUG: Prisma error meta:", error.meta);
            }
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: `Failed to create contact: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
        }
    }

    async update(id: string, data: Partial<UpdateContactInput>): Promise<ContactSelect> {
        try {
            return await this.prisma.contact.update({
                where: { id },
                data,
                select: this.contactSelect,
            });
        } catch (error) {
            console.error("Error updating contact:", error);
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to update contact",
            });
        }
    }

    async findAll(query: QueryContactsInput, createdByUserId?: string): Promise<PaginatedContacts> {
        const page = query.page ?? 1;
        const limit = Math.min(query.limit ?? 20, 100);
        const skip = (page - 1) * limit;
        const sortBy = query.sortBy ?? "createdAt";
        const sortOrder = query.sortOrder ?? "desc";
        const filterType = query.contactType || 'ALL';

        let data: any[] = [];
        let total = 0;

        // Mode 1: Client Manager ONLY
        if (filterType === 'CLIENT') {
            const where: Prisma.ClientWhereInput = {};
            if (createdByUserId) where.createdBy = createdByUserId;
            if (query.search) {
                where.OR = [
                    { firstName: { contains: query.search, mode: "insensitive" } },
                    { lastName: { contains: query.search, mode: "insensitive" } },
                    { email: { contains: query.search, mode: "insensitive" } },
                    { businessName: { contains: query.search, mode: "insensitive" } },
                ];
            }

            const [clients, count] = await Promise.all([
                this.prisma.client.findMany({
                    where,
                    take: limit,
                    skip,
                    orderBy: { [sortBy === 'firstName' || sortBy === 'lastName' || sortBy === 'email' ? sortBy : 'createdAt']: sortOrder },
                }),
                this.prisma.client.count({ where }),
            ]);

            data = clients.map(c => ({
                id: c.id,
                contactId: c.clientId,
                firstName: c.firstName,
                lastName: c.lastName,
                email: c.email,
                phone: c.cellPhone,
                dateOfBirth: null,
                transactionType: 'CLIENT',
                ricsSurveyAccount: false,
                correspondingAddress: c.businessName || c.businessAddress || 'Business Client',
                contactSource: 'Client Manager',
                contactType: 'CLIENT',
                createdBy: c.createdBy,
                createdAt: c.createdAt,
                updatedAt: c.updatedAt,
            }));
            total = count;

            // Mode 2: Staff Manager ONLY
        } else if (filterType === 'STAFF') {
            const where: Prisma.StaffWhereInput = {};
            if (createdByUserId) where.createdBy = createdByUserId;
            if (query.search) {
                where.OR = [
                    { firstName: { contains: query.search, mode: "insensitive" } },
                    { lastName: { contains: query.search, mode: "insensitive" } },
                    { email: { contains: query.search, mode: "insensitive" } },
                ];
            }

            const [staff, count] = await Promise.all([
                this.prisma.staff.findMany({
                    where,
                    take: limit,
                    skip,
                    orderBy: { [sortBy === 'firstName' || sortBy === 'lastName' || sortBy === 'email' ? sortBy : 'createdAt']: sortOrder },
                }),
                this.prisma.staff.count({ where }),
            ]);

            data = staff.map(s => ({
                id: s.id,
                contactId: s.staffId,
                firstName: s.firstName,
                lastName: s.lastName,
                email: s.email,
                phone: s.phone,
                dateOfBirth: s.dateOfBirth,
                transactionType: 'STAFF',
                ricsSurveyAccount: false,
                correspondingAddress: s.staffType || 'Staff Member',
                contactSource: 'Staff Manager',
                contactType: 'STAFF',
                createdBy: s.createdBy,
                createdAt: s.createdAt,
                updatedAt: s.updatedAt,
            }));
            total = count;

            // Mode 3: Combined View (ALL) or Fallback
        } else {
            const clientWhere: Prisma.ClientWhereInput = {};
            const staffWhere: Prisma.StaffWhereInput = {};

            if (createdByUserId) {
                clientWhere.createdBy = createdByUserId;
                staffWhere.createdBy = createdByUserId;
            }

            if (query.search) {
                const searchObj = { contains: query.search, mode: "insensitive" as const };
                clientWhere.OR = [{ firstName: searchObj }, { lastName: searchObj }, { email: searchObj }, { businessName: searchObj }];
                staffWhere.OR = [{ firstName: searchObj }, { lastName: searchObj }, { email: searchObj }];
            }

            const [clients, staff, cCount, sCount] = await Promise.all([
                this.prisma.client.findMany({ where: clientWhere, take: limit, orderBy: { createdAt: 'desc' } }),
                this.prisma.staff.findMany({ where: staffWhere, take: limit, orderBy: { createdAt: 'desc' } }),
                this.prisma.client.count({ where: clientWhere }),
                this.prisma.staff.count({ where: staffWhere }),
            ]);

            const merged = [
                ...clients.map(c => ({
                    id: c.id,
                    contactId: c.clientId,
                    firstName: c.firstName,
                    lastName: c.lastName,
                    email: c.email,
                    phone: c.cellPhone,
                    transactionType: 'CLIENT',
                    correspondingAddress: c.businessName || 'Client',
                    contactSource: 'Client Manager',
                    contactType: 'CLIENT',
                    createdAt: c.createdAt,
                })),
                ...staff.map(s => ({
                    id: s.id,
                    contactId: s.staffId,
                    firstName: s.firstName,
                    lastName: s.lastName,
                    email: s.email,
                    phone: s.phone,
                    transactionType: 'STAFF',
                    correspondingAddress: 'Staff',
                    contactSource: 'Staff Manager',
                    contactType: 'STAFF',
                    createdAt: s.createdAt,
                }))
            ];

            // Sort merged by createdAt desc
            data = merged.sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
            total = cCount + sCount;
        }

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit) || 1,
            },
        };
    }

    async findOne(id: string): Promise<ContactSelect> {
        const contact = await this.prisma.contact.findUnique({
            where: { id },
            select: this.contactSelect,
        });

        if (!contact) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "Contact not found",
            });
        }

        return contact as ContactSelect;
    }

    async remove(id: string) {
        try {
            await this.prisma.contact.delete({
                where: { id },
            });
            return { success: true };
        } catch (error) {
            console.error("Error deleting contact:", error);
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to delete contact",
            });
        }
    }
}
