"use client";

import { trpc } from "@/lib/client/trpc";
import { Button } from "@/components/ui/button";
import { PlusIcon, ArchiveIcon, RotateCcw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BillTable } from "@/components/bills/bill-table";
import { BillSearch } from "@/components/bills/bill-search";
import { Pagination } from "@/components/common/pagination";
import { BillActionModal } from "@/components/bills/bill-action-modal";

export default function BillsPage() {
    const router = useRouter();
    const utils = trpc.useUtils();
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showArchived, setShowArchived] = useState(false);

    // Action modal state
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [selectedBillForAction, setSelectedBillForAction] = useState<{ id: string, billNo: string, talentName: string } | null>(null);
    const [actionType, setActionType] = useState<'archive' | 'restore' | 'delete'>('archive');

    const { data, isLoading } = trpc.bills.getAll.useQuery({
        page,
        limit,
        showArchived,
        search: search || undefined
    }, {
        placeholderData: (previousData) => previousData,
    });

    const bills = data?.data || [];
    const total = data?.meta.total || 0;
    const totalPages = data?.meta.totalPages || 0;

    const archiveMutation = trpc.bills.delete.useMutation({
        onSuccess: () => {
            utils.bills.getAll.invalidate();
            setIsActionModalOpen(false);
            toast({ title: "Success", description: "Bill archived successfully" });
        },
    });

    const restoreMutation = trpc.bills.restore.useMutation({
        onSuccess: () => {
            utils.bills.getAll.invalidate();
            setIsActionModalOpen(false);
            toast({ title: "Success", description: "Bill restored successfully" });
        },
    });

    const hardDeleteMutation = trpc.bills.hardDelete.useMutation({
        onSuccess: () => {
            utils.bills.getAll.invalidate();
            setIsActionModalOpen(false);
            toast({ title: "Success", description: "Bill deleted permanently" });
        },
    });

    const { toast } = (require("@/components/ui/use-toast") as any).useToast();

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Bills</h1>
                    <p className="text-muted-foreground mt-1">Manage your bills and talent payments</p>
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
                    <Button onClick={() => router.push("/bills/new")}>
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Create Bill
                    </Button>
                </div>
            </div>

            <Card className="p-6 overflow-visible relative z-20">
                <div className="space-y-4">
                    <BillSearch
                        value={search}
                        onChange={setSearch}
                        placeholder="Search bills..."
                    />
                </div>
            </Card>

            <Card className="p-6">
                <BillTable
                    bills={bills as any}
                    isLoading={isLoading}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                    showArchived={showArchived}
                    onEdit={(bill) => router.push(`/bills/${bill.id}/edit`)}
                    onView={(bill) => router.push(`/bills/${bill.id}`)}
                    onArchive={(bill) => {
                        const talentName = `${bill.staff.firstName} ${bill.staff.lastName}`;
                        setSelectedBillForAction({
                            id: bill.id,
                            billNo: bill.billNo,
                            talentName: talentName
                        });
                        setActionType(showArchived ? 'restore' : 'archive');
                        setIsActionModalOpen(true);
                    }}
                    onDelete={(bill) => {
                        const talentName = `${bill.staff.firstName} ${bill.staff.lastName}`;
                        setSelectedBillForAction({
                            id: bill.id,
                            billNo: bill.billNo,
                            talentName: talentName
                        });
                        setActionType('delete');
                        setIsActionModalOpen(true);
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

            <BillActionModal
                bill={selectedBillForAction}
                open={isActionModalOpen}
                onClose={() => setIsActionModalOpen(false)}
                onConfirm={() => {
                    if (!selectedBillForAction) return;
                    if (actionType === 'archive') {
                        archiveMutation.mutate({ id: selectedBillForAction.id });
                    } else if (actionType === 'restore') {
                        restoreMutation.mutate({ id: selectedBillForAction.id });
                    } else if (actionType === 'delete') {
                        hardDeleteMutation.mutate({ id: selectedBillForAction.id });
                    }
                }}
                isLoading={archiveMutation.isPending || restoreMutation.isPending || hardDeleteMutation.isPending}
                actionType={actionType}
            />
        </div>
    );
}
