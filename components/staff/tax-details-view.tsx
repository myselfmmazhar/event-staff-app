'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { BusinessStructure, TaxFilledBy } from '@prisma/client';
import { EditIcon } from 'lucide-react';
import { trpc } from '@/lib/client/trpc';

interface TaxDetailsViewProps {
    staffId: string;
    taxDetails: {
        id: string;
        staffId: string;
        taxFilledBy: string;
        taxName: string | null;
        businessName: string | null;
        businessStructure: string;
        llcClassification: string | null;
        exemptPayeeCode: string | null;
        fatcaExemptionCode: string | null;
        taxAddress: string | null;
        taxCity: string | null;
        taxState: string | null;
        taxZip: string | null;
        accountNumbers: string | null;
        signatureUrl: string | null;
        certificationDate: Date | string | null;
        createdAt: Date | string;
        updatedAt: Date | string;
    } | null;
    onEdit?: () => void;
}

const BUSINESS_STRUCTURE_LABELS: Record<string, string> = {
    [BusinessStructure.INDIVIDUAL]: 'Individual/Sole Proprietor',
    [BusinessStructure.LLC]: 'LLC',
    [BusinessStructure.C_CORPORATION]: 'C Corporation',
    [BusinessStructure.S_CORPORATION]: 'S Corporation',
    [BusinessStructure.PARTNERSHIP]: 'Partnership',
    [BusinessStructure.TRUST_ESTATE]: 'Trust/Estate',
    [BusinessStructure.OTHER]: 'Other',
};

export function TaxDetailsView({ staffId, taxDetails, onEdit }: TaxDetailsViewProps) {
    // Query masked SSN and EIN
    const { data: maskedSsn } = trpc.staffTaxDetails.getMaskedSsn.useQuery(
        { staffId },
        { enabled: taxDetails?.taxFilledBy === TaxFilledBy.STAFF }
    );
    const { data: maskedEin } = trpc.staffTaxDetails.getMaskedEin.useQuery(
        { staffId },
        { enabled: taxDetails?.taxFilledBy === TaxFilledBy.STAFF }
    );

    // If no tax details exist yet
    if (!taxDetails) {
        return (
            <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Tax Details</h3>
                    {onEdit && (
                        <Button variant="outline" size="sm" onClick={onEdit}>
                            <EditIcon className="h-4 w-4 mr-1" />
                            Add Tax Details
                        </Button>
                    )}
                </div>
                <p className="text-sm text-muted-foreground">No tax details have been provided yet.</p>
            </div>
        );
    }

    const isStaffFilled = taxDetails.taxFilledBy === TaxFilledBy.STAFF;

    return (
        <div className="space-y-6">
            {/* Tax Collection Mode */}
            <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold border-b border-border pb-2 w-full">Tax Information</h3>
                    {onEdit && (
                        <Button variant="outline" size="sm" onClick={onEdit} className="ml-4 shrink-0">
                            <EditIcon className="h-4 w-4 mr-1" />
                            Edit
                        </Button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">Filled by:</p>
                    <Badge variant={isStaffFilled ? 'default' : 'secondary'}>
                        {isStaffFilled ? 'Staff / Admin' : 'Talent'}
                    </Badge>
                </div>
            </div>

            {/* W-9 Details */}
            <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
                <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">W-9 Information</h3>
                <div className="space-y-3">
                    {taxDetails.taxName && (
                        <div>
                            <p className="text-sm text-muted-foreground">Name (Line 1)</p>
                            <p className="text-base">{taxDetails.taxName}</p>
                        </div>
                    )}
                    {taxDetails.businessName && (
                        <div>
                            <p className="text-sm text-muted-foreground">Business Name (Line 2)</p>
                            <p className="text-base">{taxDetails.businessName}</p>
                        </div>
                    )}
                    <div>
                        <p className="text-sm text-muted-foreground">Federal Tax Classification</p>
                        <p className="text-base">
                            {BUSINESS_STRUCTURE_LABELS[taxDetails.businessStructure] || taxDetails.businessStructure}
                            {taxDetails.businessStructure === BusinessStructure.LLC && taxDetails.llcClassification && (
                                <span className="text-muted-foreground ml-1">({taxDetails.llcClassification})</span>
                            )}
                        </p>
                    </div>
                    {(taxDetails.exemptPayeeCode || taxDetails.fatcaExemptionCode) && (
                        <div className="grid grid-cols-2 gap-4">
                            {taxDetails.exemptPayeeCode && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Exempt Payee Code</p>
                                    <p className="text-base">{taxDetails.exemptPayeeCode}</p>
                                </div>
                            )}
                            {taxDetails.fatcaExemptionCode && (
                                <div>
                                    <p className="text-sm text-muted-foreground">FATCA Exemption Code</p>
                                    <p className="text-base">{taxDetails.fatcaExemptionCode}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Address */}
            {(taxDetails.taxAddress || taxDetails.taxCity) && (
                <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
                    <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Address</h3>
                    <div className="space-y-1">
                        {taxDetails.taxAddress && <p className="text-base">{taxDetails.taxAddress}</p>}
                        <p className="text-base">
                            {[taxDetails.taxCity, taxDetails.taxState, taxDetails.taxZip].filter(Boolean).join(', ')}
                        </p>
                    </div>
                </div>
            )}

            {/* Tax Identifiers */}
            {isStaffFilled && (
                <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
                    <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Tax Identifiers</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Social Security Number</p>
                            <p className="text-base font-mono">
                                {maskedSsn || 'Not provided'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Employer Identification Number</p>
                            <p className="text-base font-mono">
                                {maskedEin || 'Not provided'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Certification */}
            {(taxDetails.signatureUrl || taxDetails.certificationDate) && (
                <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
                    <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Certification</h3>
                    <div className="space-y-4">
                        {taxDetails.certificationDate && (
                            <div>
                                <p className="text-sm text-muted-foreground">Certification Date</p>
                                <p className="text-base">
                                    {format(new Date(taxDetails.certificationDate), 'MMM dd, yyyy')}
                                </p>
                            </div>
                        )}
                        {taxDetails.signatureUrl && (
                            <div>
                                <p className="text-sm text-muted-foreground mb-2">Signature</p>
                                <div className="border border-border rounded-md bg-white p-3 inline-block">
                                    <img
                                        src={taxDetails.signatureUrl}
                                        alt="Staff signature"
                                        className="max-h-24 max-w-xs object-contain"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
