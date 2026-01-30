import { PrismaClient, UserRole, Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { hashPassword } from "better-auth/crypto";
import { nanoid } from "nanoid";
import { randomBytes } from "crypto";
import type {
  CreateUserInput,
  UpdateUserInput as UpdateUserInputType,
  QueryUsersInput,
  InviteUserInput,
  AcceptUserInvitationInput,
} from "@/lib/schemas/user.schema";

// Re-export types from schema for backwards compatibility
export type { CreateUserInput, QueryUsersInput };

// Update input type for service (Zod already validates, service receives validated data)
export interface UpdateUserInput {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  phone?: string;
  profilePhoto?: string | null;
}

type UserSelect = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  phone: string | null;
  invitationToken: string | null;
  invitationExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export interface PaginatedUsers {
  data: UserSelect[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  byRole: {
    SUPER_ADMIN: number;
    ADMIN: number;
    MANAGER: number;
    STAFF: number;
  };
}

/**
 * User Service - Business logic layer for user operations
 */
export class UserService {
  constructor(private prisma: PrismaClient) { }

  /**
   * Generate a secure invitation token
   */
  private generateInvitationToken(): string {
    return randomBytes(32).toString("hex");
  }

  /**
   * Create a new user (legacy - with password)
   * @deprecated Use invite() for new users
   */
  async create(data: CreateUserInput) {
    try {
      // Sanitize input data
      const sanitizedData = {
        email: data.email.trim().toLowerCase(),
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        role: data.role,
        phone: data.phone?.trim(),
      };

      // Check if user with email already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: sanitizedData.email },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A user with this email address already exists",
        });
      }

      // Hash the password using Better Auth's scrypt hashing
      const hashedPassword = await hashPassword(data.password);

      // Auto-generate name field from firstName + lastName (CRITICAL FIX)
      const name = `${sanitizedData.firstName} ${sanitizedData.lastName}`;

      // Generate unique ID (Better Auth uses nanoid)
      const id = nanoid();

      // Create the user
      const user = await this.prisma.user.create({
        data: {
          id,
          ...sanitizedData,
          name,
          password: hashedPassword,
        },
        select: {
          id: true,
          email: true,
          name: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          phone: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return user;
    } catch (error) {
      // Re-throw TRPCError as is
      if (error instanceof TRPCError) {
        throw error;
      }

      // Log and throw formatted error for Prisma errors
      console.error("Error creating user:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create user. Please try again.",
      });
    }
  }

  /**
   * Invite a new user (invitation-based registration)
   * User will set their own password after accepting invitation
   */
  async invite(data: InviteUserInput) {
    try {
      // Sanitize input data
      const sanitizedData = {
        email: data.email.trim().toLowerCase(),
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        role: data.role,
        phone: data.phone?.trim(),
      };

      // Check if user with email already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: sanitizedData.email },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A user with this email address already exists",
        });
      }

      // Generate invitation token and expiry (7 days)
      const invitationToken = this.generateInvitationToken();
      const invitationExpiresAt = new Date();
      invitationExpiresAt.setDate(invitationExpiresAt.getDate() + 7);

      // Auto-generate name field from firstName + lastName
      const name = `${sanitizedData.firstName} ${sanitizedData.lastName}`;

      // Generate unique ID (Better Auth uses nanoid)
      const id = nanoid();

      // Create the user in pending state (no password yet)
      const user = await this.prisma.user.create({
        data: {
          id,
          ...sanitizedData,
          name,
          isActive: false, // User is inactive until they accept invitation
          invitationToken,
          invitationExpiresAt,
        },
        select: {
          id: true,
          email: true,
          name: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          phone: true,
          invitationToken: true,
          invitationExpiresAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return user;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error("Error inviting user:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to invite user. Please try again.",
      });
    }
  }

  /**
   * Accept user invitation and set password
   */
  async acceptInvitation(data: AcceptUserInvitationInput) {
    try {
      // Find user by invitation token
      const user = await this.prisma.user.findUnique({
        where: { invitationToken: data.token },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid or expired invitation token",
        });
      }

      // Check if invitation has expired
      if (user.invitationExpiresAt && user.invitationExpiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invitation has expired. Please request a new invitation.",
        });
      }

      // Hash the password using Better Auth's scrypt hashing
      const hashedPassword = await hashPassword(data.password);

      // Update user: set password, clear invitation token, activate account
      const updatedUser = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          isActive: true,
          emailVerified: true,
          invitationToken: null,
          invitationExpiresAt: null,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          phone: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Create account record for Better Auth (credential provider)
      await this.prisma.account.create({
        data: {
          id: nanoid(),
          userId: updatedUser.id,
          accountId: updatedUser.email,
          providerId: "credential",
          password: hashedPassword,
        },
      });

      return updatedUser;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error("Error accepting invitation:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to accept invitation. Please try again.",
      });
    }
  }

  /**
   * Resend invitation to a user
   */
  async resendInvitation(id: string) {
    try {
      // Find the user
      const user = await this.prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `User with ID ${id} not found`,
        });
      }

      // Check if user already has accepted their invitation
      if (user.isActive && !user.invitationToken) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User has already accepted their invitation",
        });
      }

      // Generate new invitation token and expiry
      const invitationToken = this.generateInvitationToken();
      const invitationExpiresAt = new Date();
      invitationExpiresAt.setDate(invitationExpiresAt.getDate() + 7);

      // Update the user with new invitation token
      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: {
          invitationToken,
          invitationExpiresAt,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          phone: true,
          invitationToken: true,
          invitationExpiresAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return updatedUser;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error("Error resending invitation:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to resend invitation. Please try again.",
      });
    }
  }

  /**
   * Get invitation info by token (for public invitation acceptance page)
   */
  async getInvitationInfo(token: string): Promise<{
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isExpired: boolean;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { invitationToken: token },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        invitationExpiresAt: true,
      },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Invalid invitation token",
      });
    }

    // Check if invitation has expired
    const isExpired = !user.invitationExpiresAt || user.invitationExpiresAt < new Date();

    return {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isExpired,
    };
  }

  /**
   * Get all users with pagination, search, and filters
   */
  async findAll(query: QueryUsersInput): Promise<PaginatedUsers> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100); // Max 100 items per page
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ?? "createdAt";
    const sortOrder = query.sortOrder ?? "desc";

    // Build where clause
    const where: Prisma.UserWhereInput = {};

    // Role filter
    if (query.role) {
      where.role = Array.isArray(query.role) ? { in: query.role } : query.role;
    }

    // Active/Inactive filter
    if (typeof query.isActive === "boolean") {
      where.isActive = query.isActive;
    }

    // Email verification filter
    if (typeof query.emailVerified === "boolean") {
      where.emailVerified = query.emailVerified;
    }

    // Phone filter
    if (typeof query.hasPhone === "boolean") {
      if (query.hasPhone) {
        where.phone = { not: null };
      } else {
        where.phone = null;
      }
    }

    // Date range filter
    if (query.createdFrom || query.createdTo) {
      where.createdAt = {};
      if (query.createdFrom) {
        // Normalize to start of day in local timezone
        const fromDate = new Date(query.createdFrom + 'T00:00:00');
        where.createdAt.gte = fromDate;
      }
      if (query.createdTo) {
        // Normalize to end of day in local timezone (23:59:59.999)
        const toDate = new Date(query.createdTo + 'T23:59:59.999');
        where.createdAt.lte = toDate;
      }
    }

    // Search filter (firstName, lastName, email)
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: "insensitive" } },
        { lastName: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
      ];
    }

    // Execute query
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          phone: true,
          invitationToken: true,
          invitationExpiresAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip,
      }),
      this.prisma.user.count({ where }),
    ]);

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

  /**
   * Get a single user by ID
   */
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        phone: true,
        profilePhoto: true,
        invitationToken: true,
        invitationExpiresAt: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `User with ID ${id} not found`,
      });
    }

    return user;
  }

  /**
   * Find user by email (used for authentication)
   */
  async findByEmail(email: string) {
    return await this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Update a user
   */
  async update(id: string, data: UpdateUserInput) {
    try {
      // Check if user exists
      const user = await this.findOne(id);

      // Sanitize input data
      const sanitizedData: Partial<UpdateUserInputType> = {};
      if (data.email) sanitizedData.email = data.email.trim().toLowerCase();
      if (data.firstName) sanitizedData.firstName = data.firstName.trim();
      if (data.lastName) sanitizedData.lastName = data.lastName.trim();
      if (data.role) sanitizedData.role = data.role;
      if (data.phone !== undefined) sanitizedData.phone = data.phone?.trim();
      if (data.profilePhoto !== undefined) sanitizedData.profilePhoto = data.profilePhoto;

      // Prevent changing role of SUPER_ADMIN users
      if (user.role === UserRole.SUPER_ADMIN && sanitizedData.role && sanitizedData.role !== UserRole.SUPER_ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot change the role of SUPER_ADMIN users",
        });
      }

      // Check if email is being updated and if it's already taken
      if (sanitizedData.email && sanitizedData.email !== user.email) {
        const existingUser = await this.prisma.user.findUnique({
          where: { email: sanitizedData.email },
        });

        if (existingUser) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A user with this email address already exists",
          });
        }
      }

      // Hash password if it's being updated (using Better Auth's scrypt hashing)
      if (data.password) {
        sanitizedData.password = await hashPassword(data.password);
      }

      // Auto-generate name field if firstName or lastName is being updated
      const updatedFirstName = sanitizedData.firstName || user.firstName;
      const updatedLastName = sanitizedData.lastName || user.lastName;
      const updateData = {
        ...sanitizedData,
        name: `${updatedFirstName} ${updatedLastName}`,
      } as Prisma.UserUpdateInput;

      // Update the user
      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          phone: true,
          profilePhoto: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return updatedUser;
    } catch (error) {
      // Re-throw TRPCError as is
      if (error instanceof TRPCError) {
        throw error;
      }

      // Log and throw formatted error for Prisma errors
      console.error("Error updating user:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update user. Please try again.",
      });
    }
  }

  /**
   * Delete a user (hard delete)
   */
  async remove(id: string) {
    // Check if user exists
    const user = await this.findOne(id);

    // Prevent deleting SUPER_ADMIN users
    if (user.role === UserRole.SUPER_ADMIN) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Cannot delete SUPER_ADMIN users",
      });
    }

    // Delete the user
    await this.prisma.user.delete({
      where: { id },
    });

    return { success: true, message: "User deleted successfully" };
  }

  /**
   * Deactivate a user
   */
  async deactivate(id: string) {
    // Check if user exists and get their role
    const existingUser = await this.findOne(id);

    // Prevent deactivating SUPER_ADMIN users
    if (existingUser.role === UserRole.SUPER_ADMIN) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Cannot deactivate SUPER_ADMIN users",
      });
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * Activate a user
   */
  async activate(id: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * Get user statistics for dashboard
   */
  async getStats(): Promise<UserStats> {
    const [total, active, byRole] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      Promise.all([
        this.prisma.user.count({ where: { role: UserRole.SUPER_ADMIN } }),
        this.prisma.user.count({ where: { role: UserRole.ADMIN } }),
        this.prisma.user.count({ where: { role: UserRole.MANAGER } }),
        this.prisma.user.count({ where: { role: UserRole.STAFF } }),
      ]),
    ]);

    const inactive = total - active;

    return {
      total,
      active,
      inactive,
      byRole: {
        SUPER_ADMIN: byRole[0],
        ADMIN: byRole[1],
        MANAGER: byRole[2],
        STAFF: byRole[3],
      },
    };
  }
}
