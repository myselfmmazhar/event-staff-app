import { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import type { UpdateTerminologyInput } from "@/lib/schemas/settings.schema";
import { buildTerminologyConfig, getDefaultTerminology, type TerminologyConfig } from "@/lib/config/terminology";

/**
 * Settings Service - Business logic layer for organization settings operations
 */
export class SettingsService {
    constructor(private prisma: PrismaClient) { }

    /**
     * Get current terminology configuration
     * Returns database settings if exists, otherwise falls back to environment variables
     */
    async getTerminology(): Promise<TerminologyConfig> {
        try {
            // Try to get settings from database (should only be one row)
            const settings = await this.prisma.organizationSettings.findFirst({
                select: {
                    staffTermSingular: true,
                    staffTermPlural: true,
                    eventTermSingular: true,
                    eventTermPlural: true,
                    roleTermSingular: true,
                    roleTermPlural: true,
                },
            });

            // If settings exist in database, use them
            if (settings) {
                return buildTerminologyConfig(settings);
            }

            // Otherwise, fall back to environment variables
            return getDefaultTerminology();
        } catch (error) {
            console.error("Error fetching terminology from database:", error);
            // On error, fall back to environment variables
            return getDefaultTerminology();
        }
    }

    /**
     * Update terminology configuration
     * Creates a new settings row if none exists, otherwise updates the existing one
     */
    async updateTerminology(data: UpdateTerminologyInput): Promise<TerminologyConfig> {
        try {
            // Check if settings already exist
            const existing = await this.prisma.organizationSettings.findFirst();

            let settings;

            if (existing) {
                // Update existing settings
                settings = await this.prisma.organizationSettings.update({
                    where: { id: existing.id },
                    data: {
                        staffTermSingular: data.staffTermSingular,
                        staffTermPlural: data.staffTermPlural,
                        eventTermSingular: data.eventTermSingular,
                        eventTermPlural: data.eventTermPlural,
                        roleTermSingular: data.roleTermSingular,
                        roleTermPlural: data.roleTermPlural,
                        updatedAt: new Date(),
                    },
                    select: {
                        staffTermSingular: true,
                        staffTermPlural: true,
                        eventTermSingular: true,
                        eventTermPlural: true,
                        roleTermSingular: true,
                        roleTermPlural: true,
                    },
                });
            } else {
                // Create new settings
                settings = await this.prisma.organizationSettings.create({
                    data: {
                        staffTermSingular: data.staffTermSingular,
                        staffTermPlural: data.staffTermPlural,
                        eventTermSingular: data.eventTermSingular,
                        eventTermPlural: data.eventTermPlural,
                        roleTermSingular: data.roleTermSingular,
                        roleTermPlural: data.roleTermPlural,
                    },
                    select: {
                        staffTermSingular: true,
                        staffTermPlural: true,
                        eventTermSingular: true,
                        eventTermPlural: true,
                        roleTermSingular: true,
                        roleTermPlural: true,
                    },
                });
            }

            return buildTerminologyConfig(settings);
        } catch (error) {
            console.error("Error updating terminology:", error);
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to update terminology settings",
                cause: error,
            });
        }
    }

    /**
     * Reset terminology to default values (from environment variables)
     * Deletes custom database settings if they exist
     */
    async resetTerminology(): Promise<TerminologyConfig> {
        try {
            // Delete all settings (there should only be one)
            await this.prisma.organizationSettings.deleteMany({});

            // Return default terminology from environment variables
            return getDefaultTerminology();
        } catch (error) {
            console.error("Error resetting terminology:", error);
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to reset terminology settings",
                cause: error,
            });
        }
    }

    /**
     * Get complete organization settings (future-proof for additional settings)
     */
    async getSettings() {
        try {
            const settings = await this.prisma.organizationSettings.findFirst();
            return settings;
        } catch (error) {
            console.error("Error fetching organization settings:", error);
            return null;
        }
    }
}
