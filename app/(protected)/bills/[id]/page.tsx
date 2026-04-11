"use client";

import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/client/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ArrowLeft, Pencil, Printer, Download, Paperclip, FileText, Image } from "lucide-react";
import Link from "next/link";
import React from "react";

export default function ViewBillPage() {
    const params = useParams();
    const router = useRouter();
    const billId = params.id as string;

    const { data: bill, isLoading } = trpc.bills.getById.useQuery({ id: billId });

    if (isLoading) {
        return (
            <div className="container mx-auto py-6">
                <div className="flex items-center justify-center h-64">
                    <p className="text-muted-foreground">Loading bill...</p>
                </div>
            </div>
        );
    }

    if (!bill) {
        return (
            <div className="container mx-auto py-6">
                <div className="flex items-center justify-center h-64">
                    <p className="text-muted-foreground">Bill not found</p>
                </div>
            </div>
        );
    }

    const getStatusVariant = (status: string) => {
        switch (status) {
            case "PAID": return "success";
            case "APPROVED": return "info";
            case "PENDING": return "warning";
            case "DRAFT": return "secondary";
            case "VOID": return "secondary";
            case "CANCELLED": return "danger";
            default: return "default";
        }
    };

    const subtotal = bill.items?.reduce((acc, item) => acc + Number(item.amount), 0) || 0;
    const discountAmount = bill.discountType === "PERCENT"
        ? subtotal * (Number(bill.discountValue) / 100)
        : Number(bill.discountValue) || 0;
    const total = subtotal - discountAmount + Number(bill.shippingAmount || 0) + Number(bill.salesTaxAmount || 0);

    return (
        <div className="container mx-auto py-6 space-y-6 max-w-4xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" className="p-2" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">Bill {bill.billNo}</h1>
                        <p className="text-muted-foreground">
                            Created on {format(new Date(bill.createdAt), "MMMM dd, yyyy")}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 print:hidden">
                    <Badge variant={getStatusVariant(bill.status) as any} className="text-sm px-3 py-1">
                        {bill.status}
                    </Badge>
                    <Button variant="outline" size="sm" className="p-2" onClick={() => window.print()} title="Print Bill">
                        <Printer className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="p-2" onClick={() => window.print()} title="Download as PDF">
                        <Download className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => router.push(`/bills/${bill.id}/edit`)} className="gap-2">
                        <Pencil className="h-4 w-4" />
                        Edit
                    </Button>
                </div>
            </div>

            {/* Print-only Header */}
            <div className="hidden print:block mb-8">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-4xl font-bold text-foreground">BILL</h1>
                        <p className="text-muted-foreground mt-2">#{bill.billNo}</p>
                    </div>
                </div>
            </div>

            {/* Bill Details Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Bill Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div>
                            <p className="text-sm text-muted-foreground">Bill Number</p>
                            <p className="font-medium">{bill.billNo}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Bill Date</p>
                            <p className="font-medium">{format(new Date(bill.billDate), "MMM dd, yyyy")}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Due Date</p>
                            <p className="font-medium">
                                {bill.dueDate ? format(new Date(bill.dueDate), "MMM dd, yyyy") : "N/A"}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Terms</p>
                            <p className="font-medium">{bill.terms || "N/A"}</p>
                        </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <p className="text-sm text-muted-foreground mb-2">Talent Member</p>
                            <p className="font-medium">
                                {bill.staff?.firstName} {bill.staff?.lastName}
                            </p>
                            {bill.staff?.email && (
                                <p className="text-sm text-muted-foreground">{bill.staff.email}</p>
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
                                    bill.items?.forEach((item, index) => {
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
                                                <tr key={`item-ot-${index}`} className="border-b last:border-0 bg-blue-50/10 align-top text-blue-700">
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
                        {Number(bill.shippingAmount) > 0 && (
                            <div className="flex justify-between">
                                <span>Shipping</span>
                                <span>${Number(bill.shippingAmount).toFixed(2)}</span>
                            </div>
                        )}
                        {Number(bill.salesTaxAmount) > 0 && (
                            <div className="flex justify-between">
                                <span>Sales Tax</span>
                                <span>${Number(bill.salesTaxAmount).toFixed(2)}</span>
                            </div>
                        )}
                        <Separator />
                        <div className="flex justify-between font-bold text-lg">
                            <span>Total Due</span>
                            <span>${total.toFixed(2)}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Notes & Payment Details */}
            {(bill.notes || bill.paymentDetails) && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {bill.paymentDetails && (
                                <div>
                                    <p className="text-sm font-medium mb-2">Payment Details</p>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{bill.paymentDetails}</p>
                                </div>
                            )}
                            {bill.notes && (
                                <div>
                                    <p className="text-sm font-medium mb-2">Internal Notes</p>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{bill.notes}</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
