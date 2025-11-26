'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CloseIcon } from '@/components/ui/icons';
import { format } from 'date-fns';
import { Staff, StaffPositionAssignment, StaffPosition, StaffWorkTypeAssignment, WorkType } from '@prisma/client';

// Define the type with relations included
type StaffWithRelations = Staff & {
    positions: (StaffPositionAssignment & { position: StaffPosition })[];
    workTypes: (StaffWorkTypeAssignment & { workType: WorkType })[];
    contractor?: Staff | null;
};

interface ViewStaffDialogProps {
    staff: StaffWithRelations | null;
    open: boolean;
    onClose: () => void;
}

export function ViewStaffDialog({ staff, open, onClose }: ViewStaffDialogProps) {
    if (!staff) return null;

    return (
        <Dialog open={open} onClose={onClose} className="max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <DialogHeader className="shrink-0">
                <div className="flex items-center justify-between">
                    <DialogTitle>Staff Details</DialogTitle>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <CloseIcon className="h-5 w-5" />
                    </button>
                </div>
            </DialogHeader>

            <DialogContent className="flex-1 overflow-y-auto">
                {/* Staff ID */}
                <div className="mb-6 p-3 bg-muted/30 rounded-md border">
                    <p className="text-sm text-muted-foreground">Staff ID</p>
                    <p className="text-base font-medium">{staff.staffId}</p>
                </div>

                {/* Account Details */}
                <div className="space-y-4 border-b pb-4">
                    <h3 className="font-semibold">Account Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Account Status</p>
                            <Badge>{staff.accountStatus}</Badge>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Staff Type</p>
                            <Badge variant="secondary">{staff.staffType}</Badge>
                        </div>
                    </div>
                </div>

                {/* Personal Information */}
                <div className="space-y-4 border-b pb-4">
                    <h3 className="font-semibold">Personal Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">First Name</p>
                            <p>{staff.firstName}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Last Name</p>
                            <p>{staff.lastName}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Email</p>
                            <p>{staff.email}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Phone</p>
                            <p>{staff.phone}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Date of Birth</p>
                            <p>{format(new Date(staff.dateOfBirth), 'MMM dd, yyyy')}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Skill Level</p>
                            <p className="capitalize">{staff.skillLevel.toLowerCase()}</p>
                        </div>
                    </div>
                </div>

                {/* Rate Information */}
                <div className="space-y-4 border-b pb-4">
                    <h3 className="font-semibold">Rate Information</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Rate Type</p>
                            <p className="capitalize">{staff.rateType.toLowerCase()}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Pay Rate</p>
                            <p>${Number(staff.payRate).toFixed(2)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Bill Rate</p>
                            <p>${Number(staff.billRate).toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                {/* Positions & Work Types */}
                <div className="space-y-4 border-b pb-4">
                    <h3 className="font-semibold">Positions & Work Types</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground mb-2">Positions</p>
                            <div className="flex flex-wrap gap-1">
                                {staff.positions?.map((p) => (
                                    <Badge key={p.position.id} variant="secondary">
                                        {p.position.name}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground mb-2">Work Types</p>
                            <div className="flex flex-wrap gap-1">
                                {staff.workTypes?.map((w) => (
                                    <Badge key={w.workType.id} variant="secondary">
                                        {w.workType.name}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Address */}
                <div className="space-y-4 border-b pb-4">
                    <h3 className="font-semibold">Address</h3>
                    <div className="space-y-2">
                        <p>{staff.streetAddress}</p>
                        {staff.aptSuiteUnit && <p>{staff.aptSuiteUnit}</p>}
                        <p>
                            {staff.city}, {staff.state} {staff.zipCode}
                        </p>
                        <p>{staff.country}</p>
                    </div>
                </div>

                {/* Contractor Relationship */}
                {staff.contractor && (
                    <div className="space-y-4 border-b pb-4">
                        <h3 className="font-semibold">Contractor</h3>
                        <p>
                            {staff.contractor.firstName} {staff.contractor.lastName} ({staff.contractor.staffId})
                        </p>
                    </div>
                )}

                {/* Admin Fields */}
                {(staff.experience || staff.internalNotes || staff.staffRating !== 'NA') && (
                    <div className="space-y-4">
                        <h3 className="font-semibold">Admin Information</h3>
                        {staff.staffRating !== 'NA' && (
                            <div>
                                <p className="text-sm text-muted-foreground">Staff Rating</p>
                                <Badge>{staff.staffRating}</Badge>
                            </div>
                        )}
                        {staff.experience && (
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Experience</p>
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
                )}
            </DialogContent>
        </Dialog>
    );
}
