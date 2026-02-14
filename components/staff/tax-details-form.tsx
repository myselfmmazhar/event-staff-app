'use client';

import { useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SignaturePad } from '@/components/ui/signature-pad';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { BusinessStructure } from '@prisma/client';
import { StaffTaxDetailsSchema, type UpsertStaffTaxDetailsInput } from '@/lib/schemas/staff-tax-details.schema';
import { trpc } from '@/lib/client/trpc';
import { toast } from '@/components/ui/use-toast';
import { Loader2Icon, Upload, FileText, X, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';

// Form schema - derived from the upsert schema but without staffId (passed as prop)
const formSchema = StaffTaxDetailsSchema.upsert.omit({ staffId: true });
type TaxDetailsFormInput = z.input<typeof formSchema>;

export interface TaxDetailsFormRef {
    getFormData: () => Promise<TaxDetailsFormInput | null>;
}

interface TaxDetailsFormProps {
    staffId?: string;
    initialData?: {
        collectTaxDetails?: boolean;
        trackFor1099?: boolean;
        businessStructure?: BusinessStructure | string;
        businessName?: string | null;
        ssn?: string | null;
        ein?: string | null;
        identificationFrontUrl?: string | null;
        identificationBackUrl?: string | null;
        electronic1099Consent?: boolean;
        signatureUrl?: string | null;
        consentDate?: Date | string | null;
    } | null;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export const TaxDetailsForm = forwardRef<TaxDetailsFormRef, TaxDetailsFormProps>(function TaxDetailsForm({
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
            collectTaxDetails: initialData?.collectTaxDetails ?? false,
            trackFor1099: initialData?.trackFor1099 ?? false,
            businessStructure: (initialData?.businessStructure as BusinessStructure) ?? BusinessStructure.INDIVIDUAL,
            businessName: initialData?.businessName ?? '',
            ssn: initialData?.ssn ?? '',
            ein: initialData?.ein ?? '',
            identificationFrontUrl: initialData?.identificationFrontUrl ?? null,
            identificationBackUrl: initialData?.identificationBackUrl ?? null,
            electronic1099Consent: initialData?.electronic1099Consent ?? false,
            signatureUrl: initialData?.signatureUrl ?? null,
            consentDate: initialData?.consentDate ? new Date(initialData.consentDate) : null,
        },
    });

    // When full tax details load (with SSN/EIN), reset the form with complete data
    // Only reset if the form hasn't been modified by the user (isDirty = false)
    useEffect(() => {
        if (fetchedTaxDetails && !isDirty) {
            reset({
                collectTaxDetails: fetchedTaxDetails.collectTaxDetails ?? false,
                trackFor1099: fetchedTaxDetails.trackFor1099 ?? false,
                businessStructure: (fetchedTaxDetails.businessStructure as BusinessStructure) ?? BusinessStructure.INDIVIDUAL,
                businessName: fetchedTaxDetails.businessName ?? '',
                ssn: fetchedTaxDetails.ssn ?? '',
                ein: fetchedTaxDetails.ein ?? '',
                identificationFrontUrl: fetchedTaxDetails.identificationFrontUrl ?? null,
                identificationBackUrl: fetchedTaxDetails.identificationBackUrl ?? null,
                electronic1099Consent: fetchedTaxDetails.electronic1099Consent ?? false,
                signatureUrl: fetchedTaxDetails.signatureUrl ?? null,
                consentDate: fetchedTaxDetails.consentDate ? new Date(fetchedTaxDetails.consentDate) : null,
            });
        }
    }, [fetchedTaxDetails, reset, isDirty]);

    const collectTaxDetails = watch('collectTaxDetails');
    const businessStructure = watch('businessStructure');

    const upsertMutation = trpc.staffTaxDetails.upsert.useMutation({
        onSuccess: () => {
            toast({
                title: 'Tax details saved',
                description: 'Tax details have been saved successfully',
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
    }), [handleSubmit]);

    // File upload state for ID verification
    const [uploadingFront, setUploadingFront] = useState(false);
    const [uploadingBack, setUploadingBack] = useState(false);
    const [dragActiveFront, setDragActiveFront] = useState(false);
    const [dragActiveBack, setDragActiveBack] = useState(false);

    const identificationFrontUrl = watch('identificationFrontUrl');
    const identificationBackUrl = watch('identificationBackUrl');

    const handleIdUpload = useCallback(async (
        files: FileList | null,
        side: 'front' | 'back',
    ) => {
        if (!files || files.length === 0) return;
        const file = files[0];
        if (!file) return;
        const setUploading = side === 'front' ? setUploadingFront : setUploadingBack;
        const fieldName = side === 'front' ? 'identificationFrontUrl' : 'identificationBackUrl';

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('bucket', 'staff-documents');

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to upload ${file.name}`);
            }

            const data = await response.json();
            setValue(fieldName, data.url, { shouldValidate: true });
            toast({
                title: 'Document uploaded',
                description: `ID ${side} uploaded successfully`,
            });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to upload document';
            toast({
                title: 'Upload failed',
                description: message,
                variant: 'error',
            });
        } finally {
            setUploading(false);
        }
    }, [setValue]);

    const handleIdRemove = useCallback((side: 'front' | 'back') => {
        const fieldName = side === 'front' ? 'identificationFrontUrl' : 'identificationBackUrl';
        setValue(fieldName, null, { shouldValidate: true });
    }, [setValue]);

    return (
        <div className="space-y-6">
            {/* Tax Collection Preferences */}
            <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
                <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Tax Collection Preferences</h3>
                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <Controller
                            name="collectTaxDetails"
                            control={control}
                            render={({ field }) => (
                                <Checkbox
                                    id="collectTaxDetails"
                                    checked={field.value}
                                    onChange={(e) => field.onChange(e.target.checked)}
                                    disabled={isSubmitting || upsertMutation.isPending}
                                    className="mt-1"
                                />
                            )}
                        />
                        <div>
                            <Label htmlFor="collectTaxDetails" className="cursor-pointer">Collect tax details?</Label>
                            <p className="text-sm text-muted-foreground">Enable to collect tax information from this talent</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <Controller
                            name="trackFor1099"
                            control={control}
                            render={({ field }) => (
                                <Checkbox
                                    id="trackFor1099"
                                    checked={field.value}
                                    onChange={(e) => field.onChange(e.target.checked)}
                                    disabled={isSubmitting || upsertMutation.isPending}
                                    className="mt-1"
                                />
                            )}
                        />
                        <div>
                            <Label htmlFor="trackFor1099" className="cursor-pointer">Track for 1099?</Label>
                            <p className="text-sm text-muted-foreground">Track payments for 1099 tax reporting</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Business Information - Only show if collecting tax details */}
            {collectTaxDetails && (
                <>
                    <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
                        <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Business Information</h3>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="businessStructure">Structure</Label>
                                <Controller
                                    name="businessStructure"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            disabled={isSubmitting || upsertMutation.isPending}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select structure" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={BusinessStructure.INDIVIDUAL}>Individual/Sole Proprietor</SelectItem>
                                                <SelectItem value={BusinessStructure.LLC}>LLC</SelectItem>
                                                <SelectItem value={BusinessStructure.CORPORATION}>Corporation</SelectItem>
                                                <SelectItem value={BusinessStructure.PARTNERSHIP}>Partnership</SelectItem>
                                                <SelectItem value={BusinessStructure.OTHER}>Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>

                            {businessStructure !== BusinessStructure.INDIVIDUAL && (
                                <div>
                                    <Label htmlFor="businessName">Business Name (if applicable)</Label>
                                    <Input
                                        id="businessName"
                                        {...register('businessName')}
                                        disabled={isSubmitting || upsertMutation.isPending}
                                        placeholder="Enter business name"
                                    />
                                    {errors.businessName && (
                                        <p className="text-sm text-destructive mt-1">{errors.businessName.message}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tax Identifiers */}
                    <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
                        <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Tax Identifiers</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            This information is securely stored and used for tax reporting purposes only.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="ssn">Social Security Number</Label>
                                <Input
                                    id="ssn"
                                    type="password"
                                    {...register('ssn')}
                                    disabled={isSubmitting || upsertMutation.isPending}
                                    placeholder="XXX-XX-XXXX"
                                    autoComplete="off"
                                />
                                {errors.ssn && (
                                    <p className="text-sm text-destructive mt-1">{errors.ssn.message}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="ein">Employer Identification Number</Label>
                                <Input
                                    id="ein"
                                    {...register('ein')}
                                    disabled={isSubmitting || upsertMutation.isPending}
                                    placeholder="XX-XXXXXXX"
                                />
                                {errors.ein && (
                                    <p className="text-sm text-destructive mt-1">{errors.ein.message}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ID Verification Documents */}
                    <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
                        <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">ID Verification</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Government issued ID (Driver&apos;s license, passport, etc.)
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Front */}
                            <div>
                                <Label>ID Front</Label>
                                {identificationFrontUrl ? (
                                    <div className="mt-1 flex items-center justify-between gap-2 p-3 bg-muted/30 border border-border/30 rounded-lg">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                            <span className="text-sm font-medium truncate">ID Front Uploaded</span>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                onClick={() => window.open(identificationFrontUrl, '_blank')}
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                onClick={() => handleIdRemove('front')}
                                                disabled={isSubmitting || upsertMutation.isPending}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        className={cn(
                                            'mt-1 border-2 border-dashed rounded-lg p-4 text-center transition-colors',
                                            dragActiveFront ? 'border-primary bg-primary/5' : 'border-border',
                                            isSubmitting || upsertMutation.isPending || uploadingFront
                                                ? 'opacity-50 cursor-not-allowed'
                                                : 'cursor-pointer hover:border-primary/50'
                                        )}
                                        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActiveFront(true); }}
                                        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActiveFront(false); }}
                                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                        onDrop={(e) => {
                                            e.preventDefault(); e.stopPropagation(); setDragActiveFront(false);
                                            if (!(isSubmitting || upsertMutation.isPending)) handleIdUpload(e.dataTransfer.files, 'front');
                                        }}
                                        onClick={() => {
                                            if (!(isSubmitting || upsertMutation.isPending || uploadingFront)) {
                                                document.getElementById('id-front-upload')?.click();
                                            }
                                        }}
                                    >
                                        <input
                                            id="id-front-upload"
                                            type="file"
                                            accept=".jpg,.jpeg,.png,.pdf"
                                            className="hidden"
                                            onChange={(e) => { handleIdUpload(e.target.files, 'front'); e.target.value = ''; }}
                                            disabled={isSubmitting || upsertMutation.isPending || uploadingFront}
                                        />
                                        {uploadingFront ? (
                                            <div className="flex flex-col items-center gap-1">
                                                <Spinner className="h-6 w-6 text-primary" />
                                                <p className="text-xs text-muted-foreground">Uploading...</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-1">
                                                <Upload className="h-6 w-6 text-muted-foreground" />
                                                <p className="text-xs text-muted-foreground">Drop or click to upload</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {errors.identificationFrontUrl && (
                                    <p className="text-sm text-destructive mt-1">{errors.identificationFrontUrl.message}</p>
                                )}
                            </div>
                            {/* Back */}
                            <div>
                                <Label>ID Back</Label>
                                {identificationBackUrl ? (
                                    <div className="mt-1 flex items-center justify-between gap-2 p-3 bg-muted/30 border border-border/30 rounded-lg">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                            <span className="text-sm font-medium truncate">ID Back Uploaded</span>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                onClick={() => window.open(identificationBackUrl, '_blank')}
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                onClick={() => handleIdRemove('back')}
                                                disabled={isSubmitting || upsertMutation.isPending}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        className={cn(
                                            'mt-1 border-2 border-dashed rounded-lg p-4 text-center transition-colors',
                                            dragActiveBack ? 'border-primary bg-primary/5' : 'border-border',
                                            isSubmitting || upsertMutation.isPending || uploadingBack
                                                ? 'opacity-50 cursor-not-allowed'
                                                : 'cursor-pointer hover:border-primary/50'
                                        )}
                                        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActiveBack(true); }}
                                        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActiveBack(false); }}
                                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                        onDrop={(e) => {
                                            e.preventDefault(); e.stopPropagation(); setDragActiveBack(false);
                                            if (!(isSubmitting || upsertMutation.isPending)) handleIdUpload(e.dataTransfer.files, 'back');
                                        }}
                                        onClick={() => {
                                            if (!(isSubmitting || upsertMutation.isPending || uploadingBack)) {
                                                document.getElementById('id-back-upload')?.click();
                                            }
                                        }}
                                    >
                                        <input
                                            id="id-back-upload"
                                            type="file"
                                            accept=".jpg,.jpeg,.png,.pdf"
                                            className="hidden"
                                            onChange={(e) => { handleIdUpload(e.target.files, 'back'); e.target.value = ''; }}
                                            disabled={isSubmitting || upsertMutation.isPending || uploadingBack}
                                        />
                                        {uploadingBack ? (
                                            <div className="flex flex-col items-center gap-1">
                                                <Spinner className="h-6 w-6 text-primary" />
                                                <p className="text-xs text-muted-foreground">Uploading...</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-1">
                                                <Upload className="h-6 w-6 text-muted-foreground" />
                                                <p className="text-xs text-muted-foreground">Drop or click to upload</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {errors.identificationBackUrl && (
                                    <p className="text-sm text-destructive mt-1">{errors.identificationBackUrl.message}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Electronic Consent */}
                    <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
                        <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Electronic Delivery of Tax Forms (Form 1099)</h3>

                        <div className="space-y-4 text-sm text-muted-foreground">
                            <p>
                                By checking this box and submitting this form, I affirmatively consent to receive any IRS Form 1099 and other required tax statements from <strong className="text-foreground">[Company Legal Name]</strong> (and its affiliated entities, if applicable) electronically instead of by paper mail.
                            </p>

                            <p>I acknowledge and agree that:</p>

                            <ol className="list-decimal list-outside ml-5 space-y-3">
                                <li>
                                    <strong className="text-foreground">Scope of Consent</strong>
                                    <p className="mt-1">This consent applies to all Forms 1099 and related tax statements required to be furnished to me for the current tax year and all future tax years, unless I withdraw my consent as described below.</p>
                                </li>
                                <li>
                                    <strong className="text-foreground">Method of Delivery</strong>
                                    <p className="mt-1">I understand that my Form 1099 will be delivered electronically by one or more of the following methods:</p>
                                    <ul className="list-disc list-outside ml-5 mt-1 space-y-1">
                                        <li>Via secure download through an online portal or dashboard; and/or</li>
                                        <li>By email notification with instructions on how to securely access and download the form.</li>
                                    </ul>
                                </li>
                                <li>
                                    <strong className="text-foreground">Hardware and Software Requirements</strong>
                                    <p className="mt-1">I confirm that I have access to:</p>
                                    <ul className="list-disc list-outside ml-5 mt-1 space-y-1">
                                        <li>A computer or mobile device with internet access</li>
                                        <li>A valid email address</li>
                                        <li>A web browser capable of accessing secure websites</li>
                                        <li>Software capable of opening and printing PDF files (e.g., Adobe Reader)</li>
                                    </ul>
                                </li>
                                <li>
                                    <strong className="text-foreground">Paper Copy Option</strong>
                                    <p className="mt-1">I understand that I may request a paper copy of my Form 1099 at any time at no cost by contacting <strong className="text-foreground">[support@email.com]</strong> or by updating my preferences in my account dashboard.</p>
                                </li>
                                <li>
                                    <strong className="text-foreground">Withdrawal of Consent</strong>
                                    <p className="mt-1">I understand that I may withdraw my consent to electronic delivery at any time by providing written notice to <strong className="text-foreground">[support@email.com]</strong> or by updating my preferences in my account dashboard.</p>
                                    <p className="mt-1">Any withdrawal will apply only to future tax statements and will not affect the validity of statements previously furnished electronically.</p>
                                </li>
                                <li>
                                    <strong className="text-foreground">Updating Contact Information</strong>
                                    <p className="mt-1">I agree to keep my email address and contact information current and understand that failure to do so may result in delayed or failed delivery of my electronic tax statements.</p>
                                </li>
                                <li>
                                    <strong className="text-foreground">Consent and Signature</strong>
                                    <p className="mt-1">I understand that my electronic consent and submission of this form constitutes my electronic signature and has the same legal effect as a handwritten signature.</p>
                                </li>
                            </ol>
                        </div>

                        {/* Consent Acknowledgment */}
                        <div className="mt-6 pt-4 border-t border-border">
                            <h4 className="font-semibold text-base mb-3">Electronic 1099 Disclosure &amp; Consent Acknowledgment</h4>
                            <Controller
                                name="electronic1099Consent"
                                control={control}
                                render={({ field }) => (
                                    <RadioGroup
                                        value={field.value ? 'yes' : 'no'}
                                        onValueChange={(val) => field.onChange(val === 'yes')}
                                        disabled={isSubmitting || upsertMutation.isPending}
                                        className="flex items-center gap-6"
                                    >
                                        <div className="flex items-center gap-2">
                                            <RadioGroupItem value="yes" id="consent-yes" />
                                            <Label htmlFor="consent-yes" className="cursor-pointer font-normal">Yes</Label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <RadioGroupItem value="no" id="consent-no" />
                                            <Label htmlFor="consent-no" className="cursor-pointer font-normal">No</Label>
                                        </div>
                                    </RadioGroup>
                                )}
                            />
                            <p className="text-xs text-muted-foreground mt-3 mb-5">
                                I consent to receive my IRS Form 1099 and other tax documents electronically instead of by paper mail. I have reviewed and agree to the Electronic 1099 Disclosure &amp; Consent terms.
                            </p>
                        </div>

                        {/* Signature */}
                        <div className="mt-4">
                            <Label>Signature</Label>
                            <div className="mt-1.5">
                                <Controller
                                    name="signatureUrl"
                                    control={control}
                                    render={({ field }) => (
                                        <SignaturePad
                                            value={field.value}
                                            onChange={field.onChange}
                                            disabled={isSubmitting || upsertMutation.isPending}
                                        />
                                    )}
                                />
                            </div>
                            {errors.signatureUrl && (
                                <p className="text-sm text-destructive mt-1">{errors.signatureUrl.message}</p>
                            )}
                        </div>

                        {/* Consent Date */}
                        <div className="mt-4">
                            <Label htmlFor="consentDate">Consent Date</Label>
                            <Controller
                                name="consentDate"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        id="consentDate"
                                        type="date"
                                        value={field.value instanceof Date && !isNaN(field.value.getTime())
                                            ? field.value.toISOString().split('T')[0]
                                            : ''
                                        }
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            field.onChange(val ? new Date(val + 'T00:00:00') : null);
                                        }}
                                        disabled={isSubmitting || upsertMutation.isPending}
                                    />
                                )}
                            />
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
                            disabled={isSubmitting || upsertMutation.isPending}
                        >
                            Cancel
                        </Button>
                    )}
                    <Button type="button" onClick={handleSubmit(onSubmit)} disabled={isSubmitting || upsertMutation.isPending}>
                        {(isSubmitting || upsertMutation.isPending) && (
                            <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Save Tax Details
                    </Button>
                </div>
            )}
        </div>
    );
});
