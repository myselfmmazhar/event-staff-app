import { PrismaClient, Prisma, UserRole } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { randomBytes } from "crypto";
import { hashPassword } from "better-auth/crypto";
import { auth } from "@/lib/server/auth";
import type {
  CreateClientInput,
  UpdateClientInput,
  QueryClientsInput,
  AcceptClientInvitationInput,
} from "@/lib/schemas/client.schema";
import { generateClientId } from "@/lib/utils/id-generator";
import type { ClientSelect, PaginatedResponse } from "@/lib/types/prisma-types";

export type PaginatedClients = PaginatedResponse<ClientSelect>;

export interface ClientStats {
  total: number;
  withLoginAccess: number;
  withoutLoginAccess: number;
}

/**
 * Client Service - Business logic layer for client operations
 */
export class ClientService {
  constructor(private prisma: PrismaClient) { }

  /**
   * Client select configuration for consistent querying
   */
  private readonly clientSelect = {
    id: true,
    clientId: true,
    businessName: true,
    firstName: true,
    lastName: true,
    email: true,
    cellPhone: true,
    businessPhone: true,
    details: true,
    businessAddress: true,
    city: true,
    state: true,
    zipCode: true,
    ccEmail: true,
    billingFirstName: true,
    billingLastName: true,
    billingEmail: true,
    billingPhone: true,
    hasLoginAccess: true,
    userId: true,
    invitationToken: true,
    invitationExpiresAt: true,
    createdBy: true,
    createdAt: true,
    updatedAt: true,
    locations: {
      select: {
        id: true,
        venueName: true,
        meetingPoint: true,
        venueAddress: true,
        city: true,
        state: true,
        zipCode: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' as const },
    },
  } as const;

  /**
   * Generate a secure invitation token
   */
  private generateInvitationToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Create a new client
   * Returns standardized response format with client and optional tempPassword
   */
  async create(
    data: CreateClientInput,
    createdByUserId: string
  ): Promise<{ client: ClientSelect; tempPassword: string | null }> {
    try {
      const clientId = await generateClientId(this.prisma);

      const client = await this.prisma.client.create({
        data: {
          clientId,
          ...data,
          createdBy: createdByUserId,
        },
        select: this.clientSelect,
      });

      return { client, tempPassword: null };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A client with this email already exists",
        });
      }

