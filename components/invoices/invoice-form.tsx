"use client";

import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/client/trpc";
import { InvoiceSchema, type InvoiceFormValues } from "@/lib/schemas/invoice.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { TrashIcon, PlusIcon } from "@/components/ui/icons";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/ui/file-upload";

interface InvoiceFormProps {
    invoice?: any; // Invoice data for editing
}

export function InvoiceForm({ invoice }: InvoiceFormProps) {
    const isEditMode = !!invoice;
    const router = useRouter();
    const { toast } = useToast();
    const [showDiscount, setShowDiscount] = useState(() =>
        invoice ? Number(invoice.discountValue) > 0 : false
    );
    const [showDeposit, setShowDeposit] = useState(() =>
        invoice ? Number(invoice.depositAmount) > 0 : false
    );
    const [showShipping, setShowShipping] = useState(() =>
        invoice ? Number(invoice.shippingAmount) > 0 : false
    );
    const [showTax, setShowTax] = useState(() =>
        invoice ? Number(invoice.salesTaxAmount) > 0 : false
    );

    // Fetch Clients
    const { data: clientsData } = trpc.clients.getAll.useQuery({ limit: 100 });
    const clients = clientsData?.data || [];

    // Fetch Products & Services
    const { data: productsData } = trpc.product.getAll.useQuery({});
    const { data: servicesData } = trpc.service.getAll.useQuery({});

    const products = productsData?.data || [];
    const services = servicesData?.data || [];

    const form = useForm<InvoiceFormValues>({
        resolver: zodResolver(InvoiceSchema.create),
        defaultValues: invoice ? {
            invoiceNo: invoice.invoiceNo || "",
            clientId: invoice.clientId || "",
            status: invoice.status || "DRAFT",
            invoiceDate: invoice.invoiceDate ? new Date(invoice.invoiceDate) : new Date(),
            dueDate: invoice.dueDate ? new Date(invoice.dueDate) : undefined,
            terms: invoice.terms || "",
            notes: invoice.notes || "",
            paymentDetails: invoice.paymentDetails || "",
            isTaxable: invoice.isTaxable || false,
            discountType: invoice.discountType || "AMOUNT",
            discountValue: Number(invoice.discountValue) || 0,
            depositAmount: Number(invoice.depositAmount) || 0,
            shippingAmount: Number(invoice.shippingAmount) || 0,
            salesTaxAmount: Number(invoice.salesTaxAmount) || 0,
            items: invoice.items?.map((item: any) => ({
                description: item.description || "",
                quantity: item.quantity || 1,
                price: Number(item.price) || 0,
                amount: Number(item.amount) || 0,
                productId: item.productId || null,
                serviceId: item.serviceId || null,
            })) || [{ description: "", quantity: 1, price: 0, amount: 0 }],
        } : {
            status: "DRAFT",
            invoiceDate: new Date(),
            isTaxable: false,
            items: [
                { description: "", quantity: 1, price: 0, amount: 0 }
            ],
            discountType: "AMOUNT",
            invoiceNo: "",
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "items",
    });

    const items = useWatch({ control: form.control, name: "items" });
    const discountType = useWatch({ control: form.control, name: "discountType" });
    const discountValue = useWatch({ control: form.control, name: "discountValue" }) || 0;
    const shippingAmount = useWatch({ control: form.control, name: "shippingAmount" }) || 0;
    const depositAmount = useWatch({ control: form.control, name: "depositAmount" }) || 0;
    const salesTaxAmount = useWatch({ control: form.control, name: "salesTaxAmount" }) || 0;

    // Clear values when toggled off
    useEffect(() => {
        if (!showDiscount) form.setValue("discountValue", 0);
    }, [showDiscount, form]);

    useEffect(() => {
        if (!showDeposit) form.setValue("depositAmount", 0);
    }, [showDeposit, form]);

    useEffect(() => {
        if (!showShipping) form.setValue("shippingAmount", 0);
    }, [showShipping, form]);

    useEffect(() => {
        if (!showTax) form.setValue("salesTaxAmount", 0);
    }, [showTax, form]);

    // Calculate Totals
    const subtotal = useMemo(() => {
        return items?.reduce((acc, item) => acc + (item.amount || 0), 0) || 0;
    }, [items]);

    const discountAmount = useMemo(() => {
        if (discountType === "PERCENT") {
            return subtotal * (discountValue / 100);
        }
        return discountValue;
    }, [subtotal, discountType, discountValue]);

    const total = useMemo(() => {
        return subtotal - discountAmount + shippingAmount + salesTaxAmount;
    }, [subtotal, discountAmount, shippingAmount, salesTaxAmount]);

    // Update item amount when price or quantity changes
    useEffect(() => {
        items?.forEach((item, index) => {
            const amount = (item.quantity || 0) * (item.price || 0);
            if (item.amount !== amount) {
                form.setValue(`items.${index}.amount`, amount);
            }
        });
    }, [JSON.stringify(items?.map(i => ({ q: i.quantity, p: i.price })))]);

    const createMutation = trpc.invoices.create.useMutation({
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Invoice created successfully.",
            });
            router.push("/invoices");
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "error",
            });
        },
    });

    const updateMutation = trpc.invoices.update.useMutation({
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Invoice updated successfully.",
            });
            router.push("/invoices");
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "error",
            });
        },
    });

    const onSubmit = (data: InvoiceFormValues) => {
        if (isEditMode && invoice?.id) {
            updateMutation.mutate({ id: invoice.id, ...data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleProductChange = (index: number, itemId: string) => {
        const product = products.find(p => p.id === itemId);
        const service = services.find(s => s.id === itemId);

        if (product) {
            form.setValue(`items.${index}.productId`, product.id);
            form.setValue(`items.${index}.serviceId`, null);
            form.setValue(`items.${index}.description`, product.title);
            form.setValue(`items.${index}.price`, Number(product.price) || 0);
        } else if (service) {
            form.setValue(`items.${index}.serviceId`, service.id);
            form.setValue(`items.${index}.productId`, null);
            form.setValue(`items.${index}.description`, service.title);
            form.setValue(`items.${index}.price`, Number(service.price) || 0);
        }
    };

    const onFormError = (errors: any) => {
        console.error("Form validation errors:", errors);
        toast({
            title: "Validation Error",
            description: "Please check all required fields.",
            variant: "error",
        });
    };

    return (
        <form onSubmit={form.handleSubmit(onSubmit, onFormError)} className="space-y-8 max-w-5xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">{isEditMode ? "Edit Invoice" : "Add New Invoice"}</h1>
                    <p className="text-muted-foreground">{isEditMode ? "Update invoice details." : "Create a new invoice for a client."}</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Invoice Header</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Client Name</Label>
                        <Select
                            onValueChange={(val) => form.setValue("clientId", val)}
                            value={form.watch("clientId")}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Add new or select" />
                            </SelectTrigger>
                            <SelectContent>
                                {clients.map((client) => (
                                    <SelectItem key={client.id} value={client.id}>
                                        {client.businessName || `${client.firstName} ${client.lastName}`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {form.formState.errors.clientId && (
                            <p className="text-sm text-destructive">{form.formState.errors.clientId.message}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label>Invoice No</Label>
                            <Input {...form.register("invoiceNo")} placeholder="INV-001" />
                            {form.formState.errors.invoiceNo && (
                                <p className="text-sm text-destructive">{form.formState.errors.invoiceNo.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Terms</Label>
                            <Select
                                onValueChange={(val) => form.setValue("terms", val)}
                                value={form.watch("terms") || ""}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                                    <SelectItem value="Net 15">Net 15</SelectItem>
                                    <SelectItem value="Net 30">Net 30</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Invoice Date</Label>
                            <Input
                                type="date"
                                value={form.watch("invoiceDate") ? new Date(form.watch("invoiceDate")).toISOString().split('T')[0] : ''}
                                onChange={(e) => form.setValue("invoiceDate", e.target.valueAsDate as Date)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Due Date</Label>
                            <Input
                                type="date"
                                value={form.watch("dueDate") ? new Date(form.watch("dueDate")!).toISOString().split('T')[0] : ''}
                                onChange={(e) => form.setValue("dueDate", e.target.valueAsDate as Date)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Custom Field 1</Label>
                            <Input {...form.register("customField1")} />
                        </div>
                        <div className="space-y-2">
                            <Label>Custom Field 2</Label>
                            <Input {...form.register("customField2")} />
                        </div>
                        <div className="space-y-2">
                            <Label>Custom Field 3</Label>
                            <Input {...form.register("customField3")} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Invoice Body</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {fields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-12 gap-4 items-end border-b pb-4 last:border-0 last:pb-0">
                            <div className="col-span-12 md:col-span-3 space-y-2">
                                <Label>Product / Service</Label>
                                <Select onValueChange={(val) => handleProductChange(index, val)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select from Catalog" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {products.length > 0 && (
                                            <>
                                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Products</div>
                                                {products.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                                                ))}
                                            </>
                                        )}
                                        {services.length > 0 && (
                                            <>
                                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Services</div>
                                                {services.map(s => (
                                                    <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                                                ))}
                                            </>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-12 md:col-span-3 space-y-2">
                                <Label>Description</Label>
                                <Input {...form.register(`items.${index}.description`)} />
                            </div>
                            <div className="col-span-4 md:col-span-2 space-y-2">
                                <Label>Qty</Label>
                                <Input
                                    type="number"
                                    {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                                />
                            </div>
                            <div className="col-span-4 md:col-span-2 space-y-2">
                                <Label>Price</Label>
                                <Input
                                    type="number"
                                    {...form.register(`items.${index}.price`, { valueAsNumber: true })}
                                />
                            </div>
                            <div className="col-span-3 md:col-span-1 space-y-2">
                                <Label>Amount</Label>
                                <Input
                                    readOnly
                                    disabled
                                    value={form.watch(`items.${index}.amount`)?.toFixed(2)}
                                />
                            </div>
                            <div className="col-span-1 flex justify-end pb-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => remove(index)}
                                >
                                    <TrashIcon className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        </div>
                    ))}

                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => append({ description: "", quantity: 1, price: 0, amount: 0 })}
                        className="mt-2"
                    >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add Line Item
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Invoice Total</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                    {/* Discount */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                        <div className="space-y-2">
                            <Label className="font-semibold">Discount?</Label>
                            <RadioGroup
                                className="flex gap-4"
                                value={showDiscount ? "yes" : "no"}
                                onValueChange={(v) => setShowDiscount(v === "yes")}
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="yes" id="discount-yes" />
                                    <Label htmlFor="discount-yes">Yes</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="no" id="discount-no" />
                                    <Label htmlFor="discount-no">No</Label>
                                </div>
                            </RadioGroup>
                        </div>
                        {showDiscount && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>If Yes, Discount Value</Label>
                                    <Input
                                        type="number"
                                        {...form.register("discountValue", { valueAsNumber: true })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Type</Label>
                                    <Select
                                        onValueChange={(val) => form.setValue("discountType", val as "AMOUNT" | "PERCENT")}
                                        value={discountType || "AMOUNT"}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="AMOUNT">Amount</SelectItem>
                                            <SelectItem value="PERCENT">Percent</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Deposit */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                        <div className="space-y-2">
                            <Label className="font-semibold">Deposit Received?</Label>
                            <RadioGroup
                                className="flex gap-4"
                                value={showDeposit ? "yes" : "no"}
                                onValueChange={(v) => setShowDeposit(v === "yes")}
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="yes" id="deposit-yes" />
                                    <Label htmlFor="deposit-yes">Yes</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="no" id="deposit-no" />
                                    <Label htmlFor="deposit-no">No</Label>
                                </div>
                            </RadioGroup>
                        </div>
                        {showDeposit && (
                            <div className="space-y-2">
                                <Label>Deposit Amount</Label>
                                <Input
                                    type="number"
                                    {...form.register("depositAmount", { valueAsNumber: true })}
                                />
                            </div>
                        )}
                    </div>

                    {/* Shipping */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                        <div className="space-y-2">
                            <Label className="font-semibold">Shipping?</Label>
                            <RadioGroup
                                className="flex gap-4"
                                value={showShipping ? "yes" : "no"}
                                onValueChange={(v) => setShowShipping(v === "yes")}
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="yes" id="shipping-yes" />
                                    <Label htmlFor="shipping-yes">Yes</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="no" id="shipping-no" />
                                    <Label htmlFor="shipping-no">No</Label>
                                </div>
                            </RadioGroup>
                        </div>
                        {showShipping && (
                            <div className="space-y-2">
                                <Label>Shipping charges</Label>
                                <Input
                                    type="number"
                                    {...form.register("shippingAmount", { valueAsNumber: true })}
                                />
                            </div>
                        )}
                    </div>

                    {/* Sales Tax */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                        <div className="space-y-2">
                            <Label className="font-semibold">Sales Tax?</Label>
                            <RadioGroup
                                className="flex gap-4"
                                value={showTax ? "yes" : "no"}
                                onValueChange={(v) => setShowTax(v === "yes")}
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="yes" id="tax-yes" />
                                    <Label htmlFor="tax-yes">Yes</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="no" id="tax-no" />
                                    <Label htmlFor="tax-no">No</Label>
                                </div>
                            </RadioGroup>
                        </div>
                        {showTax && (
                            <div className="space-y-2">
                                <Label>Sales Tax Amount</Label>
                                <Input
                                    type="number"
                                    {...form.register("salesTaxAmount", { valueAsNumber: true })}
                                />
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Invoice Footer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <Label className="font-semibold">Payment Details</Label>
                            <Textarea
                                {...form.register("paymentDetails")}
                                placeholder="Bank Account Details, etc."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="font-semibold">Note to clients</Label>
                            <Textarea
                                {...form.register("notes")}
                                placeholder="Thank you for your business..."
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="font-semibold">Attachments</Label>
                        <FileUpload
                            onFilesChange={(files) => console.log(files)}
                            accept={{ 'image/*': [], 'application/pdf': [] }}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Total Footer Summary */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-4 max-w-sm ml-auto">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>{subtotal.toFixed(2)}</span>
                        </div>
                        {discountAmount > 0 && (
                            <div className="flex justify-between text-destructive">
                                <span>Discount</span>
                                <span>-{discountAmount.toFixed(2)}</span>
                            </div>
                        )}
                        {shippingAmount > 0 && (
                            <div className="flex justify-between">
                                <span>Shipping</span>
                                <span>{shippingAmount.toFixed(2)}</span>
                            </div>
                        )}
                        {salesTaxAmount > 0 && (
                            <div className="flex justify-between">
                                <span>Sales Tax</span>
                                <span>{salesTaxAmount.toFixed(2)}</span>
                            </div>
                        )}
                        {depositAmount > 0 && (
                            <div className="flex justify-between font-medium text-blue-600">
                                <span>Deposit</span>
                                <span>-{depositAmount.toFixed(2)}</span>
                            </div>
                        )}
                        <Separator />
                        <div className="flex justify-between font-bold text-lg">
                            <span>Total Due</span>
                            {/* Total Due typically subtracts deposit */}
                            <span>{(total - depositAmount).toFixed(2)}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4 pb-10">
                <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : isEditMode ? "Update Invoice" : "Save Invoice"}
                </Button>
            </div>
        </form>
    );
}
