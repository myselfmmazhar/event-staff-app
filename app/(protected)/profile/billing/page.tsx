"use client";

import { trpc } from "@/lib/client/trpc";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BillTable } from "@/components/bills/bill-table";
import { BillSearch } from "@/components/bills/bill-search";
import { Pagination } from "@/components/common/pagination";

export default function BillingPage() {
    const router = useRouter();
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState<"createdAt" | "updatedAt" | "billNo" | "billDate" | "status" | "staff">("createdAt");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

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

    const { data, isLoading } = trpc.bills.getMyBills.useQuery({
        page,
        limit,
        search: search || undefined,
        sortBy,
        sortOrder,
    }, {
        placeholderData: (previousData) => previousData,
    });

    const bills = data?.data || [];
    const total = data?.meta.total || 0;
    const totalPages = data?.meta.totalPages || 0;

    return (
        <div className="space-y-6">
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
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    onView={(bill) => router.push(`/profile/billing/${bill.id}`)}
                    emptyDescription="You don't have any bills yet."
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
