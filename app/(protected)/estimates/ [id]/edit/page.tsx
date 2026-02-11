"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/client/trpc";
import { EstimateForm } from "@/components/estimates/estimate-form";

export default function EditEstimatePage() {
    const params = useParams();
    const estimateId = params.id as string;

    const { data: estimate, isLoading } = trpc.estimates.getById.useQuery({ id: estimateId });

    if (isLoading) {
        return (
            <div className="container mx-auto py-6">
                <div className="flex items-center justify-center h-64">
                    <p className="text-muted-foreground">Loading estimate...</p>
                </div>
            </div>
        );
    }

    if (!estimate) {
        return (
            <div className="container mx-auto py-6">
                <div className="flex items-center justify-center h-64">
                    <p className="text-muted-foreground">Estimate not found</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6">
            <EstimateForm estimate={estimate} />
        </div>
    );
}
