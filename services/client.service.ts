import { PrismaClient, Prisma, UserRole } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { randomBytes } from "crypto";
import { nanoid } from "nanoid";
import type {
  CreateClientInput,
  UpdateClientInput as UpdateClientInputType,
  QueryClientsInput,
} from "@/lib/schemas/client.schema";

// Update input type for service (Zod already validates, service receives validated data)
export interface UpdateClientInput extends Omit<UpdateClientInputType, "id"> {}

type ClientSelect = {
  id: string;
  clientId: string;
  businessName: string;
  firstName: string;
  lastName: string;
  email: string;
  cellPhone: string;
  businessPhone: string | null;
  details: string | null;
  venueName: string | null;
  room: string | null;
  streetAddress: string;
  aptSuiteUnit: string | null;
  city: string;
  country: string;
  state: string;
  zipCode: string;
  hasLoginAccess: boolean;
  userId: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export interface PaginatedClients {
  data: ClientSelect[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ClientStats {
  total: number;
  withLoginAccess: number;
  withoutLoginAccess: number;
}

/**
 * Client Service - Business logic layer for client operations
 */
export class ClientService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generate a unique Client ID in format CLT-YYYY-NNN
   * Includes race condition protection
   */
  private async generateClientId(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CLT-${year}-`;

    // Get the count of clients created this year
    const count = await this.prisma.client.count({
      where: {
        clientId: {
          startsWith: prefix,
        },
      },
    });

    // Generate the next number (pad with zeros to 3 digits)
    const nextNumber = (count + 1).toString().padStart(3, "0");
    const clientId = `${prefix}${nextNumber}`;

    // Check if this ID already exists (race condition protection)
    const existing = await this.prisma.client.findUnique({
      where: { clientId },
    });

    if (existing) {
      // Recursively try the next number
      return this.generateClientId();
    }

    return clientId;
  }

  /**
   * Generate a secure temporary password
   */
  private generateTemporaryPassword(): string {
    // Generate 16 random bytes and convert to base64
    const randomBytes16 = randomBytes(16).toString("base64");
    // Format: Aa#12345678901234 (mix of uppercase, lowercase, numbers, special chars)
    return `Temp${randomBytes16.substring(0, 16)}#`;
  }

  /**
   * Create a new client
   */
  async create(data: CreateClientInput, createdByUserId: string) {
    try {
      const clientId = await this.generateClientId();

      const client = await this.prisma.client.create({
        data: {
          clientId,
          ...data,
          createdBy: createdByUserId,
        },
        select: this.getClientSelect(),
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
   * Grant login access to a client
   * Creates a User account and links it to the client
   */
  async grantLoginAccess(
    clientId: string,
    createdByUserId: string
  ): Promise<{ client: ClientSelect; tempPassword: string }> {
    try {
      const client = await this.findOne(clientId);

      if (client.hasLoginAccess && client.userId) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This client already has login access",
        });
      }

      const tempPassword = this.generateTemporaryPassword();
      const userId = nanoid();
      const name = `${client.firstName} ${client.lastName}`;

      // Create User account
      await this.prisma.user.create({
        data: {
          id: userId,
          email: client.email,
          name,
          firstName: client.firstName,
          lastName: client.lastName,
          role: UserRole.CLIENT,
          emailVerified: true,
          isActive: true,
        },
      });

      // Update client with userId and hasLoginAccess
      const updatedClient = await this.prisma.client.update({
        where: { id: clientId },
        data: {
          userId,
          hasLoginAccess: true,
        },
        select: this.getClientSelect(),
      });

      return {
        client: updatedClient,
        tempPassword,
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
        select: this.getClientSelect(),
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
    if (query.country) {
      where.country = { contains: query.country, mode: "insensitive" };
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

    const [data, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        select: this.getClientSelect(),
        orderBy: { [sortBy]: sortOrder } as any,
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
      select: this.getClientSelect(),
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
      select: this.getClientSelect(),
    });
  }

  /**
   * Update a client
   * Handles login access changes
   */
  async update(id: string, data: UpdateClientInput): Promise<ClientSelect> {
    try {
      const client = await this.findOne(id);

      // Handle login access changes
      if (data.hasLoginAccess !== undefined && data.hasLoginAccess !== client.hasLoginAccess) {
        if (data.hasLoginAccess) {
          return (await this.grantLoginAccess(id, client.createdBy)).client;
        } else {
          return await this.revokeLoginAccess(id);
        }
      }

      // If user fields changed and client has login access, update the User
      if (client.userId && client.hasLoginAccess) {
        const userUpdateData: Prisma.UserUpdateInput = {};
        if (data.firstName) userUpdateData.firstName = data.firstName;
        if (data.lastName) userUpdateData.lastName = data.lastName;
        if (data.email) userUpdateData.email = data.email;

        if (data.firstName || data.lastName) {
          const firstName = data.firstName ?? client.firstName;
          const lastName = data.lastName ?? client.lastName;
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
        data: data as Prisma.ClientUpdateInput,
        select: this.getClientSelect(),
      });

      return updatedClient;
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
   * Helper method to get consistent client select fields
   */
  private getClientSelect() {
    return {
      id: true,
      clientId: true,
      businessName: true,
      firstName: true,
      lastName: true,
      email: true,
      cellPhone: true,
      businessPhone: true,
      details: true,
      venueName: true,
      room: true,
      streetAddress: true,
      aptSuiteUnit: true,
      city: true,
      country: true,
      state: true,
      zipCode: true,
      hasLoginAccess: true,
      userId: true,
      createdBy: true,
      createdAt: true,
      updatedAt: true,
    };
  }
}
