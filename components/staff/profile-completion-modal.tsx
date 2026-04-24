'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Info,
    ClipboardCheck,
    User,
    Calculator,
    FileText,
    PenLine,
    Eye,
    EyeOff,
    CheckCircle2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { SignaturePad } from '@/components/ui/signature-pad';

import { trpc } from '@/lib/client/trpc';
import { cn } from '@/lib/utils';
import { phoneValidation } from '@/lib/utils/validation';
import { FieldErrors } from '@/lib/utils/error-messages';
import { BusinessStructure } from '@prisma/client';
import {
    StaffDocumentUpload,
    type StaffDocument,
} from '@/components/staff/staff-document-upload';
import { AddressAutocomplete } from '@/components/maps/address-autocomplete';
import {
    REQ_TEMPLATE_CARDS,
    computeRequirementTemplatesFromServices,
    type ReqTemplateId,
    type ServiceForReqMerge,
} from '@/lib/requirement-templates';

/* ------------------------------------------------------------------ */
/* Constants & schema                                                 */
/* ------------------------------------------------------------------ */

const WIZARD_STEPS = ['personal', 'tax', 'requirements', 'review'] as const;
type WizardStep = (typeof WIZARD_STEPS)[number];

const STEP_LABELS: Record<WizardStep, string> = {
    personal: 'Personal Information',
    tax: 'Tax Information',
    requirements: 'Requirements & Documents',
    review: 'Review & Sign',
};

