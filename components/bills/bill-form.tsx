"use client";

import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { format, isValid } from "date-fns";
import { trpc } from "@/lib/client/trpc";
import { BillSchema, type BillFormValues } from "@/lib/schemas/bill.schema";
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

interface BillFormProps {
    bill?: any; // Bill data for editing
}

export function BillForm({ bill }: BillFormProps) {
    const isEditMode = !!bill;
    const router = useRouter();
    const { toast } = useToast();
    const [showDiscount, setShowDiscount] = useState(() =>
        bill ? Number(bill.discountValue) > 0 : false
    );
    const [showDeposit, setShowDeposit] = useState(() =>
        bill ? Number(bill.depositAmount) > 0 : false
    );
    const [showShipping, setShowShipping] = useState(() =>
        bill ? Number(bill.shippingAmount) > 0 : false
    );
    const [showTax, setShowTax] = useState(() =>
        bill ? Number(bill.salesTaxAmount) > 0 : false
    );

    // Fetch Talent (Vendors)
    const { data: staffData } = trpc.staff.getAll.useQuery({ limit: 100 });
    const staffMembers = staffData?.data || [];

    // Fetch Products & Services
    const { data: productsData } = trpc.product.getAll.useQuery({});
    const { data: servicesData } = trpc.service.getAll.useQuery({});

    const products = productsData?.data || [];
    const services = servicesData?.data || [];

    const form = useForm<BillFormValues>({
        resolver: zodResolver(BillSchema.create) as any,
        defaultValues: bill ? {
            billNo: bill.billNo || "",
            staffId: bill.staffId || "",
            status: bill.status || "DRAFT",
            billDate: bill.billDate ? new Date(bill.billDate) : new Date(),
            dueDate: bill.dueDate ? new Date(bill.dueDate) : undefined,
            terms: bill.terms || "",
            notes: bill.notes || "",
            paymentDetails: bill.paymentDetails || "",
            isTaxable: bill.isTaxable || false,
            discountType: bill.discountType || "AMOUNT",
            discountValue: Number(bill.discountValue) || 0,
            depositAmount: Number(bill.depositAmount) || 0,
            shippingAmount: Number(bill.shippingAmount) || 0,
            salesTaxAmount: Number(bill.salesTaxAmount) || 0,
            items: bill.items?.map((item: any) => ({
                description: item.description || "",
                quantity: Number(item.quantity) || 1,
                price: Number(item.price) || 0,
                amount: Number(item.amount) || 0,
                productId: item.productId || null,
                serviceId: item.serviceId || null,
                date: item.date ? new Date(item.date) : null,
                scheduledStart: item.scheduledStart ? new Date(item.scheduledStart) : null,
                scheduledEnd: item.scheduledEnd ? new Date(item.scheduledEnd) : null,
                scheduledHours: Number(item.scheduledHours) || 0,
                actualStart: item.actualStart ? new Date(item.actualStart) : null,
                actualEnd: item.actualEnd ? new Date(item.actualEnd) : null,
                actualHours: Number(item.actualHours) || 0,
                scheduleShiftDetail: item.scheduleShiftDetail || "",
                actualShiftDetails: item.actualShiftDetails || "",
                internalNotes: item.internalNotes || "",
            })) || [{ 
                description: "", quantity: 1, price: 0, amount: 0, date: null, 
                scheduledStart: null, scheduledEnd: null, scheduledHours: 0,
                actualStart: null, actualEnd: null, actualHours: 0,
                scheduleShiftDetail: "", actualShiftDetails: "", internalNotes: "" 
            }],

        } : {
            status: "DRAFT",
            billDate: new Date(),
            isTaxable: false,
            items: [
                { 
                    description: "", quantity: 1, price: 0, amount: 0, date: null,
                    scheduledStart: null, scheduledEnd: null, scheduledHours: 0,
                    actualStart: null, actualEnd: null, actualHours: 0,
                    scheduleShiftDetail: "", actualShiftDetails: "", internalNotes: "" 
                }
            ],

            discountType: "AMOUNT",
            billNo: "",
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

    // Update scheduled hours when start or end changes
    useEffect(() => {
        items?.forEach((item, index) => {
            if (item.scheduledStart && item.scheduledEnd) {
                const start = new Date(item.scheduledStart);
                const end = new Date(item.scheduledEnd);
                if (isValid(start) && isValid(end) && end > start) {
                    const diffMs = end.getTime() - start.getTime();
                    const hours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
                    if (Number(item.scheduledHours) !== hours) {
                        form.setValue(`items.${index}.scheduledHours`, hours);
                    }
                }
            }
        });
    }, [JSON.stringify(items?.map(i => ({ s: i.scheduledStart, e: i.scheduledEnd })))]);

    const createMutation = trpc.bills.create.useMutation({
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Bill created successfully.",
            });
            router.push("/bills");
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "error",
            });
        },
    });

    const updateMutation = trpc.bills.update.useMutation({
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Bill updated successfully.",
            });
            router.push("/bills");
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "error",
            });
        },
    });

    const onSubmit = (data: BillFormValues) => {
        if (isEditMode && bill?.id) {
            updateMutation.mutate({ id: bill.id, ...data });
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
            
            form.setValue(`items.${index}.date`, null);
        } else if (service) {
            form.setValue(`items.${index}.serviceId`, service.id);
            form.setValue(`items.${index}.productId`, null);
            form.setValue(`items.${index}.description`, service.description || service.title);
            form.setValue(`items.${index}.price`, Number(service.price) || 0);

            form.setValue(`items.${index}.date`, service.createdAt ? new Date(service.createdAt) : new Date());
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
                    <h1 className="text-3xl font-bold">{isEditMode ? "Edit Bill" : "Add New Bill"}</h1>
                    <p className="text-muted-foreground">{isEditMode ? "Update bill details." : "Create a new bill for a talent member."}</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Bill Header</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Talent Name</Label>
                        <Select
                            onValueChange={(val) => form.setValue("staffId", val)}
                            value={form.watch("staffId")}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Talent Member" />
                            </SelectTrigger>
                            <SelectContent>
                                {staffMembers.map((staff) => (
                                    <SelectItem key={staff.id} value={staff.id}>
                                        {staff.firstName} {staff.lastName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {form.formState.errors.staffId && (
                            <p className="text-sm text-destructive">{form.formState.errors.staffId.message}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label>Bill No</Label>
                            <Input {...form.register("billNo")} placeholder="BILL-001" />
                            {form.formState.errors.billNo && (
                                <p className="text-sm text-destructive">{form.formState.errors.billNo.message}</p>
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
                            <Label>Bill Date</Label>
                            <Input
                                type="date"
                                value={form.watch("billDate") ? new Date(form.watch("billDate")).toISOString().split('T')[0] : ''}
                                onChange={(e) => form.setValue("billDate", e.target.valueAsDate as Date)}
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
                            <Label>Status</Label>
                            <Select
                                onValueChange={(val) => form.setValue("status", val as any)}
                                value={form.watch("status")}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DRAFT">Draft</SelectItem>
                                    <SelectItem value="PENDING">Pending</SelectItem>
                                    <SelectItem value="APPROVED">Approved</SelectItem>
                                    <SelectItem value="PAID">Paid</SelectItem>
                                    <SelectItem value="VOID">Void</SelectItem>
                                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Bill Body</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {fields.map((field, index) => {
                        const isService = !!form.watch(`items.${index}.serviceId`);
                        return (
                            <div key={field.id} className="border-b pb-6 last:border-0 last:pb-0 space-y-4">
                                <div className="grid grid-cols-12 gap-4 items-start">
                                    <div className="col-span-12 md:col-span-3 space-y-2">
                                        <Label>Product / Service</Label>
                                        <Select 
                                            onValueChange={(val) => handleProductChange(index, val)}
                                            value={form.watch(`items.${index}.serviceId`) || form.watch(`items.${index}.productId`) || undefined}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Catalog Item" />
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

                                    <div className={`col-span-12 ${isService ? 'md:col-span-8' : 'md:col-span-5'} space-y-2`}>
                                        <Label>Description</Label>
                                        <Input {...form.register(`items.${index}.description`)} />
                                    </div>

                                    {!isService && (
                                        <>
                                            <div className="col-span-4 md:col-span-1 space-y-2">
                                                <Label>Qty</Label>
                                                <Input
                                                    type="number"
                                                    {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                                                />
                                            </div>
                                            <div className="col-span-4 md:col-span-1 space-y-2">
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
                                                    className="bg-muted"
                                                    value={form.watch(`items.${index}.amount`)?.toFixed(2)}
                                                />
                                            </div>
                                        </>
                                    )}

                                    <div className="col-span-1 flex justify-end pt-8">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-9 w-9 p-0 hover:bg-destructive/10 hover:text-destructive"
                                            onClick={() => remove(index)}
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                
                                {isService && (
                                    <div className="bg-muted/30 p-4 rounded-lg border border-dashed border-border space-y-4">
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Qty</Label>
                                                <Input
                                                    type="number"
                                                    {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Price</Label>
                                                <Input
                                                    type="number"
                                                    {...form.register(`items.${index}.price`, { valueAsNumber: true })}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-end">
                                            <div className="space-y-2 w-32">
                                                <Label>Amount</Label>
                                                <Input
                                                    readOnly
                                                    disabled
                                                    className="bg-muted font-bold"
                                                    value={form.watch(`items.${index}.amount`)?.toFixed(2)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => append({ 
                            description: "", 
                            quantity: 1, 
                            price: 0, 
                            amount: 0, 
                            date: null, 
                            scheduledStart: null,
                            scheduledEnd: null,
                            scheduledHours: 0,
                            actualStart: null,
                            actualEnd: null,
                            actualHours: 0,
                            scheduleShiftDetail: "", 
                            actualShiftDetails: "", 
                            internalNotes: "" 
                        })}
                        className="mt-2"
                    >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add Line Item
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Bill Total</CardTitle>
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
                                    <Label>Discount Value</Label>
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
                    <CardTitle>Bill Footer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <Label className="font-semibold">Payment Details</Label>
                            <Textarea
                                {...form.register("paymentDetails")}
                                placeholder="Bank transfer info, etc."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="font-semibold">Internal Notes</Label>
                            <Textarea
                                {...form.register("notes")}
                                placeholder="Internal notes for this bill..."
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-6">
                    <div className="space-y-4 max-w-sm ml-auto">
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
                        {salesTaxAmount > 0 && (
                            <div className="flex justify-between">
                                <span>Sales Tax</span>
                                <span>${salesTaxAmount.toFixed(2)}</span>
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

            <div className="flex justify-end gap-4 pb-10">
                <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : isEditMode ? "Update Bill" : "Save Bill"}
                </Button>
            </div>
        </form>
    );
}
