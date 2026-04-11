import { PrismaClient, BusinessStructure, TaxFilledBy } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import type {
    UpsertStaffTaxDetailsInput,
    StaffTaxDetailsSelfUpdateInput,
} from "@/lib/schemas/staff-tax-details.schema";

/**
 * StaffTaxDetails type for service returns (W-9 based)
 */
export type StaffTaxDetailsSelect = {
    id: string;
    staffId: string;
    taxFilledBy: TaxFilledBy;
    taxName: string | null;
    businessName: string | null;
    businessStructure: BusinessStructure;
    llcClassification: string | null;
    exemptPayeeCode: string | null;
    fatcaExemptionCode: string | null;
    taxAddress: string | null;
    taxCity: string | null;
    taxState: string | null;
    taxZip: string | null;
    accountNumbers: string | null;
    ssn: string | null;
    ein: string | null;
    signatureUrl: string | null;
    certificationDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
};

/**
 * StaffTaxDetails Service - Business logic layer for staff tax details operations
 * Based on IRS Form W-9 (Rev. March 2024)
 */
export class StaffTaxDetailsService {
    /**
     * Select configuration for consistent querying
     */
    private readonly taxDetailsSelect = {
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
        ssn: true,
        ein: true,
        signatureUrl: true,
        certificationDate: true,
        createdAt: true,
        updatedAt: true,
    } as const;

    constructor(private prisma: PrismaClient) { }

    /**
     * Get tax details by staff ID
     */
    async getByStaffId(staffId: string): Promise<StaffTaxDetailsSelect | null> {
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
     * Staff self-service update of their tax details (talent fills own W-9)
     */
    async selfUpdate(
        staffId: string,
        data: StaffTaxDetailsSelfUpdateInput
    ): Promise<StaffTaxDetailsSelect> {
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

        const ein = taxDetails.ein.replace(/\D/g, '');
        if (ein.length >= 4) {
            return `**-***${ein.slice(-4)}`;
        }

        return null;
    }
}