const contactFormSchema = z.object({
    firstName: z.string().min(1, 'First name is required').max(50),
    lastName: z.string().min(1, 'Last name is required').max(50),
    phone: z
        .string()
        .min(1, 'Mobile number is required')
        .refine((phone) => phoneValidation.isValid(phone), {
            message: FieldErrors.phone.invalid,
        }),
    streetAddress: z.string().min(1, 'Street address is required').max(300),
    aptSuiteUnit: z.string().max(50).optional(),
    city: z.string().min(1, 'City is required').max(100),
    state: z.string().min(1, 'State is required').max(50),
    zipCode: z.string().min(1, 'ZIP code is required').max(20),
    country: z.string().min(1, 'Country is required').max(100),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

const businessStructureLabels: Record<BusinessStructure, string> = {
    INDIVIDUAL: 'Individual / Sole Proprietor',
    LLC: 'LLC',
    C_CORPORATION: 'C Corporation',
    S_CORPORATION: 'S Corporation',
    PARTNERSHIP: 'Partnership',
    TRUST_ESTATE: 'Trust/Estate',
    OTHER: 'Other',
};

const SSN_PATTERN = /^\d{3}-?\d{2}-?\d{4}$/;
const EIN_PATTERN = /^\d{2}-?\d{7}$/;

type TaxFieldErrors = Partial<
    Record<
        | 'taxName'
        | 'taxAddress'
        | 'taxCity'
        | 'taxState'
        | 'taxZip'
        | 'ssn'
        | 'ein'
        | 'llcClassification',
        string
    >
>;

type TaxFields = {
    taxName: string;
    businessName: string;
    businessStructure: BusinessStructure;
    llcClassification: string;
    taxAddress: string;
    taxCity: string;
    taxState: string;
    taxZip: string;
    ssn: string;
    ein: string;
};

const emptyTaxFields: TaxFields = {
    taxName: '',
    businessName: '',
    businessStructure: BusinessStructure.INDIVIDUAL,
    llcClassification: '',
    taxAddress: '',
    taxCity: '',
    taxState: '',
    taxZip: '',
    ssn: '',
    ein: '',
};

interface ProfileCompletionModalProps {
    isOpen: boolean;
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export function ProfileCompletionModal({ isOpen }: ProfileCompletionModalProps) {
    const router = useRouter();
    const utils = trpc.useUtils();

    // Profile used to prefill form from admin-entered data
    const { data: myProfile } = trpc.staff.getMyProfile.useQuery(undefined, {
        enabled: isOpen,
    });

    // Wizard state
    const [wizardStep, setWizardStep] = useState<WizardStep>('personal');
    const stepIndex = WIZARD_STEPS.indexOf(wizardStep);
    const isLastStep = wizardStep === 'review';

    // Step 2 — tax fields kept in local state so we can run the SSN/EIN cross-field check
    const [taxFields, setTaxFields] = useState<TaxFields>(emptyTaxFields);
    const [taxErrors, setTaxErrors] = useState<TaxFieldErrors>({});
    const [taxSubmitAttempted, setTaxSubmitAttempted] = useState(false);

    // Step 3
    const [documents, setDocuments] = useState<StaffDocument[]>([]);
    const [ackPolicy, setAckPolicy] = useState(false);
    const [ackRecords, setAckRecords] = useState(false);

    // Step 4
    const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
    const [isUploadingSignature, setIsUploadingSignature] = useState(false);

    // Personal fields — RHF
    const form = useForm<ContactFormData>({
        resolver: zodResolver(contactFormSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            phone: '',
            streetAddress: '',
            aptSuiteUnit: '',
            city: '',
            state: '',
            zipCode: '',
            country: 'USA',
        },
    });

    // Prefill from admin-entered staff data once it loads
    const [prefilled, setPrefilled] = useState(false);
    useEffect(() => {
        if (!myProfile || prefilled) return;

        form.reset({
            firstName: myProfile.firstName || '',
            lastName: myProfile.lastName || '',
            phone: myProfile.phone || '',
            streetAddress: myProfile.streetAddress || '',
            aptSuiteUnit: myProfile.aptSuiteUnit || '',
            city: myProfile.city || '',
            state: myProfile.state || '',
            zipCode: myProfile.zipCode || '',
            country: myProfile.country || 'USA',
        });

        if (Array.isArray(myProfile.documents)) {
            setDocuments(myProfile.documents as unknown as StaffDocument[]);
        }

        if (myProfile.taxDetails) {
            setTaxFields({
                taxName: myProfile.taxDetails.taxName || '',
                businessName: myProfile.taxDetails.businessName || '',
                businessStructure:
                    (myProfile.taxDetails.businessStructure as BusinessStructure) ||
                    BusinessStructure.INDIVIDUAL,
                llcClassification: myProfile.taxDetails.llcClassification || '',
                taxAddress: myProfile.taxDetails.taxAddress || '',
                taxCity: myProfile.taxDetails.taxCity || '',
                taxState: myProfile.taxDetails.taxState || '',
                taxZip: myProfile.taxDetails.taxZip || '',
                ssn: '',
                ein: '',
            });
        }

        setPrefilled(true);
    }, [myProfile, prefilled, form]);

    // Requirement cards derived from assigned services (same logic as admin wizard)
    const requiredTemplates = useMemo<Set<ReqTemplateId>>(() => {
        if (!myProfile?.services?.length) {
            return new Set<ReqTemplateId>(['w9']);
        }
        const serviceIds = myProfile.services.map((s) => s.serviceId);
        const services: ServiceForReqMerge[] = myProfile.services.map((s) => ({
            id: s.serviceId,
            category: s.service.category ?? null,
        }));
        return computeRequirementTemplatesFromServices(serviceIds, services);
    }, [myProfile]);

    /* -------------------- mutation -------------------- */

    const completeProfileMutation = trpc.staff.completeProfile.useMutation({
        onSuccess: async () => {
            toast({ message: 'Profile completed successfully!', type: 'success' });
            await utils.staff.getMyProfile.invalidate();
            await utils.profile.getMyProfile.invalidate();
            router.push('/dashboard');
            router.refresh();
        },
        onError: (error) => {
            toast({
                message: error.message || 'Failed to save profile',
                type: 'error',
            });
        },
    });

    const isSubmitting = completeProfileMutation.isPending || isUploadingSignature;

    /* -------------------- validators -------------------- */

    const validateTax = (): TaxFieldErrors => {
        const errors: TaxFieldErrors = {};
        const ssn = taxFields.ssn.trim();
        const ein = taxFields.ein.trim();

        if (!taxFields.taxName.trim()) {
            errors.taxName = 'Name (as shown on your income tax return) is required';
        }
        if (!taxFields.taxAddress.trim()) errors.taxAddress = 'Tax address is required';
        if (!taxFields.taxCity.trim()) errors.taxCity = 'Tax city is required';
        if (!taxFields.taxState.trim()) errors.taxState = 'Tax state is required';
        if (!taxFields.taxZip.trim()) errors.taxZip = 'Tax ZIP code is required';

        if (!ssn && !ein) {
            errors.ssn =
                'Either Social Security Number or Employer Identification Number is required';
        } else {
            if (ssn && !SSN_PATTERN.test(ssn)) {
                errors.ssn = 'SSN must be in format XXX-XX-XXXX';
            }
            if (ein && !EIN_PATTERN.test(ein)) {
                errors.ein = 'EIN must be in format XX-XXXXXXX';
            }
        }

        if (
            taxFields.businessStructure === BusinessStructure.LLC &&
            !taxFields.llcClassification.trim()
        ) {
            errors.llcClassification =
                'LLC Tax Classification is required when Federal Tax Classification is LLC';
        }

        return errors;
    };

    const showTaxError = (field: keyof TaxFieldErrors) =>
        taxSubmitAttempted && !!taxErrors[field];

    /* -------------------- step nav -------------------- */

    const goNext = async () => {
        if (wizardStep === 'personal') {
            const ok = await form.trigger();
            if (!ok) return;
        } else if (wizardStep === 'tax') {
            setTaxSubmitAttempted(true);
            const errors = validateTax();
            setTaxErrors(errors);
            if (Object.keys(errors).length > 0) {
                const first = Object.values(errors)[0];
                if (first) toast({ message: first, type: 'error' });
                return;
            }
        } else if (wizardStep === 'requirements') {
            if (documents.length === 0) {
                toast({
                    message: 'Please upload at least one document to continue.',
                    type: 'error',
                });
                return;
            }
            if (!ackPolicy || !ackRecords) {
                toast({
                    message: 'Please acknowledge both statements to continue.',
                    type: 'error',
                });
                return;
            }
        }

        const next = WIZARD_STEPS[stepIndex + 1];
        if (next) setWizardStep(next);
    };

    const goBack = () => {
        const prev = WIZARD_STEPS[stepIndex - 1];
        if (prev) setWizardStep(prev);
    };

    const jumpTo = (step: WizardStep) => setWizardStep(step);

    /* -------------------- signature upload -------------------- */

    const uploadSignature = async (dataUrl: string): Promise<string> => {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], `signature-${Date.now()}.png`, {
            type: 'image/png',
        });
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', 'staff-documents');

        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err?.error || 'Failed to upload signature');
        }

        const data = await response.json();
        return data.url as string;
    };

    /* -------------------- final submit -------------------- */

    const handleFinalSubmit = async () => {
        if (!signatureDataUrl) {
            toast({
                message: 'Please sign to complete your profile.',
                type: 'error',
            });
            return;
        }

        // Defensive: re-run earlier validations so nobody can skip by jumping tabs.
        const personalOk = await form.trigger();
        if (!personalOk) {
            setWizardStep('personal');
            return;
        }
        const taxValidationErrors = validateTax();
        if (Object.keys(taxValidationErrors).length > 0) {
            setTaxErrors(taxValidationErrors);
            setTaxSubmitAttempted(true);
            setWizardStep('tax');
            return;
        }
        if (documents.length === 0 || !ackPolicy || !ackRecords) {
            setWizardStep('requirements');
            return;
        }

        setIsUploadingSignature(true);
        let signatureUrl: string;
        try {
            signatureUrl = await uploadSignature(signatureDataUrl);
        } catch (err: any) {
            toast({
                message: err?.message || 'Failed to upload signature. Please try again.',
                type: 'error',
            });
            setIsUploadingSignature(false);
            return;
        }
        setIsUploadingSignature(false);

        const contactData = form.getValues();
        completeProfileMutation.mutate({
            ...contactData,
            documents: documents.length > 0 ? documents : undefined,
            taxName: taxFields.taxName,
            businessName: taxFields.businessName || undefined,
            businessStructure: taxFields.businessStructure,
            llcClassification: taxFields.llcClassification || undefined,
            taxAddress: taxFields.taxAddress,
            taxCity: taxFields.taxCity,
            taxState: taxFields.taxState,
            taxZip: taxFields.taxZip,
            ssn: taxFields.ssn || undefined,
            ein: taxFields.ein || undefined,
            signatureUrl,
            ackPolicy,
            ackRecords,
        });
    };

    if (!isOpen) return null;

    /* -------------------- render -------------------- */

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6">
                <div className="mx-4 my-4 flex h-[min(94vh,1000px)] w-full max-h-[min(94vh,1000px)] max-w-[1200px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                    {/* Header + step tabs */}
                    <div className="shrink-0 border-b border-slate-200 px-6 pb-0 pt-5 sm:px-8">
                        <div className="min-w-0 flex-1 pr-2">
                            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                                Complete Your Profile
                            </h2>
                            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
                                Please finish all steps below to start using the platform. This
                                cannot be skipped.
                            </p>
                        </div>

                        <div className="mt-6 flex gap-1 overflow-x-auto border-t border-slate-200/90 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            {WIZARD_STEPS.map((step) => {
                                const active = wizardStep === step;
                                return (
                                    <button
                                        key={step}
                                        type="button"
                                        onClick={() => jumpTo(step)}
                                        disabled={isSubmitting}
                                        className={cn(
                                            'relative shrink-0 whitespace-nowrap px-3 py-3 text-sm transition-colors',
                                            active
                                                ? 'font-bold text-slate-900'
                                                : 'font-medium text-slate-500 hover:text-slate-700'
                                        )}
                                    >
                                        {STEP_LABELS[step]}
                                        {active && (
                                            <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-slate-900" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Body */}
                    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
                        {wizardStep === 'personal' && (
                            <PersonalStep
                                form={form}
                                disabled={isSubmitting}
                                email={myProfile?.email ?? ''}
                            />
                        )}

                        {wizardStep === 'tax' && (
                            <TaxStep
                                taxFields={taxFields}
                                setTaxFields={setTaxFields}
                                showError={showTaxError}
                                taxErrors={taxErrors}
                                disabled={isSubmitting}
                                contactData={form.getValues()}
                            />
                        )}

                        {wizardStep === 'requirements' && (
                            <RequirementsStep
                                requiredTemplates={requiredTemplates}
                                documents={documents}
                                setDocuments={setDocuments}
                                ackPolicy={ackPolicy}
                                setAckPolicy={setAckPolicy}
                                ackRecords={ackRecords}
                                setAckRecords={setAckRecords}
                                disabled={isSubmitting}
                            />
                        )}

                        {wizardStep === 'review' && (
                            <ReviewStep
                                contact={form.getValues()}
                                taxFields={taxFields}
                                documents={documents}
                                requiredTemplates={requiredTemplates}
                                email={myProfile?.email ?? ''}
                                signatureDataUrl={signatureDataUrl}
                                setSignatureDataUrl={setSignatureDataUrl}
                                onJumpTo={jumpTo}
                                disabled={isSubmitting}
                                ackPolicy={ackPolicy}
                                ackRecords={ackRecords}
                            />
                        )}
                    </div>

                    {/* Footer */}
                    <div className="shrink-0 border-t border-slate-200 bg-slate-50/50 px-6 py-5 sm:px-8">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-1">
                                {!isLastStep ? (
                                    <Button
                                        type="button"
                                        onClick={goNext}
                                        disabled={
                                            isSubmitting ||
                                            (wizardStep === 'requirements' &&
                                                (documents.length === 0 || !ackPolicy || !ackRecords))
                                        }
                                        className="h-14 w-full rounded-xl bg-slate-900 px-10 text-lg font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 hover:shadow-none disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none sm:w-auto sm:min-w-[280px]"
                                    >
                                        Continue
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        onClick={handleFinalSubmit}
                                        disabled={isSubmitting || !signatureDataUrl}
                                        isLoading={isSubmitting}
                                        className="h-14 w-full rounded-xl bg-slate-900 px-10 text-lg font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 hover:shadow-none disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none sm:w-auto sm:min-w-[280px]"
                                    >
                                        {isUploadingSignature
                                            ? 'Uploading signature...'
                                            : completeProfileMutation.isPending
                                              ? 'Saving...'
                                              : 'Submit'}
                                    </Button>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                                {stepIndex > 0 && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={goBack}
                                        disabled={isSubmitting}
                                        className="h-10 rounded-xl border-slate-200 bg-white px-5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                                    >
                                        Back
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

/* ------------------------------------------------------------------ */
/* Step 1 — Personal Information                                      */
/* ------------------------------------------------------------------ */

function PersonalStep({
    form,
    disabled,
    email,
}: {
    form: ReturnType<typeof useForm<ContactFormData>>;
    disabled: boolean;
    email: string;
}) {
    return (
        <div className="mx-auto max-w-4xl">
            <h3 className="text-base font-bold text-slate-900">1. Personal Information</h3>
            <p className="mt-1 text-xs text-slate-500">
                Confirm your contact details and address. Fields pre-filled from your invite can
                be edited.
            </p>

            {/* Identity */}
            <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                <div>
                    <Label className="text-sm font-bold text-slate-900" htmlFor="firstName" requiredMark>First Name</Label>
                    <Input
                        id="firstName"
                        disabled={disabled}
                        className="mt-2 rounded-lg border-slate-200"
                        invalid={!!form.formState.errors.firstName}
                        {...form.register('firstName')}
                    />
                    {form.formState.errors.firstName && (
                        <p className="mt-1 text-sm text-destructive">
                            {String(form.formState.errors.firstName.message)}
                        </p>
                    )}
                </div>
                <div>
                    <Label className="text-sm font-bold text-slate-900" htmlFor="lastName" requiredMark>Last Name</Label>
                    <Input
                        id="lastName"
                        disabled={disabled}
                        className="mt-2 rounded-lg border-slate-200"
                        invalid={!!form.formState.errors.lastName}
                        {...form.register('lastName')}
                    />
                    {form.formState.errors.lastName && (
                        <p className="mt-1 text-sm text-destructive">
                            {String(form.formState.errors.lastName.message)}
                        </p>
                    )}
                </div>
                <div className="md:col-span-2">
                    <Label className="text-sm font-bold text-slate-900">Email</Label>
                    <div className="mt-2 flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 truncate">
                        {email || '—'}
                    </div>
                </div>
            </div>

            {/* Contact */}
            <div className="mt-8 pt-6 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Contact
                </h4>
                <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                    <div>
                        <div className="flex items-center gap-1.5">
                            <Label
                                htmlFor="phone"
                                className="text-sm font-bold text-slate-900"
                                requiredMark
                            >
                                Mobile Number
                            </Label>
                            <span className="relative inline-flex group">
                                <Info className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 cursor-help" />
                                <span className="pointer-events-none invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap rounded-md bg-slate-900 text-white text-xs px-2.5 py-1.5 shadow-lg z-50">
                                    The text message will be sent on this number
                                </span>
                            </span>
                        </div>
                        <Input
                            id="phone"
                            type="tel"
                            placeholder="(555) 555-5555"
                            invalid={!!form.formState.errors.phone}
                            disabled={disabled}
                            className="mt-2 rounded-lg border-slate-200"
                            {...form.register('phone')}
                        />
                        {form.formState.errors.phone && (
                            <p className="mt-1 text-sm text-destructive">
                                {String(form.formState.errors.phone.message)}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Address */}
            <div className="mt-8 pt-6 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Address
                </h4>

                <div className="mt-4">
                    <AddressAutocomplete
                        label="Search Address"
                        placeholder="Type to search..."
                        disabled={disabled}
                        onSelect={(data) => {
                            form.setValue('streetAddress', data.address, {
                                shouldValidate: true,
                            });
                            form.setValue('city', data.city, { shouldValidate: true });
                            form.setValue('state', data.state, { shouldValidate: true });
                            form.setValue('zipCode', data.zipCode, { shouldValidate: true });
                            form.setValue('country', 'USA', { shouldValidate: true });
                        }}
                    />
                </div>

                <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                    <div className="md:col-span-2">
                        <Label
                            htmlFor="streetAddress"
                            className="text-sm font-bold text-slate-900"
                            requiredMark
                        >
                            Street Address
                        </Label>
                        <Input
                            id="streetAddress"
                            placeholder="123 Main St"
                            invalid={!!form.formState.errors.streetAddress}
                            disabled={disabled}
                            className="mt-2 rounded-lg border-slate-200"
                            {...form.register('streetAddress')}
                        />
                        {form.formState.errors.streetAddress && (
                            <p className="mt-1 text-sm text-destructive">
                                {String(form.formState.errors.streetAddress.message)}
                            </p>
                        )}
                    </div>
                    <div className="md:col-span-2">
                        <Label
                            htmlFor="aptSuiteUnit"
                            className="text-sm font-bold text-slate-900"
                        >
                            Apt/Suite/Unit
                        </Label>
                        <Input
                            id="aptSuiteUnit"
                            placeholder="Apt 4B (optional)"
                            disabled={disabled}
                            className="mt-2 rounded-lg border-slate-200"
                            {...form.register('aptSuiteUnit')}
                        />
                    </div>
                </div>

                <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-5">
                    <div>
                        <Label
                            htmlFor="city"
                            className="text-sm font-bold text-slate-900"
                            requiredMark
                        >
                            City
                        </Label>
                        <Input
                            id="city"
                            placeholder="New York"
                            invalid={!!form.formState.errors.city}
                            disabled={disabled}
                            className="mt-2 rounded-lg border-slate-200"
                            {...form.register('city')}
                        />
                        {form.formState.errors.city && (
                            <p className="mt-1 text-sm text-destructive">
                                {String(form.formState.errors.city.message)}
                            </p>
                        )}
                    </div>
                    <div>
                        <Label
                            htmlFor="state"
                            className="text-sm font-bold text-slate-900"
                            requiredMark
                        >
                            State
                        </Label>
                        <Input
                            id="state"
                            placeholder="NY"
                            invalid={!!form.formState.errors.state}
                            disabled={disabled}
                            className="mt-2 rounded-lg border-slate-200"
                            {...form.register('state')}
                        />
                        {form.formState.errors.state && (
                            <p className="mt-1 text-sm text-destructive">
                                {String(form.formState.errors.state.message)}
                            </p>
                        )}
                    </div>
                    <div>
                        <Label
                            htmlFor="zipCode"
                            className="text-sm font-bold text-slate-900"
                            requiredMark
                        >
                            ZIP Code
                        </Label>
                        <Input
                            id="zipCode"
                            placeholder="10001"
                            invalid={!!form.formState.errors.zipCode}
                            disabled={disabled}
                            className="mt-2 rounded-lg border-slate-200"
                            {...form.register('zipCode')}
                        />
                        {form.formState.errors.zipCode && (
                            <p className="mt-1 text-sm text-destructive">
                                {String(form.formState.errors.zipCode.message)}
                            </p>
                        )}
                    </div>
                    <div>
                        <Label
                            htmlFor="country"
                            className="text-sm font-bold text-slate-900"
                            requiredMark
                        >
                            Country
                        </Label>
                        <Input
                            id="country"
                            placeholder="USA"
                            invalid={!!form.formState.errors.country}
                            disabled={disabled}
                            className="mt-2 rounded-lg border-slate-200"
                            {...form.register('country')}
                        />
                        {form.formState.errors.country && (
                            <p className="mt-1 text-sm text-destructive">
                                {String(form.formState.errors.country.message)}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Step 2 — Tax Information                                           */
/* ------------------------------------------------------------------ */

function TaxStep({
    taxFields,
    setTaxFields,
    showError,
    taxErrors,
    disabled,
    contactData,
}: {
    taxFields: TaxFields;
    setTaxFields: React.Dispatch<React.SetStateAction<TaxFields>>;
    showError: (field: keyof TaxFieldErrors) => boolean;
    taxErrors: TaxFieldErrors;
    disabled: boolean;
    contactData: ContactFormData;
}) {
    const [usePersonalAddress, setUsePersonalAddress] = useState(false);
    const [ssnVisible, setSsnVisible] = useState(false);

    const handleAutofill = (checked: boolean) => {
        setUsePersonalAddress(checked);
        if (checked) {
            setTaxFields(prev => ({
                ...prev,
                taxAddress: [contactData.streetAddress, contactData.aptSuiteUnit].filter(Boolean).join(' '),
                taxCity: contactData.city,
                taxState: contactData.state,
                taxZip: contactData.zipCode,
            }));
        }
    };

    return (
        <div className="mx-auto max-w-4xl">
            <h3 className="text-base font-bold text-slate-900">2. Tax Information</h3>
            <p className="mt-1 text-xs text-slate-500">
                Please provide your tax information to complete your profile.
            </p>

            <div className="mt-6 space-y-6 rounded-xl border border-slate-200 bg-slate-50/50 p-5">
                <div>
                    <Label
                        htmlFor="taxName"
                        className="text-sm font-bold text-slate-900"
                        requiredMark
                    >
                        Name (as shown on your income tax return)
                    </Label>
                    <Input
                        id="taxName"
                        placeholder="Legal name"
                        disabled={disabled}
                        value={taxFields.taxName}
                        onChange={(e) =>
                            setTaxFields((p) => ({ ...p, taxName: e.target.value }))
                        }
                        invalid={showError('taxName')}
                        className="mt-2 rounded-lg border-slate-200"
                    />
                    {showError('taxName') && (
                        <p className="mt-1 text-sm text-destructive">{taxErrors.taxName}</p>
                    )}
                </div>

                <div>
                    <Label
                        htmlFor="businessName"
                        className="text-sm font-bold text-slate-900"
                    >
                        Business name (if different from above)
                    </Label>
                    <Input
                        id="businessName"
                        placeholder="Business name (if applicable)"
                        disabled={disabled}
                        value={taxFields.businessName}
                        onChange={(e) =>
                            setTaxFields((p) => ({ ...p, businessName: e.target.value }))
                        }
                        className="mt-2 rounded-lg border-slate-200"
                    />
                </div>

                <div>
                    <Label
                        htmlFor="businessStructure"
                        className="text-sm font-bold text-slate-900"
                    >
                        Federal Tax Classification
                    </Label>
                    <Select
                        value={taxFields.businessStructure}
                        onValueChange={(v) =>
                            setTaxFields((p) => ({
                                ...p,
                                businessStructure: v as BusinessStructure,
                            }))
                        }
                        disabled={disabled}
                    >
                        <SelectTrigger
                            id="businessStructure"
                            className="mt-2 rounded-lg border-slate-200"
                        >
                            <SelectValue placeholder="Select classification" />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(businessStructureLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {taxFields.businessStructure === BusinessStructure.LLC && (
                    <div>
                        <Label
                            htmlFor="llcClassification"
                            className="text-sm font-bold text-slate-900"
                            requiredMark
                        >
                            LLC Tax Classification
                        </Label>
                        <Select
                            value={taxFields.llcClassification}
                            onValueChange={(v) =>
                                setTaxFields((p) => ({ ...p, llcClassification: v }))
                            }
                            disabled={disabled}
                        >
                            <SelectTrigger
                                id="llcClassification"
                                aria-invalid={showError('llcClassification')}
                                className="mt-2 rounded-lg border-slate-200"
                            >
                                <SelectValue placeholder="Select LLC classification" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="C">C — C Corporation</SelectItem>
                                <SelectItem value="S">S — S Corporation</SelectItem>
                                <SelectItem value="P">P — Partnership</SelectItem>
                            </SelectContent>
                        </Select>
                        {showError('llcClassification') && (
                            <p className="mt-1 text-sm text-destructive">
                                {taxErrors.llcClassification}
                            </p>
                        )}
                    </div>
                )}

                <div className="pt-4 border-t border-slate-100">
                    <div className="flex items-center space-x-2 pb-4">
                        <Checkbox
                            id="autofillAddress"
                            checked={usePersonalAddress}
                            disabled={disabled}
                            onChange={(e) => handleAutofill(e.target.checked)}
                        />
                        <label
                            htmlFor="autofillAddress"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700"
                        >
                            Use address from Personal Information
                        </label>
                    </div>

                    {!usePersonalAddress && (
                        <div className="mb-4">
                            <AddressAutocomplete
                                label="Search Address"
                                placeholder="Type to search..."
                                disabled={disabled}
                                onSelect={(data) => {
                                    setTaxFields((p) => ({
                                        ...p,
                                        taxAddress: data.address,
                                        taxCity: data.city,
                                        taxState: data.state,
                                        taxZip: data.zipCode,
                                    }));
                                }}
                            />
                        </div>
                    )}

                    <Label
                        htmlFor="taxAddress"
                        className="text-sm font-bold text-slate-900"
                        requiredMark
                    >
                        Address (number, street, apt/suite)
                    </Label>
                    <Input
                        id="taxAddress"
                        placeholder="Street address"
                        disabled={disabled}
                        readOnly={usePersonalAddress}
                        value={taxFields.taxAddress}
                        onChange={(e) =>
                            !usePersonalAddress && setTaxFields((p) => ({ ...p, taxAddress: e.target.value }))
                        }
                        invalid={showError('taxAddress')}
                        className={cn('mt-2 rounded-lg border-slate-200', usePersonalAddress && 'bg-slate-50 text-slate-500')}
                    />
                    {showError('taxAddress') && (
                        <p className="mt-1 text-sm text-destructive">{taxErrors.taxAddress}</p>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-3">
                    <div>
                        <Label
                            htmlFor="taxCity"
                            className="text-sm font-bold text-slate-900"
                            requiredMark
                        >
                            City
                        </Label>
                        <Input
                            id="taxCity"
                            placeholder="City"
                            disabled={disabled}
                            readOnly={usePersonalAddress}
                            value={taxFields.taxCity}
                            onChange={(e) =>
                                !usePersonalAddress && setTaxFields((p) => ({ ...p, taxCity: e.target.value }))
                            }
                            invalid={showError('taxCity')}
                            className={cn('mt-2 rounded-lg border-slate-200', usePersonalAddress && 'bg-slate-50 text-slate-500')}
                        />
                        {showError('taxCity') && (
                            <p className="mt-1 text-sm text-destructive">{taxErrors.taxCity}</p>
                        )}
                    </div>
                    <div>
                        <Label
                            htmlFor="taxState"
                            className="text-sm font-bold text-slate-900"
                            requiredMark
                        >
                            State
                        </Label>
                        <Input
                            id="taxState"
                            placeholder="State"
                            disabled={disabled}
                            readOnly={usePersonalAddress}
                            value={taxFields.taxState}
                            onChange={(e) =>
                                !usePersonalAddress && setTaxFields((p) => ({ ...p, taxState: e.target.value }))
                            }
                            invalid={showError('taxState')}
                            className={cn('mt-2 rounded-lg border-slate-200', usePersonalAddress && 'bg-slate-50 text-slate-500')}
                        />
                        {showError('taxState') && (
                            <p className="mt-1 text-sm text-destructive">{taxErrors.taxState}</p>
                        )}
                    </div>
                    <div>
                        <Label
                            htmlFor="taxZip"
                            className="text-sm font-bold text-slate-900"
                            requiredMark
                        >
                            ZIP Code
                        </Label>
                        <Input
                            id="taxZip"
                            placeholder="ZIP"
                            disabled={disabled}
                            readOnly={usePersonalAddress}
                            value={taxFields.taxZip}
                            onChange={(e) =>
                                !usePersonalAddress && setTaxFields((p) => ({ ...p, taxZip: e.target.value }))
                            }
                            invalid={showError('taxZip')}
                            className={cn('mt-2 rounded-lg border-slate-200', usePersonalAddress && 'bg-slate-50 text-slate-500')}
                        />
                        {showError('taxZip') && (
                            <p className="mt-1 text-sm text-destructive">{taxErrors.taxZip}</p>
                        )}
                    </div>
                </div>

                <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
                    <div>
                        <p className="text-sm font-bold text-slate-900">
                            Taxpayer Identification Number (TIN){' '}
                            <span className="text-destructive">*</span>
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                            Provide at least one of the following:
                        </p>
                    </div>
                    <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                        <div>
                            <Label
                                htmlFor="ssn"
                                className="text-sm font-bold text-slate-900"
                            >
                                Social Security Number
                            </Label>
                            <div className="relative mt-2">
                                <Input
                                    id="ssn"
                                    type={ssnVisible ? 'text' : 'password'}
                                    placeholder="XXX-XX-XXXX"
                                    disabled={disabled}
                                    autoComplete="off"
                                    value={taxFields.ssn}
                                    onChange={(e) =>
                                        setTaxFields((p) => ({ ...p, ssn: e.target.value }))
                                    }
                                    invalid={showError('ssn')}
                                    className="rounded-lg border-slate-200 pr-10"
                                />
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={() => setSsnVisible((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    aria-label={ssnVisible ? 'Hide SSN' : 'Show SSN'}
                                >
                                    {ssnVisible ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                            {showError('ssn') && (
                                <p className="mt-1 text-sm text-destructive">{taxErrors.ssn}</p>
                            )}
                        </div>
                        <div>
                            <Label
                                htmlFor="ein"
                                className="text-sm font-bold text-slate-900"
                            >
                                Employer Identification Number
                            </Label>
                            <Input
                                id="ein"
                                placeholder="XX-XXXXXXX"
                                disabled={disabled}
                                value={taxFields.ein}
                                onChange={(e) =>
                                    setTaxFields((p) => ({ ...p, ein: e.target.value }))
                                }
                                invalid={showError('ein')}
                                className="mt-2 rounded-lg border-slate-200"
                            />
                            {showError('ein') && (
                                <p className="mt-1 text-sm text-destructive">{taxErrors.ein}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Step 3 — Requirements & Documents                                  */
/* ------------------------------------------------------------------ */

function RequirementsStep({
    requiredTemplates,
    documents,
    setDocuments,
    ackPolicy,
    setAckPolicy,
    ackRecords,
    setAckRecords,
    disabled,
}: {
    requiredTemplates: Set<ReqTemplateId>;
    documents: StaffDocument[];
    setDocuments: (docs: StaffDocument[]) => void;
    ackPolicy: boolean;
    setAckPolicy: (v: boolean) => void;
    ackRecords: boolean;
    setAckRecords: (v: boolean) => void;
    disabled: boolean;
}) {
    const templateCards = REQ_TEMPLATE_CARDS.filter((c) => requiredTemplates.has(c.id));

    return (
        <div className="mx-auto max-w-4xl">
            <h3 className="text-base font-bold text-slate-900">3. Requirements & Documents</h3>
            <p className="mt-1 text-xs text-slate-500">
                Below is the onboarding packet assigned to you. Upload the supporting documents
                and acknowledge the statements before continuing.
            </p>

            {/* Requirement cards */}
            <div className="mt-6">
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Onboarding Packet
                </h4>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {templateCards.map((card) => (
                        <div
                            key={card.id}
                            className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-3"
                        >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-600 shadow-sm">
                                <card.Icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-xs font-bold text-slate-900">
                                    {card.title}
                                </p>
                                <p className="text-[10px] font-bold uppercase tracking-tight text-slate-400">
                                    Active Requirement
                                </p>
                            </div>
                        </div>
                    ))}
                    {templateCards.length === 0 && (
                        <p className="col-span-full rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-4 text-center text-sm font-bold italic text-slate-400">
                            No specific requirements — please upload any supporting documents your
                            admin requested.
                        </p>
                    )}
                </div>
            </div>

            {/* Document uploads */}
            <div className="mt-8 pt-6 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Document Uploads
                </h4>
                <p className="mt-1 text-xs text-slate-500">
                    Upload at least one supporting document to continue.
                </p>
                <div className="mt-4">
                    <StaffDocumentUpload
                        documents={documents}
                        onChange={setDocuments}
                        disabled={disabled}
                    />
                </div>
            </div>

            {/* Acknowledgments */}
            <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-3">
                    <p className="text-sm font-bold text-slate-900">Acknowledgments</p>
                </div>
                <div className="divide-y divide-slate-100">
                    <label className="flex cursor-pointer items-start gap-3 px-5 py-4">
                        <Checkbox
                            checked={ackPolicy}
                            onChange={(e) => setAckPolicy(e.target.checked)}
                            disabled={disabled}
                            className="mt-0.5"
                        />
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900">
                                I acknowledge the safety and code of conduct policy.
                            </p>
                        </div>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 px-5 py-4">
                        <Checkbox
                            checked={ackRecords}
                            onChange={(e) => setAckRecords(e.target.checked)}
                            disabled={disabled}
                            className="mt-0.5"
                        />
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900">
                                I understand incomplete records may delay activation and payment.
                            </p>
                        </div>
                    </label>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Step 4 — Review & Sign                                             */
/* ------------------------------------------------------------------ */

function ReviewStep({
    contact,
    taxFields,
    documents,
    requiredTemplates,
    email,
    signatureDataUrl,
    setSignatureDataUrl,
    onJumpTo,
    disabled,
    ackPolicy,
    ackRecords,
}: {
    contact: ContactFormData;
    taxFields: TaxFields;
    documents: StaffDocument[];
    requiredTemplates: Set<ReqTemplateId>;
    email: string;
    signatureDataUrl: string | null;
    setSignatureDataUrl: (v: string | null) => void;
    onJumpTo: (step: WizardStep) => void;
    disabled: boolean;
    ackPolicy: boolean;
    ackRecords: boolean;
}) {
    const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim() || '—';
    const templateCards = REQ_TEMPLATE_CARDS.filter((c) => requiredTemplates.has(c.id));

    return (
        <div className="mx-auto max-w-6xl space-y-8">
            <div>
                <h3 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-900">
                        <ClipboardCheck className="h-5 w-5" />
                    </div>
                    Review & Confirm
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                    Verify your details below. Sign at the bottom and submit when ready.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Personal */}
                <ReviewCard
                    title="Personal Information"
                    icon={<User className="h-4 w-4" />}
                    onEdit={() => onJumpTo('personal')}
                >
                    <ReviewRow label="Name" value={fullName} />
                    <ReviewRow label="Email" value={email || '—'} />
                    <ReviewRow label="Mobile Number" value={contact.phone || '—'} />
                    <ReviewRow
                        label="Address"
                        value={
                            [
                                contact.streetAddress,
                                contact.aptSuiteUnit,
                                contact.city,
                                contact.state,
                                contact.zipCode,
                                contact.country,
                            ]
                                .filter(Boolean)
                                .join(', ') || '—'
                        }
                    />
                </ReviewCard>

                {/* Tax */}
                <ReviewCard
                    title="Tax Information"
                    icon={<Calculator className="h-4 w-4" />}
                    onEdit={() => onJumpTo('tax')}
                >
                    <ReviewRow label="Tax Name" value={taxFields.taxName || '—'} />
                    {taxFields.businessName && (
                        <ReviewRow label="Business Name" value={taxFields.businessName} />
                    )}
                    <ReviewRow
                        label="Classification"
                        value={
                            businessStructureLabels[taxFields.businessStructure] ||
                            taxFields.businessStructure
                        }
                    />
                    {taxFields.businessStructure === BusinessStructure.LLC && (
                        <ReviewRow
                            label="LLC Classification"
                            value={taxFields.llcClassification || '—'}
                        />
                    )}
                    <ReviewRow
                        label="Tax Address"
                        value={
                            [
                                taxFields.taxAddress,
                                taxFields.taxCity,
                                taxFields.taxState,
                                taxFields.taxZip,
                            ]
                                .filter(Boolean)
                                .join(', ') || '—'
                        }
                    />
                    <ReviewRow
                        label="TIN"
                        value={
                            taxFields.ssn
                                ? 'SSN provided'
                                : taxFields.ein
                                  ? `EIN ${taxFields.ein}`
                                  : '—'
                        }
                    />
                </ReviewCard>

                {/* Onboarding packet */}
                <div className="group relative rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-slate-300 hover:shadow-xl hover:shadow-slate-100/50 md:col-span-2">
                    <div className="mb-5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                                <FileText className="h-4 w-4" />
                            </div>
                            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                                Onboarding Packet
                            </h4>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-full px-3 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            onClick={() => onJumpTo('requirements')}
                        >
                            Edit
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                        {templateCards.map((card) => (
                            <div
                                key={card.id}
                                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-3"
                            >
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-600 shadow-sm">
                                    <card.Icon className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-xs font-bold text-slate-900">
                                        {card.title}
                                    </p>
                                    <p className="text-[10px] font-bold uppercase tracking-tight text-slate-400">
                                        Active Requirement
                                    </p>
                                </div>
                            </div>
                        ))}
                        {templateCards.length === 0 && (
                            <p className="col-span-full rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-4 text-center text-sm font-bold italic text-slate-400">
                                No requirements configured for this packet.
                            </p>
                        )}
                    </div>

                    <div className="mt-6 border-t border-slate-100 pt-5">
                        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                            Documents ({documents.length})
                        </p>
                        {documents.length === 0 ? (
                            <p className="text-sm italic text-slate-400">No documents uploaded</p>
                        ) : (
                            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {documents.map((doc, i) => (
                                    <li
                                        key={i}
                                        className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm text-slate-700"
                                    >
                                        <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                        <span className="truncate">{doc.name}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            {/* Acknowledgments summary */}
            {(ackPolicy || ackRecords) && (
                <div className="rounded-3xl border border-green-200 bg-green-50/60 p-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                            Acknowledgments
                        </h4>
                    </div>
                    <div className="space-y-3">
                        {ackPolicy && (
                            <div className="flex items-start gap-2">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                                <p className="text-sm text-slate-700">
                                    You have accepted the <span className="font-semibold">safety and code of conduct policy</span>.
                                </p>
                            </div>
                        )}
                        {ackRecords && (
                            <div className="flex items-start gap-2">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                                <p className="text-sm text-slate-700">
                                    You have acknowledged that <span className="font-semibold">incomplete records may delay activation and payment</span>.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Signature */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-2 flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                        <PenLine className="h-4 w-4" />
                    </div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                        Signature
                    </h4>
                    <span className="text-sm text-destructive">*</span>
                </div>
                <p className="mb-4 text-xs text-slate-500">
                    By signing below, I certify that the information provided is accurate to the
                    best of my knowledge.
                </p>
                <SignaturePad
                    value={signatureDataUrl}
                    onChange={setSignatureDataUrl}
                    disabled={disabled}
                />
            </div>
        </div>
    );
}

function ReviewCard({
    title,
    icon,
    onEdit,
    children,
}: {
    title: string;
    icon: React.ReactNode;
    onEdit: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="group relative rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-slate-300 hover:shadow-xl hover:shadow-slate-100/50">
            <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                        {icon}
                    </div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                        {title}
                    </h4>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-full px-3 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    onClick={onEdit}
                >
                    Edit
                </Button>
            </div>
            <div className="space-y-3">{children}</div>
        </div>
    );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {label}
            </span>
            <span className="text-sm font-semibold text-slate-700 break-words">{value}</span>
        </div>
    );
}
