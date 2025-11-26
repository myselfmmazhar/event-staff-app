'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit2Icon, Trash2Icon, EyeIcon } from 'lucide-react';
import { DataTable, type ColumnDef } from '@/components/common/data-table';
import { Staff, StaffPositionAssignment, StaffPosition, StaffWorkTypeAssignment, WorkType } from '@prisma/client';

// Define the type with relations included
export type StaffWithRelations = Staff & {
    positions: (StaffPositionAssignment & { position: StaffPosition })[];
    workTypes: (StaffWorkTypeAssignment & { workType: WorkType })[];
};

interface StaffTableProps {
    staff: StaffWithRelations[];
    onView: (staff: StaffWithRelations) => void;
    onEdit: (staff: StaffWithRelations) => void;
    onDelete: (staff: StaffWithRelations) => void;
}

export function StaffTable({ staff, onView, onEdit, onDelete }: StaffTableProps) {
    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'danger'> = {
            ACTIVE: 'default',
            PENDING: 'secondary',
            DISABLED: 'danger',
        };
        // Map 'danger' to 'danger' as per Badge component definition
        const variantMap: Record<string, 'default' | 'secondary' | 'danger'> = {
            default: 'default',
            secondary: 'secondary',
            danger: 'danger',
        };

        const variantKey = variants[status] || 'secondary';
        const badgeVariant = variantMap[variantKey];

        return (
            <Badge variant={badgeVariant} asSpan>
                {status.charAt(0) + status.slice(1).toLowerCase()}
            </Badge>
        );
    };

    const getTypeBadge = (type: string) => {
        return (
            <Badge variant={type === 'CONTRACTOR' ? 'default' : 'secondary'} asSpan>
                {type === 'CONTRACTOR' ? 'Contractor' : 'Employee'}
            </Badge>
        );
    };

    const columns: ColumnDef<StaffWithRelations>[] = [
        {
            key: 'staffId',
            label: 'Staff ID',
            className: 'py-4 px-4',
            render: (member) => (
                <span className="font-mono text-sm text-muted-foreground">
                    {member.staffId}
                </span>
            ),
        },
        {
            key: 'name',
            label: 'Name',
            className: 'py-4 px-4',
            render: (member) => (
                <span className="font-medium">{member.firstName} {member.lastName}</span>
            ),
        },
        {
            key: 'email',
            label: 'Email',
            className: 'py-4 px-4 text-sm text-muted-foreground',
            render: (member) => member.email,
        },
        {
            key: 'phone',
            label: 'Phone',
            className: 'py-4 px-4 text-sm text-muted-foreground',
            render: (member) => member.phone,
        },
        {
            key: 'type',
            label: 'Type',
            className: 'py-4 px-4',
            render: (member) => getTypeBadge(member.staffType),
        },
        {
            key: 'status',
            label: 'Status',
            className: 'py-4 px-4',
            render: (member) => getStatusBadge(member.accountStatus),
        },
        {
            key: 'skillLevel',
            label: 'Skill Level',
            className: 'py-4 px-4 text-sm capitalize',
            render: (member) => member.skillLevel.toLowerCase(),
        },
        {
            key: 'actions',
            label: 'Actions',
            className: 'py-4 px-4',
            headerClassName: 'text-right py-3 px-4',
            render: (member) => (
                <div className="flex items-center justify-end gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView(member)}
                        title="View details"
                    >
                        <EyeIcon className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(member)}
                        title="Edit staff"
                    >
                        <Edit2Icon className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(member)}
                        title="Delete staff"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                        <Trash2Icon className="h-4 w-4" />
                    </Button>
                </div>
            ),
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
                <div className="capitalize">{member.skillLevel.toLowerCase()}</div>
                <div className="text-xs">
                    {member.positions?.map((p) => p.position.name).join(', ') || 'No positions'}
                </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onView(member)}
                    className="flex-1"
                >
                    <EyeIcon className="h-4 w-4 mr-1" />
                    View
                </Button>
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
            emptyMessage="No staff members found"
            emptyDescription="Try adjusting your search or filters"
            mobileCard={renderMobileCard}
            getRowKey={(member) => member.id}
        />
    );
}
