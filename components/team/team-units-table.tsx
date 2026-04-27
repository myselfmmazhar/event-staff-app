'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit2Icon, ArchiveIcon, ArchiveRestoreIcon, Trash2Icon, HistoryIcon } from 'lucide-react';
import { DataTable, type ColumnDef } from '@/components/common/data-table';
import { ActionDropdown, type ActionItem } from '@/components/common/action-dropdown';
import { ConfirmModal } from '@/components/common/confirm-modal';
import { trpc } from '@/lib/client/trpc';
import { toast } from '@/components/ui/use-toast';
import { AddTeamUnitModal } from './add-team-unit-modal';
import { TeamUnitHistoryModal } from './team-unit-history-modal';
import { TEAM_UNIT_STATUS, TEAM_UNIT_AVAILABILITY } from '@/lib/schemas/team-unit.schema';

type TeamUnit = {
    id: string;
    unitId: string;
    unitName: string;
    primaryContact: string | null;
    serviceId: string | null;
    status: typeof TEAM_UNIT_STATUS[number];
    availability: typeof TEAM_UNIT_AVAILABILITY[number];
    capacityNotes: string | null;
    internalNotes: string | null;
    staffId: string;
    createdBy: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    service: { id: string; title: string } | null;
};

type StatusFilter = 'ALL' | typeof TEAM_UNIT_STATUS[number];

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
    { value: 'ALL', label: 'All Units' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'PENDING_REVIEW', label: 'Pending' },
    { value: 'ARCHIVED', label: 'Archived' },
];

interface TeamUnitsTableProps {
    defaultFilter?: StatusFilter;
}

