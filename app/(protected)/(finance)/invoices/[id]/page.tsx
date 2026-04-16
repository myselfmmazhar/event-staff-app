"use client";

import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/client/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ArrowLeft, Pencil, Printer, Download, Paperclip, FileText, Image, ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function ViewInvoicePage() {
    const params = useParams();
    const router = useRouter();
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

    const getStatusVariant = (status: string) => {
        switch (status) {
            case "PAID": return "success";
            case "SENT": return "info";
            case "OVERDUE": return "danger";
            case "DRAFT": return "secondary";
            default: return "default";
        }
    };

    const subtotal = invoice.items?.reduce((acc, item) => acc + Number(item.amount), 0) || 0;
    const discountAmount = invoice.discountType === "PERCENT"
        ? subtotal * (Number(invoice.discountValue) / 100)
        : Number(invoice.discountValue) || 0;
    const total = subtotal - discountAmount + Number(invoice.shippingAmount || 0) + Number(invoice.salesTaxAmount || 0);

    return (
        <div className="container mx-auto py-6 space-y-6 max-w-4xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" className="p-2" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">Invoice {invoice.invoiceNo}</h1>
                        <p className="text-muted-foreground">
                            Created on {format(new Date(invoice.createdAt), "MMMM dd, yyyy")}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 print:hidden">
                    <Badge variant={getStatusVariant(invoice.status) as any} className="text-sm px-3 py-1">
                        {invoice.status}
                    </Badge>
                    <Button variant="outline" size="sm" className="p-2" onClick={() => window.print()} title="Print Invoice">
                        <Printer className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="p-2" onClick={() => window.print()} title="Download as PDF">
                        <Download className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => router.push(`/invoices/${invoice.id}/edit`)} className="gap-2">
                        <Pencil className="h-4 w-4" />
                        Edit
                    </Button>
                </div>
            </div>

            {/* Print-only Header (only visible when printing) */}
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
                            <p className="font-medium">{format(new Date(invoice.invoiceDate), "MMM dd, yyyy")}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Due Date</p>
                            <p className="font-medium">
                                {invoice.dueDate ? format(new Date(invoice.dueDate), "MMM dd, yyyy") : "N/A"}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Terms</p>
                            <p className="font-medium">{invoice.terms || "N/A"}</p>
                        </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <p className="text-sm text-muted-foreground mb-2">Bill To</p>
                            <p className="font-medium">
                                {invoice.client?.businessName || `${invoice.client?.firstName} ${invoice.client?.lastName}`}
                            </p>
                            {invoice.client?.email && (
                                <p className="text-sm text-muted-foreground">{invoice.client.email}</p>
                            )}
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
                                {(() => {
                                    const rows: React.ReactNode[] = [];
                                    invoice.items?.forEach((item, index) => {
                                        const actualHours = Number(item.actualHours) || 0;
                                        const scheduledHours = Number(item.scheduledHours) || 0;
                                        const otHours = Math.max(0, actualHours - scheduledHours);
                                        const hasOT = otHours > 0;

                                        // Main Item (Base Shift)
                                        rows.push(
                                            <tr key={`item-${index}`} className="border-b last:border-0 align-top">
                                                <td className="py-3 px-2">
                                                    <div className="font-medium">{item.description}</div>
                                                    {item.scheduleShiftDetail && (
                                                        <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                                                            📅 {item.scheduleShiftDetail}
                                                        </div>
                                                    )}
                                                    {item.actualShiftDetails && (
                                                        <div className="text-[11px] text-muted-foreground leading-relaxed">
                                                            🕒 {item.actualShiftDetails}
                                                        </div>
                                                    )}
                                                    {item.internalNotes && (
                                                        <div className="text-[10px] italic text-slate-400 mt-1 pl-4 border-l-2 border-slate-100">
                                                            Note: {item.internalNotes}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3 px-2 text-right">
                                                    {hasOT ? scheduledHours.toFixed(2) : Number(item.quantity).toFixed(2)}
                                                </td>
                                                <td className="py-3 px-2 text-right">${Number(item.price).toFixed(2)}</td>
                                                <td className="py-3 px-2 text-right font-medium">
                                                    ${(hasOT ? (scheduledHours * Number(item.price)) : Number(item.amount)).toFixed(2)}
                                                </td>
                                            </tr>
                                        );

                                        // Add OT Row if applicable
                                        if (hasOT) {
                                            const otAmount = otHours * Number(item.price);
                                            rows.push(
                                                <tr key={`item-ot-${index}`} className="border-b last:border-0 bg-blue-50/10 animate-in fade-in slide-in-from-left-1 duration-500 align-top">
                                                    <td className="py-3 px-2 pl-6">
                                                        <div className="font-medium text-blue-700/80">
                                                            Overtime - {item.description}
                                                        </div>
                                                        <div className="text-[11px] text-blue-600/60 italic">
                                                            Extra {otHours.toFixed(2)} hours worked beyond scheduled shift
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-2 text-right text-blue-700/70">{otHours.toFixed(2)}</td>
                                                    <td className="py-3 px-2 text-right text-blue-700/70">${Number(item.price).toFixed(2)}</td>
                                                    <td className="py-3 px-2 text-right font-semibold text-blue-800">
                                                        ${otAmount.toFixed(2)}
                                                    </td>
                                                </tr>
                                            );
                                        }
                                    });
                                    return rows;
                                })()}
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
                                <span>Discount</span>
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
                            <span>${(total - Number(invoice.depositAmount || 0)).toFixed(2)}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Attachments */}
            {invoice.fileLinks && Array.isArray(invoice.fileLinks) && invoice.fileLinks.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Paperclip className="h-5 w-5" />
                            Attachments
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(invoice.fileLinks as Array<{ name: string; url: string; type?: string }>).map((file, index) => (
                                <a
                                    key={index}
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    {file.type?.startsWith('image/') ? (
                                        <Image className="h-8 w-8 text-blue-500" />
                                    ) : (
                                        <FileText className="h-8 w-8 text-red-500" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{file.name}</p>
                                        <p className="text-xs text-muted-foreground">Click to view</p>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

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
