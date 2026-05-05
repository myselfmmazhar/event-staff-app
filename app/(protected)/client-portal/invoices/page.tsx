'use client';

import { trpc } from '@/lib/client/trpc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { DataTable, type ColumnDef } from '@/components/common/data-table';
import { ArrowLeftIcon, EyeIcon } from 'lucide-react';
import Link from 'next/link';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/server/routers/_app';

type RouterOutputs = inferRouterOutputs<AppRouter>;
type ClientInvoice = RouterOutputs['profile']['getMyClientInvoices'][number];

function getInvoiceTotal(invoice: ClientInvoice) {
    const discountAmount =
        invoice.discountType === 'PERCENT'
            ? invoice.subtotal * (Number(invoice.discountValue) / 100)
            : Number(invoice.discountValue || 0);
    return (
        invoice.subtotal -
        discountAmount +
        Number(invoice.shippingAmount || 0) +
        Number(invoice.salesTaxAmount || 0)
    );
}

export default function ClientInvoicesPage() {
    const router = useRouter();
    const { data: invoices, isLoading } = trpc.profile.getMyClientInvoices.useQuery();

    const columns: ColumnDef<ClientInvoice>[] = [
        {
            key: 'actions',
            label: 'Actions',
            render: (invoice) => (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/client-portal/invoices/${invoice.id}`)}
                >
                    <EyeIcon className="h-4 w-4 mr-1" />
                    View Details
                </Button>
            ),
        },
        {
            key: 'status',
            label: 'Status',
            render: () => (
                <Badge variant="outline" className="border-green-400 text-green-700 bg-green-50/50 text-[11px] font-semibold">
                    PAID
                </Badge>
            ),
        },
        {
            key: 'invoiceDate',
            label: 'Date',
            render: (invoice) => (
                <div className="text-sm font-medium text-foreground whitespace-nowrap">
                    <div>{format(new Date(invoice.invoiceDate), 'MMM d, yyyy')}</div>
                    <div className="text-muted-foreground text-xs opacity-75">
                        {format(new Date(invoice.invoiceDate), 'h:mm a')}
                    </div>
                </div>
            ),
        },
        {
            key: 'invoiceNo',
            label: 'Invoice No',
            render: (invoice) => (
                <p className="font-bold text-foreground">{invoice.invoiceNo}</p>
            ),
        },
        {
            key: 'dueDate',
            label: 'Due Date',
            render: (invoice) => (
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {invoice.dueDate ? format(new Date(invoice.dueDate), 'MMM d, yyyy') : '—'}
                </span>
            ),
        },
        {
            key: 'amount',
            label: 'Amount',
            render: (invoice) => (
                <span className="text-sm font-medium text-foreground">
                    ${getInvoiceTotal(invoice).toFixed(2)}
                </span>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/client-portal">
                    <Button variant="ghost" size="sm" className="rounded-full w-9 h-9 p-0">
                        <ArrowLeftIcon className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">My Invoices</h1>
                    <p className="text-muted-foreground">All invoices associated with your account</p>
                </div>
            </div>

            {/* Table card */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-4">
                    <DataTable
                        tableId="client-invoices"
                        data={invoices ?? []}
                        columns={columns}
                        isLoading={isLoading}
                        emptyMessage="No Invoices Yet"
                        emptyDescription="Invoices associated with your account will appear here."
                        getRowKey={(invoice) => invoice.id}
                    />
                </div>
            </div>
        </div>
    );
}
