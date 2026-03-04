import { Prisma, PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import type { UpdateTerminologyInput } from "@/lib/schemas/settings.schema";
import type { UpdateGlobalLabelsInput, PageIdentifier, ResetLabelsInput } from "@/lib/schemas/labels.schema";
import { buildTerminologyConfig, getDefaultTerminology, type TerminologyConfig } from "@/lib/config/terminology";
import {
    buildLabelsConfig,
    getDefaultLabels,
    deepMerge,
    setNestedValue,
    DEFAULT_GLOBAL_LABELS,
    DEFAULT_PAGE_LABELS,
    type LabelsConfig,
    type GlobalLabels,
    type PageLabels,
} from "@/lib/config/labels";

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

    // ========================================================================
    // LABELS METHODS
    // ========================================================================

    /**
     * Get all labels (global + page-specific)
     * Returns database settings merged with defaults
     */
    async getLabels(): Promise<LabelsConfig> {
        try {
            const settings = await this.prisma.organizationSettings.findFirst({
                select: {
                    globalLabels: true,
                    pageLabels: true,
                },
            });

            return buildLabelsConfig({
                globalLabels: (settings?.globalLabels as Record<string, unknown>) || {},
                pageLabels: (settings?.pageLabels as Record<string, unknown>) || {},
            });
        } catch (error) {
            console.error("Error fetching labels from database:", error);
            // On error, return defaults
            return getDefaultLabels();
        }
    }

    /**
     * Update global labels (partial update)
     * Merges provided labels with existing ones
     */
    async updateGlobalLabels(labels: UpdateGlobalLabelsInput): Promise<LabelsConfig> {
        try {
            const existing = await this.prisma.organizationSettings.findFirst();
            const currentGlobalLabels = (existing?.globalLabels as Record<string, unknown>) || {};
            const mergedLabels = deepMerge<GlobalLabels>(
                currentGlobalLabels as unknown as GlobalLabels,
                labels as unknown as Partial<GlobalLabels>
            );

            if (existing) {
                await this.prisma.organizationSettings.update({
                    where: { id: existing.id },
                    data: {
                        globalLabels: mergedLabels as unknown as Prisma.InputJsonValue,
                        updatedAt: new Date(),
                    },
                });
            } else {
                await this.prisma.organizationSettings.create({
                    data: {
                        globalLabels: mergedLabels as unknown as Prisma.InputJsonValue,
                    },
                });
            }

            return this.getLabels();
        } catch (error) {
            console.error("Error updating global labels:", error);
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to update global labels",
                cause: error,
            });
        }
    }

    /**
     * Update page-specific labels
     * Updates labels for a specific page
     */
    async updatePageLabels(page: PageIdentifier, labels: Record<string, unknown>): Promise<LabelsConfig> {
        try {
            const existing = await this.prisma.organizationSettings.findFirst();
            const currentPageLabels = (existing?.pageLabels as Record<string, unknown>) || {};
            const currentPageSection = (currentPageLabels[page] as Record<string, unknown>) || {};

            // Convert dot-notation keys to nested object structure
            // e.g., {"columns.staffId": "ID"} -> {columns: {staffId: "ID"}}
            let nestedLabels: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(labels)) {
                nestedLabels = setNestedValue(nestedLabels, key, value);
            }

            // Deep merge the new labels with existing page labels
            let mergedPageSection = deepMerge(
                currentPageSection as Record<string, unknown>,
                nestedLabels as Record<string, unknown>
            );

            // IMPORTANT: Clean up legacy dot-notation keys to prevent them from
            // overwriting nested values during normalization in buildLabelsConfig.
            // If we have both "columns: { staffId: 'X' }" and "'columns.staffId': 'Y'",
            // the legacy key would overwrite the nested value. Remove legacy keys.
            const legacyPrefixes = ['columns.', 'filters.', 'page.'];
            const cleanedPageSection: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(mergedPageSection)) {
                // Skip legacy dot-notation keys (they're now in nested format)
                const isLegacyKey = legacyPrefixes.some(prefix => key.startsWith(prefix));
                if (!isLegacyKey) {
                    cleanedPageSection[key] = value;
                }
            }

            const mergedPageLabels = {
                ...currentPageLabels,
                [page]: cleanedPageSection,
            };

            if (existing) {
                await this.prisma.organizationSettings.update({
                    where: { id: existing.id },
                    data: {
                        pageLabels: mergedPageLabels as unknown as Prisma.InputJsonValue,
                        updatedAt: new Date(),
                    },
                });
            } else {
                await this.prisma.organizationSettings.create({
                    data: {
                        pageLabels: mergedPageLabels as unknown as Prisma.InputJsonValue,
                    },
                });
            }

            return this.getLabels();
        } catch (error) {
            console.error("Error updating page labels:", error);
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: `Failed to update labels for ${page} page`,
                cause: error,
            });
        }
    }

    /**
     * Reset labels to defaults
     * Can reset all labels, global only, or a specific page
     */
    async resetLabels(input: ResetLabelsInput): Promise<LabelsConfig> {
        try {
            const existing = await this.prisma.organizationSettings.findFirst();

            if (!existing) {
                // Nothing to reset, return defaults
                return getDefaultLabels();
            }

            let updateData: { globalLabels?: Prisma.InputJsonValue; pageLabels?: Prisma.InputJsonValue } = {};

            switch (input.scope) {
                case 'all':
                    updateData = {
                        globalLabels: {} as Prisma.InputJsonValue,
                        pageLabels: {} as Prisma.InputJsonValue,
                    };
                    break;
                case 'global':
                    updateData = {
                        globalLabels: {} as Prisma.InputJsonValue,
                    };
                    break;
                case 'page':
                    if (input.page) {
                        const currentPageLabels = (existing.pageLabels as Record<string, unknown>) || {};
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const { [input.page]: _, ...rest } = currentPageLabels;
                        updateData = {
                            pageLabels: rest as unknown as Prisma.InputJsonValue,
                        };
                    }
                    break;
            }

            await this.prisma.organizationSettings.update({
                where: { id: existing.id },
                data: {
                    ...updateData,
                    updatedAt: new Date(),
                },
            });

            return this.getLabels();
        } catch (error) {
            console.error("Error resetting labels:", error);
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to reset labels",
                cause: error,
            });
        }
    }

    // ========================================================================
    // COMPANY PROFILE METHODS
    // ========================================================================

    /**
     * Get company profile settings
     */
    async getCompanyProfile() {
        try {
            const settings = await this.prisma.organizationSettings.findFirst({
                select: {
                    companyName: true,
                    companyLogoUrl: true,
                    companyTagline: true,
                    companyWebsite: true,
                    companyPhone: true,
                    companyAddress: true,
                    companyTimezone: true,
                },
            }) as any;

            return {
                companyName: settings?.companyName || null,
                companyLogoUrl: settings?.companyLogoUrl || null,
                companyTagline: settings?.companyTagline || null,
                companyWebsite: settings?.companyWebsite || null,
                companyPhone: settings?.companyPhone || null,
                companyAddress: settings?.companyAddress || null,
                companyTimezone: settings?.companyTimezone || "UTC",
            };
        } catch (error) {
            console.error("Error fetching company profile:", error);
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to fetch company profile",
                cause: error,
            });
        }
    }

    /**
     * Update company profile settings
     */
    async updateCompanyProfile(data: {
        companyName?: string | null;
        companyLogoUrl?: string | null;
        companyTagline?: string | null;
        companyWebsite?: string | null;
        companyPhone?: string | null;
        companyAddress?: string | null;
        companyTimezone?: string;
    }) {
        try {
            const existingSettings = await this.prisma.organizationSettings.findFirst();

            if (existingSettings) {
                await this.prisma.organizationSettings.update({
                    where: { id: existingSettings.id },
                    data,
                });
            } else {
                await this.prisma.organizationSettings.create({
                    data,
                });
            }

            return this.getCompanyProfile();
        } catch (error) {
            console.error("Error updating company profile:", error);
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to update company profile",
                cause: error,
            });
        }
    }

    /**
     * Get communication settings (deprecated single fields)
     */
    async getCommunicationSettings() {
        return {}; // Bird fields removed, now using messaging configurations
    }

    /**
     * Update communication settings (deprecated single fields)
     */
    async updateCommunicationSettings() {
        return {};
    }

    // ========================================================================
    // SMTP CONFIGURATION METHODS
    // ========================================================================

    async listSmtpConfigs() {
        return await (this.prisma as any).smtpConfiguration.findMany({
            orderBy: { createdAt: 'desc' }
        });
    }

    async createSmtpConfig(data: {
        name: string;
        host: string;
        port: number;
        user: string;
        pass: string;
        from: string;
        security?: string;
        isDefault?: boolean;
    }) {
        try {
            const fs = require('fs');
            const prismaAny = this.prisma as any;

            if (!prismaAny.smtpConfiguration) {
                const errorMsg = "Prisma model 'smtpConfiguration' is not available. This usually means the Prisma Client is stale. Please restart the dev server.";
                fs.appendFileSync('prisma-debug.log', `CRITICAL ERROR at ${new Date().toISOString()}: ${errorMsg}\nKeys found: ${Object.keys(prismaAny).filter((k: string) => !k.startsWith('_')).join(', ')}\n---\n`);
                throw new Error(errorMsg);
            }

            const debugInfo = {
                timestamp: new Date().toISOString(),
                data,
                prismaKeys: Object.keys(this.prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'))
            };
            fs.appendFileSync('prisma-debug.log', JSON.stringify(debugInfo, null, 2) + "\n---\n");

            if (data.isDefault) {
                await prismaAny.smtpConfiguration.updateMany({
                    where: { isDefault: true },
                    data: { isDefault: false }
                });
            }

            return await prismaAny.smtpConfiguration.create({
                data
            });
        } catch (error: any) {
            const fs = require('fs');
            fs.appendFileSync('prisma-debug.log', `ERROR at ${new Date().toISOString()}: ${error.message}\n${error.stack}\n---\n`);
            console.error("Error creating SMTP config:", error);
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: `Failed to create SMTP configuration: ${error.message}`,
                cause: error
            });
        }
    }

    async updateSmtpConfig(id: string, data: {
        name?: string;
        host?: string;
        port?: number;
        user?: string;
        pass?: string;
        from?: string;
        security?: string;
        isDefault?: boolean;
    }) {
        if (data.isDefault) {
            await (this.prisma as any).smtpConfiguration.updateMany({
                where: { isDefault: true, NOT: { id } },
                data: { isDefault: false }
            });
        }

        return await (this.prisma as any).smtpConfiguration.update({
            where: { id },
            data
        });
    }

    async deleteSmtpConfig(id: string) {
        return await (this.prisma as any).smtpConfiguration.delete({
            where: { id }
        });
    }

    async setDefaultSmtpConfig(id: string) {
        await this.prisma.smtpConfiguration.updateMany({
            where: { isDefault: true },
            data: { isDefault: false }
        });

        return await this.prisma.smtpConfiguration.update({
            where: { id },
            data: { isDefault: true }
        });
    }

    // ========================================================================
    // MESSAGING CONFIGURATION METHODS
    // ========================================================================

    async listMessagingConfigs() {
        return await (this.prisma as any).messagingConfiguration.findMany({
            orderBy: { createdAt: 'desc' }
        });
    }

    async createMessagingConfig(data: {
        name: string;
        provider: string;
        apiKey: string;
        workspaceId?: string;
        channelId?: string;
        from?: string;
        isDefault?: boolean;
    }) {
        if (data.isDefault) {
            await (this.prisma as any).messagingConfiguration.updateMany({
                where: { isDefault: true },
                data: { isDefault: false }
            });
        }

        return await (this.prisma as any).messagingConfiguration.create({
            data
        });
    }

    async updateMessagingConfig(id: string, data: {
        name?: string;
        provider?: string;
        apiKey?: string;
        workspaceId?: string;
        channelId?: string;
        from?: string;
        isDefault?: boolean;
    }) {
        if (data.isDefault) {
            await (this.prisma as any).messagingConfiguration.updateMany({
                where: { isDefault: true, NOT: { id } },
                data: { isDefault: false }
            });
        }

        return await (this.prisma as any).messagingConfiguration.update({
            where: { id },
            data
        });
    }

    async deleteMessagingConfig(id: string) {
        return await (this.prisma as any).messagingConfiguration.delete({
            where: { id }
        });
    }

    async setDefaultMessagingConfig(id: string) {
        await (this.prisma as any).messagingConfiguration.updateMany({
            where: { isDefault: true },
            data: { isDefault: false }
        });

        return await (this.prisma as any).messagingConfiguration.update({
            where: { id },
            data: { isDefault: true }
        });
    }
}
