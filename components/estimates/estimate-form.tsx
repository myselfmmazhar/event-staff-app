"use client";

import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/client/trpc";
import { EstimateSchema, type EstimateFormValues } from "@/lib/schemas/estimate.schema";
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

interface EstimateFormProps {
    estimate?: any; // Estimate data for editing
}

export function EstimateForm({ estimate }: EstimateFormProps) {
    const isEditMode = !!estimate;
    const router = useRouter();
    const { toast } = useToast();
    const [showDiscount, setShowDiscount] = useState(() =>
        estimate ? Number(estimate.discountValue) > 0 : false
    );
    const [showDeposit, setShowDeposit] = useState(() =>
        estimate ? Number(estimate.depositAmount) > 0 : false
    );
    const [showShipping, setShowShipping] = useState(() =>
        estimate ? Number(estimate.shippingAmount) > 0 : false
    );
    const [showTax, setShowTax] = useState(() =>
        estimate ? Number(estimate.salesTaxAmount) > 0 : false
    );
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Fetch Clients
    const { data: clientsData } = trpc.clients.getAll.useQuery({ limit: 100 });
    const clients = clientsData?.data || [];

    // Fetch Products & Services
    const { data: productsData } = trpc.product.getAll.useQuery({});
    const { data: servicesData } = trpc.service.getAll.useQuery({});

    const products = productsData?.data || [];
    const services = servicesData?.data || [];

    const form = useForm<EstimateFormValues>({
        resolver: zodResolver(EstimateSchema.create) as any,
        defaultValues: estimate ? {
            estimateNo: estimate.estimateNo || "",
            clientId: estimate.clientId || "",
            status: estimate.status || "DRAFT",
            estimateDate: estimate.estimateDate ? new Date(estimate.estimateDate) : new Date(),
            expirationDate: estimate.expirationDate ? new Date(estimate.expirationDate) : undefined,
            approvedBy: estimate.approvedBy || "",
            approvedDate: estimate.approvedDate ? new Date(estimate.approvedDate) : undefined,
            terms: estimate.terms || "",
            notes: estimate.notes || "",
            paymentDetails: estimate.paymentDetails || "",
            customField1: estimate.customField1 || "",
            customField2: estimate.customField2 || "",
            customField3: estimate.customField3 || "",
            isTaxable: estimate.isTaxable || false,
            discountType: estimate.discountType || "AMOUNT",
            discountValue: Number(estimate.discountValue) || 0,
            depositAmount: Number(estimate.depositAmount) || 0,
            shippingAmount: Number(estimate.shippingAmount) || 0,
            salesTaxAmount: Number(estimate.salesTaxAmount) || 0,
            items: estimate.items?.map((item: any) => ({
                description: item.description || "",
                quantity: Number(item.quantity) || 1,
                price: Number(item.price) || 0,
                amount: Number(item.amount) || 0,
                productId: item.productId || null,
                serviceId: item.serviceId || null,
                date: item.date ? new Date(item.date) : null,
            })) || [{ description: "", quantity: 1, price: 0, amount: 0, date: null }],
        } : {
            status: "DRAFT",
            estimateDate: new Date(),
            isTaxable: false,
            items: [
                { description: "", quantity: 1, price: 0, amount: 0, date: null }
            ],
            discountType: "AMOUNT",
            estimateNo: "",
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
        if (!isMounted) return;
        if (!showDiscount && form.getValues("discountValue") !== 0) {
            form.setValue("discountValue", 0);
        }
    }, [showDiscount, form, isMounted]);

    useEffect(() => {
        if (!isMounted) return;
        if (!showDeposit && form.getValues("depositAmount") !== 0) {
            form.setValue("depositAmount", 0);
        }
    }, [showDeposit, form, isMounted]);

    useEffect(() => {
        if (!isMounted) return;
        if (!showShipping && form.getValues("shippingAmount") !== 0) {
            form.setValue("shippingAmount", 0);
        }
    }, [showShipping, form, isMounted]);

    useEffect(() => {
        if (!isMounted) return;
        if (!showTax && form.getValues("salesTaxAmount") !== 0) {
            form.setValue("salesTaxAmount", 0);
        }
    }, [showTax, form, isMounted]);

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
        if (!isMounted) return;
        items?.forEach((item, index) => {
            const quantity = Number(item.quantity) || 0;
            const price = Number(item.price) || 0;
            const amount = quantity * price;
            const currentAmount = Number(item.amount) || 0;

            if (Math.abs(currentAmount - amount) > 0.001) {
                form.setValue(`items.${index}.amount`, amount);
            }
        });
    }, [JSON.stringify(items?.map(i => ({ q: i.quantity, p: i.price }))), form, isMounted]);

    const createMutation = trpc.estimates.create.useMutation({
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Estimate created successfully.",
            });
            router.push("/estimates");
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const updateMutation = trpc.estimates.update.useMutation({
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Estimate updated successfully.",
            });
            router.push("/estimates");
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const onSubmit = (data: EstimateFormValues) => {
        if (isEditMode && estimate?.id) {
            updateMutation.mutate({ id: estimate.id, ...data });
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
            variant: "destructive",
        });
    };

    return (
        <form onSubmit={form.handleSubmit(onSubmit, onFormError)} className="space-y-8 max-w-5xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">{isEditMode ? "Edit Estimate" : "Add New Estimate"}</h1>
                    <p className="text-muted-foreground">{isEditMode ? "Update estimate details." : "Create a new estimate for a client."}</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Estimate Header</CardTitle>
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Estimate No</Label>
                            <Input {...form.register("estimateNo")} placeholder="EST-001" />
                            {form.formState.errors.estimateNo && (
                                <p className="text-sm text-destructive">{form.formState.errors.estimateNo.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Estimate Date</Label>
                            <Input
                                type="date"
                                value={form.watch("estimateDate") ? new Date(form.watch("estimateDate")).toISOString().split('T')[0] : ''}
                                onChange={(e) => form.setValue("estimateDate", e.target.valueAsDate as Date)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Estimate Expiration</Label>
                            <Input
                                type="date"
                                value={form.watch("expirationDate") ? new Date(form.watch("expirationDate")!).toISOString().split('T')[0] : ''}
                                onChange={(e) => form.setValue("expirationDate", e.target.valueAsDate as Date)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Approved by</Label>
                            <Input {...form.register("approvedBy")} />
                        </div>
                        <div className="space-y-2">
                            <Label>Approved Date</Label>
                            <Input
                                type="date"
                                value={form.watch("approvedDate") ? new Date(form.watch("approvedDate")!).toISOString().split('T')[0] : ''}
                                onChange={(e) => form.setValue("approvedDate", e.target.valueAsDate as Date)}
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
                    <CardTitle>Estimate Body</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {fields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-12 gap-4 items-end border-b pb-4 last:border-0 last:pb-0">
                            <div className="col-span-12 md:col-span-2 space-y-2">
                                <Label>Date</Label>
                                <Input
                                    type="date"
                                    value={form.watch(`items.${index}.date`) ? new Date(form.watch(`items.${index}.date`)!).toISOString().split('T')[0] : ''}
                                    onChange={(e) => form.setValue(`items.${index}.date`, e.target.valueAsDate as Date)}
                                />
                            </div>
                            <div className="col-span-12 md:col-span-2 space-y-2">
                                <Label>Product / Service</Label>
                                <Select onValueChange={(val) => handleProductChange(index, val)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Add new or select from Catalog" />
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
                            <div className="col-span-3 md:col-span-2 space-y-2">
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
                                    size="sm"
                                    onClick={() => remove(index)}
                                >
                                    <TrashIcon className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        </div>
                    ))}

                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => append({ description: "", quantity: 1, price: 0, amount: 0, date: null })}
                        >
                            <PlusIcon className="h-4 w-4 mr-2" />
                            Save and new line item
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Estimate Total</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                    {/* Discount */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
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
                            <>
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
                            </>
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
                            <Select onValueChange={(v) => setShowShipping(v === "yes")} value={showShipping ? "yes" : "no"}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="no">First Choice</SelectItem>
                                    <SelectItem value="yes">Yes</SelectItem>
                                </SelectContent>
                            </Select>
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
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Estimate Footer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <Label className="font-semibold">Payment Details</Label>
                            <Textarea
                                {...form.register("paymentDetails")}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="font-semibold">Note to clients</Label>
                            <Textarea
                                {...form.register("notes")}
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
                            <span>{(total - depositAmount).toFixed(2)}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-2 pb-10">
                {/* <Button type="button" variant="outline" onClick={() => router.push("/estimates")}>Save and close</Button> */}
                {/* <Button type="button" variant="outline">Convert to Invoice</Button> */}
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : isEditMode ? "Update Estimate" : "Submit"}
                </Button>
            </div>
        </form>
    );
}
