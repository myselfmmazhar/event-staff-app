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
    Briefcase,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { useScrollToTopOnChange } from '@/hooks/use-scroll-to-top-on-change';
import { cn } from '@/lib/utils';
import { phoneValidation } from '@/lib/utils/validation';
import { FieldErrors } from '@/lib/utils/error-messages';
import { BusinessStructure } from '@prisma/client';
import {
    PerRequirementDocumentUpload,
    type CategorizedDocument,
} from '@/components/staff/per-requirement-document-upload';
import { ServiceSelectionTable } from '@/components/staff/form-sections/service-selection-table';
import { AddressAutocomplete } from '@/components/maps/address-autocomplete';
import {
    REQ_TEMPLATE_CARDS,
    computeRequirementTemplatesFromServices,
    computeCustomCardsFromServices,
    countDocumentTemplates,
    type ReqTemplateId,
    type ServiceForReqMerge,
    type CustomRequirementCard,
} from '@/lib/requirement-templates';

/* ------------------------------------------------------------------ */
/* Constants & schema                                                 */
/* ------------------------------------------------------------------ */

const ALL_WIZARD_STEPS = ['personal', 'services', 'tax', 'requirements', 'review'] as const;
type WizardStep = (typeof ALL_WIZARD_STEPS)[number];

const STEP_LABELS: Record<WizardStep, string> = {
    personal: 'Personal Information',
    services: 'Services',
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
    exemptPayeeCode: string;
    fatcaExemptionCode: string;
    taxAddress: string;
    taxCity: string;
    taxState: string;
    taxZip: string;
    accountNumbers: string;
    ssn: string;
    ein: string;
    // W-9 additions
    otherClassificationDescription: string;
    hasForeignPartners: boolean;
    requesterNameAddress: string;
    w9SubjectToBackupWithholding: boolean;
};

