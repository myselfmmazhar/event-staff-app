"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { InvoiceStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { DataTable, ColumnDef } from "@/components/common/data-table";
import { format } from "date-fns";
import { ActionDropdown, type ActionItem } from "@/components/common/action-dropdown";
import { EditIcon, EyeIcon, ArchiveBoxIcon, RefreshCwIcon, TrashIcon } from "@/components/ui/icons";

interface Invoice {
    id: string;
    invoiceNo: string;
    status: InvoiceStatus;
    invoiceDate: Date | string;
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

type SortableField = "createdAt" | "updatedAt" | "invoiceNo" | "invoiceDate" | "status" | "client";

interface InvoiceTableProps {
    invoices: Invoice[];
    isLoading: boolean;
    sortBy?: SortableField;
    sortOrder?: "asc" | "desc";
    onEdit?: (invoice: Invoice) => void;
    onArchive?: (invoice: Invoice) => void;
    onDelete?: (invoice: Invoice) => void;
    onView?: (invoice: Invoice) => void;
    onReview?: (invoice: Invoice) => void;
    onApprove?: (invoice: Invoice) => void;
    onReject?: (invoice: Invoice) => void;
    onSort?: (field: SortableField) => void;
    selectedIds?: Set<string>;
    onSelectionChange?: (ids: Set<string>) => void;
    showArchived?: boolean;
}

export function InvoiceTable({
    invoices,
    isLoading,
    sortBy = "createdAt",
    sortOrder = "desc",
    onEdit,
    onArchive,
    onDelete,
    onView,
    onReview,
    onApprove,
    onReject,
    onSort,
    selectedIds,
    onSelectionChange,
    showArchived = false,
}: InvoiceTableProps) {
    const router = useRouter();

    // Selection handlers
    const allSelected = selectedIds && invoices.length > 0 && invoices.every((i) => selectedIds.has(i.id));
    const someSelected = selectedIds && invoices.some((i) => selectedIds.has(i.id));

    const toggleAll = () => {
        if (!onSelectionChange || !selectedIds) return;
        if (allSelected) {
            const newSet = new Set(selectedIds);
            invoices.forEach((i) => newSet.delete(i.id));
            onSelectionChange(newSet);
        } else {
            const newSet = new Set(selectedIds);
            invoices.forEach((i) => newSet.add(i.id));
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
            case "SENT": return "info";
            case "OVERDUE": return "danger";
            case "DRAFT": return "secondary";
            default: return "default";
        }
    };

    const columns: ColumnDef<Invoice>[] = [
        ...(selectedIds && onSelectionChange ? [{
            key: "select" as const,
            label: (
                <div className="flex items-center justify-center">
                    <Checkbox
                        checked={allSelected}
                        indeterminate={someSelected && !allSelected}
                        onChange={toggleAll}
                        aria-label="Select all"
                    />
                </div>
            ),
            headerClassName: "w-10 min-w-10 max-w-10 py-4 px-2 align-middle text-center",
            className: "w-10 min-w-10 max-w-10 py-4 px-2 align-middle text-center",
            render: (invoice: Invoice) => (
                <div className="flex items-center justify-center">
                    <Checkbox
                        checked={selectedIds.has(invoice.id)}
                        onChange={() => toggleOne(invoice.id)}
                        aria-label={`Select ${invoice.invoiceNo}`}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            ),
        }] : []),
        {
            key: "actions",
            label: "Actions",
            headerClassName: "py-4 px-2 align-middle text-left whitespace-nowrap",
            className: "py-4 px-2 align-middle",
            render: (invoice) => {
                const actions: ActionItem[] = [];

                if (onEdit) {
                    actions.push({
                        label: 'Edit',
                        icon: <EditIcon className="h-3.5 w-3.5" />,
                        onClick: () => onEdit(invoice),
                    });
                }

                if (onView) {
                    actions.push({
                        label: 'View',
                        icon: <EyeIcon className="h-3.5 w-3.5" />,
                        onClick: () => onView(invoice),
                    });
                }

                if (onArchive) {
                    actions.push({
                        label: showArchived ? 'Restore' : 'Archive',
                        icon: showArchived ? <RefreshCwIcon className="h-3.5 w-3.5" /> : <ArchiveBoxIcon className="h-3.5 w-3.5" />,
                        onClick: () => onArchive(invoice),
                    });
                }

                if (!showArchived && onReview) {
                    actions.push({
                        label: 'Review',
                        onClick: () => onReview(invoice),
                    });
                }

                if (!showArchived && onApprove) {
                    actions.push({
                        label: 'Approve',
                        onClick: () => onApprove(invoice),
                    });
                }

                if (!showArchived && onReject) {
                    actions.push({
                        label: 'Reject',
                        onClick: () => onReject(invoice),
                        variant: 'destructive',
                    });
                }

                if (showArchived && onDelete) {
                    actions.push({
                        label: 'Delete',
                        icon: <TrashIcon className="h-3.5 w-3.5" />,
                        onClick: () => onDelete(invoice),
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
            render: (invoice) => (
                <Badge variant={getStatusVariant(invoice.status) as any} asSpan>
                    {invoice.status}
                </Badge>
            ),
        },
        {
            key: "invoiceDate",
            label: "Date",
            sortable: true,
            className: "py-4 px-4 text-sm text-muted-foreground whitespace-nowrap",
            render: (invoice) => (
                <div>
                    <div>{format(new Date(invoice.invoiceDate), "MMM dd, yyyy")}</div>
                    <div className="text-xs opacity-75">
                        {format(new Date(invoice.invoiceDate), "h:mm a")}
                    </div>
                </div>
            ),
        },
        {
            key: "invoiceNo",
            label: "Invoice No",
            sortable: true,
            className: "py-4 px-4 font-medium",
            render: (invoice) => (
                <span
                    className={onEdit ? "cursor-pointer text-primary hover:underline" : ""}
                    onClick={onEdit ? () => onEdit(invoice) : undefined}
                >
                    {invoice.invoiceNo}
                </span>
            ),
        },
        {
            key: "client",
            label: "Client",
            sortable: true,
            className: "py-4 px-4 text-sm text-muted-foreground",
            render: (invoice) => invoice.client.businessName || `${invoice.client.firstName} ${invoice.client.lastName}`,
        },
        {
            key: "amount",
            label: "Amount",
            className: "py-4 px-4 text-sm font-medium",
            render: (invoice) => {
                const total = invoice.items?.reduce((acc, item) => {
                    const amount = typeof item.amount === 'object' && 'toNumber' in item.amount
                        ? item.amount.toNumber()
                        : Number(item.amount);
                    return acc + amount;
                }, 0) || 0;
                return `$${total.toFixed(2)}`;
            },
        },
    ];

    const renderMobileCard = (invoice: Invoice) => (
        <div key={invoice.id} className="bg-card rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <h3 className="font-medium text-foreground">{invoice.invoiceNo}</h3>
                </div>
                <Badge variant={getStatusVariant(invoice.status) as any} asSpan>
                    {invoice.status}
                </Badge>
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                    <span className="font-medium">Date:</span>
                    <span>{format(new Date(invoice.invoiceDate), "MMM dd, yyyy")}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-medium">Client:</span>
                    <span>{invoice.client.businessName || `${invoice.client.firstName} ${invoice.client.lastName}`}</span>
                </div>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => onEdit?.(invoice)} className="flex-1">
                    <EditIcon className="h-4 w-4 mr-1" /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => onView?.(invoice)} className="flex-1">
                    <EyeIcon className="h-4 w-4 mr-1" /> View
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onArchive?.(invoice)}
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
                        onClick={() => onDelete?.(invoice)}
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
            tableId="invoices"
            data={invoices}
            columns={columns}
            isLoading={isLoading}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={(field) => onSort?.(field as SortableField)}
            emptyMessage="No invoices found"
            emptyDescription="Create your first invoice to get started"
            mobileCard={renderMobileCard}
            getRowKey={(invoice) => invoice.id}
        />
    );
}