      console.error("Error creating client:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create client. Please try again.",
      });
    }
  }

  /**
   * Grant login access to a client (generates invitation token)
   * Sends an invitation email for the client to complete account setup
   */
  async grantLoginAccess(
    clientId: string
  ): Promise<{ client: ClientSelect; invitationToken: string }> {
    try {
      const client = await this.findOne(clientId);

      if (client.hasLoginAccess && client.userId) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This client already has login access",
        });
      }

      // If already has pending invitation, return the existing token
      if (client.invitationToken && client.invitationExpiresAt && client.invitationExpiresAt > new Date()) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An invitation has already been sent. Use resend invitation to send again.",
        });
      }

      const invitationToken = this.generateInvitationToken();
      const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Update client with invitation token and hasLoginAccess
      const updatedClient = await this.prisma.client.update({
        where: { id: clientId },
        data: {
          hasLoginAccess: true,
          invitationToken,
          invitationExpiresAt,
        },
        select: this.clientSelect,
      });

      return {
        client: updatedClient,
        invitationToken,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error("Error granting login access:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to grant login access. Please try again.",
      });
    }
  }

  /**
   * Accept client invitation and create user account
   */
  async acceptInvitation(
    data: AcceptClientInvitationInput
  ): Promise<ClientSelect> {
    const { token, password } = data;

    // Find client by invitation token
    const client = await this.prisma.client.findUnique({
      where: { invitationToken: token },
    });

    if (!client) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Invalid invitation token",
      });
    }

    if (!client.invitationExpiresAt || client.invitationExpiresAt < new Date()) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invitation has expired. Please request a new invitation.",
      });
    }

    try {
      // Check if user already exists with this email
      const existingUser = await this.prisma.user.findUnique({
        where: { email: client.email },
      });

      if (existingUser) {
        // Check if this user is already linked to the client record
        if (client.userId === existingUser.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This invitation has already been accepted. Please log in with your credentials.",
          });
        }

        // User exists but not linked to this client - link them
        const hashedPassword = await hashPassword(password);

        // Update user with CLIENT role, verified status, and new password
        await this.prisma.user.update({
          where: { id: existingUser.id },
          data: {
            role: UserRole.CLIENT,
            emailVerified: true,
            phone: client.cellPhone,
            isActive: true,
            password: hashedPassword,
          },
        });

        // Update account password for Better Auth
        await this.prisma.account.updateMany({
          where: {
            userId: existingUser.id,
            providerId: 'credential',
          },
          data: {
            password: hashedPassword,
          },
        });

        // Update client with user link
        const updatedClient = await this.prisma.client.update({
          where: { id: client.id },
          data: {
            userId: existingUser.id,
            invitationToken: null,
            invitationExpiresAt: null,
          },
          select: this.clientSelect,
        });

        return updatedClient;
      }

      // Create User account via Better Auth
      const authResult = await auth.api.signUpEmail({
        body: {
          email: client.email,
          password,
          name: `${client.firstName} ${client.lastName}`,
          firstName: client.firstName,
          lastName: client.lastName,
        },
      });

      if (!authResult?.user?.id) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create user account",
        });
      }

      // Update the created user with CLIENT role and verified status
      await this.prisma.user.update({
        where: { id: authResult.user.id },
        data: {
          role: UserRole.CLIENT,
          emailVerified: true,
          phone: client.cellPhone,
        },
      });

      // Update client with user link and clear invitation
      const updatedClient = await this.prisma.client.update({
        where: { id: client.id },
        data: {
          userId: authResult.user.id,
          invitationToken: null,
          invitationExpiresAt: null,
        },
        select: this.clientSelect,
      });

      return updatedClient;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      // Handle race condition (same fix as staff)
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes("already exists") ||
          errorMessage.includes("duplicate") ||
          errorMessage.includes("activate your account") ||
          errorMessage.includes("invitation")) {
          // Re-check if user was created
          const createdUser = await this.prisma.user.findUnique({
            where: { email: client.email },
          });

          if (createdUser && !client.userId) {
            const hashedPassword = await hashPassword(password);

            await this.prisma.user.update({
              where: { id: createdUser.id },
              data: {
                role: UserRole.CLIENT,
                emailVerified: true,
                phone: client.cellPhone,
                isActive: true,
                password: hashedPassword,
              },
            });

            await this.prisma.account.updateMany({
              where: {
                userId: createdUser.id,
                providerId: 'credential',
              },
              data: {
                password: hashedPassword,
              },
            });

            const updatedClient = await this.prisma.client.update({
              where: { id: client.id },
              data: {
                userId: createdUser.id,
                invitationToken: null,
                invitationExpiresAt: null,
              },
              select: this.clientSelect,
            });

            return updatedClient;
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
   * Get invitation info by token (for invitation acceptance page)
   */
  async getInvitationInfo(token: string): Promise<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    businessName: string;
    isExpired: boolean;
  }> {
    const client = await this.prisma.client.findUnique({
      where: { invitationToken: token },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        businessName: true,
        invitationExpiresAt: true,
      },
    });

    if (!client) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Invalid invitation token",
      });
    }

    const isExpired = !client.invitationExpiresAt || client.invitationExpiresAt < new Date();

    return {
      id: client.id,
      email: client.email,
      firstName: client.firstName,
      lastName: client.lastName,
      businessName: client.businessName,
      isExpired,
    };
  }

  /**
   * Resend invitation email
   */
  async resendInvitation(id: string): Promise<{ client: ClientSelect; invitationToken: string }> {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Client not found",
      });
    }

    if (client.userId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Client has already accepted the invitation",
      });
    }

    const invitationToken = this.generateInvitationToken();
    const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const updatedClient = await this.prisma.client.update({
      where: { id },
      data: {
        invitationToken,
        invitationExpiresAt,
        hasLoginAccess: true,
      },
      select: this.clientSelect,
    });

    return { client: updatedClient, invitationToken };
  }

  /**
   * Revoke login access from a client
   * Deactivates the associated User account
   */
  async revokeLoginAccess(clientId: string): Promise<ClientSelect> {
    try {
      const client = await this.findOne(clientId);

      if (!client.hasLoginAccess || !client.userId) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This client does not have login access",
        });
      }

      // Deactivate the user
      await this.prisma.user.update({
        where: { id: client.userId },
        data: { isActive: false },
      });

      // Update client
      const updatedClient = await this.prisma.client.update({
        where: { id: clientId },
        data: { hasLoginAccess: false },
        select: this.clientSelect,
      });

      return updatedClient;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error("Error revoking login access:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to revoke login access. Please try again.",
      });
    }
  }

  /**
   * Get all clients with pagination, search, and filters
   */
  async findAll(
    query: QueryClientsInput,
    createdByUserId?: string
  ): Promise<PaginatedClients> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ?? "createdAt";
    const sortOrder = query.sortOrder ?? "desc";

    const where: Prisma.ClientWhereInput = {};

    if (createdByUserId) {
      where.createdBy = createdByUserId;
    }

    if (query.hasLoginAccess !== undefined) {
      where.hasLoginAccess = query.hasLoginAccess;
    }

    if (query.city) {
      where.city = { contains: query.city, mode: "insensitive" };
    }
    if (query.state) {
      where.state = { contains: query.state, mode: "insensitive" };
    }

    if (query.createdFrom || query.createdTo) {
      where.createdAt = {};
      if (query.createdFrom) {
        where.createdAt.gte = new Date(query.createdFrom);
      }
      if (query.createdTo) {
        const toDate = new Date(query.createdTo);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    if (query.search) {
      where.OR = [
        { businessName: { contains: query.search, mode: "insensitive" } },
        { firstName: { contains: query.search, mode: "insensitive" } },
        { lastName: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
      ];
    }

    // Create type-safe orderBy
    const orderBy: Prisma.ClientOrderByWithRelationInput =
      sortBy === 'businessName' ? { businessName: sortOrder } :
        sortBy === 'email' ? { email: sortOrder } :
          sortBy === 'createdAt' ? { createdAt: sortOrder } :
            { createdAt: 'desc' };

    const [data, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        select: this.clientSelect,
        orderBy,
        take: limit,
        skip,
      }),
      this.prisma.client.count({ where }),
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
   * Get a single client by ID
   */
  async findOne(id: string): Promise<ClientSelect> {
    const client = await this.prisma.client.findUnique({
      where: { id },
      select: this.clientSelect,
    });

    if (!client) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Client with ID ${id} not found`,
      });
    }

    return client;
  }

  /**
   * Find client by email
   */
  async findByEmail(email: string): Promise<ClientSelect | null> {
    return await this.prisma.client.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: this.clientSelect,
    });
  }

  /**
   * Update a client
   * Handles login access changes
   * Returns standardized response format with client and optional invitationToken
   */
  async update(
    id: string,
    data: Omit<UpdateClientInput, 'id'>
  ): Promise<{ client: ClientSelect; invitationToken: string | null }> {
    try {
      const client = await this.findOne(id);

      // Handle login access changes - only send invite on FIRST time access enabled
      if (data.hasLoginAccess !== undefined && data.hasLoginAccess !== client.hasLoginAccess) {
        if (data.hasLoginAccess) {
          // Only grant access if client doesn't already have userId (not already accepted)
          // and doesn't have a valid pending invitation
          if (!client.userId && !client.invitationToken) {
            // First time enabling access - generate and return invitation
            return await this.grantLoginAccess(id);
          }
          // If already has userId or invitationToken, just update the flag
          const updatedClient = await this.prisma.client.update({
            where: { id },
            data: { hasLoginAccess: true },
            select: this.clientSelect,
          });
          return { client: updatedClient, invitationToken: null };
        } else {
          // Return revoked client with null invitationToken
          const revokedClient = await this.revokeLoginAccess(id);
          return { client: revokedClient, invitationToken: null };
        }
      }

      // If user fields changed and client has login access, update the User
      if (client.userId && client.hasLoginAccess) {
        const userUpdateData: Prisma.UserUpdateInput = {};

        if ('firstName' in data && data.firstName) {
          userUpdateData.firstName = data.firstName;
        }
        if ('lastName' in data && data.lastName) {
          userUpdateData.lastName = data.lastName;
        }
        if ('email' in data && data.email) {
          userUpdateData.email = data.email;
        }

        if ('firstName' in data || 'lastName' in data) {
          const firstName = ('firstName' in data && data.firstName) ? data.firstName : client.firstName;
          const lastName = ('lastName' in data && data.lastName) ? data.lastName : client.lastName;
          userUpdateData.name = `${firstName} ${lastName}`;
        }

        if (Object.keys(userUpdateData).length > 0) {
          await this.prisma.user.update({
            where: { id: client.userId },
            data: userUpdateData,
          });
        }
      }

      // Update the client
      const updatedClient = await this.prisma.client.update({
        where: { id },
        data: data,
        select: this.clientSelect,
      });

      return { client: updatedClient, invitationToken: null };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A client with this email already exists",
        });
      }

      console.error("Error updating client:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update client. Please try again.",
      });
    }
  }

  /**
   * Delete a client
   * Deactivates associated User if exists
   */
  async remove(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const client = await this.findOne(id);

      if (client.userId) {
        await this.prisma.user.update({
          where: { id: client.userId },
          data: { isActive: false },
        });
      }

      await this.prisma.client.delete({
        where: { id },
      });

      return { success: true, message: "Client deleted successfully" };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error("Error deleting client:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to delete client. Please try again.",
      });
    }
  }

  /**
   * Delete multiple clients
   */
  async deleteMany(ids: string[]): Promise<{ count: number }> {
    const result = await this.prisma.client.deleteMany({
      where: { id: { in: ids } },
    });

    return { count: result.count };
  }

  /**
   * Get client statistics
   */
  async getStats(): Promise<ClientStats> {
    const [total, withLoginAccess] = await Promise.all([
      this.prisma.client.count(),
      this.prisma.client.count({ where: { hasLoginAccess: true } }),
    ]);

    return {
      total,
      withLoginAccess,
      withoutLoginAccess: total - withLoginAccess,
    };
  }

  /**
   * Get all clients for export (no pagination)
   * Excludes security-sensitive fields like hasLoginAccess, userId, invitationToken
   */
  async findAllForExport(userId: string) {
    const clients = await this.prisma.client.findMany({
      where: { createdBy: userId },
      select: {
        id: true,
        clientId: true,
        businessName: true,
        firstName: true,
        lastName: true,
        email: true,
        cellPhone: true,
        businessPhone: true,
        details: true,
        businessAddress: true,
        city: true,
        state: true,
        zipCode: true,
        ccEmail: true,
        billingFirstName: true,
        billingLastName: true,
        billingEmail: true,
        billingPhone: true,
        createdAt: true,
      },
      orderBy: { businessName: 'asc' },
    });

    return clients;
  }

  /**
   * Bulk create clients (create-only mode)
   * Each client gets a unique clientId auto-generated
   */
  async createMany(
    clients: Array<Partial<CreateClientInput> & Pick<CreateClientInput, 'businessName' | 'firstName' | 'lastName' | 'email' | 'cellPhone' | 'city' | 'state' | 'zipCode'>>,
    userId: string
  ): Promise<{ created: number; errors: { index: number; message: string }[] }> {
    const results = { created: 0, errors: [] as { index: number; message: string }[] };

    for (let i = 0; i < clients.length; i++) {
      const clientData = clients[i]!;
      try {
        await this.create(clientData as CreateClientInput, userId);
        results.created++;
      } catch (error) {
        results.errors.push({
          index: i,
          message: error instanceof Error ? error.message : 'Failed to create client',
        });
      }
    }

    return results;
  }

  /**
   * Bulk upsert clients (create or update by email match)
   * If email matches an existing client owned by the user, updates it.
   * Otherwise, creates a new client.
   */
  async upsertMany(
    clients: Array<Partial<CreateClientInput> & Pick<CreateClientInput, 'businessName' | 'firstName' | 'lastName' | 'email' | 'cellPhone' | 'city' | 'state' | 'zipCode'>>,
    userId: string
  ): Promise<{ created: number; updated: number; errors: { index: number; message: string }[] }> {
    const results = { created: 0, updated: 0, errors: [] as { index: number; message: string }[] };

    // Collect all emails from import data
    const importEmails = clients
      .map((c) => c.email.toLowerCase())
      .filter((email): email is string => !!email);

    // Build a map of existing clients by email
    const existingClients = importEmails.length > 0
      ? await this.prisma.client.findMany({
        where: {
          createdBy: userId,
          email: { in: importEmails, mode: 'insensitive' },
        },
        select: {
          id: true,
          email: true,
        },
      })
      : [];

    // Map email -> database id
    const existingMap = new Map<string, string>();
    for (const client of existingClients) {
      existingMap.set(client.email.toLowerCase(), client.id);
    }

    for (let i = 0; i < clients.length; i++) {
      const clientData = clients[i]!;
      try {
        // Check if this client's email matches an existing client
        const existingId = existingMap.get(clientData.email.toLowerCase());

        if (existingId) {
          // Update existing client (don't touch hasLoginAccess)
          await this.update(existingId, clientData);
          results.updated++;
        } else {
          // Create new client
          await this.create(clientData as CreateClientInput, userId);
          results.created++;
        }
      } catch (error) {
        results.errors.push({
          index: i,
          message: error instanceof Error ? error.message : 'Failed to process client',
        });
      }
    }

    return results;
  }
}
