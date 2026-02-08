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

export default function InvoicesPage() {
    const router = useRouter();
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showArchived, setShowArchived] = useState(false);

    const { data, isLoading } = trpc.invoices.getAll.useQuery({
        page,
        limit,
        showArchived,
        // search // TODO: Add search to backend query
    });

    const invoices = data?.data || [];
    const total = data?.meta.total || 0;
    const totalPages = Math.ceil(total / limit);

    const archiveMutation = trpc.invoices.delete.useMutation({
        onSuccess: () => {
            utils.invoices.getAll.invalidate();
        },
    });

    const restoreMutation = trpc.invoices.restore.useMutation({
        onSuccess: () => {
            utils.invoices.getAll.invalidate();
        },
    });

    const utils = trpc.useUtils();

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Invoices</h1>
                    <p className="text-muted-foreground mt-1">Manage your invoices and payments</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant={showArchived ? "default" : "outline"}
                        onClick={() => setShowArchived(!showArchived)}
                        className={showArchived ? "bg-blue-600 hover:bg-blue-700" : ""}
                    >
                        <ArchiveIcon className="h-4 w-4 mr-2" />
                        {showArchived ? "Showing Archived" : "View Archive"}
                    </Button>
                    <Button onClick={() => router.push("/invoices/new")}>
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Create Invoice
                    </Button>
                </div>
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
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                    showArchived={showArchived}
                    onEdit={(invoice) => router.push(`/invoices/${invoice.id}/edit`)}
                    onView={(invoice) => router.push(`/invoices/${invoice.id}`)}
                    onArchive={(invoice) => {
                        if (showArchived) {
                            if (confirm("Are you sure you want to restore this invoice?")) {
                                restoreMutation.mutate({ id: invoice.id });
                            }
                        } else {
                            if (confirm("Are you sure you want to archive this invoice? It will be moved to the archive.")) {
                                archiveMutation.mutate({ id: invoice.id });
                            }
                        }
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
        </div>
    );
}
