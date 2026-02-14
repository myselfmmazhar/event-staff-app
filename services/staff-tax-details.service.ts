import { PrismaClient, BusinessStructure } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import type {
    UpsertStaffTaxDetailsInput,
    StaffTaxDetailsSelfUpdateInput,
} from "@/lib/schemas/staff-tax-details.schema";

/**
 * StaffTaxDetails type for service returns
 */
export type StaffTaxDetailsSelect = {
    id: string;
    staffId: string;
    collectTaxDetails: boolean;
    trackFor1099: boolean;
    businessStructure: BusinessStructure;
    businessName: string | null;
    ssn: string | null;
    ein: string | null;
    identificationFrontUrl: string | null;
    identificationBackUrl: string | null;
    electronic1099Consent: boolean;
    signatureUrl: string | null;
    consentDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
};

/**
 * StaffTaxDetails Service - Business logic layer for staff tax details operations
 */
export class StaffTaxDetailsService {
    /**
     * Select configuration for consistent querying
     */
    private readonly taxDetailsSelect = {
        id: true,
        staffId: true,
        collectTaxDetails: true,
        trackFor1099: true,
        businessStructure: true,
        businessName: true,
        ssn: true,
        ein: true,
        identificationFrontUrl: true,
        identificationBackUrl: true,
        electronic1099Consent: true,
        signatureUrl: true,
        consentDate: true,
        createdAt: true,
        updatedAt: true,
    } as const;

    constructor(private prisma: PrismaClient) {}

    /**
     * Get tax details by staff ID
     */
    async getByStaffId(staffId: string): Promise<StaffTaxDetailsSelect | null> {
        // First verify the staff exists
        const staff = await this.prisma.staff.findUnique({
            where: { id: staffId },
            select: { id: true },
        });

        if (!staff) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "Staff member not found",
            });
        }

        const taxDetails = await this.prisma.staffTaxDetails.findUnique({
            where: { staffId },
            select: this.taxDetailsSelect,
        });

        return taxDetails;
    }

    /**
     * Create or update tax details for a staff member
     */
    async upsert(data: UpsertStaffTaxDetailsInput): Promise<StaffTaxDetailsSelect> {
        const { staffId, ...taxData } = data;

        // Verify the staff exists
        const staff = await this.prisma.staff.findUnique({
            where: { id: staffId },
            select: { id: true },
        });

        if (!staff) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "Staff member not found",
            });
        }

        // Upsert the tax details
        const taxDetails = await this.prisma.staffTaxDetails.upsert({
            where: { staffId },
            create: {
                staffId,
                ...taxData,
            },
            update: taxData,
            select: this.taxDetailsSelect,
        });

        return taxDetails;
    }

    /**
     * Staff self-service update of their tax details
     * Used when staff is updating their own tax information
     */
    async selfUpdate(
        staffId: string,
        data: StaffTaxDetailsSelfUpdateInput
    ): Promise<StaffTaxDetailsSelect> {
        // Verify the staff exists
        const staff = await this.prisma.staff.findUnique({
            where: { id: staffId },
            select: { id: true },
        });

        if (!staff) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "Staff member not found",
            });
        }

        // Upsert the tax details (create if doesn't exist, update if exists)
        const taxDetails = await this.prisma.staffTaxDetails.upsert({
            where: { staffId },
            create: {
                staffId,
                ...data,
            },
            update: data,
            select: this.taxDetailsSelect,
        });

        return taxDetails;
    }

    /**
     * Delete tax details for a staff member
     */
    async delete(staffId: string): Promise<void> {
        // Check if tax details exist
        const existing = await this.prisma.staffTaxDetails.findUnique({
            where: { staffId },
            select: { id: true },
        });

        if (!existing) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "Tax details not found for this staff member",
            });
        }

        await this.prisma.staffTaxDetails.delete({
            where: { staffId },
        });
    }

    /**
     * Check if staff has tax details
     */
    async hasTaxDetails(staffId: string): Promise<boolean> {
        const taxDetails = await this.prisma.staffTaxDetails.findUnique({
            where: { staffId },
            select: { id: true },
        });

        return !!taxDetails;
    }

    /**
     * Get masked SSN (last 4 digits only) for display
     */
    async getMaskedSsn(staffId: string): Promise<string | null> {
        const taxDetails = await this.prisma.staffTaxDetails.findUnique({
            where: { staffId },
            select: { ssn: true },
        });

        if (!taxDetails?.ssn) {
            return null;
        }

        // Return only last 4 digits
        const ssn = taxDetails.ssn.replace(/\D/g, '');
        if (ssn.length >= 4) {
            return `***-**-${ssn.slice(-4)}`;
        }

        return null;
    }

    /**
     * Get masked EIN for display
     */
    async getMaskedEin(staffId: string): Promise<string | null> {
        const taxDetails = await this.prisma.staffTaxDetails.findUnique({
            where: { staffId },
            select: { ein: true },
        });

        if (!taxDetails?.ein) {
            return null;
        }

        // Return only last 4 digits
        const ein = taxDetails.ein.replace(/\D/g, '');
        if (ein.length >= 4) {
            return `**-***${ein.slice(-4)}`;
        }

        return null;
    }
}
