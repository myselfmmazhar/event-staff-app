import { PrismaClient, Prisma, AccountStatus, StaffType, StaffRole, SkillLevel, StaffRating, AvailabilityStatus, UserRole } from "@prisma/client";
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
    BulkUpdateStaffInput,
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
    companies: number;
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
        staffRole: true,
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
        companyId: true,
        hasLoginAccess: true,
        userId: true,
        invitationToken: true,
        invitationExpiresAt: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        // Custom fields
        customField1: true,
        customField2: true,
        customField3: true,
        // Documents
        documents: true,
        // Team Details (for TEAM role)
        teamEntityName: true,
        teamEmail: true,
        teamPhone: true,
        teamAddressLine1: true,
        teamAddressLine2: true,
        teamCity: true,
        teamState: true,
        teamZipCode: true,
        services: {
            select: {
                id: true,
                staffId: true,
                serviceId: true,
                assignedAt: true,
                service: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        isActive: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                },
            },
        },
        company: {
            select: {
                id: true,
                staffId: true,
                firstName: true,
                lastName: true,
                teamEntityName: true,
                teamEmail: true,
                teamPhone: true,
            },
        },
        // Team members for TEAM role staff
        teamMembers: {
            select: {
                id: true,
                staffId: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                staffType: true,
                accountStatus: true,
                services: {
                    select: {
                        serviceId: true,
                        service: {
                            select: {
                                id: true,
                                title: true,
                            },
                        },
                    },
                },
            },
        },
        // Tax details (1:1 relation)
        taxDetails: {
            select: {
                id: true,
                staffId: true,
                taxFilledBy: true,
                taxName: true,
                businessName: true,
                businessStructure: true,
                llcClassification: true,
                exemptPayeeCode: true,
                fatcaExemptionCode: true,
                taxAddress: true,
                taxCity: true,
                taxState: true,
                taxZip: true,
                accountNumbers: true,
                // Note: SSN and EIN are not included here for security
                // Use dedicated masked endpoints to retrieve them
                signatureUrl: true,
                certificationDate: true,
                createdAt: true,
                updatedAt: true,
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
    ): Promise<{ staff: StaffSelect; invitations: Array<{ email: string; firstName: string; token: string }> }> {
        // Extract serviceIds and teamMembers from data - these should not be passed to Prisma directly
        // teamMembers is for COMPANY type staff and would be processed separately if needed
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { serviceIds, teamMembers, ...staffData } = data;

        // Generate unique Staff ID using shared utility
        const terminology = await this.settingsService.getTerminology();
        const staffId = await generateStaffId(this.prisma, terminology.staffIdPrefix);

        // Generate invitation token for email
        const invitationToken = this.generateInvitationToken();
        const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const invitations: Array<{ email: string; firstName: string; token: string }> = [
            { email: staffData.email, firstName: staffData.firstName, token: invitationToken }
        ];

        try {
            const { documents, ...restStaffData } = staffData;
            const staff = await this.prisma.staff.create({
                data: {
                    staffId,
                    ...restStaffData,
                    documents: documents as Prisma.InputJsonValue ?? Prisma.JsonNull,
                    accountStatus: AccountStatus.PENDING, // Always start as pending
                    invitationToken,
                    invitationExpiresAt,
                    createdBy: createdByUserId,
                    services: {
                        create: serviceIds.map((serviceId) => ({
                            serviceId,
                        })),
                    },
                },
                select: this.staffSelect,
            });

            // If staff role is TEAM and team members were provided, create them
            if (staffData.staffRole === StaffRole.TEAM && teamMembers && teamMembers.length > 0) {
                const terminology = await this.settingsService.getTerminology();

                for (const member of teamMembers) {
                    // Check if email already exists
                    const existingMember = await this.prisma.staff.findUnique({
                        where: { email: member.email },
                    });

                    if (existingMember) {
                        console.warn(`Team member with email ${member.email} already exists, skipping`);
                        continue;
                    }

                    const memberStaffId = await generateStaffId(this.prisma, terminology.staffIdPrefix);
                    const memberInvitationToken = this.generateInvitationToken();
                    const memberInvitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

                    await this.prisma.staff.create({
                        data: {
                            staffId: memberStaffId,
                            firstName: member.firstName,
                            lastName: member.lastName ?? '',
                            email: member.email,
                            phone: member.phone ?? '',
                            staffType: StaffType.EMPLOYEE, // Team members default to EMPLOYEE
                            accountStatus: AccountStatus.PENDING,
                            companyId: staff.id, // Link to the parent company
                            invitationToken: memberInvitationToken,
                            invitationExpiresAt: memberInvitationExpiresAt,
                            createdBy: createdByUserId,
                            // Service assignments from team member input (multiple)
                            services: member.serviceIds && member.serviceIds.length > 0 ? {
                                create: member.serviceIds.map((serviceId) => ({ serviceId })),
                            } : undefined,
                        },
                    });

                    invitations.push({
                        email: member.email,
                        firstName: member.firstName,
                        token: memberInvitationToken
                    });
                }

                // Refetch the company staff to include the newly created team members
                const updatedStaff = await this.prisma.staff.findUnique({
                    where: { id: staff.id },
                    select: this.staffSelect,
                });

                if (updatedStaff) {
                    return { staff: updatedStaff, invitations };
                }
            }

            return { staff, invitations };
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
                        message: "Invalid company or position ID provided",
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
        const { serviceIds, ...inviteData } = data;
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
                    services: {
                        create: serviceIds.map((serviceId) => ({
                            serviceId,
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
            // This can happen if signUpEmail partially succeeds (creates user) but throws an error
            // We need to check if user was actually created and link them instead of throwing
            if (error instanceof Error) {
                const errorMessage = error.message.toLowerCase();
                if (errorMessage.includes("already exists") ||
                    errorMessage.includes("accept your invitation") ||
                    errorMessage.includes("duplicate")) {
                    // Re-check if user was created (race condition handling)
                    const createdUser = await this.prisma.user.findUnique({
                        where: { email: staff.email },
                    });

                    if (createdUser && !staff.userId) {
                        // User was created but staff wasn't linked - complete the linking
                        const hashedPassword = await hashPassword(password);

                        // Update user with STAFF role and new password
                        await this.prisma.user.update({
                            where: { id: createdUser.id },
                            data: {
                                role: UserRole.STAFF,
                                emailVerified: true,
                                phone: profileData.phone,
                                isActive: true,
                                password: hashedPassword,
                            },
                        });

                        // Update account password for Better Auth
                        await this.prisma.account.updateMany({
                            where: {
                                userId: createdUser.id,
                                providerId: 'credential',
                            },
                            data: {
                                password: hashedPassword,
                            },
                        });

                        // Update staff with profile data and link to user
                        const updatedStaff = await this.prisma.staff.update({
                            where: { id: staff.id },
                            data: {
                                ...profileData,
                                accountStatus: AccountStatus.ACTIVE,
                                hasLoginAccess: true,
                                userId: createdUser.id,
                                invitationToken: null,
                                invitationExpiresAt: null,
                            },
                            select: this.staffSelect,
                        });

                        return updatedStaff;
                    }

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
        // Type the teamMembers to match frontend TeamMemberInput structure
        type TeamMemberInput = {
            email: string;
            firstName: string;
            lastName?: string;
            phone?: string;
            serviceIds?: string[];
        };
        const { serviceIds, teamMembers, companyId, ...updateData } = data as Omit<UpdateStaffInput, "id"> & {
            serviceIds?: string[];
            teamMembers?: TeamMemberInput[];
            companyId?: string | null;
        };

        // Check if staff exists and get current team members
        const existing = await this.prisma.staff.findUnique({
            where: { id },
            include: {
                teamMembers: {
                    select: {
                        id: true,
                        email: true,
                    },
                },
            },
        });

        if (!existing) {
            const terminology = await this.settingsService.getTerminology();
            throw new TRPCError({
                code: "NOT_FOUND",
                message: `${terminology.staff.singular} member not found`,
            });
        }

        try {
            const { documents, ...restUpdateData } = updateData as typeof updateData & { documents?: unknown };
            const staff = await this.prisma.staff.update({
                where: { id },
                data: {
                    ...restUpdateData,
                    ...(documents !== undefined && {
                        documents: documents as Prisma.InputJsonValue ?? Prisma.JsonNull,
                    }),
                    // Update company relation if provided
                    ...(companyId !== undefined && {
                        company: companyId ? { connect: { id: companyId } } : { disconnect: true },
                    }),
                    // Update services if provided
                    ...(serviceIds !== undefined && {
                        services: {
                            deleteMany: {},
                            create: serviceIds.map((serviceId: string) => ({
                                serviceId,
                            })),
                        },
                    }),
                },
                select: this.staffSelect,
            });

            // Handle team members for TEAM role staff
            // Check both existing role OR if the role is being updated to TEAM
            const staffRoleIsTeam = existing.staffRole === StaffRole.TEAM ||
                (updateData as { staffRole?: StaffRole }).staffRole === StaffRole.TEAM;

            if (staffRoleIsTeam && teamMembers !== undefined) {
                const terminology = await this.settingsService.getTerminology();
                const existingEmails = new Set(existing.teamMembers.map(tm => tm.email));
                const incomingEmails = new Set(teamMembers.map(tm => tm.email));

                // Find team members to remove (no longer in the list)
                const membersToRemove = existing.teamMembers.filter(tm => !incomingEmails.has(tm.email));

                // Find new team members to add
                const membersToAdd = teamMembers.filter(tm => !existingEmails.has(tm.email));

                // Remove team members by unlinking them from this company
                if (membersToRemove.length > 0) {
                    await this.prisma.staff.updateMany({
                        where: {
                            id: { in: membersToRemove.map(tm => tm.id) },
                        },
                        data: {
                            companyId: null,
                        },
                    });
                }

                // Add new team members
                for (const member of membersToAdd) {
                    // Check if email already exists as a staff member
                    const existingStaff = await this.prisma.staff.findUnique({
                        where: { email: member.email },
                    });

                    if (existingStaff) {
                        // If they already exist, just link them to this company
                        await this.prisma.staff.update({
                            where: { id: existingStaff.id },
                            data: { companyId: id },
                        });
                    } else {
                        // Create new staff member
                        const memberStaffId = await generateStaffId(this.prisma, terminology.staffIdPrefix);
                        const memberInvitationToken = this.generateInvitationToken();
                        const memberInvitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

                        // Use member's serviceIds if provided, otherwise use parent's serviceIds
                        const memberServiceIds = member.serviceIds && member.serviceIds.length > 0
                            ? member.serviceIds
                            : serviceIds;

                        await this.prisma.staff.create({
                            data: {
                                staffId: memberStaffId,
                                firstName: member.firstName,
                                lastName: member.lastName || '',
                                email: member.email,
                                phone: member.phone || '',
                                staffType: StaffType.EMPLOYEE, // Team members default to EMPLOYEE
                                accountStatus: AccountStatus.PENDING,
                                companyId: id,
                                invitationToken: memberInvitationToken,
                                invitationExpiresAt: memberInvitationExpiresAt,
                                createdBy: existing.createdBy,
                                // Assign services to team member
                                ...(memberServiceIds && memberServiceIds.length > 0 && {
                                    services: {
                                        create: memberServiceIds.map((serviceId) => ({
                                            serviceId,
                                        })),
                                    },
                                }),
                            },
                        });
                    }
                }

                // Refetch to get updated team members
                const updatedStaff = await this.prisma.staff.findUnique({
                    where: { id },
                    select: this.staffSelect,
                });

                if (updatedStaff) {
                    return updatedStaff;
                }
            }

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
                        message: "Invalid company or position ID provided",
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
        userId: string,
        userRole?: string
    ): Promise<PaginatedStaff> {
        const {
            page = 1,
            limit = 10,
            search,
            sortBy = "createdAt",
            sortOrder = "desc",
            accountStatuses,
            staffTypes,
            skillLevels,
            availabilityStatus,
            companyId,
            serviceId,
            createdFrom,
            createdTo,
        } = query;

        const isSuperAdmin = userRole === 'SUPER_ADMIN';
        const isAdmin = userRole === 'ADMIN';

        // Build where clause
        const where: Prisma.StaffWhereInput = {
            ...(isSuperAdmin ? {} : 
               isAdmin ? { users_staff_createdByTousers: { role: { not: 'SUPER_ADMIN' } } } : 
               { createdBy: userId }),
            ...(search && {
                OR: [
                    { firstName: { contains: search, mode: "insensitive" } },
                    { lastName: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                    { phone: { contains: search, mode: "insensitive" } },
                    { staffId: { contains: search, mode: "insensitive" } },
                ],
            }),
            ...(accountStatuses && accountStatuses.length > 0 && { accountStatus: { in: accountStatuses } }),
            ...(staffTypes && staffTypes.length > 0 && { staffType: { in: staffTypes } }),
            ...(skillLevels && skillLevels.length > 0 && { skillLevel: { in: skillLevels } }),
            ...(availabilityStatus && { availabilityStatus }),
            ...(companyId && { companyId }),
            ...(serviceId && {
                services: {
                    some: {
                        serviceId: serviceId,
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
    async findOne(id: string, userId: string, userRole?: string): Promise<StaffSelect> {
        const isSuperAdmin = userRole === 'SUPER_ADMIN';
        const isAdmin = userRole === 'ADMIN';

        const staff = await this.prisma.staff.findFirst({
            where: {
                id,
                ...(isSuperAdmin ? {} : 
                   isAdmin ? { users_staff_createdByTousers: { role: { not: 'SUPER_ADMIN' } } } : 
                   { createdBy: userId }),
            },
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
            select: { id: true, firstName: true, lastName: true, staffType: true, staffRole: true, teamMembers: true },
        });

        if (!staff) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: `${terminology.staff.singular} member not found`,
            });
        }

        // Check if this is a team with team members
        if (staff.staffRole === "TEAM" && staff.teamMembers && staff.teamMembers.length > 0) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message:
                    "Cannot delete company with assigned team members. Please reassign or remove team members first.",
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
                    staffRole: true,
                    accountStatus: true,
                    _count: {
                        select: {
                            teamMembers: true, // Count of team members assigned to this team
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

                // Check if team with assigned team members
                if (staff.staffRole === "TEAM" && staff._count.teamMembers > 0) {
                    failed.push({
                        id: staff.id,
                        staffId: staff.staffId,
                        reason: `Team has ${staff._count.teamMembers} assigned team member(s)`,
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
     * Bulk delete staff members
     * @param staffIds Array of staff IDs to delete
     * @returns Result with success count and failed items
     */
    async bulkDelete(
        staffIds: string[]
    ): Promise<{
        success: number;
        failed: Array<{ id: string; staffId: string; reason: string }>;
    }> {
        const terminology = await this.settingsService.getTerminology();

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
                    staffRole: true,
                    _count: {
                        select: {
                            teamMembers: true, // Count of team members assigned to this team
                        },
                    },
                },
            });

            // Track failures
            const failed: Array<{ id: string; staffId: string; reason: string }> = [];
            const validIds: string[] = [];

            // Validate each staff member
            for (const staff of staffMembers) {
                // Check if team with assigned team members
                if (staff.staffRole === "TEAM" && staff._count.teamMembers > 0) {
                    failed.push({
                        id: staff.id,
                        staffId: staff.staffId,
                        reason: `Team has ${staff._count.teamMembers} assigned team member(s). Reassign or remove them first.`,
                    });
                    continue;
                }

                // Valid for deletion
                validIds.push(staff.id);
            }

            // Check for non-existent IDs
            const foundIds = staffMembers.map((s) => s.id);
            const missingIds = staffIds.filter((id) => !foundIds.includes(id));
            for (const id of missingIds) {
                failed.push({
                    id,
                    staffId: "Unknown",
                    reason: `${terminology.staff.singular} member not found`,
                });
            }

            // Perform bulk delete for valid IDs
            let successCount = 0;
            if (validIds.length > 0) {
                const result = await this.prisma.staff.deleteMany({
                    where: {
                        id: { in: validIds },
                    },
                });
                successCount = result.count;
            }

            return {
                success: successCount,
                failed,
            };
        } catch (error) {
            console.error("Error bulk deleting staff:", error);
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: `Failed to delete ${terminology.staff.lower} members`,
            });
        }
    }

    /**
     * Bulk update staff members
     * Only updates fields that have enabled: true
     * @param input Bulk update input with field flags
     * @param updatedByUserId ID of user performing the operation
     * @returns Result with success count and failed items
     */
    async bulkUpdate(
        input: BulkUpdateStaffInput,
        updatedByUserId: string
    ): Promise<{
        success: number;
        failed: Array<{ id: string; staffId: string; reason: string }>;
    }> {
        const { staffIds, ...fields } = input;
        const terminology = await this.settingsService.getTerminology();

        try {
            // Fetch all staff to validate
            const staffMembers = await this.prisma.staff.findMany({
                where: { id: { in: staffIds } },
                select: {
                    id: true,
                    staffId: true,
                    firstName: true,
                    lastName: true,
                    staffType: true,
                    accountStatus: true,
                },
            });

            // Track failures and valid IDs
            const failed: Array<{ id: string; staffId: string; reason: string }> = [];
            const validIds: string[] = [];

            // Check for non-existent IDs
            const foundIds = staffMembers.map((s) => s.id);
            for (const id of staffIds) {
                if (!foundIds.includes(id)) {
                    failed.push({
                        id,
                        staffId: "Unknown",
                        reason: `${terminology.staff.singular} member not found`,
                    });
                }
            }

            // All found staff are valid for update (no complex validation needed now)
            for (const staff of staffMembers) {
                validIds.push(staff.id);
            }

            // Build the update data object from enabled fields
            const updateData: Prisma.StaffUncheckedUpdateManyInput = {};

            if (fields.accountStatus?.enabled && fields.accountStatus.value !== undefined) {
                updateData.accountStatus = fields.accountStatus.value;
            }
            if (fields.staffType?.enabled && fields.staffType.value !== undefined) {
                updateData.staffType = fields.staffType.value;
            }
            if (fields.skillLevel?.enabled && fields.skillLevel.value !== undefined) {
                updateData.skillLevel = fields.skillLevel.value;
            }
            if (fields.availabilityStatus?.enabled && fields.availabilityStatus.value !== undefined) {
                updateData.availabilityStatus = fields.availabilityStatus.value;
            }
            if (fields.staffRating?.enabled && fields.staffRating.value !== undefined) {
                updateData.staffRating = fields.staffRating.value;
            }

            const hasFieldUpdates = Object.keys(updateData).length > 0;
            let successCount = 0;

            if (validIds.length === 0) {
                return { success: 0, failed };
            }

            if (hasFieldUpdates) {
                // Bulk update all valid staff
                const result = await this.prisma.staff.updateMany({
                    where: { id: { in: validIds } },
                    data: {
                        ...updateData,
                        updatedAt: new Date(),
                    },
                });
                successCount = result.count;
            } else {
                // No fields to update
                successCount = validIds.length;
            }

            return { success: successCount, failed };
        } catch (error) {
            console.error("Error bulk updating staff:", error);
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: `Failed to update ${terminology.staff.lower} members`,
            });
        }
    }

    /**
     * Get staff statistics for dashboard
     */
    async getStats(userId?: string, userRole?: string): Promise<StaffStats> {
        const isSuperAdmin = userRole === 'SUPER_ADMIN';
        const isAdmin = userRole === 'ADMIN';

        const visibilityWhere: Prisma.StaffWhereInput = 
            isSuperAdmin ? {} : 
            isAdmin ? { users_staff_createdByTousers: { role: { not: 'SUPER_ADMIN' } } } : 
            userId ? { createdBy: userId } : {};

        const [total, active, disabled, pending, employees, contractors, companies] =
            await Promise.all([
                this.prisma.staff.count({ where: visibilityWhere }),
                this.prisma.staff.count({
                    where: { ...visibilityWhere, accountStatus: "ACTIVE" },
                }),
                this.prisma.staff.count({
                    where: { ...visibilityWhere, accountStatus: "DISABLED" },
                }),
                this.prisma.staff.count({
                    where: { ...visibilityWhere, accountStatus: "PENDING" },
                }),
                this.prisma.staff.count({
                    where: { ...visibilityWhere, staffType: "EMPLOYEE" },
                }),
                this.prisma.staff.count({
                    where: { ...visibilityWhere, staffType: "CONTRACTOR" },
                }),
                this.prisma.staff.count({
                    where: { ...visibilityWhere, staffType: "COMPANY" },
                }),
            ]);

        return {
            total,
            active,
            disabled,
            pending,
            employees,
            contractors,
            companies,
        };
    }

    /**
     * Get all companies (for dropdown selection when assigning contractors/employees)
     */
    async getCompanies(userId?: string, userRole?: string): Promise<Array<{
        id: string;
        staffId: string;
        firstName: string;
        lastName: string;
    }>> {
        const isSuperAdmin = userRole === 'SUPER_ADMIN';
        const isAdmin = userRole === 'ADMIN';

        const visibilityWhere: Prisma.StaffWhereInput = 
            isSuperAdmin ? {} : 
            isAdmin ? { users_staff_createdByTousers: { role: { not: 'SUPER_ADMIN' } } } : 
            userId ? { createdBy: userId } : {};

        return await this.prisma.staff.findMany({
            where: {
                ...visibilityWhere,
                staffType: "COMPANY",
                // Include both ACTIVE and PENDING companies
                accountStatus: { in: ["ACTIVE", "PENDING"] },
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
