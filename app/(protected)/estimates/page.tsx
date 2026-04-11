"use client";

import { trpc } from "@/lib/client/trpc";
import { Button } from "@/components/ui/button";
import { PlusIcon, ArchiveIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { EstimateTable } from "@/components/estimates/estimate-table";
import { EstimateSearch } from "@/components/estimates/estimate-search";
import { Pagination } from "@/components/common/pagination";
import { EstimateActionModal } from "@/components/estimates/estimate-action-modal";

export default function EstimatesPage() {
    const router = useRouter();
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showArchived, setShowArchived] = useState(false);

    // Action modal state
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [selectedEstimateForAction, setSelectedEstimateForAction] = useState<{ id: string, estimateNo: string, clientName: string } | null>(null);
    const [actionType, setActionType] = useState<'archive' | 'restore' | 'delete'>('archive');

    const { data, isLoading } = trpc.estimates.getAll.useQuery({
        page,
        limit,
        showArchived,
        search: search || undefined,
    });

    const estimates = data?.data || [];
    const total = data?.meta.total || 0;
    const totalPages = Math.ceil(total / limit);

    const archiveMutation = trpc.estimates.delete.useMutation({
        onSuccess: () => {
            utils.estimates.getAll.invalidate();
            setIsActionModalOpen(false);
        },
    });

    const restoreMutation = trpc.estimates.restore.useMutation({
        onSuccess: () => {
            utils.estimates.getAll.invalidate();
            setIsActionModalOpen(false);
        },
    });

    const hardDeleteMutation = trpc.estimates.hardDelete.useMutation({
        onSuccess: () => {
            utils.estimates.getAll.invalidate();
            setIsActionModalOpen(false);
        },
    });

    const utils = trpc.useUtils();

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Estimates</h1>
                    <p className="text-muted-foreground mt-1">Manage your estimates and quotes</p>
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
                    <Button onClick={() => router.push("/estimates/new")}>
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Create Estimate
                    </Button>
                </div>
            </div>

            <Card className="p-6 overflow-visible relative z-20">
                <div className="space-y-4">
                    <EstimateSearch
                        value={search}
                        onChange={setSearch}
                        placeholder="Search estimates..."
                    />
                </div>
            </Card>

            <Card className="p-6">
                <EstimateTable
                    estimates={estimates as any}
                    isLoading={isLoading}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                    showArchived={showArchived}
                    onEdit={(estimate) => router.push(`/estimates/${estimate.id}/edit`)}
                    onView={(estimate) => router.push(`/estimates/${estimate.id}`)}
                    onArchive={(estimate) => {
                        const clientName = estimate.client.businessName || `${estimate.client.firstName} ${estimate.client.lastName}`;
                        setSelectedEstimateForAction({
                            id: estimate.id,
                            estimateNo: estimate.estimateNo,
                            clientName: clientName
                        });
                        setActionType(showArchived ? 'restore' : 'archive');
                        setIsActionModalOpen(true);
                    }}
                    onDelete={(estimate) => {
                        const clientName = estimate.client.businessName || `${estimate.client.firstName} ${estimate.client.lastName}`;
                        setSelectedEstimateForAction({
                            id: estimate.id,
                            estimateNo: estimate.estimateNo,
                            clientName: clientName
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

            <EstimateActionModal
                estimate={selectedEstimateForAction}
                open={isActionModalOpen}
                onClose={() => setIsActionModalOpen(false)}
                onConfirm={() => {
                    if (!selectedEstimateForAction) return;
                    if (actionType === 'archive') {
                        archiveMutation.mutate({ id: selectedEstimateForAction.id });
                    } else if (actionType === 'restore') {
                        restoreMutation.mutate({ id: selectedEstimateForAction.id });
                    } else if (actionType === 'delete') {
                        hardDeleteMutation.mutate({ id: selectedEstimateForAction.id });
                    }
                }}
                isLoading={archiveMutation.isPending || restoreMutation.isPending || hardDeleteMutation.isPending}
                actionType={actionType}
            />
        </div>
    );
}
