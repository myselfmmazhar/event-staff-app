'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AddressAutocomplete } from '@/components/maps/address-autocomplete';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { BusinessStructure, TaxFilledBy, StaffType } from '@prisma/client';
import { StaffTaxDetailsSchema, type UpsertStaffTaxDetailsInput } from '@/lib/schemas/staff-tax-details.schema';
import { trpc } from '@/lib/client/trpc';
import { toast } from '@/components/ui/use-toast';
import { Eye, EyeOff, Loader2Icon } from 'lucide-react';
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
    staffType?: StaffType;
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
        w4FirstName?: string | null;
        w4LastName?: string | null;
        w4Status?: string | null;
        w4EmployerName?: string | null;
        w4EmployerAddress?: string | null;
        w4EmploymentDate?: Date | string | null;
        // W-9 additions
        otherClassificationDescription?: string | null;
        hasForeignPartners?: boolean | null;
        requesterNameAddress?: string | null;
        w9SubjectToBackupWithholding?: boolean | null;
        w9CertifiedAt?: Date | string | null;
        // W-4 additions
        w4MiddleInitial?: string | null;
        w4MultipleJobs?: boolean | null;
        w4QualifyingChildren?: number | null;
        w4OtherDependents?: number | null;
        w4OtherCredits?: number | string | null;
        w4DependentsTotal?: number | string | null;
        w4OtherIncome?: number | string | null;
        w4Deductions?: number | string | null;
        w4ExtraWithholding?: number | string | null;
        w4Exempt?: boolean | null;
        w4PerjuryAckAt?: Date | string | null;
    } | null;
    onSuccess?: () => void;
    onCancel?: () => void;
}

