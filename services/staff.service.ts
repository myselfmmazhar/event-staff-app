import { PrismaClient, Prisma, AccountStatus, StaffType, RateType, SkillLevel, StaffRating } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import type {
    CreateStaffInput,
    UpdateStaffInput,
    QueryStaffInput,
} from "@/lib/schemas/staff.schema";

/**
 * Staff Select Type (return type for queries)
 */
type StaffSelect = {
    id: string;
    staffId: string;
    accountStatus: AccountStatus;
    staffType: StaffType;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    dateOfBirth: Date;
    payRate: Prisma.Decimal;
    billRate: Prisma.Decimal;
    rateType: RateType;
    skillLevel: SkillLevel;
    streetAddress: string;
    aptSuiteUnit: string | null;
    city: string;
    country: string;
    state: string;
    zipCode: string;
    experience: string | null;
    staffRating: StaffRating;
    internalNotes: string | null;
    contractorId: string | null;
    userId: string | null;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    positions: Array<{
        id: string;
        staffId: string;
        positionId: string;
        assignedAt: Date;
        position: {
            id: string;
            name: string;
            description: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    workTypes: Array<{
        workType: {
            id: string;
            name: string;
        };
    }>;
    contractor?: {
        id: string;
        staffId: string;
        firstName: string;
        lastName: string;
    } | null;
};

/**
 * Paginated Staff Response
 */
type PaginatedStaff = {
    data: StaffSelect[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
    total: number;
    page: number;
    limit: number;
    totalPages: number;
};

/**
 * Staff Statistics
 */
type StaffStats = {
    total: number;
    active: number;
    disabled: number;
    pending: number;
    employees: number;
    contractors: number;
};

/**
 * Staff Service - Business logic layer for staff operations
 */
export class StaffService {
    constructor(private prisma: PrismaClient) { }

    /**
     * Generate a unique Staff ID in format STF-YYYY-NNN
     * Includes race condition protection
     */
    async generateStaffId(): Promise<string> {
        const currentYear = new Date().getFullYear();
        const prefix = `STF-${currentYear}`;

        // Find the last staff ID for the current year
        const lastStaff = await this.prisma.staff.findFirst({
            where: {
                staffId: {
                    startsWith: prefix,
                },
            },
            orderBy: {
                staffId: "desc",
            },
            select: {
                staffId: true,
            },
        });

        let nextNumber = 1;
        if (lastStaff) {
            const lastNumber = parseInt(lastStaff.staffId.split("-")[2]);
            nextNumber = lastNumber + 1;
        }

        return `${prefix}-${String(nextNumber).padStart(3, "0")}`;
    }

    /**
     * Create a new staff member
     * Handles position and work type assignments
     */
    async create(
        data: CreateStaffInput,
        createdByUserId: string
    ): Promise<StaffSelect> {
        const { positionIds, workTypeIds, ...staffData } = data;

        // Generate unique Staff ID
        const staffId = await this.generateStaffId();

        try {
            const staff = await this.prisma.staff.create({
                data: {
                    staffId,
                    ...staffData,
                    createdBy: createdByUserId,
                    positions: {
                        create: positionIds.map((positionId) => ({
                            positionId,
                        })),
                    },
                    workTypes: {
                        create: workTypeIds.map((workTypeId) => ({
                            workTypeId,
                        })),
                    },
                },
                select: this.getStaffSelect(),
            });

            return staff;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new TRPCError({
                        code: "CONFLICT",
                        message: "A staff member with this email already exists",
                    });
                }
                if (error.code === "P2003") {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: "Invalid contractor, position, or work type ID provided",
                    });
                }
            }
            console.error("Error creating staff:", error);
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to create staff member",
            });
        }
    }

    /**
     * Update a staff member
     * Handles position and work type assignment updates
     */
    async update(
        id: string,
        data: Omit<UpdateStaffInput, "id">
    ): Promise<StaffSelect> {
        const { positionIds, workTypeIds, ...updateData } = data as Omit<UpdateStaffInput, "id"> & {
            positionIds?: string[];
            workTypeIds?: string[];
        };

        // Check if staff exists
        const existing = await this.prisma.staff.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "Staff member not found",
            });
        }

        try {
            const staff = await this.prisma.staff.update({
                where: { id },
                data: {
                    ...updateData,
                    // Update positions if provided
                    ...(positionIds !== undefined && {
                        positions: {
                            deleteMany: {},
                            create: positionIds.map((positionId: string) => ({
                                positionId,
                            })),
                        },
                    }),
                    // Update work types if provided
                    ...(workTypeIds !== undefined && {
                        workTypes: {
                            deleteMany: {},
                            create: workTypeIds.map((workTypeId: string) => ({
                                workTypeId,
                            })),
                        },
                    }),
                },
                select: this.getStaffSelect(),
            });

            return staff;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new TRPCError({
                        code: "CONFLICT",
                        message: "A staff member with this email already exists",
                    });
                }
                if (error.code === "P2003") {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: "Invalid contractor, position, or work type ID provided",
                    });
                }
            }
            console.error("Error updating staff:", error);
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to update staff member",
            });
        }
    }

    /**
     * Get all staff members with pagination, search, and filters
     */
    async findAll(
        query: QueryStaffInput,
        createdByUserId?: string
    ): Promise<PaginatedStaff> {
        const {
            page = 1,
            limit = 10,
            search,
            sortBy = "createdAt",
            sortOrder = "desc",
            accountStatus,
            staffType,
            skillLevel,
            contractorId,
            positionId,
            workTypeId,
            createdFrom,
            createdTo,
        } = query;

        // Build where clause
        const where: Prisma.StaffWhereInput = {
            ...(createdByUserId && { createdBy: createdByUserId }),
            ...(search && {
                OR: [
                    { firstName: { contains: search, mode: "insensitive" } },
                    { lastName: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                    { phone: { contains: search, mode: "insensitive" } },
                    { staffId: { contains: search, mode: "insensitive" } },
                ],
            }),
            ...(accountStatus && { accountStatus }),
            ...(staffType && { staffType }),
            ...(skillLevel && { skillLevel }),
            ...(contractorId && { contractorId }),
            ...(positionId && {
                positions: {
                    some: {
                        positionId,
                    },
                },
            }),
            ...(workTypeId && {
                workTypes: {
                    some: {
                        workTypeId,
                    },
                },
            }),
            ...(createdFrom || createdTo
                ? {
                    createdAt: {
                        ...(createdFrom && { gte: createdFrom }),
                        ...(createdTo && { lte: createdTo }),
                    },
                }
                : {}),
        };

        // Execute queries in parallel
        const [staff, total] = await Promise.all([
            this.prisma.staff.findMany({
                where,
                select: this.getStaffSelect(),
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.staff.count({ where }),
        ]);

        return {
            data: staff,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Get a single staff member by ID
     */
    async findOne(id: string): Promise<StaffSelect> {
        const staff = await this.prisma.staff.findUnique({
            where: { id },
            select: this.getStaffSelect(),
        });

        if (!staff) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "Staff member not found",
            });
        }

        return staff;
    }

    /**
     * Delete a staff member
     * Cascades to position and work type assignments
     */
    async remove(id: string): Promise<{ success: boolean; message: string }> {
        // Check if staff exists
        const staff = await this.prisma.staff.findUnique({
            where: { id },
            select: { id: true, firstName: true, lastName: true, employees: true },
        });

        if (!staff) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "Staff member not found",
            });
        }

        // Check if this is a contractor with employees
        if (staff.employees && staff.employees.length > 0) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message:
                    "Cannot delete contractor with assigned employees. Please reassign or remove employees first.",
            });
        }

        try {
            await this.prisma.staff.delete({
                where: { id },
            });

            return {
                success: true,
                message: `Staff member ${staff.firstName} ${staff.lastName} deleted successfully`,
            };
        } catch (error) {
            console.error("Error deleting staff:", error);
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to delete staff member",
            });
        }
    }

    /**
     * Bulk disable staff members
     * @param staffIds Array of staff IDs to disable
     * @param updatedByUserId ID of user performing the operation
     * @returns Result with success count and failed items
     */
    async bulkDisable(
        staffIds: string[],
        updatedByUserId: string
    ): Promise<{
        success: number;
        failed: Array<{ id: string; staffId: string; reason: string }>;
    }> {
        try {
            // Fetch all staff to validate
            const staffMembers = await this.prisma.staff.findMany({
                where: {
                    id: { in: staffIds },
                },
                select: {
                    id: true,
                    staffId: true,
                    firstName: true,
                    lastName: true,
                    staffType: true,
                    accountStatus: true,
                    _count: {
                        select: {
                            employees: true, // Count of employees assigned to this contractor
                        },
                    },
                },
            });

            // Track failures
            const failed: Array<{ id: string; staffId: string; reason: string }> = [];
            const validIds: string[] = [];

            // Validate each staff member
            for (const staff of staffMembers) {
                // Check if already disabled
                if (staff.accountStatus === "DISABLED") {
                    failed.push({
                        id: staff.id,
                        staffId: staff.staffId,
                        reason: "Staff member is already disabled",
                    });
                    continue;
                }

                // Check if contractor with assigned employees
                if (staff.staffType === "CONTRACTOR" && staff._count.employees > 0) {
                    failed.push({
                        id: staff.id,
                        staffId: staff.staffId,
                        reason: `Contractor has ${staff._count.employees} assigned employee(s)`,
                    });
                    continue;
                }

                // Valid for disabling
                validIds.push(staff.id);
            }

            // Check for non-existent IDs
            const foundIds = staffMembers.map((s) => s.id);
            const missingIds = staffIds.filter((id) => !foundIds.includes(id));
            for (const id of missingIds) {
                failed.push({
                    id,
                    staffId: "Unknown",
                    reason: "Staff member not found",
                });
            }

            // Perform bulk update for valid IDs
            let successCount = 0;
            if (validIds.length > 0) {
                const result = await this.prisma.staff.updateMany({
                    where: {
                        id: { in: validIds },
                    },
                    data: {
                        accountStatus: "DISABLED",
                        updatedAt: new Date(),
                    },
                });
                successCount = result.count;
            }

            return {
                success: successCount,
                failed,
            };
        } catch (error) {
            console.error("Error bulk disabling staff:", error);
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to disable staff members",
            });
        }
    }

    /**
     * Get staff statistics for dashboard
     */
    async getStats(): Promise<StaffStats> {
        const [total, active, disabled, pending, employees, contractors] =
            await Promise.all([
                this.prisma.staff.count(),
                this.prisma.staff.count({
                    where: { accountStatus: "ACTIVE" },
                }),
                this.prisma.staff.count({
                    where: { accountStatus: "DISABLED" },
                }),
                this.prisma.staff.count({
                    where: { accountStatus: "PENDING" },
                }),
                this.prisma.staff.count({
                    where: { staffType: "EMPLOYEE" },
                }),
                this.prisma.staff.count({
                    where: { staffType: "CONTRACTOR" },
                }),
            ]);

        return {
            total,
            active,
            disabled,
            pending,
            employees,
            contractors,
        };
    }

    /**
     * Get all contractors (for dropdown selection)
     */
    async getContractors(): Promise<Array<{
        id: string;
        staffId: string;
        firstName: string;
        lastName: string;
    }>> {
        return await this.prisma.staff.findMany({
            where: {
                staffType: "CONTRACTOR",
                accountStatus: "ACTIVE",
            },
            select: {
                id: true,
                staffId: true,
                firstName: true,
                lastName: true,
            },
            orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        });
    }

    /**
     * Helper method to get consistent staff select fields
     */
    private getStaffSelect() {
        return {
            id: true,
            staffId: true,
            accountStatus: true,
            staffType: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            dateOfBirth: true,
            payRate: true,
            billRate: true,
            rateType: true,
            skillLevel: true,
            streetAddress: true,
            aptSuiteUnit: true,
            city: true,
            country: true,
            state: true,
            zipCode: true,
            experience: true,
            staffRating: true,
            internalNotes: true,
            contractorId: true,
            userId: true,
            createdBy: true,
            createdAt: true,
            updatedAt: true,
            positions: {
                select: {
                    id: true,
                    staffId: true,
                    positionId: true,
                    assignedAt: true,
                    position: {
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            isActive: true,
                            createdAt: true,
                            updatedAt: true,
                        },
                    },
                },
            },
            workTypes: {
                select: {
                    workType: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
            contractor: {
                select: {
                    id: true,
                    staffId: true,
                    firstName: true,
                    lastName: true,
                },
            },
        } as const;
    }
}
