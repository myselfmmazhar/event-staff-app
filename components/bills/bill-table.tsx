"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { BillStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { DataTable, ColumnDef } from "@/components/common/data-table";
import { format } from "date-fns";
import { ActionDropdown, type ActionItem } from "@/components/common/action-dropdown";
import { EditIcon, EyeIcon, ArchiveBoxIcon, RefreshCwIcon, TrashIcon } from "@/components/ui/icons";

interface Bill {
    id: string;
    billNo: string;
    status: BillStatus;
    billDate: Date | string;
    staff: {
        id: string;
        firstName?: string | null;
        lastName?: string | null;
    };
    items: {
        amount: number | string | { toNumber: () => number };
    }[];
}

type SortableField = "createdAt" | "updatedAt" | "billNo" | "billDate" | "status" | "staff";

interface BillTableProps {
    bills: Bill[];
    isLoading: boolean;
    sortBy?: SortableField;
    sortOrder?: "asc" | "desc";
    onEdit?: (bill: Bill) => void;
    onArchive?: (bill: Bill) => void;
    onDelete?: (bill: Bill) => void;
    onView?: (bill: Bill) => void;
    onSort?: (field: SortableField) => void;
    selectedIds?: Set<string>;
    onSelectionChange?: (ids: Set<string>) => void;
    showArchived?: boolean;
}

export function BillTable({
    bills,
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
}: BillTableProps) {
    const router = useRouter();

    // Selection handlers
    const allSelected = selectedIds && bills.length > 0 && bills.every((i) => selectedIds.has(i.id));
    const someSelected = selectedIds && bills.some((i) => selectedIds.has(i.id));

    const toggleAll = () => {
        if (!onSelectionChange || !selectedIds) return;
        if (allSelected) {
            const newSet = new Set(selectedIds);
            bills.forEach((i) => newSet.delete(i.id));
            onSelectionChange(newSet);
        } else {
            const newSet = new Set(selectedIds);
            bills.forEach((i) => newSet.add(i.id));
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
            case "PAID": return "success";
            case "APPROVED": return "info";
            case "PENDING": return "warning";
            case "DRAFT": return "secondary";
            case "VOID": return "secondary";
            case "CANCELLED": return "danger";
            default: return "default";
        }
    };

    const columns: ColumnDef<Bill>[] = [
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
            render: (bill: Bill) => (
                <Checkbox
                    checked={selectedIds.has(bill.id)}
                    onChange={() => toggleOne(bill.id)}
                    aria-label={`Select ${bill.billNo}`}
                    onClick={(e) => e.stopPropagation()}
                />
            ),
        }] : []),
        {
            key: "actions",
            label: "Actions",
            headerClassName: "text-left py-3 px-4 w-10",
            className: "w-10 py-4 px-4",
            render: (bill) => {
                const actions: ActionItem[] = [];

                if (onEdit) {
                    actions.push({
                        label: 'Edit',
                        icon: <EditIcon className="h-3.5 w-3.5" />,
                        onClick: () => onEdit(bill),
                    });
                }

                if (onView) {
                    actions.push({
                        label: 'View',
                        icon: <EyeIcon className="h-3.5 w-3.5" />,
                        onClick: () => onView(bill),
                    });
                }

                if (onArchive) {
                    actions.push({
                        label: showArchived ? 'Restore' : 'Archive',
                        icon: showArchived ? <RefreshCwIcon className="h-3.5 w-3.5" /> : <ArchiveBoxIcon className="h-3.5 w-3.5" />,
                        onClick: () => onArchive(bill),
                    });
                }

                if (showArchived && onDelete) {
                    actions.push({
                        label: 'Delete',
                        icon: <TrashIcon className="h-3.5 w-3.5" />,
                        onClick: () => onDelete(bill),
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
            render: (bill) => (
                <Badge variant={getStatusVariant(bill.status) as any} asSpan>
                    {bill.status}
                </Badge>
            ),
        },
        {
            key: "billDate",
            label: "Date",
            sortable: true,
            className: "py-4 px-4 text-sm text-muted-foreground whitespace-nowrap",
            render: (bill) => (
                <div>
                    <div>{format(new Date(bill.billDate), "MMM dd, yyyy")}</div>
                    <div className="text-xs opacity-75">
                        {format(new Date(bill.billDate), "h:mm a")}
                    </div>
                </div>
            ),
        },
        {
            key: "billNo",
            label: "Bill No",
            sortable: true,
            className: "py-4 px-4 font-medium",
            render: (bill) => bill.billNo,
        },
        {
            key: "staff",
            label: "Talent",
            sortable: true,
            className: "py-4 px-4 text-sm text-muted-foreground",
            render: (bill) => `${bill.staff.firstName} ${bill.staff.lastName}`,
        },
        {
            key: "amount",
            label: "Amount",
            className: "py-4 px-4 text-sm font-medium",
            render: (bill) => {
                const total = bill.items?.reduce((acc, item) => {
                    const amount = typeof item.amount === 'object' && 'toNumber' in item.amount
                        ? item.amount.toNumber()
                        : Number(item.amount);
                    return acc + amount;
                }, 0) || 0;
                return `$${total.toFixed(2)}`;
            },
        },
    ];

    const renderMobileCard = (bill: Bill) => (
        <div key={bill.id} className="bg-card rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <h3 className="font-medium text-foreground">{bill.billNo}</h3>
                </div>
                <Badge variant={getStatusVariant(bill.status) as any} asSpan>
                    {bill.status}
                </Badge>
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                    <span className="font-medium">Date:</span>
                    <span>{format(new Date(bill.billDate), "MMM dd, yyyy")}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-medium">Talent:</span>
                    <span>{`${bill.staff.firstName} ${bill.staff.lastName}`}</span>
                </div>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => onEdit?.(bill)} className="flex-1">
                    <EditIcon className="h-4 w-4 mr-1" /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => onView?.(bill)} className="flex-1">
                    <EyeIcon className="h-4 w-4 mr-1" /> View
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onArchive?.(bill)}
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
                        onClick={() => onDelete?.(bill)}
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
            tableId="bills"
            data={bills}
            columns={columns}
            isLoading={isLoading}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={(field) => onSort?.(field as SortableField)}
            emptyMessage="No bills found"
            emptyDescription="Create your first bill to get started"
            mobileCard={renderMobileCard}
            getRowKey={(bill) => bill.id}
        />
    );
}