// Coerce Prisma Decimal / number / string into a number-or-null suitable for form inputs.
const toNumOrNull = (v: unknown): number | null => {
    if (v == null || v === '') return null;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : null;
};

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
    staffType,
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
            w4FirstName: initialData?.w4FirstName ?? '',
            w4LastName: initialData?.w4LastName ?? '',
            w4Status: initialData?.w4Status ?? 'Single or Married filing separately',
            w4EmployerName: initialData?.w4EmployerName ?? '',
            w4EmployerAddress: initialData?.w4EmployerAddress ?? '',
            w4EmploymentDate: initialData?.w4EmploymentDate ? new Date(initialData.w4EmploymentDate) : null,
            // W-9 additions
            otherClassificationDescription: initialData?.otherClassificationDescription ?? '',
            hasForeignPartners: initialData?.hasForeignPartners ?? false,
            requesterNameAddress: initialData?.requesterNameAddress ?? '',
            w9SubjectToBackupWithholding: initialData?.w9SubjectToBackupWithholding ?? false,
            w9CertifiedAt: initialData?.w9CertifiedAt ? new Date(initialData.w9CertifiedAt) : null,
            // W-4 additions
            w4MiddleInitial: initialData?.w4MiddleInitial ?? '',
            w4MultipleJobs: initialData?.w4MultipleJobs ?? false,
            w4QualifyingChildren: toNumOrNull(initialData?.w4QualifyingChildren),
            w4OtherDependents: toNumOrNull(initialData?.w4OtherDependents),
            w4OtherCredits: toNumOrNull(initialData?.w4OtherCredits),
            w4DependentsTotal: toNumOrNull(initialData?.w4DependentsTotal),
            w4OtherIncome: toNumOrNull(initialData?.w4OtherIncome),
            w4Deductions: toNumOrNull(initialData?.w4Deductions),
            w4ExtraWithholding: toNumOrNull(initialData?.w4ExtraWithholding),
            w4Exempt: initialData?.w4Exempt ?? false,
            w4PerjuryAckAt: initialData?.w4PerjuryAckAt ? new Date(initialData.w4PerjuryAckAt) : null,
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
                w4FirstName: fetchedTaxDetails.w4FirstName ?? '',
                w4LastName: fetchedTaxDetails.w4LastName ?? '',
                w4Status: fetchedTaxDetails.w4Status ?? 'Single or Married filing separately',
                w4EmployerName: fetchedTaxDetails.w4EmployerName ?? '',
                w4EmployerAddress: fetchedTaxDetails.w4EmployerAddress ?? '',
                w4EmploymentDate: fetchedTaxDetails.w4EmploymentDate ? new Date(fetchedTaxDetails.w4EmploymentDate) : null,
                // W-9 additions
                otherClassificationDescription: (fetchedTaxDetails as any).otherClassificationDescription ?? '',
                hasForeignPartners: (fetchedTaxDetails as any).hasForeignPartners ?? false,
                requesterNameAddress: (fetchedTaxDetails as any).requesterNameAddress ?? '',
                w9SubjectToBackupWithholding: (fetchedTaxDetails as any).w9SubjectToBackupWithholding ?? false,
                w9CertifiedAt: (fetchedTaxDetails as any).w9CertifiedAt ? new Date((fetchedTaxDetails as any).w9CertifiedAt) : null,
                // W-4 additions
                w4MiddleInitial: (fetchedTaxDetails as any).w4MiddleInitial ?? '',
                w4MultipleJobs: (fetchedTaxDetails as any).w4MultipleJobs ?? false,
                w4QualifyingChildren: toNumOrNull((fetchedTaxDetails as any).w4QualifyingChildren),
                w4OtherDependents: toNumOrNull((fetchedTaxDetails as any).w4OtherDependents),
                w4OtherCredits: toNumOrNull((fetchedTaxDetails as any).w4OtherCredits),
                w4DependentsTotal: toNumOrNull((fetchedTaxDetails as any).w4DependentsTotal),
                w4OtherIncome: toNumOrNull((fetchedTaxDetails as any).w4OtherIncome),
                w4Deductions: toNumOrNull((fetchedTaxDetails as any).w4Deductions),
                w4ExtraWithholding: toNumOrNull((fetchedTaxDetails as any).w4ExtraWithholding),
                w4Exempt: (fetchedTaxDetails as any).w4Exempt ?? false,
                w4PerjuryAckAt: (fetchedTaxDetails as any).w4PerjuryAckAt ? new Date((fetchedTaxDetails as any).w4PerjuryAckAt) : null,
            });
        }
    }, [fetchedTaxDetails, reset, isDirty]);

    const taxFilledBy = watch('taxFilledBy');
    const businessStructure = watch('businessStructure');

    // W-9 Line 3b is only relevant for partnerships, trusts/estates, or LLCs taxed as partnerships
    const w9LlcClassification = watch('llcClassification');
    const showLine3b =
        businessStructure === BusinessStructure.PARTNERSHIP ||
        businessStructure === BusinessStructure.TRUST_ESTATE ||
        (businessStructure === BusinessStructure.LLC && w9LlcClassification === 'P');

    // Auto-compute W-4 Step 3 dependents total: children*2000 + others*500 + otherCredits
    const w4QualifyingChildren = watch('w4QualifyingChildren');
    const w4OtherDependents = watch('w4OtherDependents');
    const w4OtherCredits = watch('w4OtherCredits');
    useEffect(() => {
        const children = Number(w4QualifyingChildren) || 0;
        const others = Number(w4OtherDependents) || 0;
        const credits = Number(w4OtherCredits) || 0;
        const total = children * 2000 + others * 500 + credits;
        setValue('w4DependentsTotal', total > 0 ? total : null, { shouldDirty: true });
    }, [w4QualifyingChildren, w4OtherDependents, w4OtherCredits, setValue]);

    // TIN type toggle (SSN vs EIN)
    const [tinType, setTinType] = useState<'SSN' | 'EIN'>('SSN');
    const [ssnVisible, setSsnVisible] = useState(false);
    const [einVisible, setEinVisible] = useState(false);
    const [w4SsnVisible, setW4SsnVisible] = useState(false);
    const [w4EinVisible, setW4EinVisible] = useState(false);

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
                                                Talent (will fill out their own tax form)
                                            </SelectItem>
                                            <SelectItem value={TaxFilledBy.STAFF}>
                                                Staff / Admin (enter tax details now)
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

            {/* W-9 Form — Only show when Staff/Admin fills it out AND talent is Contractor */}
            {taxFilledBy === TaxFilledBy.STAFF && staffW9Presentation !== 'hidden' && staffType === StaffType.CONTRACTOR && (
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

                            {businessStructure === BusinessStructure.OTHER && (
                                <div className="min-w-0 md:col-span-2">
                                    <Label htmlFor="otherClassificationDescription" className="text-sm leading-snug">
                                        Other classification description
                                    </Label>
                                    <Input
                                        id="otherClassificationDescription"
                                        className="mt-2 h-10"
                                        {...register('otherClassificationDescription')}
                                        disabled={isDisabled}
                                        placeholder="Describe your tax classification"
                                    />
                                </div>
                            )}

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

                            {showLine3b && (
                                <div className="min-w-0 md:col-span-2">
                                    <Controller
                                        name="hasForeignPartners"
                                        control={control}
                                        render={({ field }) => (
                                            <label className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-4">
                                                <Checkbox
                                                    checked={!!field.value}
                                                    onChange={(e) => field.onChange(e.currentTarget.checked)}
                                                    disabled={isDisabled}
                                                    className="mt-0.5"
                                                />
                                                <span className="text-sm leading-snug text-foreground">
                                                    <span className="font-medium">Line 3b — Foreign partners, owners, or beneficiaries</span>
                                                    <span className="mt-1 block text-xs text-muted-foreground">
                                                        Check this box if you are providing this form to a partnership, trust, or estate
                                                        in which you have an ownership interest and that partnership, trust, or estate
                                                        has any foreign partners, owners, or beneficiaries.
                                                    </span>
                                                </span>
                                            </label>
                                        )}
                                    />
                                </div>
                            )}
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
                                <div className="mt-2">
                                    <AddressAutocomplete
                                        label=""
                                        defaultValue={watch('taxAddress') ?? ''}
                                        placeholder="Type to search for an address..."
                                        disabled={isDisabled}
                                        onSelect={(addressData) => {
                                            setValue('taxAddress', addressData.address, { shouldDirty: true, shouldValidate: true });
                                            setValue('taxCity', addressData.city, { shouldDirty: true, shouldValidate: true });
                                            setValue('taxState', addressData.state, { shouldDirty: true, shouldValidate: true });
                                            setValue('taxZip', addressData.zipCode, { shouldDirty: true, shouldValidate: true });
                                        }}
                                    />
                                </div>
                                {errors.taxAddress && (
                                    <p className="mt-1 text-sm text-destructive">{errors.taxAddress.message}</p>
                                )}
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
                            <div className="min-w-0 md:col-span-12">
                                <Label htmlFor="requesterNameAddress" className="text-sm leading-snug">
                                    Requester&apos;s name and address <span className="font-normal text-muted-foreground">(optional)</span>
                                </Label>
                                <Textarea
                                    id="requesterNameAddress"
                                    className="mt-2 min-h-[72px]"
                                    {...register('requesterNameAddress')}
                                    disabled={isDisabled}
                                    placeholder="Name and address of the person/business requesting this Form W-9"
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
                                        <div className="relative mt-2">
                                            <Input
                                                id="ssn"
                                                type={ssnVisible ? 'text' : 'password'}
                                                className="h-10 bg-background pr-10"
                                                {...register('ssn')}
                                                disabled={isDisabled}
                                                placeholder="XXX-XX-XXXX"
                                                autoComplete="off"
                                            />
                                            <button
                                                type="button"
                                                tabIndex={-1}
                                                onClick={() => setSsnVisible((v) => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                aria-label={ssnVisible ? 'Hide SSN' : 'Show SSN'}
                                            >
                                                {ssnVisible ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                        {errors.ssn && (
                                            <p className="mt-1.5 text-sm text-destructive">{errors.ssn.message}</p>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <Label htmlFor="ein" className="text-sm font-medium">
                                            Employer Identification Number
                                        </Label>
                                        <div className="relative mt-2">
                                            <Input
                                                id="ein"
                                                type={einVisible ? 'text' : 'password'}
                                                className="h-10 bg-background pr-10"
                                                {...register('ein')}
                                                disabled={isDisabled}
                                                placeholder="XX-XXXXXXX"
                                                autoComplete="off"
                                            />
                                            <button
                                                type="button"
                                                tabIndex={-1}
                                                onClick={() => setEinVisible((v) => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                aria-label={einVisible ? 'Hide EIN' : 'Show EIN'}
                                            >
                                                {einVisible ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
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
                        <h3 className="text-lg font-semibold border-b border-border pb-3 mb-2">
                            Part II — Certification
                        </h3>
                        <p className="text-sm text-muted-foreground mb-5">
                            Under penalties of perjury, I certify that:
                        </p>

                        <div className="space-y-3">
                            <Controller
                                name="w9SubjectToBackupWithholding"
                                control={control}
                                render={({ field }) => (
                                    <label className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-4">
                                        <Checkbox
                                            checked={!!field.value}
                                            onChange={(e) => field.onChange(e.currentTarget.checked)}
                                            disabled={isDisabled}
                                            className="mt-0.5"
                                        />
                                        <span className="text-sm leading-snug text-foreground">
                                            <span className="font-medium">I have been notified by the IRS that I am currently subject to backup withholding</span>
                                            <span className="mt-1 block text-xs text-muted-foreground">
                                                Only check if the IRS has notified you that you are currently subject to backup
                                                withholding because of underreporting interest or dividends on your tax return.
                                            </span>
                                        </span>
                                    </label>
                                )}
                            />

                            <Controller
                                name="w9CertifiedAt"
                                control={control}
                                render={({ field }) => (
                                    <label className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-4">
                                        <Checkbox
                                            checked={!!field.value}
                                            onChange={(e) => field.onChange(e.currentTarget.checked ? new Date() : null)}
                                            disabled={isDisabled}
                                            className="mt-0.5"
                                        />
                                        <span className="text-sm leading-snug text-foreground">
                                            <span className="font-medium">
                                                I certify under penalties of perjury that:
                                            </span>
                                            <span className="mt-2 block text-xs text-muted-foreground space-y-1">
                                                <span className="block">1. The TIN shown on this form is my correct taxpayer identification number (or I am waiting for a number to be issued to me).</span>
                                                <span className="block">2. I am not subject to backup withholding (unless I checked the box above).</span>
                                                <span className="block">3. I am a U.S. citizen or other U.S. person.</span>
                                                <span className="block">4. The FATCA code(s) entered on this form (if any) indicating that I am exempt from FATCA reporting is correct.</span>
                                            </span>
                                            {field.value && (
                                                <span className="mt-2 block text-xs text-muted-foreground">
                                                    Certified on {new Date(field.value as unknown as string).toLocaleDateString()}
                                                </span>
                                            )}
                                        </span>
                                    </label>
                                )}
                            />
                        </div>
                    </div>
                </>
            )}

            {/* W-4 Form — Only show when Staff/Admin fills it out AND talent is Employee */}
            {taxFilledBy === TaxFilledBy.STAFF && staffW9Presentation !== 'hidden' && (staffType === StaffType.EMPLOYEE || !staffType) && (
                <>
                    {/* W-4 Header */}
                    <div>
                        <div className="flex flex-col gap-1 border-b border-border pb-3 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
                            <h3 className="text-lg font-semibold">Form W-4</h3>
                            <span className="text-xs text-muted-foreground sm:max-w-[55%] sm:text-right">
                                Employee&apos;s Withholding Certificate
                            </span>
                        </div>

                        {/* Design similar to W-9 */}
                        <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-12">
                            <div className="min-w-0 md:col-span-5">
                                <Label htmlFor="w4FirstName" className="text-sm font-bold">
                                    First name
                                </Label>
                                <Input
                                    id="w4FirstName"
                                    className="mt-2 h-10"
                                    {...register('w4FirstName')}
                                    disabled={isDisabled}
                                    placeholder="Enter first name"
                                />
                                {errors.w4FirstName && (
                                    <p className="mt-1 text-sm text-destructive">{errors.w4FirstName.message}</p>
                                )}
                            </div>

                            <div className="min-w-0 md:col-span-2">
                                <Label htmlFor="w4MiddleInitial" className="text-sm font-bold">
                                    Middle initial
                                </Label>
                                <Input
                                    id="w4MiddleInitial"
                                    maxLength={1}
                                    className="mt-2 h-10"
                                    {...register('w4MiddleInitial')}
                                    disabled={isDisabled}
                                    placeholder="M"
                                />
                            </div>

                            <div className="min-w-0 md:col-span-5">
                                <Label htmlFor="w4LastName" className="text-sm font-bold">
                                    Last name
                                </Label>
                                <Input
                                    id="w4LastName"
                                    className="mt-2 h-10"
                                    {...register('w4LastName')}
                                    disabled={isDisabled}
                                    placeholder="Enter last name"
                                />
                                {errors.w4LastName && (
                                    <p className="mt-1 text-sm text-destructive">{errors.w4LastName.message}</p>
                                )}
                            </div>

                            <div className="min-w-0 md:col-span-12">
                                <Label htmlFor="w4Status" className="text-sm font-bold">
                                    Filing Status
                                </Label>
                                <Controller
                                    name="w4Status"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            value={field.value ?? ''}
                                            onValueChange={field.onChange}
                                            disabled={isDisabled}
                                        >
                                            <SelectTrigger className="mt-2 h-10 w-full">
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Single or Married filing separately">Single or Married filing separately</SelectItem>
                                                <SelectItem value="Married filing jointly or Qualifying surviving spouse">Married filing jointly or Qualifying surviving spouse</SelectItem>
                                                <SelectItem value="Head of household">Head of household (Check only if you’re unmarried and pay more than half the costs of keeping up a home for yourself and a qualifying individual.)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>

                            <div className="min-w-0 md:col-span-12">
                                <Label htmlFor="w4EmployerName" className="text-sm font-bold">
                                    Employer’s name and address
                                </Label>
                                <Input
                                    id="w4EmployerName"
                                    className="mt-2 h-10"
                                    {...register('w4EmployerName')}
                                    disabled={isDisabled}
                                    placeholder="Employer Name"
                                />
                            </div>
                            <div className="min-w-0 md:col-span-12">
                                <Textarea
                                    id="w4EmployerAddress"
                                    className="mt-2 min-h-[80px]"
                                    {...register('w4EmployerAddress')}
                                    disabled={isDisabled}
                                    placeholder="Employer Address"
                                />
                            </div>

                            <div className="min-w-0 md:col-span-6">
                                <Label htmlFor="w4EmploymentDate" className="text-sm font-bold">
                                    First date of employment
                                </Label>
                                <Controller
                                    name="w4EmploymentDate"
                                    control={control}
                                    render={({ field }) => (
                                        <Input
                                            id="w4EmploymentDate"
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

                    {/* Reuse Address Section for Step 4-5 */}
                    <div>
                        <h3 className="text-lg font-semibold border-b border-border pb-3 mb-5">
                            Address
                        </h3>
                        <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-12">
                            <div className="min-w-0 md:col-span-12">
                                <Label htmlFor="w4Address" className="text-sm font-bold">
                                    Address
                                </Label>
                                <div className="mt-2">
                                    <AddressAutocomplete
                                        label=""
                                        defaultValue={watch('taxAddress') ?? ''}
                                        placeholder="Type to search for an address..."
                                        disabled={isDisabled}
                                        onSelect={(addressData) => {
                                            setValue('taxAddress', addressData.address, { shouldDirty: true, shouldValidate: true });
                                            setValue('taxCity', addressData.city, { shouldDirty: true, shouldValidate: true });
                                            setValue('taxState', addressData.state, { shouldDirty: true, shouldValidate: true });
                                            setValue('taxZip', addressData.zipCode, { shouldDirty: true, shouldValidate: true });
                                        }}
                                    />
                                </div>
                                {errors.taxAddress && (
                                    <p className="mt-1 text-sm text-destructive">{errors.taxAddress.message}</p>
                                )}
                            </div>
                            <div className="min-w-0 md:col-span-5">
                                <Label htmlFor="w4City">City</Label>
                                <Input
                                    id="w4City"
                                    className="mt-2 h-10"
                                    {...register('taxCity')}
                                    disabled={isDisabled}
                                    placeholder="City"
                                />
                            </div>
                            <div className="min-w-0 md:col-span-3">
                                <Label htmlFor="w4State">State</Label>
                                <Input
                                    id="w4State"
                                    className="mt-2 h-10"
                                    {...register('taxState')}
                                    disabled={isDisabled}
                                    placeholder="State"
                                />
                            </div>
                            <div className="min-w-0 md:col-span-4">
                                <Label htmlFor="w4Zip">ZIP code</Label>
                                <Input
                                    id="w4Zip"
                                    className="mt-2 h-10"
                                    {...register('taxZip')}
                                    disabled={isDisabled}
                                    placeholder="ZIP"
                                />
                            </div>
                        </div>
                    </div>

                    {/* TIN Section for Step 3 & 9 */}
                    <div>
                        <h3 className="text-lg font-semibold border-b border-border pb-3 mb-2">
                            Identifiers
                        </h3>
                        <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                            <div className="min-w-0">
                                <Label htmlFor="w4ssn" className="text-sm font-bold">
                                    Social Security Number
                                </Label>
                                <div className="relative mt-2">
                                    <Input
                                        id="w4ssn"
                                        type={w4SsnVisible ? 'text' : 'password'}
                                        className="h-10 pr-10"
                                        {...register('ssn')}
                                        disabled={isDisabled}
                                        placeholder="XXX-XX-XXXX"
                                        autoComplete="off"
                                    />
                                    <button
                                        type="button"
                                        tabIndex={-1}
                                        onClick={() => setW4SsnVisible((v) => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        aria-label={w4SsnVisible ? 'Hide SSN' : 'Show SSN'}
                                    >
                                        {w4SsnVisible ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                                {errors.ssn && (
                                    <p className="mt-1.5 text-sm text-destructive">{errors.ssn.message}</p>
                                )}
                            </div>
                            <div className="min-w-0">
                                <Label htmlFor="w4ein" className="text-sm font-bold">
                                    Employer Identification Number (EIN)
                                </Label>
                                <div className="relative mt-2">
                                    <Input
                                        id="w4ein"
                                        type={w4EinVisible ? 'text' : 'password'}
                                        className="h-10 pr-10"
                                        {...register('ein')}
                                        disabled={isDisabled}
                                        placeholder="XX-XXXXXXX"
                                        autoComplete="off"
                                    />
                                    <button
                                        type="button"
                                        tabIndex={-1}
                                        onClick={() => setW4EinVisible((v) => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        aria-label={w4EinVisible ? 'Hide EIN' : 'Show EIN'}
                                    >
                                        {w4EinVisible ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                                {errors.ein && (
                                    <p className="mt-1.5 text-sm text-destructive">{errors.ein.message}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Step 2 — Multiple Jobs or Spouse Works */}
                    <div>
                        <h3 className="text-lg font-semibold border-b border-border pb-3 mb-2">
                            Step 2 — Multiple Jobs or Spouse Works
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Complete this step if you (1) hold more than one job at a time, or (2) are married
                            filing jointly and your spouse also works.
                        </p>
                        <Controller
                            name="w4MultipleJobs"
                            control={control}
                            render={({ field }) => (
                                <label className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-4">
                                    <Checkbox
                                        checked={!!field.value}
                                        onChange={(e) => field.onChange(e.currentTarget.checked)}
                                        disabled={isDisabled}
                                        className="mt-0.5"
                                    />
                                    <span className="text-sm leading-snug text-foreground">
                                        <span className="font-medium">Step 2(c) — Two jobs total</span>
                                        <span className="mt-1 block text-xs text-muted-foreground">
                                            Check this box if there are only two jobs total. Do the same on the W-4 for the other job.
                                            This option is generally accurate when the pay at the two jobs is similar.
                                        </span>
                                    </span>
                                </label>
                            )}
                        />
                    </div>

                    {/* Step 3 — Claim Dependents */}
                    <div>
                        <h3 className="text-lg font-semibold border-b border-border pb-3 mb-2">
                            Step 3 — Claim Dependents
                        </h3>
                        <p className="text-sm text-muted-foreground mb-5">
                            If your total income will be $200,000 or less ($400,000 or less if married filing jointly):
                        </p>
                        <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                            <div className="min-w-0">
                                <Label htmlFor="w4QualifyingChildren" className="text-sm font-bold">
                                    Qualifying children under age 17
                                </Label>
                                <Input
                                    id="w4QualifyingChildren"
                                    type="number"
                                    min={0}
                                    step={1}
                                    className="mt-2 h-10"
                                    {...register('w4QualifyingChildren')}
                                    disabled={isDisabled}
                                    placeholder="0"
                                />
                                <p className="mt-1.5 text-xs text-muted-foreground">Multiplied by $2,000</p>
                            </div>
                            <div className="min-w-0">
                                <Label htmlFor="w4OtherDependents" className="text-sm font-bold">
                                    Number of other dependents
                                </Label>
                                <Input
                                    id="w4OtherDependents"
                                    type="number"
                                    min={0}
                                    step={1}
                                    className="mt-2 h-10"
                                    {...register('w4OtherDependents')}
                                    disabled={isDisabled}
                                    placeholder="0"
                                />
                                <p className="mt-1.5 text-xs text-muted-foreground">Multiplied by $500</p>
                            </div>
                            <div className="min-w-0">
                                <Label htmlFor="w4OtherCredits" className="text-sm font-bold">
                                    Other credits
                                </Label>
                                <Input
                                    id="w4OtherCredits"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    className="mt-2 h-10"
                                    {...register('w4OtherCredits')}
                                    disabled={isDisabled}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="min-w-0">
                                <Label htmlFor="w4DependentsTotal" className="text-sm font-bold">
                                    Total <span className="font-normal text-muted-foreground">(auto-computed)</span>
                                </Label>
                                <Input
                                    id="w4DependentsTotal"
                                    type="number"
                                    readOnly
                                    className="mt-2 h-10 bg-muted/40"
                                    value={(watch('w4DependentsTotal') as number | null) ?? ''}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Step 4 — Other Adjustments */}
                    <div>
                        <h3 className="text-lg font-semibold border-b border-border pb-3 mb-2">
                            Step 4 (optional) — Other Adjustments
                        </h3>
                        <div className="mt-2 grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-3">
                            <div className="min-w-0">
                                <Label htmlFor="w4OtherIncome" className="text-sm font-bold">
                                    4(a) Other income
                                </Label>
                                <Input
                                    id="w4OtherIncome"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    className="mt-2 h-10"
                                    {...register('w4OtherIncome')}
                                    disabled={isDisabled}
                                    placeholder="0.00"
                                />
                                <p className="mt-1.5 text-xs text-muted-foreground">Not from jobs (annual)</p>
                            </div>
                            <div className="min-w-0">
                                <Label htmlFor="w4Deductions" className="text-sm font-bold">
                                    4(b) Deductions
                                </Label>
                                <Input
                                    id="w4Deductions"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    className="mt-2 h-10"
                                    {...register('w4Deductions')}
                                    disabled={isDisabled}
                                    placeholder="0.00"
                                />
                                <p className="mt-1.5 text-xs text-muted-foreground">Other than standard deduction</p>
                            </div>
                            <div className="min-w-0">
                                <Label htmlFor="w4ExtraWithholding" className="text-sm font-bold">
                                    4(c) Extra withholding
                                </Label>
                                <Input
                                    id="w4ExtraWithholding"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    className="mt-2 h-10"
                                    {...register('w4ExtraWithholding')}
                                    disabled={isDisabled}
                                    placeholder="0.00"
                                />
                                <p className="mt-1.5 text-xs text-muted-foreground">Additional per pay period</p>
                            </div>
                        </div>

                        <div className="mt-5">
                            <Controller
                                name="w4Exempt"
                                control={control}
                                render={({ field }) => (
                                    <label className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-4">
                                        <Checkbox
                                            checked={!!field.value}
                                            onChange={(e) => field.onChange(e.currentTarget.checked)}
                                            disabled={isDisabled}
                                            className="mt-0.5"
                                        />
                                        <span className="text-sm leading-snug text-foreground">
                                            <span className="font-medium">Claim exemption from withholding</span>
                                            <span className="mt-1 block text-xs text-muted-foreground">
                                                Check only if both apply: (1) had no federal income tax liability last year,
                                                AND (2) expect no federal income tax liability this year.
                                            </span>
                                        </span>
                                    </label>
                                )}
                            />
                        </div>
                    </div>

                    {/* Step 5 — Certification */}
                    <div>
                        <h3 className="text-lg font-semibold border-b border-border pb-3 mb-2">
                            Step 5 — Sign Here
                        </h3>
                        <Controller
                            name="w4PerjuryAckAt"
                            control={control}
                            render={({ field }) => (
                                <label className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-4">
                                    <Checkbox
                                        checked={!!field.value}
                                        onChange={(e) => field.onChange(e.currentTarget.checked ? new Date() : null)}
                                        disabled={isDisabled}
                                        className="mt-0.5"
                                    />
                                    <span className="text-sm leading-snug text-foreground">
                                        <span className="font-medium">
                                            Under penalties of perjury, I declare that this certificate, to the best of my
                                            knowledge and belief, is true, correct, and complete.
                                        </span>
                                        {field.value && (
                                            <span className="mt-2 block text-xs text-muted-foreground">
                                                Acknowledged on {new Date(field.value as unknown as string).toLocaleDateString()}
                                            </span>
                                        )}
                                    </span>
                                </label>
                            )}
                        />
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
