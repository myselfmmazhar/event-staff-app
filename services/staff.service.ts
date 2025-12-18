import { PrismaClient, Prisma, AccountStatus, StaffType, SkillLevel, StaffRating, AvailabilityStatus, UserRole } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { randomBytes } from "crypto";
import { hashPassword } from "better-auth/crypto";
import type {
    CreateStaffInput,
    UpdateStaffInput,
    QueryStaffInput,
    InviteStaffInput,
    AcceptStaffInvitationInput,
    StaffSelfUpdateInput,
} from "@/lib/schemas/staff.schema";
import { SettingsService } from "./settings.service";
import { auth } from "@/lib/server/auth";
import { generateStaffId } from "@/lib/utils/id-generator";
import type { StaffSelect, PaginatedResponse } from "@/lib/types/prisma-types";

/**
 * Paginated Staff Response
 */
export type PaginatedStaff = PaginatedResponse<StaffSelect>;

/**
 * Staff Statistics
 */
export type StaffStats = {
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
    private settingsService: SettingsService;

    /**
     * Staff select configuration for consistent querying
     */
    private readonly staffSelect = {
        id: true,
        staffId: true,
        accountStatus: true,
        staffType: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        dateOfBirth: true,
        skillLevel: true,
        availabilityStatus: true,
        timeOffStart: true,
        timeOffEnd: true,
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
        hasLoginAccess: true,
        userId: true,
        invitationToken: true,
        invitationExpiresAt: true,
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
        contractor: {
            select: {
                id: true,
                staffId: true,
                firstName: true,
                lastName: true,
            },
        },
    } as const;

    constructor(private prisma: PrismaClient) {
        this.settingsService = new SettingsService(prisma);
    }

    /**
     * Generate invitation token
     */
    private generateInvitationToken(): string {
        return randomBytes(32).toString('hex');
    }

    /**
     * Generate temporary password
     */
    private generateTemporaryPassword(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
        let password = '';
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }

    /**
     * Create a new staff member (full form)
     * Handles position assignments and generates invitation token
     * Returns both the staff record and invitation token for email sending
     */
    async create(
        data: CreateStaffInput,
        createdByUserId: string
    ): Promise<{ staff: StaffSelect; invitationToken: string }> {
        const { positionIds, ...staffData } = data;

        // Generate unique Staff ID using shared utility
        const terminology = await this.settingsService.getTerminology();
        const staffId = await generateStaffId(this.prisma, terminology.staffIdPrefix);

        // Generate invitation token for email
        const invitationToken = this.generateInvitationToken();
        const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        try {
            const staff = await this.prisma.staff.create({
                data: {
                    staffId,
                    ...staffData,
                    accountStatus: AccountStatus.PENDING, // Always start as pending
                    invitationToken,
                    invitationExpiresAt,
                    createdBy: createdByUserId,
                    positions: {
                        create: positionIds.map((positionId) => ({
                            positionId,
                        })),
                    },
                },
                select: this.staffSelect,
            });

            return { staff, invitationToken };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    const terminology = await this.settingsService.getTerminology();
                    throw new TRPCError({
                        code: "CONFLICT",
                        message: `A ${terminology.staff.lower} member with this email already exists`,
                    });
                }
                if (error.code === "P2003") {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: "Invalid contractor or position ID provided",
                    });
                }
            }
            console.error("Error creating staff:", error);
            const terminology = await this.settingsService.getTerminology();
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: `Failed to create ${terminology.staff.lower} member`,
            });
        }
    }

    /**
     * Invite a staff member (send invitation to complete profile)
     */
    async invite(
        data: InviteStaffInput,
        createdByUserId: string
    ): Promise<{ staff: StaffSelect; invitationToken: string }> {
        const { positionIds, ...inviteData } = data;
        const terminology = await this.settingsService.getTerminology();

        // Check if email already exists
        const existing = await this.prisma.staff.findUnique({
            where: { email: inviteData.email },
        });

        if (existing) {
            throw new TRPCError({
                code: "CONFLICT",
                message: `A ${terminology.staff.lower} member with this email already exists`,
            });
        }

        const staffId = await generateStaffId(this.prisma, terminology.staffIdPrefix);
        const invitationToken = this.generateInvitationToken();
        const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        try {
            const staff = await this.prisma.staff.create({
                data: {
                    staffId,
                    ...inviteData,
                    accountStatus: AccountStatus.PENDING,
                    // Placeholder values for required fields (will be filled on invitation acceptance)
                    phone: '',
                    streetAddress: '',
                    city: '',
                    state: '',
                    zipCode: '',
                    country: '',
                    dateOfBirth: new Date('1990-01-01'), // Placeholder
                    invitationToken,
                    invitationExpiresAt,
                    createdBy: createdByUserId,
                    positions: {
                        create: positionIds.map((positionId) => ({
                            positionId,
                        })),
                    },
                },
                select: this.staffSelect,
            });

            return { staff, invitationToken };
        } catch (error) {
            console.error("Error inviting staff:", error);
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: `Failed to invite ${terminology.staff.lower} member`,
            });
        }
    }

    /**
     * Accept staff invitation and complete profile
     */
    async acceptInvitation(
        data: AcceptStaffInvitationInput
    ): Promise<StaffSelect> {
        const { token, password, ...profileData } = data;
        const terminology = await this.settingsService.getTerminology();

        // Find staff by invitation token
        const staff = await this.prisma.staff.findUnique({
            where: { invitationToken: token },
        });

        if (!staff) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "Invalid invitation token",
            });
        }

        if (!staff.invitationExpiresAt || staff.invitationExpiresAt < new Date()) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Invitation has expired. Please request a new invitation.",
            });
        }

        try {
            // Check if user already exists with this email
            const existingUser = await this.prisma.user.findUnique({
                where: { email: staff.email },
            });

            if (existingUser) {
                // Check if this user is already linked to the staff record
                if (staff.userId === existingUser.id) {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: "This invitation has already been accepted. Please log in with your credentials.",
                    });
                }

                // User exists but not linked to this staff - link them and update staff profile
                // This handles the case where a user was created previously (e.g., leftover test data)
                // and we need to complete the staff profile setup

                // Hash the new password
                const hashedPassword = await hashPassword(password);

                // Update user with STAFF role, verified status, and new password
                await this.prisma.user.update({
                    where: { id: existingUser.id },
                    data: {
                        role: UserRole.STAFF,
                        emailVerified: true,
                        phone: profileData.phone,
                        isActive: true,
                        password: hashedPassword,
                    },
                });

                // Also update the account password for Better Auth credential provider
                await this.prisma.account.updateMany({
                    where: {
                        userId: existingUser.id,
                        providerId: 'credential',
                    },
                    data: {
                        password: hashedPassword,
                    },
                });

                // Update staff with profile data and link to existing user
                const updatedStaff = await this.prisma.staff.update({
                    where: { id: staff.id },
                    data: {
                        ...profileData,
                        accountStatus: AccountStatus.ACTIVE,
                        hasLoginAccess: true,
                        userId: existingUser.id,
                        invitationToken: null,
                        invitationExpiresAt: null,
                    },
                    select: this.staffSelect,
                });

                return updatedStaff;
            }

            // Create User account via Better Auth
            const authResult = await auth.api.signUpEmail({
                body: {
                    email: staff.email,
                    password,
                    name: `${staff.firstName} ${staff.lastName}`,
                    firstName: staff.firstName,
                    lastName: staff.lastName,
                },
            });

            if (!authResult?.user?.id) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to create user account",
                });
            }

            // Update the created user with STAFF role and verified status
            await this.prisma.user.update({
                where: { id: authResult.user.id },
                data: {
                    role: UserRole.STAFF,
                    emailVerified: true,
                    phone: profileData.phone,
                },
            });

            // Update staff with profile data and link to user
            const updatedStaff = await this.prisma.staff.update({
                where: { id: staff.id },
                data: {
                    ...profileData,
                    accountStatus: AccountStatus.ACTIVE,
                    hasLoginAccess: true,
                    userId: authResult.user.id,
                    invitationToken: null,
                    invitationExpiresAt: null,
                },
                select: this.staffSelect,
            });

            return updatedStaff;
        } catch (error) {
            if (error instanceof TRPCError) {
                throw error;
            }

            // Check for duplicate email error from Better Auth
            if (error instanceof Error) {
                const errorMessage = error.message.toLowerCase();
                if (errorMessage.includes("already exists") ||
                    errorMessage.includes("accept your invitation") ||
                    errorMessage.includes("duplicate")) {
                    throw new TRPCError({
                        code: "CONFLICT",
                        message: "A user account with this email already exists. Please try logging in instead.",
                    });
                }
            }

            console.error("Error accepting invitation:", error);
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to complete registration",
            });
        }
    }

    /**
     * Resend invitation email
     */
    async resendInvitation(id: string): Promise<{ staff: StaffSelect; invitationToken: string }> {
        const terminology = await this.settingsService.getTerminology();

        const staff = await this.prisma.staff.findUnique({
            where: { id },
        });

        if (!staff) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: `${terminology.staff.singular} member not found`,
            });
        }

        if (staff.hasLoginAccess || staff.userId) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: `${terminology.staff.singular} already has login access`,
            });
        }

        const invitationToken = this.generateInvitationToken();
        const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const updatedStaff = await this.prisma.staff.update({
            where: { id },
            data: {
                invitationToken,
                invitationExpiresAt,
            },
            select: this.staffSelect,
        });

        return { staff: updatedStaff, invitationToken };
    }

    /**
     * Get invitation info by token (for invitation acceptance page)
     */
    async getInvitationInfo(token: string): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        staffType: string;
        isExpired: boolean;
    }> {
        const staff = await this.prisma.staff.findUnique({
            where: { invitationToken: token },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                staffType: true,
                invitationExpiresAt: true,
            },
        });

        if (!staff) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "Invalid invitation token",
            });
        }

        const isExpired = !staff.invitationExpiresAt || staff.invitationExpiresAt < new Date();

        return {
            id: staff.id,
            email: staff.email,
            firstName: staff.firstName,
            lastName: staff.lastName,
            staffType: staff.staffType,
            isExpired,
        };
    }

    /**
     * Grant login access to existing staff (creates user account)
     */
    async grantLoginAccess(
        staffId: string
    ): Promise<{ staff: StaffSelect; tempPassword: string }> {
        const terminology = await this.settingsService.getTerminology();

        const staff = await this.prisma.staff.findUnique({
            where: { id: staffId },
        });

        if (!staff) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: `${terminology.staff.singular} member not found`,
            });
        }

        if (staff.hasLoginAccess && staff.userId) {
            throw new TRPCError({
                code: "CONFLICT",
                message: `This ${terminology.staff.lower} member already has login access`,
            });
        }

        const tempPassword = this.generateTemporaryPassword();

        try {
            // Create User account via Better Auth API
            const authResult = await auth.api.signUpEmail({
                body: {
                    email: staff.email,
                    password: tempPassword,
                    name: `${staff.firstName} ${staff.lastName}`,
                    firstName: staff.firstName,
                    lastName: staff.lastName,
                },
            });

            if (!authResult?.user?.id) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to create user account",
                });
            }

            // Update the created user with STAFF role and verified status
            await this.prisma.user.update({
                where: { id: authResult.user.id },
                data: {
                    role: UserRole.STAFF,
                    emailVerified: true,
                    phone: staff.phone,
                },
            });

            // Update staff with userId and hasLoginAccess
            const updatedStaff = await this.prisma.staff.update({
                where: { id: staffId },
                data: {
                    userId: authResult.user.id,
                    hasLoginAccess: true,
                    accountStatus: AccountStatus.ACTIVE,
                    invitationToken: null,
                    invitationExpiresAt: null,
                },
                select: this.staffSelect,
            });

            return {
                staff: updatedStaff,
                tempPassword,
            };
        } catch (error) {
            if (error instanceof TRPCError) {
                throw error;
            }

            // Check for duplicate email error from Better Auth
            if (error instanceof Error && error.message.includes("already exists")) {
                throw new TRPCError({
                    code: "CONFLICT",
                    message: "A user with this email already exists",
                });
            }

            console.error("Error granting login access:", error);
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to grant login access",
            });
        }
    }

    /**
     * Get staff profile by userId (for self-service)
     */
    async getMyStaffProfile(userId: string): Promise<StaffSelect | null> {
        return await this.prisma.staff.findUnique({
            where: { userId },
            select: this.staffSelect,
        });
    }

    /**
     * Staff self-update (fields staff can update about themselves)
     */
    async selfUpdate(
        userId: string,
        data: StaffSelfUpdateInput
    ): Promise<StaffSelect> {
        const terminology = await this.settingsService.getTerminology();

        const staff = await this.prisma.staff.findUnique({
            where: { userId },
        });

        if (!staff) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: `${terminology.staff.singular} profile not found`,
            });
        }

        return await this.prisma.staff.update({
            where: { id: staff.id },
            data: {
                // Personal Information
                firstName: data.firstName,
                lastName: data.lastName,
                phone: data.phone,
                dateOfBirth: data.dateOfBirth,
                // Address
                streetAddress: data.streetAddress,
                aptSuiteUnit: data.aptSuiteUnit,
                city: data.city,
                state: data.state,
                zipCode: data.zipCode,
                country: data.country,
                // Availability
                availabilityStatus: data.availabilityStatus,
                timeOffStart: data.timeOffStart,
                timeOffEnd: data.timeOffEnd,
            },
            select: this.staffSelect,
        });
    }

    /**
     * Staff self-deactivate
     */
    async deactivateSelf(userId: string, reason?: string): Promise<StaffSelect> {
        const terminology = await this.settingsService.getTerminology();

        const staff = await this.prisma.staff.findUnique({
            where: { userId },
        });

        if (!staff) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: `${terminology.staff.singular} profile not found`,
            });
        }

        // Deactivate staff account (optionally store reason in internalNotes)
        const updatedStaff = await this.prisma.staff.update({
            where: { id: staff.id },
            data: {
                accountStatus: AccountStatus.DISABLED,
                ...(reason && {
                    internalNotes: staff.internalNotes
                        ? `${staff.internalNotes}\n\nSelf-deactivated: ${reason}`
                        : `Self-deactivated: ${reason}`,
                }),
            },
            select: this.staffSelect,
        });

        // Also deactivate user account
        if (staff.userId) {
            await this.prisma.user.update({
                where: { id: staff.userId },
                data: { isActive: false },
            });
        }

        return updatedStaff;
    }

    /**
     * Update a staff member
     * Handles position assignment updates
     */
    async update(
        id: string,
        data: Omit<UpdateStaffInput, "id">
    ): Promise<StaffSelect> {
        const { positionIds, ...updateData } = data as Omit<UpdateStaffInput, "id"> & {
            positionIds?: string[];
        };

        // Check if staff exists
        const existing = await this.prisma.staff.findUnique({
            where: { id },
        });

        if (!existing) {
            const terminology = await this.settingsService.getTerminology();
            throw new TRPCError({
                code: "NOT_FOUND",
                message: `${terminology.staff.singular} member not found`,
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
                },
                select: this.staffSelect,
            });

            return staff;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    const terminology = await this.settingsService.getTerminology();
                    throw new TRPCError({
                        code: "CONFLICT",
                        message: `A ${terminology.staff.lower} member with this email already exists`,
                    });
                }
                if (error.code === "P2003") {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: "Invalid contractor or position ID provided",
                    });
                }
            }
            console.error("Error updating staff:", error);
            const terminology = await this.settingsService.getTerminology();
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: `Failed to update ${terminology.staff.lower} member`,
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
            availabilityStatus,
            contractorId,
            positionId,
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
            ...(availabilityStatus && { availabilityStatus }),
            ...(contractorId && { contractorId }),
            ...(positionId && {
                positions: {
                    some: {
                        positionId,
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

        // Create type-safe orderBy
        const orderBy: Prisma.StaffOrderByWithRelationInput =
            sortBy === 'firstName' ? { firstName: sortOrder } :
            sortBy === 'lastName' ? { lastName: sortOrder } :
            sortBy === 'email' ? { email: sortOrder } :
            sortBy === 'staffId' ? { staffId: sortOrder } :
            sortBy === 'createdAt' ? { createdAt: sortOrder } :
            { createdAt: 'desc' };

        // Execute queries in parallel
        const [staff, total] = await Promise.all([
            this.prisma.staff.findMany({
                where,
                select: this.staffSelect,
                orderBy,
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
        };
    }

    /**
     * Get a single staff member by ID
     */
    async findOne(id: string): Promise<StaffSelect> {
        const staff = await this.prisma.staff.findUnique({
            where: { id },
            select: this.staffSelect,
        });

        if (!staff) {
            const terminology = await this.settingsService.getTerminology();
            throw new TRPCError({
                code: "NOT_FOUND",
                message: `${terminology.staff.singular} member not found`,
            });
        }

        return staff;
    }

    /**
     * Delete a staff member
     * Cascades to position and work type assignments
     */
    async remove(id: string): Promise<{ success: boolean; message: string }> {
        const terminology = await this.settingsService.getTerminology();

        // Check if staff exists
        const staff = await this.prisma.staff.findUnique({
            where: { id },
            select: { id: true, firstName: true, lastName: true, employees: true },
        });

        if (!staff) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: `${terminology.staff.singular} member not found`,
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
                message: `${terminology.staff.singular} member ${staff.firstName} ${staff.lastName} deleted successfully`,
            };
        } catch (error) {
            console.error("Error deleting staff:", error);
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: `Failed to delete ${terminology.staff.lower} member`,
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
                    const terminology = await this.settingsService.getTerminology();
                    failed.push({
                        id: staff.id,
                        staffId: staff.staffId,
                        reason: `${terminology.staff.singular} member is already disabled`,
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
            const terminology = await this.settingsService.getTerminology();
            for (const id of missingIds) {
                failed.push({
                    id,
                    staffId: "Unknown",
                    reason: `${terminology.staff.singular} member not found`,
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
            const terminology = await this.settingsService.getTerminology();
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: `Failed to disable ${terminology.staff.lower} members`,
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
}
