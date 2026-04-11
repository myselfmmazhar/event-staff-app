import { PrismaClient, Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import type {
  CreateClientLocationInput,
  UpdateClientLocationInput,
} from "@/lib/schemas/client-location.schema";

/**
 * Client Location select fields
 */
const clientLocationSelect = {
  id: true,
  clientId: true,
  venueName: true,
  meetingPoint: true,
  venueAddress: true,
  city: true,
  state: true,
  zipCode: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type ClientLocationSelect = Prisma.ClientLocationGetPayload<{
  select: typeof clientLocationSelect;
}>;

/**
 * Client Location Service - Business logic layer for client location operations
 */
export class ClientLocationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new client location
   */
  async create(data: CreateClientLocationInput): Promise<ClientLocationSelect> {
    try {
      // First verify the client exists
      const client = await this.prisma.client.findUnique({
        where: { id: data.clientId },
      });

      if (!client) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Client not found",
        });
      }

      const location = await this.prisma.clientLocation.create({
        data: {
          clientId: data.clientId,
          venueName: data.venueName.trim(),
          meetingPoint: data.meetingPoint?.trim() || null,
          venueAddress: data.venueAddress.trim(),
          city: data.city.trim(),
          state: data.state.trim(),
          zipCode: data.zipCode.trim(),
        },
        select: clientLocationSelect,
      });

      return location;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error("Error creating client location:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create location. Please try again.",
      });
    }
  }

  /**
   * Get all locations for a client
   */
  async findByClient(clientId: string): Promise<ClientLocationSelect[]> {
    // First verify the client exists
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Client not found",
      });
    }

    const locations = await this.prisma.clientLocation.findMany({
      where: { clientId },
      select: clientLocationSelect,
      orderBy: { createdAt: "asc" },
    });

    return locations;
  }

  /**
   * Get a single location by ID
   */
  async findOne(id: string): Promise<ClientLocationSelect> {
    const location = await this.prisma.clientLocation.findUnique({
      where: { id },
      select: clientLocationSelect,
    });

    if (!location) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Location not found",
      });
    }

    return location;
  }

  /**
   * Update a client location
   */
  async update(
    id: string,
    data: Omit<UpdateClientLocationInput, "id">
  ): Promise<ClientLocationSelect> {
    // First verify the location exists
    const existing = await this.prisma.clientLocation.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Location not found",
      });
    }

    try {
      const updateData: Prisma.ClientLocationUpdateInput = {};

      if (data.venueName !== undefined) {
        updateData.venueName = data.venueName.trim();
      }
      if (data.meetingPoint !== undefined) {
        updateData.meetingPoint = data.meetingPoint?.trim() || null;
      }
      if (data.venueAddress !== undefined) {
        updateData.venueAddress = data.venueAddress.trim();
      }
      if (data.city !== undefined) {
        updateData.city = data.city.trim();
      }
      if (data.state !== undefined) {
        updateData.state = data.state.trim();
      }
      if (data.zipCode !== undefined) {
        updateData.zipCode = data.zipCode.trim();
      }

      const location = await this.prisma.clientLocation.update({
        where: { id },
        data: updateData,
        select: clientLocationSelect,
      });

      return location;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error("Error updating client location:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update location. Please try again.",
      });
    }
  }

  /**
   * Delete a client location
   */
  async remove(id: string): Promise<{ message: string }> {
    // First verify the location exists
    const existing = await this.prisma.clientLocation.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Location not found",
      });
    }

    try {
      await this.prisma.clientLocation.delete({
        where: { id },
      });

      return { message: "Location deleted successfully" };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error("Error deleting client location:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to delete location. Please try again.",
      });
    }
  }
}
