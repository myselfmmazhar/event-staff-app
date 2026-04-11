"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EstimateStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { DataTable, ColumnDef } from "@/components/common/data-table";
import { format } from "date-fns";
import { ActionDropdown, type ActionItem } from "@/components/common/action-dropdown";
import { EditIcon, EyeIcon, ArchiveBoxIcon, RefreshCwIcon, TrashIcon } from "@/components/ui/icons";

interface Estimate {
    id: string;
    estimateNo: string;
    status: EstimateStatus;
    estimateDate: Date | string;
    client: {
        id: string;
        businessName?: string | null;
        firstName?: string | null;
        lastName?: string | null;
    };
    items: {
        amount: number | string | { toNumber: () => number };
    }[];
}

type SortableField = "createdAt" | "updatedAt" | "estimateNo" | "estimateDate" | "status" | "client";

interface EstimateTableProps {
    estimates: Estimate[];
    isLoading: boolean;
    sortBy?: SortableField;
    sortOrder?: "asc" | "desc";
    onEdit?: (estimate: Estimate) => void;
    onArchive?: (estimate: Estimate) => void;
    onDelete?: (estimate: Estimate) => void;
    onView?: (estimate: Estimate) => void;
    onSort?: (field: SortableField) => void;
    selectedIds?: Set<string>;
    onSelectionChange?: (ids: Set<string>) => void;
    showArchived?: boolean;
}

