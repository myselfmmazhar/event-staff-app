'use client';

import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/client/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import Link from 'next/link';

function formatCurrency(value: number | string | null | undefined) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
}

export default function ClientInvoiceDetailPage() {
    const params = useParams();
    const router = useRouter();
    const invoiceId = params.id as string;

    const { data: invoice, isLoading } = trpc.profile.getMyClientInvoiceById.useQuery({ id: invoiceId });

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
                <div className="flex items-center justify-center h-64 flex-col gap-4">
                    <p className="text-muted-foreground">Invoice not found or not available.</p>
                    <Link href="/client-portal/invoices">
                        <Button variant="outline" size="sm">Back to Invoices</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const subtotal = invoice.items?.reduce((acc, item) => acc + Number(item.amount), 0) ?? 0;
    const discountAmount =
        invoice.discountType === 'PERCENT'
            ? subtotal * (Number(invoice.discountValue) / 100)
            : Number(invoice.discountValue || 0);
    const total = subtotal - discountAmount + Number(invoice.shippingAmount || 0) + Number(invoice.salesTaxAmount || 0);
    const totalDue = total - Number(invoice.depositAmount || 0);

    return (
        <div className="container mx-auto py-6 space-y-6 max-w-4xl">
            {/* Header */}
            <div className="flex items-center justify-between print:hidden">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" className="p-2" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">Invoice {invoice.invoiceNo}</h1>
                        <p className="text-muted-foreground">
                            Created on {format(new Date(invoice.createdAt), 'MMMM dd, yyyy')}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge className="text-sm px-3 py-1 bg-green-100 text-green-700 border border-green-400 hover:bg-green-100">
                        PAID
                    </Badge>
                    <Button variant="outline" size="sm" className="p-2" onClick={() => window.print()} title="Print Invoice">
                        <Printer className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="p-2" onClick={() => window.print()} title="Download as PDF">
                        <Download className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Print-only header */}
            <div className="hidden print:block mb-8">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-4xl font-bold text-foreground">INVOICE</h1>
                        <p className="text-muted-foreground mt-2">#{invoice.invoiceNo}</p>
                    </div>
                </div>
            </div>

            {/* Invoice Details Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Invoice Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div>
                            <p className="text-sm text-muted-foreground">Invoice Number</p>
                            <p className="font-medium">{invoice.invoiceNo}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Invoice Date</p>
                            <p className="font-medium">{format(new Date(invoice.invoiceDate), 'MMM dd, yyyy')}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Due Date</p>
                            <p className="font-medium">
                                {invoice.dueDate ? format(new Date(invoice.dueDate), 'MMM dd, yyyy') : 'N/A'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Terms</p>
                            <p className="font-medium">{invoice.terms || 'N/A'}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Line Items Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Line Items</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Description</th>
                                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Qty</th>
                                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Price</th>
                                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoice.items?.map((item, index) => (
                                    <tr key={item.id ?? index} className="border-b last:border-0">
                                        <td className="py-3 px-2">
                                            <div className="font-medium">{item.description || '—'}</div>
                                        </td>
                                        <td className="py-3 px-2 text-right">
                                            {item.quantity != null ? Number(item.quantity).toFixed(2) : '—'}
                                        </td>
                                        <td className="py-3 px-2 text-right">${Number(item.price).toFixed(2)}</td>
                                        <td className="py-3 px-2 text-right font-medium">${Number(item.amount).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <Separator className="my-4" />

                    {/* Totals */}
                    <div className="space-y-2 max-w-xs ml-auto">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>${subtotal.toFixed(2)}</span>
                        </div>
                        {discountAmount > 0 && (
                            <div className="flex justify-between text-destructive">
                                <span>
                                    Discount{invoice.discountType === 'PERCENT' ? ` (${Number(invoice.discountValue)}%)` : ''}
                                </span>
                                <span>-${discountAmount.toFixed(2)}</span>
                            </div>
                        )}
                        {Number(invoice.shippingAmount) > 0 && (
                            <div className="flex justify-between">
                                <span>Shipping</span>
                                <span>${Number(invoice.shippingAmount).toFixed(2)}</span>
                            </div>
                        )}
                        {Number(invoice.salesTaxAmount) > 0 && (
                            <div className="flex justify-between">
                                <span>Sales Tax</span>
                                <span>${Number(invoice.salesTaxAmount).toFixed(2)}</span>
                            </div>
                        )}
                        {Number(invoice.depositAmount) > 0 && (
                            <div className="flex justify-between text-blue-600">
                                <span>Deposit</span>
                                <span>-${Number(invoice.depositAmount).toFixed(2)}</span>
                            </div>
                        )}
                        <Separator />
                        <div className="flex justify-between font-bold text-lg">
                            <span>Total Due</span>
                            <span>${totalDue.toFixed(2)}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Notes & Payment Details */}
            {(invoice.notes || invoice.paymentDetails) && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {invoice.paymentDetails && (
                                <div>
                                    <p className="text-sm font-medium mb-2">Payment Details</p>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.paymentDetails}</p>
                                </div>
                            )}
                            {invoice.notes && (
                                <div>
                                    <p className="text-sm font-medium mb-2">Notes</p>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
