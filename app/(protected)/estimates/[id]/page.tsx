"use client";

import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/client/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ArrowLeft, Pencil, Printer, Download, Paperclip, FileText, Image } from "lucide-react";

export default function ViewEstimatePage() {
    const params = useParams();
    const router = useRouter();
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

    const getStatusVariant = (status: string) => {
        switch (status) {
            case "APPROVED": return "success";
            case "SENT": return "info";
            case "DECLINED": return "danger";
            case "DRAFT": return "secondary";
            case "EXPIRED": return "warning";
            case "CONVERTED": return "default";
            default: return "default";
        }
    };

    const subtotal = estimate.items?.reduce((acc, item) => acc + Number(item.amount), 0) || 0;
    const discountAmount = estimate.discountType === "PERCENT"
        ? subtotal * (Number(estimate.discountValue) / 100)
        : Number(estimate.discountValue) || 0;
    const total = subtotal - discountAmount + Number(estimate.shippingAmount || 0) + Number(estimate.salesTaxAmount || 0);

    return (
        <div className="container mx-auto py-6 space-y-6 max-w-4xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">Estimate {estimate.estimateNo}</h1>
                        <p className="text-muted-foreground">
                            Created on {format(new Date(estimate.createdAt), "MMMM dd, yyyy")}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 print:hidden">
                    <Badge variant={getStatusVariant(estimate.status) as any} className="text-sm px-3 py-1">
                        {estimate.status}
                    </Badge>
                    <Button variant="outline" size="icon" onClick={() => window.print()} title="Print Estimate">
                        <Printer className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => window.print()} title="Download as PDF">
                        <Download className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => router.push(`/estimates/${estimate.id}/edit`)} className="gap-2">
                        <Pencil className="h-4 w-4" />
                        Edit
                    </Button>
                </div>
            </div>

            {/* Print-only Header (only visible when printing) */}
            <div className="hidden print:block mb-8">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-4xl font-bold text-foreground">ESTIMATE</h1>
                        <p className="text-muted-foreground mt-2">#{estimate.estimateNo}</p>
                    </div>
                </div>
            </div>

            {/* Estimate Details Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Estimate Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div>
                            <p className="text-sm text-muted-foreground">Estimate Number</p>
                            <p className="font-medium">{estimate.estimateNo}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Estimate Date</p>
                            <p className="font-medium">{format(new Date(estimate.estimateDate), "MMM dd, yyyy")}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Expiration Date</p>
                            <p className="font-medium">
                                {estimate.expirationDate ? format(new Date(estimate.expirationDate), "MMM dd, yyyy") : "N/A"}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Status</p>
                            <p className="font-medium">{estimate.status}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div>
                            <p className="text-sm text-muted-foreground">Approved By</p>
                            <p className="font-medium">{estimate.approvedBy || "N/A"}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Approved Date</p>
                            <p className="font-medium">
                                {estimate.approvedDate ? format(new Date(estimate.approvedDate), "MMM dd, yyyy") : "N/A"}
                            </p>
                        </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <p className="text-sm text-muted-foreground mb-2">Estimate To</p>
                            <p className="font-medium">
                                {estimate.client?.businessName || `${estimate.client?.firstName} ${estimate.client?.lastName}`}
                            </p>
                            {estimate.client?.email && (
                                <p className="text-sm text-muted-foreground">{estimate.client.email}</p>
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
                                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Date</th>
                                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Description</th>
                                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Qty</th>
                                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Price</th>
                                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {estimate.items?.map((item, index) => (
                                    <tr key={index} className="border-b last:border-0">
                                        <td className="py-3 px-2">
                                            {item.date ? format(new Date(item.date), "MMM dd, yyyy") : "-"}
                                        </td>
                                        <td className="py-3 px-2">{item.description}</td>
                                        <td className="py-3 px-2 text-right">{item.quantity}</td>
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
                                <span>Discount</span>
                                <span>-${discountAmount.toFixed(2)}</span>
                            </div>
                        )}
                        {Number(estimate.shippingAmount) > 0 && (
                            <div className="flex justify-between">
                                <span>Shipping</span>
                                <span>${Number(estimate.shippingAmount).toFixed(2)}</span>
                            </div>
                        )}
                        {Number(estimate.salesTaxAmount) > 0 && (
                            <div className="flex justify-between">
                                <span>Sales Tax</span>
                                <span>${Number(estimate.salesTaxAmount).toFixed(2)}</span>
                            </div>
                        )}
                        {Number(estimate.depositAmount) > 0 && (
                            <div className="flex justify-between text-blue-600">
                                <span>Deposit</span>
                                <span>-${Number(estimate.depositAmount).toFixed(2)}</span>
                            </div>
                        )}
                        <Separator />
                        <div className="flex justify-between font-bold text-lg">
                            <span>Total Due</span>
                            <span>${(total - Number(estimate.depositAmount || 0)).toFixed(2)}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Attachments */}
            {estimate.fileLinks && Array.isArray(estimate.fileLinks) && estimate.fileLinks.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Paperclip className="h-5 w-5" />
                            Attachments
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(estimate.fileLinks as Array<{ name: string; url: string; type?: string }>).map((file, index) => (
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

            {/* Notes & Detail Footer */}
            {(estimate.notes || estimate.paymentDetails) && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {estimate.paymentDetails && (
                                <div>
                                    <p className="text-sm font-medium mb-2">Payment Details</p>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{estimate.paymentDetails}</p>
                                </div>
                            )}
                            {estimate.notes && (
                                <div>
                                    <p className="text-sm font-medium mb-2">Notes</p>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{estimate.notes}</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
