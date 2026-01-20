'use client';

import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useStaffTerm } from '@/lib/hooks/use-terminology';
import { useColumnLabels } from '@/lib/hooks/use-column-labels';

type StaffPosition = { id: string; name: string };
type StaffPositionAssignment = { position: StaffPosition };

export type StaffWithRelations = {
    id: string;
    staffId: string;
    firstName: string;
    lastName: string;
    email: string;
    staffType: string;
    accountStatus: string;
    positions?: StaffPositionAssignment[];
};

interface SelectableStaffTableProps {
    staff: StaffWithRelations[];
    selectedIds: Set<string>;
    onSelectionChange: (ids: Set<string>) => void;
    isLoading?: boolean;
}

export function SelectableStaffTable({
    staff,
    selectedIds,
    onSelectionChange,
    isLoading = false,
}: SelectableStaffTableProps) {
    const staffTerm = useStaffTerm();

    // Get column labels from saved configuration
    const columnLabels = useColumnLabels('cleanup-roster', {
        staffId: `${staffTerm.singular} ID`,
        name: 'Name',
        email: 'Email',
        type: 'Type',
        status: 'Status',
        positions: 'Positions',
    });

    const handleSelectAll = () => {
        const visibleIds = staff.map((s) => s.id);
        const allSelected = visibleIds.every((id) => selectedIds.has(id));

        if (allSelected) {
            // Deselect all
            onSelectionChange(new Set());
        } else {
            // Select all visible
            onSelectionChange(new Set(visibleIds));
        }
    };

    const handleSelectRow = (id: string) => {
        const newSelection = new Set(selectedIds);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        onSelectionChange(newSelection);
    };

    const allSelected = staff.length > 0 && staff.every((s) => selectedIds.has(s.id));

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'danger'> = {
            ACTIVE: 'default',
            PENDING: 'secondary',
            DISABLED: 'danger',
        };
        const variant = variants[status] || 'secondary';

        return (
            <Badge variant={variant} asSpan>
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

    if (isLoading) {
        return (
            <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                ))}
            </div>
        );
    }

    if (staff.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-foreground text-lg">No {staffTerm.lower} members found</p>
                <p className="text-muted-foreground text-sm mt-2">
                    No ACTIVE or PENDING {staffTerm.lower} members match your search criteria
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: '800px' }}>
                <thead>
                    <tr className="border-b border-border">
                        <th className="w-12 text-left py-3 px-4">
                            <Checkbox
                                checked={allSelected}
                                onChange={handleSelectAll}
                                aria-label="Select all staff"
                            />
                        </th>
                        <th className="text-left py-3 px-4">
                            <span className="font-semibold text-sm text-foreground">{columnLabels.staffId}</span>
                        </th>
                        <th className="text-left py-3 px-4">
                            <span className="font-semibold text-sm text-foreground">{columnLabels.name}</span>
                        </th>
                        <th className="text-left py-3 px-4">
                            <span className="font-semibold text-sm text-foreground">{columnLabels.email}</span>
                        </th>
                        <th className="text-left py-3 px-4">
                            <span className="font-semibold text-sm text-foreground">{columnLabels.type}</span>
                        </th>
                        <th className="text-left py-3 px-4">
                            <span className="font-semibold text-sm text-foreground">{columnLabels.status}</span>
                        </th>
                        <th className="text-left py-3 px-4">
                            <span className="font-semibold text-sm text-foreground">{columnLabels.positions}</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {staff.map((member) => (
                        <tr
                            key={member.id}
                            className={`border-b border-border hover:bg-muted/50 transition-colors ${selectedIds.has(member.id) ? 'bg-primary/5' : ''
                                }`}
                        >
                            <td className="w-12 py-4 px-4">
                                <Checkbox
                                    checked={selectedIds.has(member.id)}
                                    onChange={() => handleSelectRow(member.id)}
                                    aria-label={`Select ${member.firstName} ${member.lastName}`}
                                />
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap">
                                <span className="font-mono text-sm text-muted-foreground">
                                    {member.staffId}
                                </span>
                            </td>
                            <td className="py-4 px-4">
                                <span className="font-medium">
                                    {member.firstName} {member.lastName}
                                </span>
                            </td>
                            <td className="py-4 px-4 text-sm text-muted-foreground">
                                {member.email}
                            </td>
                            <td className="py-4 px-4">{getTypeBadge(member.staffType)}</td>
                            <td className="py-4 px-4">{getStatusBadge(member.accountStatus)}</td>
                            <td className="py-4 px-4">
                                <div className="flex flex-wrap gap-1">
                                    {member.positions?.slice(0, 2).map((p) => (
                                        <Badge key={p.position.id} variant="info" size="sm" asSpan>
                                            {p.position.name}
                                        </Badge>
                                    ))}
                                    {member.positions && member.positions.length > 2 && (
                                        <Badge variant="info" size="sm" asSpan>
                                            +{member.positions.length - 2}
                                        </Badge>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
