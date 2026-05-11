"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/client/trpc";
import { BillForm } from "@/components/bills/bill-form";

export default function EditBillPage() {
    const params = useParams();
    const billId = params.id as string;

    const { data: bill, isLoading } = trpc.bills.getById.useQuery({ id: billId });

    if (isLoading) {
        return (
            <div className="w-full px-4 py-6">
                <div className="flex items-center justify-center h-64">
                    <p className="text-muted-foreground">Loading bill...</p>
                </div>
            </div>
        );
    }

    if (!bill) {
        return (
            <div className="w-full px-4 py-6">
                <div className="flex items-center justify-center h-64">
                    <p className="text-muted-foreground">Bill not found</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <BillForm bill={bill} />
        </div>
    );
}
