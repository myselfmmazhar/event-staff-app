'use client';


import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CloseIcon } from '@/components/ui/icons';
import { format } from 'date-fns';
import { AccountStatus, AvailabilityStatus, StaffType, StaffRole } from '@prisma/client';
import { useTerminology } from '@/lib/hooks/use-terminology';
import { useLabels } from '@/lib/hooks/use-labels';
import type { StaffWithRelations } from '@/components/staff/staff-table';
import { TaxDetailsView } from './tax-details-view';
import { AssignmentHistory } from './assignment-history';
import { FileText, Download } from 'lucide-react';

interface ViewStaffModalProps {
    staff: StaffWithRelations | null;
    open: boolean;
    onClose: () => void;
    onGrantLoginAccess?: (staffId: string) => void;
    onResendInvitation?: (staffId: string) => void;
    onDisable?: (staffId: string) => void;
    isActioning?: boolean;
}

// Helper to get availability status badge color
function getAvailabilityBadgeVariant(status: AvailabilityStatus): BadgeProps['variant'] {
    switch (status) {
        case 'OPEN_TO_OFFERS':
            return 'success';
        case 'BUSY':
            return 'warning';
        case 'TIME_OFF':
            return 'secondary';
        default:
            return 'default';
    }
}

// Helper to format availability status for display
function formatAvailabilityStatus(status: AvailabilityStatus) {
    switch (status) {
        case 'OPEN_TO_OFFERS':
            return 'Open to Offers';
        case 'BUSY':
            return 'Busy';
        case 'TIME_OFF':
            return 'Time Off';
        default:
            return status;
    }
}

