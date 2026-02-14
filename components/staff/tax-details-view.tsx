'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { BusinessStructure } from '@prisma/client';
import { ExternalLinkIcon, CheckCircleIcon, XCircleIcon, EditIcon } from 'lucide-react';
import { trpc } from '@/lib/client/trpc';

interface TaxDetailsViewProps {
    staffId: string;
    taxDetails: {
        id: string;
        staffId: string;
        collectTaxDetails: boolean;
        trackFor1099: boolean;
        businessStructure: string;
        businessName: string | null;
        identificationFrontUrl: string | null;
        identificationBackUrl: string | null;
        electronic1099Consent: boolean;
        signatureUrl: string | null;
        consentDate: Date | string | null;
        createdAt: Date | string;
        updatedAt: Date | string;
    } | null;
    onEdit?: () => void;
}

// Helper to format business structure for display
function formatBusinessStructure(structure: string): string {
    switch (structure) {
        case BusinessStructure.INDIVIDUAL:
            return 'Individual/Sole Proprietor';
        case BusinessStructure.LLC:
            return 'LLC';
        case BusinessStructure.CORPORATION:
            return 'Corporation';
        case BusinessStructure.PARTNERSHIP:
            return 'Partnership';
        case BusinessStructure.OTHER:
            return 'Other';
        default:
            return structure;
    }
}

export function TaxDetailsView({ staffId, taxDetails, onEdit }: TaxDetailsViewProps) {
    // Query masked SSN and EIN
    const { data: maskedSsn } = trpc.staffTaxDetails.getMaskedSsn.useQuery(
        { staffId },
        { enabled: !!taxDetails?.collectTaxDetails }
    );
    const { data: maskedEin } = trpc.staffTaxDetails.getMaskedEin.useQuery(
        { staffId },
        { enabled: !!taxDetails?.collectTaxDetails }
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

    return (
        <div className="space-y-6">
            {/* Tax Collection Preferences */}
            <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold border-b border-border pb-2 w-full">Tax Collection Preferences</h3>
                    {onEdit && (
                        <Button variant="outline" size="sm" onClick={onEdit} className="ml-4 shrink-0">
                            <EditIcon className="h-4 w-4 mr-1" />
                            Edit
                        </Button>
                    )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                        {taxDetails.collectTaxDetails ? (
                            <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        ) : (
                            <XCircleIcon className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                            <p className="text-sm text-muted-foreground">Collect Tax Details</p>
                            <Badge variant={taxDetails.collectTaxDetails ? 'success' : 'secondary'}>
                                {taxDetails.collectTaxDetails ? 'Yes' : 'No'}
                            </Badge>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {taxDetails.trackFor1099 ? (
                            <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        ) : (
                            <XCircleIcon className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                            <p className="text-sm text-muted-foreground">Track for 1099</p>
                            <Badge variant={taxDetails.trackFor1099 ? 'success' : 'secondary'}>
                                {taxDetails.trackFor1099 ? 'Yes' : 'No'}
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>

            {/* Only show remaining sections if collecting tax details */}
            {taxDetails.collectTaxDetails && (
                <>
                    {/* Business Information */}
                    <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
                        <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Business Information</h3>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm text-muted-foreground">Structure</p>
                                <p className="text-base">{formatBusinessStructure(taxDetails.businessStructure)}</p>
                            </div>
                            {taxDetails.businessName && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Business Name</p>
                                    <p className="text-base">{taxDetails.businessName}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tax Identifiers */}
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

                    {/* ID Verification */}
                    {(taxDetails.identificationFrontUrl || taxDetails.identificationBackUrl) && (
                        <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
                            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">ID Verification</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">ID Front</p>
                                    {taxDetails.identificationFrontUrl ? (
                                        <a
                                            href={taxDetails.identificationFrontUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center text-primary hover:underline"
                                        >
                                            View Document
                                            <ExternalLinkIcon className="h-3 w-3 ml-1" />
                                        </a>
                                    ) : (
                                        <p className="text-base text-muted-foreground">Not provided</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">ID Back</p>
                                    {taxDetails.identificationBackUrl ? (
                                        <a
                                            href={taxDetails.identificationBackUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center text-primary hover:underline"
                                        >
                                            View Document
                                            <ExternalLinkIcon className="h-3 w-3 ml-1" />
                                        </a>
                                    ) : (
                                        <p className="text-base text-muted-foreground">Not provided</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Electronic Consent */}
                    <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
                        <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Electronic 1099 Consent</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                {taxDetails.electronic1099Consent ? (
                                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                                ) : (
                                    <XCircleIcon className="h-5 w-5 text-muted-foreground" />
                                )}
                                <div>
                                    <p className="text-sm text-muted-foreground">Electronic Delivery Consent</p>
                                    <Badge variant={taxDetails.electronic1099Consent ? 'success' : 'secondary'}>
                                        {taxDetails.electronic1099Consent ? 'Consented' : 'Not Consented'}
                                    </Badge>
                                </div>
                            </div>

                            {taxDetails.consentDate && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Consent Date</p>
                                    <p className="text-base">
                                        {format(new Date(taxDetails.consentDate), 'MMM dd, yyyy')}
                                    </p>
                                </div>
                            )}

                            {taxDetails.signatureUrl && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Signature</p>
                                    <a
                                        href={taxDetails.signatureUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center text-primary hover:underline"
                                    >
                                        View Signature
                                        <ExternalLinkIcon className="h-3 w-3 ml-1" />
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