export function TeamUnitsTable({ defaultFilter = 'ALL' }: TeamUnitsTableProps) {
    const utils = trpc.useUtils();
    const [statusFilter, setStatusFilter] = useState<StatusFilter>(defaultFilter);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [editingUnit, setEditingUnit] = useState<TeamUnit | null>(null);
    const [deletingUnit, setDeletingUnit] = useState<TeamUnit | null>(null);
    const [historyUnit, setHistoryUnit] = useState<TeamUnit | null>(null);

    const { data: rawUnits = [], isLoading } = trpc.teamUnit.getAll.useQuery();
    const units = rawUnits as TeamUnit[];

    const archiveMutation = trpc.teamUnit.update.useMutation({
        onSuccess: () => {
            toast({ title: 'Team unit archived.' });
            utils.teamUnit.getAll.invalidate();
        },
        onError: (err) => {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        },
    });

    const unarchiveMutation = trpc.teamUnit.update.useMutation({
        onSuccess: () => {
            toast({ title: 'Team unit restored to active.' });
            utils.teamUnit.getAll.invalidate();
        },
        onError: (err) => {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        },
    });

    const deleteMutation = trpc.teamUnit.delete.useMutation({
        onSuccess: () => {
            toast({ title: 'Team unit deleted.' });
            setDeletingUnit(null);
            utils.teamUnit.getAll.invalidate();
        },
        onError: (err) => {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        },
    });

    const filteredUnits = useMemo(() => {
        if (statusFilter === 'ALL') return units;
        return units.filter((u) => u.status === statusFilter);
    }, [units, statusFilter]);

    const counts = useMemo(() => ({
        ALL: units.length,
        ACTIVE: units.filter((u) => u.status === 'ACTIVE').length,
        PENDING_REVIEW: units.filter((u) => u.status === 'PENDING_REVIEW').length,
        ARCHIVED: units.filter((u) => u.status === 'ARCHIVED').length,
    }), [units]);

    const allSelected = filteredUnits.length > 0 && filteredUnits.every((u) => selectedIds.has(u.id));
    const someSelected = filteredUnits.some((u) => selectedIds.has(u.id));

    const toggleAll = () => {
        const next = new Set(selectedIds);
        if (allSelected) {
            filteredUnits.forEach((u) => next.delete(u.id));
        } else {
            filteredUnits.forEach((u) => next.add(u.id));
        }
        setSelectedIds(next);
    };

    const toggleOne = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelectedIds(next);
    };

    const getStatusBadge = (status: TeamUnit['status']) => {
        const map: Record<TeamUnit['status'], { variant: 'success' | 'warning' | 'default'; label: string }> = {
            ACTIVE: { variant: 'success', label: 'Active' },
            PENDING_REVIEW: { variant: 'warning', label: 'Pending Review' },
            ARCHIVED: { variant: 'default', label: 'Archived' },
        };
        const { variant, label } = map[status];
        return <Badge variant={variant} asSpan>{label}</Badge>;
    };

    const getAvailabilityLabel = (availability: TeamUnit['availability']) => {
        const map: Record<TeamUnit['availability'], string> = {
            AVAILABLE: 'Available',
            LIMITED: 'Limited Availability',
            NOT_AVAILABLE: 'Unavailable',
        };
        return map[availability];
    };

    const formatDate = (date: string | Date) =>
        new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const getActivityLabel = (unit: TeamUnit): string => {
        const createdMs = new Date(unit.createdAt).getTime();
        const updatedMs = new Date(unit.updatedAt).getTime();
        const isNewlyCreated = updatedMs - createdMs < 10_000;

        if (isNewlyCreated) return 'Added';
        switch (unit.status) {
            case 'ARCHIVED': return 'Archived';
            case 'PENDING_REVIEW': return 'Submitted';
            case 'ACTIVE': return 'Activated';
            default: return 'Updated';
        }
    };

    const columns: ColumnDef<TeamUnit>[] = [
        {
            key: 'select',
            label: (
                <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected && !allSelected}
                    onChange={toggleAll}
                    aria-label="Select all"
                />
            ),
            headerClassName: 'w-12 py-3 px-4 text-left',
            className: 'w-12 py-4 px-4',
            render: (unit) => (
                <Checkbox
                    checked={selectedIds.has(unit.id)}
                    onChange={() => toggleOne(unit.id)}
                    aria-label={`Select ${unit.unitName}`}
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                />
            ),
        },
        {
            key: 'actions',
            label: 'Actions',
            className: 'w-10 py-4 px-4',
            headerClassName: 'text-left py-3 px-4 w-10',
            render: (unit) => {
                const viewHistory: ActionItem = {
                    label: 'View History',
                    icon: <HistoryIcon className="h-3.5 w-3.5" />,
                    onClick: () => setHistoryUnit(unit),
                };

                const actions: ActionItem[] = unit.status === 'ARCHIVED'
                    ? [
                        {
                            label: 'Unarchive',
                            icon: <ArchiveRestoreIcon className="h-3.5 w-3.5" />,
                            onClick: () => unarchiveMutation.mutate({ id: unit.id, status: 'ACTIVE' }),
                        },
                        viewHistory,
                        {
                            label: 'Delete',
                            icon: <Trash2Icon className="h-3.5 w-3.5" />,
                            onClick: () => setDeletingUnit(unit),
                            variant: 'destructive',
                        },
                    ]
                    : [
                        {
                            label: 'Edit',
                            icon: <Edit2Icon className="h-3.5 w-3.5" />,
                            onClick: () => setEditingUnit(unit),
                        },
                        {
                            label: 'Archive',
                            icon: <ArchiveIcon className="h-3.5 w-3.5" />,
                            onClick: () => archiveMutation.mutate({ id: unit.id, status: 'ARCHIVED' }),
                            variant: 'warning',
                        },
                        viewHistory,
                    ];
                return <ActionDropdown actions={actions} />;
            },
        },
        {
            key: 'status',
            label: 'Status',
            className: 'py-4 px-4',
            headerClassName: 'text-left py-3 px-4',
            render: (unit) => getStatusBadge(unit.status),
        },
        {
            key: 'unitName',
            label: 'Unit',
            className: 'py-4 px-4',
            headerClassName: 'text-left py-3 px-4',
            render: (unit) => (
                <div>
                    <p className="font-medium text-foreground">{unit.unitName}</p>
                    {unit.primaryContact && (
                        <p className="text-xs text-muted-foreground">Primary operator: {unit.primaryContact}</p>
                    )}
                </div>
            ),
        },
        {
            key: 'serviceType',
            label: 'Service Type',
            className: 'py-4 px-4 text-sm text-muted-foreground',
            headerClassName: 'text-left py-3 px-4',
            render: (unit) => unit.service?.title ?? '—',
        },
        {
            key: 'availability',
            label: 'Availability',
            className: 'py-4 px-4 text-sm text-muted-foreground',
            headerClassName: 'text-left py-3 px-4',
            render: (unit) => getAvailabilityLabel(unit.availability),
        },
        {
            key: 'lastActivity',
            label: 'Last Activity',
            className: 'py-4 px-4 text-sm text-muted-foreground whitespace-nowrap',
            headerClassName: 'text-left py-3 px-4',
            render: (unit) => `${getActivityLabel(unit)} · ${formatDate(unit.updatedAt)}`,
        },
    ];

    return (
        <>
            <div className="space-y-4">
                {/* Section header */}
                <div>
                    <h2 className="text-xl font-bold text-foreground">Team Units</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        View, edit, archive, and track all units connected to this team.
                    </p>
                </div>

                {/* Status filter pills */}
                <div className="flex items-center gap-2 flex-wrap">
                    {STATUS_FILTERS.map(({ value, label }) => {
                        const count = counts[value as keyof typeof counts];
                        const isActive = statusFilter === value;
                        return (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setStatusFilter(value)}
                                className={[
                                    'px-4 py-1.5 rounded-full text-sm font-medium border transition-colors',
                                    isActive
                                        ? 'bg-foreground text-background border-foreground'
                                        : 'bg-background text-muted-foreground border-border hover:border-foreground hover:text-foreground',
                                ].join(' ')}
                            >
                                {label}
                                {count > 0 && (
                                    <span className="ml-1.5 text-xs opacity-60">({count})</span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Table */}
                <DataTable
                    tableId="team-units"
                    data={filteredUnits}
                    columns={columns}
                    isLoading={isLoading}
                    emptyMessage="No team units found"
                    emptyDescription={
                        statusFilter === 'ALL'
                            ? 'Add your first team unit using the button above.'
                            : 'No units match this filter.'
                    }
                    getRowKey={(unit) => unit.id}
                />
            </div>

            {/* Edit modal */}
            <AddTeamUnitModal
                open={!!editingUnit}
                unit={editingUnit}
                onClose={() => setEditingUnit(null)}
                onSuccess={() => setEditingUnit(null)}
            />

            {/* History modal */}
            <TeamUnitHistoryModal
                open={!!historyUnit}
                onClose={() => setHistoryUnit(null)}
                unitId={historyUnit?.id ?? null}
                unitName={historyUnit?.unitName}
            />

            {/* Delete confirmation */}
            <ConfirmModal
                open={!!deletingUnit}
                onClose={() => setDeletingUnit(null)}
                onConfirm={() => deletingUnit && deleteMutation.mutate({ id: deletingUnit.id })}
                isLoading={deleteMutation.isPending}
                title="Delete Team Unit"
                description={`Are you sure you want to permanently delete "${deletingUnit?.unitName}"? This action cannot be undone.`}
                confirmText="Delete"
                variant="danger"
            />
        </>
    );
}