const emptyTaxFields: TaxFields = {
    taxName: '',
    businessName: '',
    businessStructure: BusinessStructure.INDIVIDUAL,
    llcClassification: '',
    exemptPayeeCode: '',
    fatcaExemptionCode: '',
    taxAddress: '',
    taxCity: '',
    taxState: '',
    taxZip: '',
    accountNumbers: '',
    ssn: '',
    ein: '',
    otherClassificationDescription: '',
    hasForeignPartners: false,
    requesterNameAddress: '',
    w9SubjectToBackupWithholding: false,
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

    // Whether admin left service selection to the talent (no admin-assigned services)
    const showServicesStep = !(myProfile?.services?.length);

    const activeSteps = useMemo(
        () => ALL_WIZARD_STEPS.filter((s) => s !== 'services' || showServicesStep),
        [showServicesStep]
    );

    // Wizard state
    const [wizardStep, setWizardStep] = useState<WizardStep>('personal');
    const bodyScrollRef = useScrollToTopOnChange<HTMLDivElement>(wizardStep);
    const stepIndex = activeSteps.indexOf(wizardStep);
    const isLastStep = wizardStep === 'review';

    // Step — services (talent-selected when admin chose Talent mode)
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
    const { data: availableServices = [] } = trpc.staff.getServices.useQuery(undefined, {
        enabled: isOpen,
    });

    // Step 2 — tax fields kept in local state so we can run the SSN/EIN cross-field check
    const [taxFields, setTaxFields] = useState<TaxFields>(emptyTaxFields);
    const [taxErrors, setTaxErrors] = useState<TaxFieldErrors>({});
    const [taxSubmitAttempted, setTaxSubmitAttempted] = useState(false);

    // Step 3 — categorized per requirement template
    const [documents, setDocuments] = useState<
        Partial<Record<ReqTemplateId, CategorizedDocument>>
    >({});
    const [ackRecords, setAckRecords] = useState(false);
    const documentsCount = Object.values(documents).filter(Boolean).length;

    // Step 4
    const [ackCertification, setAckCertification] = useState(false);
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

        // Note: onboarding documents are categorized per requirement, so we don't
        // prefill from the legacy `documents` JSON array (admin uses the legacy
        // categorize tool to migrate those later).

        if (myProfile.taxDetails) {
            setTaxFields({
                taxName: myProfile.taxDetails.taxName || '',
                businessName: myProfile.taxDetails.businessName || '',
                businessStructure:
                    (myProfile.taxDetails.businessStructure as BusinessStructure) ||
                    BusinessStructure.INDIVIDUAL,
                llcClassification: myProfile.taxDetails.llcClassification || '',
                exemptPayeeCode: myProfile.taxDetails.exemptPayeeCode || '',
                fatcaExemptionCode: myProfile.taxDetails.fatcaExemptionCode || '',
                taxAddress: myProfile.taxDetails.taxAddress || '',
                taxCity: myProfile.taxDetails.taxCity || '',
                taxState: myProfile.taxDetails.taxState || '',
                taxZip: myProfile.taxDetails.taxZip || '',
                accountNumbers: myProfile.taxDetails.accountNumbers || '',
                ssn: '',
                ein: '',
                otherClassificationDescription:
                    (myProfile.taxDetails as any).otherClassificationDescription || '',
                hasForeignPartners: (myProfile.taxDetails as any).hasForeignPartners ?? false,
                requesterNameAddress:
                    (myProfile.taxDetails as any).requesterNameAddress || '',
                w9SubjectToBackupWithholding:
                    (myProfile.taxDetails as any).w9SubjectToBackupWithholding ?? false,
            });
        }

        setPrefilled(true);
    }, [myProfile, prefilled, form]);

    // Requirement cards derived from services — admin-assigned when available, otherwise talent-selected
    const requiredTemplates = useMemo<Set<ReqTemplateId>>(() => {
        if (myProfile?.services?.length) {
            const serviceIds = myProfile.services.map((s) => s.serviceId);
            const services: ServiceForReqMerge[] = myProfile.services.map((s) => ({
                id: s.serviceId,
                category: s.service.category ?? null,
            }));
            return computeRequirementTemplatesFromServices(serviceIds, services);
        }
        if (selectedServiceIds.length) {
            const services: ServiceForReqMerge[] = selectedServiceIds.map((id) => {
                const svc = availableServices.find((s) => s.id === id);
                return { id, category: svc?.category ?? null };
            });
            return computeRequirementTemplatesFromServices(selectedServiceIds, services);
        }
        return new Set<ReqTemplateId>(['w9']);
    }, [myProfile, selectedServiceIds, availableServices]);

    /** Distinct custom-card requirement rows for the talent's services. */
    const requiredCustomCards = useMemo<CustomRequirementCard[]>(() => {
        if (myProfile?.services?.length) {
            const serviceIds = myProfile.services.map((s) => s.serviceId);
            const services: ServiceForReqMerge[] = myProfile.services.map((s) => ({
                id: s.serviceId,
                category: s.service.category ?? null,
            }));
            return computeCustomCardsFromServices(serviceIds, services);
        }
        if (selectedServiceIds.length) {
            const services: ServiceForReqMerge[] = selectedServiceIds.map((id) => {
                const svc = availableServices.find((s) => s.id === id);
                return { id, category: svc?.category ?? null };
            });
            return computeCustomCardsFromServices(selectedServiceIds, services);
        }
        return [];
    }, [myProfile, selectedServiceIds, availableServices]);

    /** One document upload required per active card (excludes W-9 / e-signature, which have their own steps). */
    const requiredDocumentCount = useMemo(
        () => countDocumentTemplates(requiredTemplates),
        [requiredTemplates]
    );

    /** Talent acknowledgements per custom card: doc/link checkboxes. */
    const [customAcks, setCustomAcks] = useState<
        Record<string, { doc?: boolean; link?: boolean }>
    >({});

    /** True when every present doc/link on every custom card has been acknowledged. */
    const customAcksSatisfied = useMemo(() => {
        for (const card of requiredCustomCards) {
            const ack = customAcks[card.id];
            if (card.customDocumentUrl && !ack?.doc) return false;
            if (card.customLinkUrl && !ack?.link) return false;
        }
        return true;
    }, [requiredCustomCards, customAcks]);

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
            if (documentsCount < requiredDocumentCount) {
                const missing = requiredDocumentCount - documentsCount;
                toast({
                    message:
                        requiredDocumentCount === 1
                            ? 'Please upload a document for the active requirement to continue.'
                            : `Please upload ${requiredDocumentCount} documents (one for each active requirement). ${missing} more needed.`,
                    type: 'error',
                });
                return;
            }
            if (!ackRecords) {
                toast({
                    message: 'Please acknowledge the statement to continue.',
                    type: 'error',
                });
                return;
            }
            if (!customAcksSatisfied) {
                toast({
                    message:
                        'Please review and acknowledge each item on the custom requirement cards to continue.',
                    type: 'error',
                });
                return;
            }
        }

        const next = activeSteps[stepIndex + 1];
        if (next) setWizardStep(next);
    };

    const goBack = () => {
        const prev = activeSteps[stepIndex - 1];
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
        if (documentsCount < requiredDocumentCount || !ackRecords || !customAcksSatisfied) {
            setWizardStep('requirements');
            return;
        }
        if (!ackCertification) {
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
        const categorizedList = Object.values(documents).filter(
            (d): d is CategorizedDocument => !!d
        );
        completeProfileMutation.mutate({
            ...contactData,
            categorizedDocuments: categorizedList.length > 0 ? categorizedList : undefined,
            serviceIds: showServicesStep && selectedServiceIds.length > 0 ? selectedServiceIds : undefined,
            taxName: taxFields.taxName,
            businessName: taxFields.businessName || undefined,
            businessStructure: taxFields.businessStructure,
            llcClassification: taxFields.llcClassification || undefined,
            exemptPayeeCode: taxFields.exemptPayeeCode || undefined,
            fatcaExemptionCode: taxFields.fatcaExemptionCode || undefined,
            taxAddress: taxFields.taxAddress,
            taxCity: taxFields.taxCity,
            taxState: taxFields.taxState,
            taxZip: taxFields.taxZip,
            accountNumbers: taxFields.accountNumbers || undefined,
            ssn: taxFields.ssn || undefined,
            ein: taxFields.ein || undefined,
            signatureUrl,
            ackRecords,
            // W-9 additions
            otherClassificationDescription:
                taxFields.otherClassificationDescription || undefined,
            hasForeignPartners: taxFields.hasForeignPartners,
            requesterNameAddress: taxFields.requesterNameAddress || undefined,
            w9SubjectToBackupWithholding: taxFields.w9SubjectToBackupWithholding,
            w9CertifiedAt: ackCertification ? new Date() : undefined,
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
                            {activeSteps.map((step) => {
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
                    <div ref={bodyScrollRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
                        {wizardStep === 'personal' && (
                            <PersonalStep
                                form={form}
                                disabled={isSubmitting}
                                email={myProfile?.email ?? ''}
                            />
                        )}

                        {wizardStep === 'services' && (
                            <ServicesStep
                                services={availableServices}
                                selectedServiceIds={selectedServiceIds}
                                onChange={setSelectedServiceIds}
                                disabled={isSubmitting}
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
                                requiredDocumentCount={requiredDocumentCount}
                                documentsCount={documentsCount}
                                documents={documents}
                                setDocuments={setDocuments}
                                ackRecords={ackRecords}
                                setAckRecords={setAckRecords}
                                customCards={requiredCustomCards}
                                customAcks={customAcks}
                                setCustomAcks={setCustomAcks}
                                disabled={isSubmitting}
                            />
                        )}

                        {wizardStep === 'review' && (
                            <ReviewStep
                                contact={form.getValues()}
                                taxFields={taxFields}
                                documents={documents}
                                documentsCount={documentsCount}
                                requiredTemplates={requiredTemplates}
                                email={myProfile?.email ?? ''}
                                signatureDataUrl={signatureDataUrl}
                                setSignatureDataUrl={setSignatureDataUrl}
                                onJumpTo={jumpTo}
                                disabled={isSubmitting}
                                ackRecords={ackRecords}
                                staffType={myProfile?.staffType ?? null}
                                ackCertification={ackCertification}
                                setAckCertification={setAckCertification}
                                selectedServices={
                                    showServicesStep
                                        ? selectedServiceIds
                                              .map((id) => availableServices.find((s) => s.id === id))
                                              .filter((s): s is NonNullable<typeof s> => !!s)
                                              .map((s) => ({ id: s.id, title: s.title }))
                                        : []
                                }
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
                                                (documentsCount < requiredDocumentCount ||
                                                    !ackRecords ||
                                                    !customAcksSatisfied))
                                        }
                                        className="h-14 w-full rounded-xl bg-slate-900 px-10 text-lg font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 hover:shadow-none disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none sm:w-auto sm:min-w-[280px]"
                                    >
                                        Continue
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        onClick={handleFinalSubmit}
                                        disabled={isSubmitting || !signatureDataUrl || !ackCertification}
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

                {taxFields.businessStructure === BusinessStructure.OTHER && (
                    <div>
                        <Label
                            htmlFor="otherClassificationDescription"
                            className="text-sm font-bold text-slate-900"
                        >
                            Other classification description
                        </Label>
                        <Input
                            id="otherClassificationDescription"
                            placeholder="Describe your tax classification"
                            disabled={disabled}
                            value={taxFields.otherClassificationDescription}
                            onChange={(e) =>
                                setTaxFields((p) => ({
                                    ...p,
                                    otherClassificationDescription: e.target.value,
                                }))
                            }
                            className="mt-2 rounded-lg border-slate-200"
                        />
                    </div>
                )}

                {(taxFields.businessStructure === BusinessStructure.PARTNERSHIP ||
                    taxFields.businessStructure === BusinessStructure.TRUST_ESTATE ||
                    (taxFields.businessStructure === BusinessStructure.LLC &&
                        taxFields.llcClassification === 'P')) && (
                    <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4">
                        <Checkbox
                            checked={taxFields.hasForeignPartners}
                            onChange={(e) =>
                                setTaxFields((p) => ({
                                    ...p,
                                    hasForeignPartners: e.target.checked,
                                }))
                            }
                            disabled={disabled}
                            className="mt-0.5"
                        />
                        <span className="text-sm leading-snug text-slate-900">
                            <span className="font-bold">Line 3b — Foreign partners, owners, or beneficiaries</span>
                            <span className="mt-1 block text-xs font-normal text-slate-500">
                                Check this if you are providing this form to a partnership, trust, or estate
                                in which you have an ownership interest and that partnership, trust, or estate
                                has any foreign partners, owners, or beneficiaries.
                            </span>
                        </span>
                    </label>
                )}

                {/* Line 4 — Exemptions */}
                <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                    <div>
                        <Label
                            htmlFor="exemptPayeeCode"
                            className="text-sm font-bold text-slate-900"
                        >
                            Exempt payee code <span className="font-normal text-slate-500">(if any)</span>
                        </Label>
                        <Input
                            id="exemptPayeeCode"
                            placeholder="Code (if applicable)"
                            disabled={disabled}
                            value={taxFields.exemptPayeeCode}
                            onChange={(e) =>
                                setTaxFields((p) => ({ ...p, exemptPayeeCode: e.target.value }))
                            }
                            className="mt-2 rounded-lg border-slate-200"
                        />
                    </div>
                    <div>
                        <Label
                            htmlFor="fatcaExemptionCode"
                            className="text-sm font-bold text-slate-900"
                        >
                            FATCA exemption code <span className="font-normal text-slate-500">(if any)</span>
                        </Label>
                        <Input
                            id="fatcaExemptionCode"
                            placeholder="Code (if applicable)"
                            disabled={disabled}
                            value={taxFields.fatcaExemptionCode}
                            onChange={(e) =>
                                setTaxFields((p) => ({ ...p, fatcaExemptionCode: e.target.value }))
                            }
                            className="mt-2 rounded-lg border-slate-200"
                        />
                    </div>
                </div>

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

                <div>
                    <Label
                        htmlFor="accountNumbers"
                        className="text-sm font-bold text-slate-900"
                    >
                        Account number(s) <span className="font-normal text-slate-500">(optional)</span>
                    </Label>
                    <Input
                        id="accountNumbers"
                        placeholder="Optional account numbers"
                        disabled={disabled}
                        value={taxFields.accountNumbers}
                        onChange={(e) =>
                            setTaxFields((p) => ({ ...p, accountNumbers: e.target.value }))
                        }
                        className="mt-2 rounded-lg border-slate-200"
                    />
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

                {/* Requester's name & address (optional) */}
                <div>
                    <Label
                        htmlFor="requesterNameAddress"
                        className="text-sm font-bold text-slate-900"
                    >
                        Requester&apos;s name and address (optional)
                    </Label>
                    <Textarea
                        id="requesterNameAddress"
                        placeholder="Name and address of the person/business requesting this Form W-9"
                        disabled={disabled}
                        value={taxFields.requesterNameAddress}
                        onChange={(e) =>
                            setTaxFields((p) => ({ ...p, requesterNameAddress: e.target.value }))
                        }
                        className="mt-2 min-h-[72px] rounded-lg border-slate-200"
                    />
                </div>

                {/* Backup-withholding notification */}
                <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4">
                    <Checkbox
                        checked={taxFields.w9SubjectToBackupWithholding}
                        onChange={(e) =>
                            setTaxFields((p) => ({
                                ...p,
                                w9SubjectToBackupWithholding: e.target.checked,
                            }))
                        }
                        disabled={disabled}
                        className="mt-0.5"
                    />
                    <span className="text-sm leading-snug text-slate-900">
                        <span className="font-bold">
                            I have been notified by the IRS that I am currently subject to backup withholding
                        </span>
                        <span className="mt-1 block text-xs font-normal text-slate-500">
                            Only check if the IRS has notified you that you are currently subject to backup
                            withholding because of underreporting interest or dividends on your tax return.
                        </span>
                    </span>
                </label>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Step 3 — Requirements & Documents                                  */
/* ------------------------------------------------------------------ */

function RequirementsStep({
    requiredTemplates,
    requiredDocumentCount,
    documentsCount,
    documents,
    setDocuments,
    ackRecords,
    setAckRecords,
    customCards,
    customAcks,
    setCustomAcks,
    disabled,
}: {
    requiredTemplates: Set<ReqTemplateId>;
    requiredDocumentCount: number;
    documentsCount: number;
    documents: Partial<Record<ReqTemplateId, CategorizedDocument>>;
    setDocuments: (docs: Partial<Record<ReqTemplateId, CategorizedDocument>>) => void;
    ackRecords: boolean;
    setAckRecords: (v: boolean) => void;
    customCards: CustomRequirementCard[];
    customAcks: Record<string, { doc?: boolean; link?: boolean }>;
    setCustomAcks: React.Dispatch<
        React.SetStateAction<Record<string, { doc?: boolean; link?: boolean }>>
    >;
    disabled: boolean;
}) {
    // Exclude the generic 'custom' static card from the read-only packet grid;
    // each custom requirement renders below as its own per-row card.
    const templateCards = REQ_TEMPLATE_CARDS.filter(
        (c) => requiredTemplates.has(c.id) && c.id !== 'custom'
    );

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
                    {requiredDocumentCount > 0
                        ? `Upload one file for each active requirement above. ${documentsCount} of ${requiredDocumentCount} uploaded.`
                        : 'No document uploads required for your onboarding packet.'}
                </p>
                <div className="mt-4">
                    <PerRequirementDocumentUpload
                        requiredTemplates={requiredTemplates}
                        documents={documents}
                        onChange={setDocuments}
                        disabled={disabled}
                    />
                </div>
            </div>

            {/* Custom requirement cards (admin-defined: name + optional doc + optional link) */}
            {customCards.length > 0 && (
                <div className="mt-8 pt-6 border-t border-slate-100">
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                        Additional Requirements
                    </h4>
                    <p className="mt-1 text-xs text-slate-500">
                        Review the items below. You must acknowledge each provided document and
                        link before continuing.
                    </p>
                    <div className="mt-4 space-y-3">
                        {customCards.map((card) => {
                            const ack = customAcks[card.id] ?? {};
                            const hasDoc = !!card.customDocumentUrl;
                            const hasLink = !!card.customLinkUrl;
                            return (
                                <div
                                    key={card.id}
                                    className="rounded-2xl border border-slate-200 bg-white p-4"
                                >
                                    <p className="text-sm font-bold text-slate-900">
                                        {card.name}
                                    </p>
                                    {card.instructions && (
                                        <p className="mt-1 text-xs text-slate-500">
                                            {card.instructions}
                                        </p>
                                    )}

                                    {!hasDoc && !hasLink && (
                                        <p className="mt-3 text-xs italic text-slate-400">
                                            No items to acknowledge.
                                        </p>
                                    )}

                                    {hasDoc && (
                                        <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <a
                                                    href={card.customDocumentUrl ?? '#'}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex min-w-0 items-center gap-2 text-sm font-medium text-primary hover:underline"
                                                >
                                                    <FileText className="h-4 w-4 shrink-0" />
                                                    <span className="truncate">
                                                        {card.customDocumentName ??
                                                            'View document'}
                                                    </span>
                                                </a>
                                            </div>
                                            <label className="mt-3 flex cursor-pointer items-start gap-3">
                                                <Checkbox
                                                    checked={!!ack.doc}
                                                    onChange={(e) =>
                                                        setCustomAcks((prev) => ({
                                                            ...prev,
                                                            [card.id]: {
                                                                ...prev[card.id],
                                                                doc: e.target.checked,
                                                            },
                                                        }))
                                                    }
                                                    disabled={disabled}
                                                    className="mt-0.5"
                                                />
                                                <span className="text-sm font-medium text-slate-700">
                                                    I have reviewed the document.
                                                </span>
                                            </label>
                                        </div>
                                    )}

                                    {hasLink && (
                                        <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                                            <a
                                                href={card.customLinkUrl ?? '#'}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline break-all"
                                            >
                                                {card.customLinkLabel || card.customLinkUrl}
                                            </a>
                                            <label className="mt-3 flex cursor-pointer items-start gap-3">
                                                <Checkbox
                                                    checked={!!ack.link}
                                                    onChange={(e) =>
                                                        setCustomAcks((prev) => ({
                                                            ...prev,
                                                            [card.id]: {
                                                                ...prev[card.id],
                                                                link: e.target.checked,
                                                            },
                                                        }))
                                                    }
                                                    disabled={disabled}
                                                    className="mt-0.5"
                                                />
                                                <span className="text-sm font-medium text-slate-700">
                                                    I have read the linked information.
                                                </span>
                                            </label>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Acknowledgments */}
            <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-3">
                    <p className="text-sm font-bold text-slate-900">Acknowledgments</p>
                </div>
                <div className="divide-y divide-slate-100">
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
/* Step 2 — Services (shown only when admin chose Talent mode)        */
/* ------------------------------------------------------------------ */

function ServicesStep({
    services,
    selectedServiceIds,
    onChange,
    disabled,
}: {
    services: { id: string; title: string }[];
    selectedServiceIds: string[];
    onChange: (ids: string[]) => void;
    disabled: boolean;
}) {
    return (
        <div className="mx-auto max-w-4xl">
            <h3 className="text-base font-bold text-slate-900">Services</h3>
            <p className="mt-1 text-xs text-slate-500 mb-6">
                Select the service types you offer. This is optional — you can update it later from
                your profile.
            </p>
            <ServiceSelectionTable
                services={services}
                value={selectedServiceIds}
                onChange={onChange}
                disabled={disabled}
            />
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
    documentsCount,
    requiredTemplates,
    email,
    signatureDataUrl,
    setSignatureDataUrl,
    onJumpTo,
    disabled,
    ackRecords,
    staffType,
    ackCertification,
    setAckCertification,
    selectedServices,
}: {
    contact: ContactFormData;
    taxFields: TaxFields;
    documents: Partial<Record<ReqTemplateId, CategorizedDocument>>;
    documentsCount: number;
    requiredTemplates: Set<ReqTemplateId>;
    email: string;
    signatureDataUrl: string | null;
    setSignatureDataUrl: (v: string | null) => void;
    onJumpTo: (step: WizardStep) => void;
    disabled: boolean;
    ackRecords: boolean;
    staffType: string | null;
    ackCertification: boolean;
    setAckCertification: (v: boolean) => void;
    selectedServices: { id: string; title: string }[];
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

                {/* Services (talent-selected) */}
                {selectedServices.length > 0 && (
                    <div className="group relative rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-slate-300 hover:shadow-xl hover:shadow-slate-100/50 md:col-span-2">
                        <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                                    <Briefcase className="h-4 w-4" />
                                </div>
                                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                                    Services
                                </h4>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 rounded-full px-3 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                onClick={() => onJumpTo('services')}
                            >
                                Edit
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {selectedServices.map((svc) => (
                                <span
                                    key={svc.id}
                                    className="inline-flex items-center rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm font-medium text-slate-900 shadow-sm"
                                >
                                    {svc.title}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

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
                            Documents ({documentsCount})
                        </p>
                        {documentsCount === 0 ? (
                            <p className="text-sm italic text-slate-400">No documents uploaded</p>
                        ) : (
                            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {Object.values(documents)
                                    .filter((d): d is CategorizedDocument => !!d)
                                    .map((doc) => (
                                        <li
                                            key={doc.requirementTemplateId}
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
            {ackRecords && (
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
                        <div className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                            <p className="text-sm text-slate-700">
                                You have acknowledged that <span className="font-semibold">incomplete records may delay activation and payment</span>.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Certification */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                        <ClipboardCheck className="h-4 w-4" />
                    </div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                        Certification
                    </h4>
                    <span className="text-sm text-destructive">*</span>
                </div>

                {staffType === 'EMPLOYEE' ? (
                    <p className="mb-5 text-sm text-slate-600 leading-relaxed">
                        Under penalties of perjury, I declare that I have examined this certificate
                        and, to the best of my knowledge and belief, it is true, correct, and
                        complete.
                    </p>
                ) : (
                    <div className="mb-5 space-y-2 text-sm text-slate-600 leading-relaxed">
                        <p>Under penalties of perjury, I certify that:</p>
                        <div className="space-y-2 pl-4">
                            <p>1. The number shown on this form is my correct taxpayer identification number (or I am waiting for a number to be issued to me); and</p>
                            <div className="space-y-1">
                                <p>2. I am not subject to backup withholding because:</p>
                                <div className="space-y-1 pl-4">
                                    <p>a. I am exempt from backup withholding, or</p>
                                    <p>b. I have not been notified by the Internal Revenue Service (IRS) that I am subject to backup withholding as a result of a failure to report all interest or dividends, or</p>
                                    <p>c. The IRS has notified me that I am no longer subject to backup withholding; and</p>
                                </div>
                            </div>
                            <p>3. I am a U.S. citizen or other U.S. person (defined in the instructions); and</p>
                            <p>4. The FATCA code(s) entered on this form (if any) indicating that I am exempt from FATCA reporting is correct.</p>
                        </div>
                    </div>
                )}

                <label className="flex cursor-pointer items-start gap-3">
                    <Checkbox
                        checked={ackCertification}
                        onChange={(e) => setAckCertification(e.target.checked)}
                        disabled={disabled}
                        className="mt-0.5"
                    />
                    <p className="text-sm font-bold text-slate-900">
                        I certify the above statements are true and correct.
                    </p>
                </label>
            </div>

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
