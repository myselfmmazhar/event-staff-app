"use client";

import { trpc } from "@/lib/client/trpc";
import { Button } from "@/components/ui/button";
import { PlusIcon, ArchiveIcon, RotateCcw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { InvoiceTable } from "@/components/invoices/invoice-table";
import { InvoiceSearch } from "@/components/invoices/invoice-search";
import { Pagination } from "@/components/common/pagination";
import { InvoiceActionModal } from "@/components/invoices/invoice-action-modal";
import { useToast } from "@/components/ui/use-toast";

export default function InvoicesPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showArchived, setShowArchived] = useState(false);
    const [sortBy, setSortBy] = useState<"createdAt" | "updatedAt" | "invoiceNo" | "invoiceDate" | "status" | "client">("createdAt");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    // Action modal state
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [selectedInvoiceForAction, setSelectedInvoiceForAction] = useState<{ id: string, invoiceNo: string, clientName: string } | null>(null);
    const [actionType, setActionType] = useState<'archive' | 'restore' | 'delete'>('archive');

    const handleSort = (field: string) => {
        const f = field as typeof sortBy;
        if (sortBy === f) {
            setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortBy(f);
            setSortOrder("desc");
        }
        setPage(1);
    };

    const { data, isLoading } = trpc.invoices.getAll.useQuery({
        page,
        limit,
        showArchived,
        search: search || undefined,
        sortBy,
        sortOrder,
    });

    const invoices = data?.data || [];
    const total = data?.meta.total || 0;
    const totalPages = Math.ceil(total / limit);

    const archiveMutation = trpc.invoices.delete.useMutation({
        onSuccess: () => {
            utils.invoices.getAll.invalidate();
            setIsActionModalOpen(false);
        },
    });

    const restoreMutation = trpc.invoices.restore.useMutation({
        onSuccess: () => {
            utils.invoices.getAll.invalidate();
            setIsActionModalOpen(false);
        },
    });

    const hardDeleteMutation = trpc.invoices.hardDelete.useMutation({
        onSuccess: () => {
            utils.invoices.getAll.invalidate();
            setIsActionModalOpen(false);
        },
    });
    const updateMutation = trpc.invoices.update.useMutation({
        onSuccess: () => {
            utils.invoices.getAll.invalidate();
            toast({
                title: "Invoice updated",
                description: "Action applied successfully.",
            });
        },
        onError: (error) => {
            toast({
                title: "Update failed",
                description: error.message || "Could not update invoice status.",
                variant: "error",
            });
        },
    });

    const utils = trpc.useUtils();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-end gap-2">
                <Button
                    variant={showArchived ? "default" : "outline"}
                    onClick={() => setShowArchived(!showArchived)}
                    className={showArchived ? "bg-blue-600 hover:bg-blue-700" : ""}
                    size="lg"
                >
                    <ArchiveIcon className="h-4 w-4 mr-2" />
                    {showArchived ? "Showing Archived" : "View Archive"}
                </Button>
                <Button 
                    onClick={() => router.push("/invoices/new")}
                    size="lg"
                    className="rounded-xl shadow-lg shadow-primary/10"
                >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Create Invoice
                </Button>
            </div>

            <Card className="p-6 overflow-visible relative z-20">
                <div className="space-y-4">
                    <InvoiceSearch
                        value={search}
                        onChange={setSearch}
                        placeholder="Search invoices..."
                    />
                </div>
            </Card>

            <Card className="p-6">
                <InvoiceTable
                    invoices={invoices}
                    isLoading={isLoading}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                    showArchived={showArchived}
                    onEdit={(invoice) => router.push(`/invoices/${invoice.id}/edit`)}
                    onView={(invoice) => router.push(`/invoices/${invoice.id}`)}
                    onArchive={(invoice) => {
                        const clientName = invoice.client.businessName || `${invoice.client.firstName} ${invoice.client.lastName}`;
                        setSelectedInvoiceForAction({
                            id: invoice.id,
                            invoiceNo: invoice.invoiceNo,
                            clientName: clientName
                        });
                        setActionType(showArchived ? 'restore' : 'archive');
                        setIsActionModalOpen(true);
                    }}
                    onDelete={(invoice) => {
                        const clientName = invoice.client.businessName || `${invoice.client.firstName} ${invoice.client.lastName}`;
                        setSelectedInvoiceForAction({
                            id: invoice.id,
                            invoiceNo: invoice.invoiceNo,
                            clientName: clientName
                        });
                        setActionType('delete');
                        setIsActionModalOpen(true);
                    }}
                    onReview={(invoice) => {
                        updateMutation.mutate({
                            id: invoice.id,
                            invoiceNo: invoice.invoiceNo,
                            clientId: invoice.client.id,
                            status: "SENT",
                            invoiceDate: new Date(invoice.invoiceDate),
                        });
                    }}
                    onApprove={(invoice) => {
                        updateMutation.mutate({
                            id: invoice.id,
                            invoiceNo: invoice.invoiceNo,
                            clientId: invoice.client.id,
                            status: "PAID",
                            invoiceDate: new Date(invoice.invoiceDate),
                        });
                    }}
                    onReject={(invoice) => {
                        updateMutation.mutate({
                            id: invoice.id,
                            invoiceNo: invoice.invoiceNo,
                            clientId: invoice.client.id,
                            status: "CANCELLED",
                            invoiceDate: new Date(invoice.invoiceDate),
                        });
                    }}
                />
                {total > 0 && (
                    <div className="mt-6">
                        <Pagination
                            currentPage={page}
                            totalPages={totalPages}
                            totalItems={total}
                            itemsPerPage={limit}
                            onPageChange={setPage}
                            onItemsPerPageChange={setLimit}
                        />
                    </div>
                )}
            </Card>

            <InvoiceActionModal
                invoice={selectedInvoiceForAction}
                open={isActionModalOpen}
                onClose={() => setIsActionModalOpen(false)}
                onConfirm={() => {
                    if (!selectedInvoiceForAction) return;
                    if (actionType === 'archive') {
                        archiveMutation.mutate({ id: selectedInvoiceForAction.id });
                    } else if (actionType === 'restore') {
                        restoreMutation.mutate({ id: selectedInvoiceForAction.id });
                    } else if (actionType === 'delete') {
                        hardDeleteMutation.mutate({ id: selectedInvoiceForAction.id });
                    }
                }}
                isLoading={archiveMutation.isPending || restoreMutation.isPending || hardDeleteMutation.isPending}
                actionType={actionType}
            />
        </div>
    );
}