export function EstimateTable({
    estimates,
    isLoading,
    sortBy = "createdAt",
    sortOrder = "desc",
    onEdit,
    onArchive,
    onDelete,
    onView,
    onSort,
    selectedIds,
    onSelectionChange,
    showArchived = false,
}: EstimateTableProps) {

    // Selection handlers
    const allSelected = selectedIds && estimates.length > 0 && estimates.every((i) => selectedIds.has(i.id));
    const someSelected = selectedIds && estimates.some((i) => selectedIds.has(i.id));

    const toggleAll = () => {
        if (!onSelectionChange || !selectedIds) return;
        if (allSelected) {
            const newSet = new Set(selectedIds);
            estimates.forEach((i) => newSet.delete(i.id));
            onSelectionChange(newSet);
        } else {
            const newSet = new Set(selectedIds);
            estimates.forEach((i) => newSet.add(i.id));
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

    const getStatusVariant = (status: string) => {
        switch (status) {
            case "APPROVED": return "success";
            case "SENT": return "info";
            case "DECLINED": return "danger";
            case "DRAFT": return "secondary";
            case "EXPIRED": return "warning";
            case "CONVERTED": return "default";
            default: return "default";
        }
    };

    const columns: ColumnDef<Estimate>[] = [
        ...(selectedIds && onSelectionChange ? [{
            key: "select" as const,
            label: (
                <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected && !allSelected}
                    onChange={toggleAll}
                    aria-label="Select all"
                />
            ),
            headerClassName: "w-12 py-3 px-4",
            className: "w-12 py-4 px-4",
            render: (estimate: Estimate) => (
                <Checkbox
                    checked={selectedIds.has(estimate.id)}
                    onChange={() => toggleOne(estimate.id)}
                    aria-label={`Select ${estimate.estimateNo}`}
                    onClick={(e) => e.stopPropagation()}
                />
            ),
        }] : []),
        {
            key: "actions",
            label: "Actions",
            headerClassName: "text-left py-3 px-4 w-10",
            className: "w-10 py-4 px-4",
            render: (estimate) => {
                const actions: ActionItem[] = [];

                if (onEdit) {
                    actions.push({
                        label: 'Edit',
                        icon: <EditIcon className="h-3.5 w-3.5" />,
                        onClick: () => onEdit(estimate),
                    });
                }

                if (onView) {
                    actions.push({
                        label: 'View',
                        icon: <EyeIcon className="h-3.5 w-3.5" />,
                        onClick: () => onView(estimate),
                    });
                }

                if (onArchive) {
                    actions.push({
                        label: showArchived ? 'Restore' : 'Archive',
                        icon: showArchived ? <RefreshCwIcon className="h-3.5 w-3.5" /> : <ArchiveBoxIcon className="h-3.5 w-3.5" />,
                        onClick: () => onArchive(estimate),
                    });
                }

                if (showArchived && onDelete) {
                    actions.push({
                        label: 'Delete',
                        icon: <TrashIcon className="h-3.5 w-3.5" />,
                        onClick: () => onDelete(estimate),
                        variant: 'destructive',
                    });
                }

                return <ActionDropdown actions={actions} />;
            },
        },
        {
            key: "status",
            label: "Status",
            sortable: true,
            className: "py-4 px-4 whitespace-nowrap",
            render: (estimate) => (
                <Badge variant={getStatusVariant(estimate.status) as any} asSpan>
                    {estimate.status}
                </Badge>
            ),
        },
        {
            key: "estimateDate",
            label: "Date",
            sortable: true,
            className: "py-4 px-4 text-sm text-muted-foreground whitespace-nowrap",
            render: (estimate) => (
                <div>
                    <div>{format(new Date(estimate.estimateDate), "MMM dd, yyyy")}</div>
                    <div className="text-xs opacity-75">
                        {format(new Date(estimate.estimateDate), "h:mm a")}
                    </div>
                </div>
            ),
        },
        {
            key: "estimateNo",
            label: "Estimate No",
            sortable: true,
            className: "py-4 px-4 font-medium",
            render: (estimate) => estimate.estimateNo,
        },
        {
            key: "client",
            label: "Client",
            sortable: true,
            className: "py-4 px-4 text-sm text-muted-foreground",
            render: (estimate) => estimate.client.businessName || `${estimate.client.firstName} ${estimate.client.lastName}`,
        },
        {
            key: "amount",
            label: "Amount",
            className: "py-4 px-4 text-sm font-medium",
            render: (estimate) => {
                const total = estimate.items?.reduce((acc, item) => {
                    const amount = typeof item.amount === 'object' && 'toNumber' in item.amount
                        ? (item.amount as any).toNumber()
                        : Number(item.amount);
                    return acc + amount;
                }, 0) || 0;
                return `$${total.toFixed(2)}`;
            },
        },
    ];

    const renderMobileCard = (estimate: Estimate) => (
        <div key={estimate.id} className="bg-card rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <h3 className="font-medium text-foreground">{estimate.estimateNo}</h3>
                </div>
                <Badge variant={getStatusVariant(estimate.status) as any} asSpan>
                    {estimate.status}
                </Badge>
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                    <span className="font-medium">Date:</span>
                    <span>{format(new Date(estimate.estimateDate), "MMM dd, yyyy")}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-medium">Client:</span>
                    <span>{estimate.client.businessName || `${estimate.client.firstName} ${estimate.client.lastName}`}</span>
                </div>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => onEdit?.(estimate)} className="flex-1">
                    <EditIcon className="h-4 w-4 mr-1" /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => onView?.(estimate)} className="flex-1">
                    <EyeIcon className="h-4 w-4 mr-1" /> View
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onArchive?.(estimate)}
                    className={`flex-1 ${showArchived ? "text-blue-600 hover:bg-blue-50" : "text-blue-600 hover:text-blue-700 hover:bg-blue-50"}`}
                >
                    {showArchived ? (
                        <RefreshCwIcon className="h-4 w-4 mr-1" />
                    ) : (
                        <ArchiveBoxIcon className="h-4 w-4 mr-1" />
                    )}
                    {showArchived ? "Restore" : "Archive"}
                </Button>
                {showArchived && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDelete?.(estimate)}
                        className="flex-1 text-destructive hover:bg-destructive/10"
                    >
                        <TrashIcon className="h-4 w-4 mr-1" /> Delete
                    </Button>
                )}
            </div>
        </div>
    );

    return (
        <DataTable
            data={estimates}
            columns={columns}
            isLoading={isLoading}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={(field) => onSort?.(field as SortableField)}
            emptyMessage="No estimates found"
            emptyDescription="Create your first estimate to get started"
            mobileCard={renderMobileCard}
            getRowKey={(estimate) => estimate.id}
        />
    );
}
