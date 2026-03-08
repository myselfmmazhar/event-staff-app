'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit2Icon, Trash2Icon, MessageSquareIcon, EyeIcon } from 'lucide-react';
import { DataTable, type ColumnDef } from '@/components/common/data-table';
import { AvailabilityStatus, AccountStatus, StaffType, StaffRole, SkillLevel, StaffRating } from '@prisma/client';
import { useStaffTerm, useTerminology } from '@/lib/hooks/use-terminology';
import { useColumnLabels } from '@/lib/hooks/use-column-labels';

export type StaffWithRelations = {
    id: string;
    staffId: string;
    accountStatus: AccountStatus;
    staffType: StaffType;
    staffRole: StaffRole;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: Date | string | null;
    skillLevel: SkillLevel;
    availabilityStatus: AvailabilityStatus;
    timeOffStart: Date | string | null;
    timeOffEnd: Date | string | null;
    streetAddress: string;
    aptSuiteUnit: string | null;
    city: string;
    country: string;
    state: string;
    zipCode: string;
    experience: string | null;
    staffRating: StaffRating;
    internalNotes: string | null;
    companyId: string | null;
    hasLoginAccess: boolean;
    userId: string | null;
    invitationToken: string | null;
    invitationExpiresAt: Date | string | null;
    createdBy: string;
    createdAt: Date | string;
    updatedAt: Date | string;
    // Custom fields
    customField1: string | null;
    customField2: string | null;
    customField3: string | null;
    // Documents
    documents: Array<{ name: string; url: string; type?: string; size?: number }> | null;
    // Team Details (for TEAM role)
    teamEntityName: string | null;
    teamEmail: string | null;
    teamPhone: string | null;
    teamAddressLine1: string | null;
    teamAddressLine2: string | null;
    teamCity: string | null;
    teamState: string | null;
    teamZipCode: string | null;
    services?: Array<{ service: { id: string; title: string } }>;
    company: { id: string; staffId: string; firstName: string; lastName: string; teamEntityName: string | null; teamEmail: string | null; teamPhone: string | null } | null;
    teamMembers?: Array<{
        id: string;
        staffId: string;
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        staffType: StaffType;
        accountStatus: AccountStatus;
        services?: Array<{
            serviceId: string;
            service: { id: string; title: string };
        }>;
    }>;
    // Tax details (optional 1:1 relation)
    taxDetails?: {
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
};

interface StaffTableProps {
    staff: StaffWithRelations[];
    onEdit: (staff: StaffWithRelations) => void;
    onDelete: (staff: StaffWithRelations) => void;
    onViewDetails?: (staff: StaffWithRelations) => void;
    onMessage?: (staff: StaffWithRelations) => void;
    // Optional selection props
    selectedIds?: Set<string>;
    onSelectionChange?: (ids: Set<string>) => void;
}

export function StaffTable({ staff, onEdit, onDelete, onViewDetails, onMessage, selectedIds, onSelectionChange }: StaffTableProps) {
    const staffTerm = useStaffTerm();
    const { terminology } = useTerminology();

    // Get column labels from saved configuration (same pattern as events/clients)
    const columnLabels = useColumnLabels('staff', {
        staffId: `${terminology.staff.singular} ID`,
        name: 'Name',
        email: 'Email',
        phone: 'Phone',
        type: 'Type',
        status: 'Status',
        skillLevel: 'Experience',
        availability: 'Availability',
        actions: 'Actions',
    });

    // Selection handlers
    const allSelected =
        selectedIds && staff.length > 0 && staff.every((s) => selectedIds.has(s.id));
    const someSelected = selectedIds && staff.some((s) => selectedIds.has(s.id));

    const toggleAll = () => {
        if (!onSelectionChange || !selectedIds) return;
        if (allSelected) {
            const newSet = new Set(selectedIds);
            staff.forEach((s) => newSet.delete(s.id));
            onSelectionChange(newSet);
        } else {
            const newSet = new Set(selectedIds);
            staff.forEach((s) => newSet.add(s.id));
            onSelectionChange(newSet);
        }
    };

    const toggleOne = (id: string) => {
        if (!onSelectionChange || !selectedIds) return;
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        onSelectionChange(newSet);
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'danger' | 'warning'> = {
            ACTIVE: 'default',
            PENDING: 'secondary',
            DISABLED: 'danger',
            TERMINATED: 'danger',
            ARCHIVED: 'warning',
        };

        const badgeVariant = variants[status] || 'secondary';

        return (
            <Badge variant={badgeVariant} asSpan>
                {status.charAt(0) + status.slice(1).toLowerCase()}
            </Badge>
        );
    };

    const getTypeBadge = (type: StaffType) => {
        const labels: Record<StaffType, string> = {
            COMPANY: 'Company',
            CONTRACTOR: 'Contractor',
            EMPLOYEE: 'Employee',
            FREELANCE: 'Freelance',
        };
        const variants: Record<StaffType, 'default' | 'secondary'> = {
            COMPANY: 'default',
            CONTRACTOR: 'default',
            EMPLOYEE: 'secondary',
            FREELANCE: 'default',
        };
        return (
            <Badge variant={variants[type]} asSpan>
                {labels[type]}
            </Badge>
        );
    };

    const getAvailabilityBadge = (status: AvailabilityStatus) => {
        const variants: Record<AvailabilityStatus, 'default' | 'secondary' | 'danger'> = {
            OPEN_TO_OFFERS: 'default',
            BUSY: 'secondary',
            TIME_OFF: 'secondary',
        };
        const labels: Record<AvailabilityStatus, string> = {
            OPEN_TO_OFFERS: 'Available',
            BUSY: 'Busy',
            TIME_OFF: 'Time Off',
        };

        return (
            <Badge variant={variants[status]} asSpan>
                {labels[status]}
            </Badge>
        );
    };

    const columns: ColumnDef<StaffWithRelations>[] = [
        ...(selectedIds && onSelectionChange
            ? [
                {
                    key: 'select' as const,
                    label: (
                        <Checkbox
                            checked={allSelected}
                            indeterminate={someSelected && !allSelected}
                            onChange={toggleAll}
                            aria-label="Select all"
                        />
                    ),
                    headerClassName: 'w-12 py-3 px-4',
                    className: 'w-12 py-4 px-4',
                    render: (member: StaffWithRelations) => (
                        <Checkbox
                            checked={selectedIds.has(member.id)}
                            onChange={() => toggleOne(member.id)}
                            aria-label={`Select ${member.firstName} ${member.lastName}`}
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        />
                    ),
                },
            ]
            : []),
        {
            key: 'actions',
            label: columnLabels.actions,
            className: 'py-4 px-4',
            headerClassName: 'text-left py-3 px-4',
            render: (member) => (
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="px-0"
                        onClick={() => onEdit(member)}
                        title={`Edit ${staffTerm.lower}`}
                    >
                        <Edit2Icon className="h-4 w-4" />
                    </Button>
                    {onMessage && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="px-0"
                            onClick={() => onMessage(member)}
                            title={`Message ${staffTerm.lower}`}
                        >
                            <MessageSquareIcon className="h-4 w-4" />
                        </Button>
                    )}
                    {onViewDetails && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="px-0"
                            onClick={() => onViewDetails(member)}
                            title={`View ${staffTerm.lower} details`}
                        >
                            <EyeIcon className="h-4 w-4" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(member)}
                        title={`Delete ${staffTerm.lower}`}
                        className="px-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                        <Trash2Icon className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
        {
            key: 'status',
            label: columnLabels.status,
            className: 'py-4 px-4',
            render: (member) => getStatusBadge(member.accountStatus),
        },
        {
            key: 'staffId',
            label: columnLabels.staffId,
            className: 'py-4 px-4 whitespace-nowrap',
            render: (member) => (
                <span className="font-mono text-sm text-muted-foreground">
                    {member.staffId}
                </span>
            ),
        },
        {
            key: 'name',
            label: columnLabels.name,
            className: 'py-4 px-4',
            render: (member) => (
                <span className="font-medium">{member.firstName} {member.lastName}</span>
            ),
        },
        {
            key: 'email',
            label: columnLabels.email,
            className: 'py-4 px-4 text-sm text-muted-foreground',
            render: (member) => member.email,
        },
        {
            key: 'phone',
            label: columnLabels.phone,
            className: 'py-4 px-4 text-sm text-muted-foreground whitespace-nowrap',
            render: (member) => member.phone,
        },
        {
            key: 'type',
            label: columnLabels.type,
            className: 'py-4 px-4',
            render: (member) => getTypeBadge(member.staffType),
        },
        {
            key: 'skillLevel',
            label: columnLabels.skillLevel,
            className: 'py-4 px-4 text-sm capitalize',
            render: (member) => member.skillLevel.toLowerCase(),
        },
        {
            key: 'availability',
            label: columnLabels.availability,
            className: 'py-4 px-4',
            render: (member) => getAvailabilityBadge(member.availabilityStatus),
        },
    ];

    const renderMobileCard = (member: StaffWithRelations) => (
        <div
            key={member.id}
            className="bg-card rounded-lg border border-border p-4 space-y-3"
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="font-mono text-xs text-muted-foreground mb-1">
                        {member.staffId}
                    </div>
                    <h3 className="font-semibold text-card-foreground">
                        {member.firstName} {member.lastName}
                    </h3>
                    <div className="text-sm text-muted-foreground mt-1">
                        {member.email}
                    </div>
                </div>
                <div className="flex flex-col gap-1">
                    {getTypeBadge(member.staffType)}
                    {getStatusBadge(member.accountStatus)}
                </div>
            </div>

            <div className="space-y-1 text-sm text-muted-foreground">
                <div>{member.phone}</div>
                <div className="flex items-center gap-2">
                    <span className="capitalize">{member.skillLevel.toLowerCase()}</span>
                    <span>•</span>
                    {getAvailabilityBadge(member.availabilityStatus)}
                </div>
                <div className="text-xs">
                    {member.services?.map((s) => s.service.title).join(', ') || 'No services'}
                </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(member)}
                    className="flex-1"
                >
                    <Edit2Icon className="h-4 w-4 mr-1" />
                    Edit
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(member)}
                    className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                    <Trash2Icon className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );

    return (
        <DataTable
            data={staff}
            columns={columns}
            emptyMessage={`No ${staffTerm.lower} members found`}
            emptyDescription="Try adjusting your search or filters"
            mobileCard={renderMobileCard}
            getRowKey={(member) => member.id}
        />
    );
}