export function ViewStaffModal({
    staff,
    open,
    onClose,
    onGrantLoginAccess,
    onResendInvitation,
    onDisable,
    isActioning = false,
}: ViewStaffModalProps) {
    const { terminology } = useTerminology();
    const { labels } = useLabels();

    if (!staff) return null;

    const isPending = staff.accountStatus === AccountStatus.PENDING;
    const hasInvitation = !!staff.invitationToken;
    const hasLoginAccess = staff.hasLoginAccess;

    const hasAdminInfo = staff.experience || staff.internalNotes || staff.staffRating !== 'NA';
    const hasCustomFields = staff.customField1 || staff.customField2 || staff.customField3;
    const documents = (staff.documents as Array<{ name: string; url: string; type?: string; size?: number }>) || [];
    const hasDocuments = documents.length > 0;

    return (
        <Dialog open={open} onClose={onClose} fullScreen>
            <div className="h-full flex flex-col">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle>{terminology.staff.singular} Details</DialogTitle>
                        <button
                            onClick={onClose}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <CloseIcon className="h-5 w-5" />
                        </button>
                    </div>
                </DialogHeader>

                <DialogContent className="flex-1 overflow-y-auto">
                    {/* Staff ID + Account Details */}
                    <div className="mb-6 p-3 bg-muted/30 rounded-md border border-border">
                        <p className="text-sm text-muted-foreground">{terminology.staff.singular} ID</p>
                        <p className="text-base font-medium">{staff.staffId}</p>
                    </div>

                    {/* Row 1: Personal Information + Account Details & Availability (side-by-side on lg+) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Personal Information */}
                        <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
                            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Personal Information</h3>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">First Name</p>
                                        <p className="text-base">{staff.firstName}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Last Name</p>
                                        <p className="text-base">{staff.lastName}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Email</p>
                                        <p className="text-base">{staff.email}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Phone</p>
                                        <p className="text-base">{staff.phone}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Date of Birth</p>
                                        <p className="text-base">{staff.dateOfBirth ? format(new Date(staff.dateOfBirth), 'MMM dd, yyyy') : 'Not provided'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Experience Level</p>
                                        <p className="text-base capitalize">{staff.skillLevel.toLowerCase()}</p>
                                    </div>
                                </div>
                                {staff.company && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">Company</p>
                                        <p className="text-base">{staff.company.firstName} {staff.company.lastName} ({staff.company.staffId})</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Account Details + Availability (stacked in right column) */}
                        <div className="space-y-6">
                            {/* Account Details */}
                            <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
                                <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Account Details</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Account Status</p>
                                        <Badge>{staff.accountStatus}</Badge>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">{terminology.staff.singular} Type</p>
                                        <Badge variant="secondary">{staff.staffType}</Badge>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Role</p>
                                        <Badge variant="secondary">
                                            {staff.staffRole === StaffRole.TEAM ? 'Team' : 'Individual'}
                                        </Badge>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Login Access</p>
                                        <Badge variant={hasLoginAccess ? 'success' : 'secondary'}>
                                            {hasLoginAccess ? 'Enabled' : 'Disabled'}
                                        </Badge>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Invitation Status</p>
                                        <Badge variant={hasInvitation ? 'warning' : isPending ? 'secondary' : 'success'}>
                                            {hasInvitation ? 'Pending' : isPending ? 'Not Sent' : 'Accepted'}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            {/* Availability */}
                            <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
                                <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Availability</h3>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Status</p>
                                        <Badge variant={getAvailabilityBadgeVariant(staff.availabilityStatus)}>
                                            {formatAvailabilityStatus(staff.availabilityStatus)}
                                        </Badge>
                                    </div>
                                    {(staff.timeOffStart || staff.timeOffEnd) && (
                                        <div className="grid grid-cols-2 gap-4">
                                            {staff.timeOffStart && (
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Time Off Start</p>
                                                    <p className="text-base">{format(new Date(staff.timeOffStart), 'MMM dd, yyyy')}</p>
                                                </div>
                                            )}
                                            {staff.timeOffEnd && (
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Time Off End</p>
                                                    <p className="text-base">{format(new Date(staff.timeOffEnd), 'MMM dd, yyyy')}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Address + Services (side-by-side on lg+) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Address */}
                        <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
                            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Address</h3>
                            <div className="space-y-2">
                                <p className="text-base">{staff.streetAddress}</p>
                                {staff.aptSuiteUnit && <p className="text-base">{staff.aptSuiteUnit}</p>}
                                <p className="text-base">{staff.city}, {staff.state} {staff.zipCode}</p>
                                <p className="text-base">{staff.country}</p>
                            </div>
                        </div>

                        {/* Services */}
                        <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
                            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Services</h3>
                            <div className="flex flex-wrap gap-2">
                                {staff.services && staff.services.length > 0 ? (
                                    staff.services.map((s) => (
                                        <Badge key={s.service.id} variant="secondary">
                                            {s.service.title}
                                        </Badge>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground">No services assigned</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Team Details (only for TEAM role) */}
                    {staff.staffRole === StaffRole.TEAM && (
                        <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
                            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Team Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {staff.teamEntityName && (
                                    <div className="md:col-span-2">
                                        <p className="text-sm text-muted-foreground">Team/Entity Name</p>
                                        <p className="text-base font-medium">{staff.teamEntityName}</p>
                                    </div>
                                )}
                                {staff.teamEmail && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">Team Email</p>
                                        <p className="text-base">{staff.teamEmail}</p>
                                    </div>
                                )}
                                {staff.teamPhone && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">Team Phone</p>
                                        <p className="text-base">{staff.teamPhone}</p>
                                    </div>
                                )}
                                {(staff.teamAddressLine1 || staff.teamCity) && (
                                    <div className="md:col-span-2">
                                        <p className="text-sm text-muted-foreground">Team Address</p>
                                        <div className="space-y-1">
                                            {staff.teamAddressLine1 && <p className="text-base">{staff.teamAddressLine1}</p>}
                                            {staff.teamAddressLine2 && <p className="text-base">{staff.teamAddressLine2}</p>}
                                            {(staff.teamCity || staff.teamState || staff.teamZipCode) && (
                                                <p className="text-base">
                                                    {[staff.teamCity, staff.teamState, staff.teamZipCode].filter(Boolean).join(', ')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Team Members (only for TEAM role or COMPANY type staff) */}
                    {(staff.staffRole === StaffRole.TEAM || staff.staffType === StaffType.COMPANY) && staff.teamMembers && staff.teamMembers.length > 0 && (
                        <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
                            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Team Members</h3>
                            <div className="space-y-3">
                                {staff.teamMembers.map((member) => (
                                    <div key={member.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
                                        <div className="space-y-1">
                                            <p className="font-medium">{member.firstName} {member.lastName}</p>
                                            <p className="text-sm text-muted-foreground">{member.email}</p>
                                            {member.phone && (
                                                <p className="text-sm text-muted-foreground">{member.phone}</p>
                                            )}
                                            {member.services && member.services.length > 0 && (
                                                <div className="flex gap-1 flex-wrap">
                                                    {member.services.map((s) => (
                                                        <Badge key={s.serviceId} variant="outline" className="text-xs">
                                                            {s.service.title}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <Badge variant={member.accountStatus === 'ACTIVE' ? 'success' : 'warning'}>
                                                {member.accountStatus}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Team/Company Details (for staff members linked to a team) */}
                    {staff.company && (
                        <div className="bg-blue-50/50 border border-blue-200 p-5 rounded-lg mb-6">
                            <h3 className="text-lg font-semibold border-b border-blue-200 pb-2 mb-4">Team Information</h3>
                            <div className="space-y-3">
                                {staff.company.teamEntityName && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">Team Name</p>
                                        <p className="text-base font-medium">{staff.company.teamEntityName}</p>
                                    </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Team Lead</p>
                                        <p className="text-base">{staff.company.firstName} {staff.company.lastName}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Team ID</p>
                                        <p className="text-base">{staff.company.staffId}</p>
                                    </div>
                                    {staff.company.teamEmail && (
                                        <div>
                                            <p className="text-sm text-muted-foreground">Team Email</p>
                                            <p className="text-base">{staff.company.teamEmail}</p>
                                        </div>
                                    )}
                                    {staff.company.teamPhone && (
                                        <div>
                                            <p className="text-sm text-muted-foreground">Team Phone</p>
                                            <p className="text-base">{staff.company.teamPhone}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Row 3: Admin Information (full width, conditional) */}
                    {hasAdminInfo && (
                        <div className="bg-accent/5 border border-border/30 p-5 rounded-lg lg:max-w-2xl mb-6">
                            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Admin Information</h3>
                            <div className="space-y-3">
                                {staff.staffRating !== 'NA' && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">{terminology.staff.singular} Rating</p>
                                        <Badge>{staff.staffRating}</Badge>
                                    </div>
                                )}
                                {staff.experience && (
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Experience Notes</p>
                                        <p className="text-sm whitespace-pre-wrap">{staff.experience}</p>
                                    </div>
                                )}
                                {staff.internalNotes && (
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Internal Notes</p>
                                        <p className="text-sm whitespace-pre-wrap">{staff.internalNotes}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Custom Fields Section */}
                    {hasCustomFields && (
                        <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
                            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Custom Fields</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {staff.customField1 && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">{labels.global.staffCustomFields.customField1}</p>
                                        <p className="text-base">{staff.customField1}</p>
                                    </div>
                                )}
                                {staff.customField2 && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">{labels.global.staffCustomFields.customField2}</p>
                                        <p className="text-base">{staff.customField2}</p>
                                    </div>
                                )}
                                {staff.customField3 && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">{labels.global.staffCustomFields.customField3}</p>
                                        <p className="text-base">{staff.customField3}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Documents Section */}
                    {hasDocuments && (
                        <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
                            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Documents</h3>
                            <div className="space-y-2">
                                {documents.map((doc, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between gap-2 p-3 bg-muted/30 border border-border/30 rounded-lg"
                                    >
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium truncate">{doc.name}</p>
                                                {doc.size && (
                                                    <p className="text-xs text-muted-foreground">
                                                        {doc.size < 1024
                                                            ? `${doc.size} B`
                                                            : doc.size < 1024 * 1024
                                                                ? `${(doc.size / 1024).toFixed(1)} KB`
                                                                : `${(doc.size / (1024 * 1024)).toFixed(1)} MB`
                                                        }
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() => window.open(doc.url, '_blank')}
                                        >
                                            <Download className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Assignment History Section */}
                    <AssignmentHistory staffId={staff.id} />

                    {/* Tax Details Section (Read-only) */}
                    <div className="mb-6">
                        <TaxDetailsView
                            staffId={staff.id}
                            taxDetails={staff.taxDetails ?? null}
                        />
                    </div>
                </DialogContent>

                {/* Action Buttons */}
                <DialogFooter>
                    <div className="flex flex-wrap gap-2 w-full justify-between">
                        <div className="flex gap-2">
                            {!hasLoginAccess && onGrantLoginAccess && (
                                <Button
                                    variant="outline"
                                    onClick={() => onGrantLoginAccess(staff.id)}
                                    disabled={isActioning}
                                >
                                    Grant Login Access
                                </Button>
                            )}

                            {hasInvitation && onResendInvitation && (
                                <Button
                                    variant="outline"
                                    onClick={() => onResendInvitation(staff.id)}
                                    disabled={isActioning}
                                >
                                    Resend Invitation
                                </Button>
                            )}
                        </div>

                        <div className="flex gap-2">
                            {staff.accountStatus === AccountStatus.ACTIVE && onDisable && (
                                <Button
                                    variant="danger"
                                    onClick={() => onDisable(staff.id)}
                                    disabled={isActioning}
                                >
                                    Disable Account
                                </Button>
                            )}

                            <Button variant="outline" onClick={onClose}>
                                Close
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </div>
        </Dialog>
    );
}
