'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from '@/components/ui/select';
import { SignaturePad } from '@/components/ui/signature-pad';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { BusinessStructure, TaxFilledBy } from '@prisma/client';
import { StaffTaxDetailsSchema, type UpsertStaffTaxDetailsInput } from '@/lib/schemas/staff-tax-details.schema';
import { trpc } from '@/lib/client/trpc';
import { toast } from '@/components/ui/use-toast';
import { Loader2Icon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Form schema - derived from the upsert schema but without staffId (passed as prop)
const formSchema = StaffTaxDetailsSchema.upsert.omit({ staffId: true });
type TaxDetailsFormInput = z.input<typeof formSchema>;

export interface TaxDetailsFormRef {
    getFormData: () => Promise<TaxDetailsFormInput | null>;
    setTaxFilledBy: (value: TaxFilledBy) => void;
}

interface TaxDetailsFormProps {
    /** When `hidden`, the "who provides tax details" block is omitted (e.g. wizard supplies its own UI). */
    taxFilledByControl?: 'select' | 'hidden';
    /**
     * When `hidden`, the inline Form W-9 block is not shown for TaxFilledBy.STAFF (mode still stored for create/submit).
     * Use when you want the toggle without the nested form UI.
     */
    staffW9Presentation?: 'full' | 'hidden';
    staffId?: string;
    initialData?: {
        taxFilledBy?: TaxFilledBy | string;
        taxName?: string | null;
        businessName?: string | null;
        businessStructure?: BusinessStructure | string;
        llcClassification?: string | null;
        exemptPayeeCode?: string | null;
        fatcaExemptionCode?: string | null;
        taxAddress?: string | null;
        taxCity?: string | null;
        taxState?: string | null;
        taxZip?: string | null;
        accountNumbers?: string | null;
        ssn?: string | null;
        ein?: string | null;
        signatureUrl?: string | null;
        certificationDate?: Date | string | null;
    } | null;
    onSuccess?: () => void;
    onCancel?: () => void;
}

const BUSINESS_STRUCTURE_LABELS: Record<BusinessStructure, string> = {
    INDIVIDUAL: 'Individual/Sole Proprietor',
    LLC: 'LLC',
    C_CORPORATION: 'C Corporation',
    S_CORPORATION: 'S Corporation',
    PARTNERSHIP: 'Partnership',
    TRUST_ESTATE: 'Trust/Estate',
    OTHER: 'Other',
};

export const TaxDetailsForm = forwardRef<TaxDetailsFormRef, TaxDetailsFormProps>(function TaxDetailsForm({
    taxFilledByControl = 'select',
    staffW9Presentation = 'full',
    staffId,
    initialData,
    onSuccess,
    onCancel,
}, ref) {
    const utils = trpc.useUtils();

    // Fetch full tax details (including SSN/EIN) when editing
    const { data: fetchedTaxDetails } = trpc.staffTaxDetails.getByStaffId.useQuery(
        { staffId: staffId! },
        { enabled: !!staffId }
    );

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting, isDirty },
        control,
        watch,
        setValue,
        reset,
    } = useForm<TaxDetailsFormInput>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            taxFilledBy: (initialData?.taxFilledBy as TaxFilledBy) ?? TaxFilledBy.TALENT,
            taxName: initialData?.taxName ?? '',
            businessName: initialData?.businessName ?? '',
            businessStructure: (initialData?.businessStructure as BusinessStructure) ?? BusinessStructure.INDIVIDUAL,
            llcClassification: initialData?.llcClassification ?? '',
            exemptPayeeCode: initialData?.exemptPayeeCode ?? '',
            fatcaExemptionCode: initialData?.fatcaExemptionCode ?? '',
            taxAddress: initialData?.taxAddress ?? '',
            taxCity: initialData?.taxCity ?? '',
            taxState: initialData?.taxState ?? '',
            taxZip: initialData?.taxZip ?? '',
            accountNumbers: initialData?.accountNumbers ?? '',
            ssn: initialData?.ssn ?? '',
            ein: initialData?.ein ?? '',
            signatureUrl: initialData?.signatureUrl ?? null,
            certificationDate: initialData?.certificationDate ? new Date(initialData.certificationDate) : null,
        },
    });

    // When full tax details load (with SSN/EIN), reset the form with complete data
    useEffect(() => {
        if (fetchedTaxDetails && !isDirty) {
            reset({
                taxFilledBy: (fetchedTaxDetails.taxFilledBy as TaxFilledBy) ?? TaxFilledBy.TALENT,
                taxName: fetchedTaxDetails.taxName ?? '',
                businessName: fetchedTaxDetails.businessName ?? '',
                businessStructure: (fetchedTaxDetails.businessStructure as BusinessStructure) ?? BusinessStructure.INDIVIDUAL,
                llcClassification: fetchedTaxDetails.llcClassification ?? '',
                exemptPayeeCode: fetchedTaxDetails.exemptPayeeCode ?? '',
                fatcaExemptionCode: fetchedTaxDetails.fatcaExemptionCode ?? '',
                taxAddress: fetchedTaxDetails.taxAddress ?? '',
                taxCity: fetchedTaxDetails.taxCity ?? '',
                taxState: fetchedTaxDetails.taxState ?? '',
                taxZip: fetchedTaxDetails.taxZip ?? '',
                accountNumbers: fetchedTaxDetails.accountNumbers ?? '',
                ssn: fetchedTaxDetails.ssn ?? '',
                ein: fetchedTaxDetails.ein ?? '',
                signatureUrl: fetchedTaxDetails.signatureUrl ?? null,
                certificationDate: fetchedTaxDetails.certificationDate ? new Date(fetchedTaxDetails.certificationDate) : null,
            });
        }
    }, [fetchedTaxDetails, reset, isDirty]);

    const taxFilledBy = watch('taxFilledBy');
    const businessStructure = watch('businessStructure');

    // TIN type toggle (SSN vs EIN)
    const [tinType, setTinType] = useState<'SSN' | 'EIN'>('SSN');

    const upsertMutation = trpc.staffTaxDetails.upsert.useMutation({
        onSuccess: () => {
            toast({
                title: 'Tax details saved',
                description: 'W-9 information has been saved successfully',
            });
            if (staffId) {
                utils.staff.getById.invalidate({ id: staffId });
                utils.staffTaxDetails.getByStaffId.invalidate({ staffId });
            }
            onSuccess?.();
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message || 'Failed to save tax details',
                variant: 'error',
            });
        },
    });

    const onSubmit = (data: TaxDetailsFormInput) => {
        if (!staffId) return;
        upsertMutation.mutate({
            staffId,
            ...data,
        } as UpsertStaffTaxDetailsInput);
    };

    // Expose getFormData to parent via ref (used in create mode)
    useImperativeHandle(ref, () => ({
        getFormData: () => {
            return new Promise<TaxDetailsFormInput | null>((resolve) => {
                handleSubmit(
                    (data) => resolve(data),
                    () => resolve(null),
                )();
            });
        },
        setTaxFilledBy: (value: TaxFilledBy) => {
            setValue('taxFilledBy', value);
        },
    }), [handleSubmit, setValue]);

    const isDisabled = isSubmitting || upsertMutation.isPending;

    return (
        <div className="space-y-6">
            {/* Toggle: Who fills out tax details? */}
            {taxFilledByControl !== 'hidden' && (
                <div>
                    <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">
                        Tax Information Collection
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <Label>Who will provide tax details?</Label>
                            <Controller
                                name="taxFilledBy"
                                control={control}
                                render={({ field }) => (
                                    <Select
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        disabled={isDisabled}
                                    >
                                        <SelectTrigger className="mt-1.5">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={TaxFilledBy.TALENT}>
                                                Talent (will fill out their own W-9)
                                            </SelectItem>
                                            <SelectItem value={TaxFilledBy.STAFF}>
                                                Staff / Admin (enter W-9 details now)
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {taxFilledBy === TaxFilledBy.TALENT && (
                                <p className="text-sm text-muted-foreground mt-2">
                                    Tax details will be collected from the talent directly when they complete their profile.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* W-9 Form — Only show when Staff/Admin fills it out */}
            {taxFilledBy === TaxFilledBy.STAFF && staffW9Presentation !== 'hidden' && (
                <>
                    {/* W-9 Header */}
                    <div>
                        <div className="flex flex-col gap-1 border-b border-border pb-3 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
                            <h3 className="text-lg font-semibold">Form W-9</h3>
                            <span className="text-xs text-muted-foreground sm:max-w-[55%] sm:text-right">
                                Request for Taxpayer Identification Number and Certification
                            </span>
                        </div>

                        {/* Two-column grid: aligned rows, no orphan cells */}
                        <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                            <div className="min-w-0">
                                <Label htmlFor="taxName" className="text-sm leading-snug">
                                    Name <span className="font-normal text-muted-foreground">(as on income tax return)</span>
                                </Label>
                                <Input
                                    id="taxName"
                                    className="mt-2 h-10"
                                    {...register('taxName')}
                                    disabled={isDisabled}
                                    placeholder="Name of entity or individual"
                                />
                                {errors.taxName && (
                                    <p className="mt-1 text-sm text-destructive">{errors.taxName.message}</p>
                                )}
                            </div>

                            <div className="min-w-0">
                                <Label htmlFor="businessName" className="text-sm leading-snug">
                                    Business name / disregarded entity name
                                </Label>
                                <Input
                                    id="businessName"
                                    className="mt-2 h-10"
                                    {...register('businessName')}
                                    disabled={isDisabled}
                                    placeholder="Business name (if applicable)"
                                />
                                {errors.businessName && (
                                    <p className="mt-1 text-sm text-destructive">{errors.businessName.message}</p>
                                )}
                            </div>

                            <div className="min-w-0">
                                <Label className="text-sm leading-snug">Federal tax classification</Label>
                                <Controller
                                    name="businessStructure"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            disabled={isDisabled}
                                        >
                                            <SelectTrigger className="mt-2 h-10 w-full">
                                                <SelectValue placeholder="Select classification" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(BUSINESS_STRUCTURE_LABELS).map(([value, label]) => (
                                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>

                            {businessStructure === BusinessStructure.LLC && (
                                <div className="min-w-0 md:col-span-2">
                                    <Label htmlFor="llcClassification" className="text-sm leading-snug">
                                        LLC tax classification
                                    </Label>
                                    <Controller
                                        name="llcClassification"
                                        control={control}
                                        render={({ field }) => (
                                            <Select
                                                value={field.value ?? ''}
                                                onValueChange={field.onChange}
                                                disabled={isDisabled}
                                            >
                                                <SelectTrigger className="mt-2 h-10 w-full max-w-md">
                                                    <SelectValue placeholder="Select LLC classification" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="C">C — C Corporation</SelectItem>
                                                    <SelectItem value="S">S — S Corporation</SelectItem>
                                                    <SelectItem value="P">P — Partnership</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    <p className="mt-1.5 text-xs text-muted-foreground">
                                        C = C corporation, S = S corporation, P = Partnership
                                    </p>
                                </div>
                            )}

                            <div className="min-w-0">
                                <Label htmlFor="exemptPayeeCode" className="text-sm leading-snug">
                                    Exempt payee code <span className="font-normal text-muted-foreground">(if any)</span>
                                </Label>
                                <Input
                                    id="exemptPayeeCode"
                                    className="mt-2 h-10"
                                    {...register('exemptPayeeCode')}
                                    disabled={isDisabled}
                                    placeholder="Code (if applicable)"
                                />
                            </div>

                            <div className="min-w-0">
                                <Label htmlFor="fatcaExemptionCode" className="text-sm leading-snug">
                                    FATCA exemption code <span className="font-normal text-muted-foreground">(if any)</span>
                                </Label>
                                <Input
                                    id="fatcaExemptionCode"
                                    className="mt-2 h-10"
                                    {...register('fatcaExemptionCode')}
                                    disabled={isDisabled}
                                    placeholder="Code (if applicable)"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Address */}
                    <div>
                        <h3 className="text-lg font-semibold border-b border-border pb-3 mb-5">Address</h3>
                        <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-12">
                            <div className="min-w-0 md:col-span-12">
                                <Label htmlFor="taxAddress" className="text-sm leading-snug">
                                    Address <span className="font-normal text-muted-foreground">(street, apt. or suite)</span>
                                </Label>
                                <Input
                                    id="taxAddress"
                                    className="mt-2 h-10"
                                    {...register('taxAddress')}
                                    disabled={isDisabled}
                                    placeholder="Street address"
                                />
                            </div>
                            <div className="min-w-0 md:col-span-5">
                                <Label htmlFor="taxCity">City</Label>
                                <Input
                                    id="taxCity"
                                    className="mt-2 h-10"
                                    {...register('taxCity')}
                                    disabled={isDisabled}
                                    placeholder="City"
                                />
                            </div>
                            <div className="min-w-0 md:col-span-3">
                                <Label htmlFor="taxState">State</Label>
                                <Input
                                    id="taxState"
                                    className="mt-2 h-10"
                                    {...register('taxState')}
                                    disabled={isDisabled}
                                    placeholder="State"
                                />
                            </div>
                            <div className="min-w-0 md:col-span-4">
                                <Label htmlFor="taxZip">ZIP code</Label>
                                <Input
                                    id="taxZip"
                                    className="mt-2 h-10"
                                    {...register('taxZip')}
                                    disabled={isDisabled}
                                    placeholder="ZIP"
                                />
                            </div>
                            <div className="min-w-0 md:col-span-12">
                                <Label htmlFor="accountNumbers" className="text-sm leading-snug">
                                    Account number(s) <span className="font-normal text-muted-foreground">(optional)</span>
                                </Label>
                                <Input
                                    id="accountNumbers"
                                    className="mt-2 h-10"
                                    {...register('accountNumbers')}
                                    disabled={isDisabled}
                                    placeholder="Optional account numbers"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Part I: Taxpayer Identification Number — toggles on their own row; input below (no grid overlap) */}
                    <div>
                        <h3 className="text-lg font-semibold border-b border-border pb-3 mb-2">
                            Taxpayer Identification Number (TIN)
                        </h3>
                        <p className="text-sm text-muted-foreground mb-5">
                            Enter your TIN in the appropriate box. This is securely stored and used for tax reporting purposes only.
                        </p>

                        <div className="space-y-5">
                            <div>
                                <span className="mb-3 block text-sm font-medium text-foreground">Identification type</span>
                                <div
                                    role="group"
                                    aria-label="TIN type"
                                    className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
                                >
                                    <button
                                        type="button"
                                        className={cn(
                                            'rounded-lg border px-4 py-2.5 text-left text-sm font-medium transition-colors sm:min-w-[10rem]',
                                            tinType === 'SSN'
                                                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                                : 'border-border bg-background text-foreground hover:bg-muted/60'
                                        )}
                                        onClick={() => setTinType('SSN')}
                                    >
                                        Social Security Number
                                    </button>
                                    <span className="hidden px-1 text-center text-xs text-muted-foreground sm:block sm:self-center">
                                        or
                                    </span>
                                    <button
                                        type="button"
                                        className={cn(
                                            'rounded-lg border px-4 py-2.5 text-left text-sm font-medium transition-colors sm:min-w-[10rem]',
                                            tinType === 'EIN'
                                                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                                : 'border-border bg-background text-foreground hover:bg-muted/60'
                                        )}
                                        onClick={() => setTinType('EIN')}
                                    >
                                        Employer Identification Number
                                    </button>
                                </div>
                            </div>

                            <div className="max-w-md rounded-lg border border-border/60 bg-muted/20 p-4">
                                {tinType === 'SSN' ? (
                                    <>
                                        <Label htmlFor="ssn" className="text-sm font-medium">
                                            Social Security Number
                                        </Label>
                                        <Input
                                            id="ssn"
                                            type="password"
                                            className="mt-2 h-10 bg-background"
                                            {...register('ssn')}
                                            disabled={isDisabled}
                                            placeholder="XXX-XX-XXXX"
                                            autoComplete="off"
                                        />
                                        {errors.ssn && (
                                            <p className="mt-1.5 text-sm text-destructive">{errors.ssn.message}</p>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <Label htmlFor="ein" className="text-sm font-medium">
                                            Employer Identification Number
                                        </Label>
                                        <Input
                                            id="ein"
                                            className="mt-2 h-10 bg-background"
                                            {...register('ein')}
                                            disabled={isDisabled}
                                            placeholder="XX-XXXXXXX"
                                        />
                                        {errors.ein && (
                                            <p className="mt-1.5 text-sm text-destructive">{errors.ein.message}</p>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Part II: Certification */}
                    <div>
                        <h3 className="text-lg font-semibold border-b border-border pb-3 mb-4">
                            Certification
                        </h3>
                        <div className="mb-5 space-y-2 text-sm text-muted-foreground">
                            <p>Under penalties of perjury, I certify that:</p>
                            <ol className="ml-5 list-outside list-decimal space-y-1">
                                <li>The number shown on this form is my correct taxpayer identification number, and</li>
                                <li>I am not subject to backup withholding, and</li>
                                <li>I am a U.S. citizen or other U.S. person, and</li>
                                <li>The FATCA code(s) entered on this form (if any) are correct.</li>
                            </ol>
                        </div>

                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <div className="min-w-0 md:col-span-2">
                                <Label>Signature</Label>
                                <div className="mt-2">
                                    <Controller
                                        name="signatureUrl"
                                        control={control}
                                        render={({ field }) => (
                                            <SignaturePad
                                                value={field.value}
                                                onChange={field.onChange}
                                                disabled={isDisabled}
                                            />
                                        )}
                                    />
                                </div>
                                {errors.signatureUrl && (
                                    <p className="mt-1 text-sm text-destructive">{errors.signatureUrl.message}</p>
                                )}
                            </div>

                            <div className="min-w-0 max-w-xs">
                                <Label htmlFor="certificationDate">Date</Label>
                                <Controller
                                    name="certificationDate"
                                    control={control}
                                    render={({ field }) => (
                                        <Input
                                            id="certificationDate"
                                            type="date"
                                            className="mt-2 h-10"
                                            value={field.value instanceof Date && !isNaN(field.value.getTime())
                                                ? field.value.toISOString().split('T')[0]
                                                : ''
                                            }
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                field.onChange(val ? new Date(val + 'T00:00:00') : null);
                                            }}
                                            disabled={isDisabled}
                                        />
                                    )}
                                />
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Form Actions - only show when staffId exists (edit mode) */}
            {staffId && (
                <div className="flex justify-end gap-3">
                    {onCancel && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            disabled={isDisabled}
                        >
                            Cancel
                        </Button>
                    )}
                    <Button type="button" onClick={handleSubmit(onSubmit)} disabled={isDisabled}>
                        {isDisabled && (
                            <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Save Tax Details
                    </Button>
                </div>
            )}
        </div>
    );
});
