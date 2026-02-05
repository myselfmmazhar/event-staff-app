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
import { AccountStatus, AvailabilityStatus } from '@prisma/client';
import { useTerminology } from '@/lib/hooks/use-terminology';
import type { StaffWithRelations } from '@/components/staff/staff-table';

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
    if (!staff) return null;

    const isPending = staff.accountStatus === AccountStatus.PENDING;
    const hasInvitation = !!staff.invitationToken;
    const hasLoginAccess = staff.hasLoginAccess;

    const hasAdminInfo = staff.experience || staff.internalNotes || staff.staffRating !== 'NA';

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
                                {staff.contractor && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">Contractor</p>
                                        <p className="text-base">{staff.contractor.firstName} {staff.contractor.lastName} ({staff.contractor.staffId})</p>
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

                    {/* Row 3: Admin Information (full width, conditional) */}
                    {hasAdminInfo && (
                        <div className="bg-accent/5 border border-border/30 p-5 rounded-lg lg:max-w-2xl">
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
