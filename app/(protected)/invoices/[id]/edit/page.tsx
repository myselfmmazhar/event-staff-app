"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/client/trpc";
import { InvoiceForm } from "@/components/invoices/invoice-form";

export default function EditInvoicePage() {
    const params = useParams();
    const invoiceId = params.id as string;

    const { data: invoice, isLoading } = trpc.invoices.getById.useQuery({ id: invoiceId });

    if (isLoading) {
        return (
            <div className="container mx-auto py-6">
                <div className="flex items-center justify-center h-64">
                    <p className="text-muted-foreground">Loading invoice...</p>
                </div>
            </div>
        );
    }

    if (!invoice) {
        return (
            <div className="container mx-auto py-6">
                <div className="flex items-center justify-center h-64">
                    <p className="text-muted-foreground">Invoice not found</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6">
            <InvoiceForm invoice={invoice} />
        </div>
    );
}
