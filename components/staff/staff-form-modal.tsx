'use client';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { z } from 'zod';
import { CloseIcon, EyeIcon, ChevronDownIcon } from '@/components/ui/icons';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { StaffSchema, type CreateStaffInput, type UpdateStaffInput } from '@/lib/schemas/staff.schema';
import { AccountStatus, StaffType, StaffRole, SkillLevel, StaffRating, AvailabilityStatus, TaxFilledBy } from '@prisma/client';
import { trpc } from '@/lib/client/trpc';
import { useTerminology } from '@/lib/hooks/use-terminology';
import { useLabels } from '@/lib/hooks/use-labels';
import type { LabelsConfig } from '@/lib/config/labels';
import type { StaffWithRelations } from '@/components/staff/staff-table';
import { ServiceFormModal } from '@/components/catalog/services/service-form-modal';
import type { CreateServiceInput } from '@/lib/schemas/service.schema';
import { toast } from '@/components/ui/use-toast';
import {
    AccountDetailsSection,
    ServiceDetailsSection,
    TalentDetailsSection,
    TeamDetailsSection,
    TeamMembersSection,
    DocumentsSection,
    type ServiceOption,
    type CompanyOption,
    type TeamMemberInput,
} from './form-sections';
import { STAFF_RATING_OPTIONS } from './form-sections/constants';
import { TaxDetailsForm, type TaxDetailsFormRef } from './tax-details-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { phoneValidation } from '@/lib/utils/validation';
import {
    FileText,
    Cloud,
    PenLine,
    Smartphone,
    Search,
    Camera,
    ClipboardCheck,
    User,
    MapPin,
    Star,
    Calculator,
} from 'lucide-react';

const STAFF_FORM_DRAFT_KEY = 'staff-add-form-draft-v1';

/** Toggle to show the collapsible “Profile, services & account settings” block on the Review step. */
const SHOW_REVIEW_PROFILE_ACCOUNT_SETTINGS = false;

/** Toggle to show the Documents upload block on the Requirements step. */
const SHOW_REQUIREMENTS_DOCUMENT_UPLOAD = false;

/**
 * Toggle to show the nested Form W-9 when “Company completes the tax form” (TaxFilledBy.STAFF) is selected.
 * When false, the mode switch still works; tax data is submitted without the inline W-9 UI.
 */
const SHOW_TAX_STAFF_W9_FORM = true;

const WIZARD_STEPS = ['basic', 'talentType', 'requirements', 'tax', 'review'] as const;
type WizardStep = (typeof WIZARD_STEPS)[number];

const STEP_LABELS: Record<WizardStep, string> = {
    basic: 'Basic Info',
    talentType: 'Experience',
    requirements: 'Requirements',
    tax: 'Tax Flow',
    review: 'Review',
};

const STAFF_TYPE_CHIPS: { id: string; label: string; value: StaffType }[] = [
    { id: 'contractor', label: 'Contractor', value: StaffType.CONTRACTOR },
    { id: 'employee', label: 'Employee', value: StaffType.EMPLOYEE },
];

function defaultTalentChipIdForStaffType(t: StaffType): string {
    switch (t) {
        case StaffType.EMPLOYEE:
            return 'employee';
        case StaffType.FREELANCE:
            return 'freelancer';
        case StaffType.COMPANY:
            return 'vendor';
        case StaffType.CONTRACTOR:
        default:
            return 'contractor';
    }
}

type ReqTemplateId = 'w9' | 'upload' | 'esign' | 'idv' | 'bg' | 'headshot';

const REQ_TEMPLATE_CARDS: {
    id: ReqTemplateId;
    title: string;
    badge: 'Standard' | 'Smart';
    description: string;
    footer: string;
    Icon: typeof FileText;
}[] = [
        {
            id: 'w9',
            title: 'Tax form - W-9',
            badge: 'Standard',
            description: 'Contractor tax requirement with acknowledgement and signature.',
            footer: 'Included for contractor',
            Icon: FileText,
        },
        {
            id: 'upload',
            title: 'File upload',
            badge: 'Standard',
            description: 'Upload certifications, insurance, IDs, or supporting documents.',
            footer: 'Add supporting docs',
            Icon: Cloud,
        },
        {
            id: 'esign',
            title: 'E-signature',
            badge: 'Standard',
            description: 'Signature-only requirement for policies, agreements, or acknowledgements.',
            footer: 'Signature required',
            Icon: PenLine,
        },
        {
            id: 'idv',
            title: 'ID verification',
            badge: 'Smart',
            description: 'Identity or document verification based on role and compliance need.',
            footer: 'Optional requirement',
            Icon: Smartphone,
        },
        {
            id: 'bg',
            title: 'Background check',
            badge: 'Smart',
            description: 'Use when the role, client, venue, or market requires it.',
            footer: 'Optional requirement',
            Icon: Search,
        },
        {
            id: 'headshot',
            title: 'Headshot / profile photo',
            badge: 'Smart',
            description: 'Useful for promotional talent, models, and client-facing roles.',
            footer: 'Optional requirement',
            Icon: Camera,
        },
    ];

// Helper to get default form values
const getDefaultFormValues = () => ({
    accountStatus: AccountStatus.PENDING,
    staffType: StaffType.CONTRACTOR,
    staffRole: StaffRole.INDIVIDUAL,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    streetAddress: '',
    aptSuiteUnit: '',
    city: '',
    state: '',
    zipCode: '',
    skillLevel: SkillLevel.BEGINNER,
    availabilityStatus: AvailabilityStatus.OPEN_TO_OFFERS,
    timeOffStart: null,
    timeOffEnd: null,
    experience: '',
    staffRating: StaffRating.NA,
    internalNotes: '',
    companyId: null,
    serviceIds: [] as string[],
    customField1: '',
    customField2: '',
    customField3: '',
    documents: [] as Array<{ name: string; url: string; type?: string; size?: number }>,
    teamEntityName: '',
    teamEmail: '',
    teamPhone: '',
    teamAddressLine1: '',
    teamAddressLine2: '',
    teamCity: '',
    teamState: '',
    teamZipCode: '',
});

// Helper to get form values from staff data
const getFormValuesFromStaff = (staff: StaffWithRelations) => ({
    accountStatus: staff.accountStatus,
    staffType: staff.staffType,
    staffRole: staff.staffRole,
    firstName: staff.firstName,
    lastName: staff.lastName,
    email: staff.email,
    phone: staff.phone || '',
    streetAddress: staff.streetAddress || '',
    aptSuiteUnit: staff.aptSuiteUnit || '',
    city: staff.city || '',
    state: staff.state || '',
    zipCode: staff.zipCode || '',
    skillLevel: staff.skillLevel,
    availabilityStatus: staff.availabilityStatus,
    timeOffStart: staff.timeOffStart ? new Date(staff.timeOffStart) : null,
    timeOffEnd: staff.timeOffEnd ? new Date(staff.timeOffEnd) : null,
    experience: staff.experience || '',
    staffRating: staff.staffRating ?? StaffRating.NA,
    internalNotes: staff.internalNotes || '',
    companyId: staff.companyId || null,
    serviceIds: staff.services?.map((s) => s.service.id) || [],
    customField1: staff.customField1 || '',
    customField2: staff.customField2 || '',
    customField3: staff.customField3 || '',
    documents: (staff.documents as Array<{ name: string; url: string; type?: string; size?: number }>) || [],
    teamEntityName: staff.teamEntityName || '',
    teamEmail: staff.teamEmail || '',
    teamPhone: staff.teamPhone || '',
    teamAddressLine1: staff.teamAddressLine1 || '',
    teamAddressLine2: staff.teamAddressLine2 || '',
    teamCity: staff.teamCity || '',
    teamState: staff.teamState || '',
    teamZipCode: staff.teamZipCode || '',
});

// Form schema for client-side
const formSchema = StaffSchema.create;
export type StaffFormInput = z.input<typeof formSchema>;

interface StaffFormModalProps {
    staff: StaffWithRelations | null;
    open: boolean;
    onClose: () => void;
    onSubmit: (data: CreateStaffInput | Omit<UpdateStaffInput, 'id'>, taxData?: Record<string, unknown>) => void;
    isSubmitting: boolean;
    onViewDetails?: () => void;
}

// Inner form component that gets remounted when staff changes
interface StaffFormContentProps {
    staff: StaffWithRelations | null;
    onClose: () => void;
    onSubmit: (data: CreateStaffInput | Omit<UpdateStaffInput, 'id'>, taxData?: Record<string, unknown>) => void;
    isSubmitting: boolean;
    onViewDetails?: () => void;
    onCreateService?: () => void;
    services: ServiceOption[];
    companies: CompanyOption[];
    terminology: { staff: { singular: string; plural: string; lower: string } };
    labels: LabelsConfig;
}

function StaffFormContent({
    staff,
    onClose,
    onSubmit,
    isSubmitting,
    onViewDetails,
    onCreateService,
    services,
    companies,
    terminology,
    labels,
}: StaffFormContentProps) {
    type ExperienceMode = 'talent' | 'company';
    const isEdit = !!staff;
    const taxFormRef = useRef<TaxDetailsFormRef>(null);
    const [wizardStep, setWizardStep] = useState<WizardStep>('basic');
    const [selectedReqTemplates, setSelectedReqTemplates] = useState<Set<ReqTemplateId>>(
        () => new Set<ReqTemplateId>(['w9'])
    );
    const [createTaxFilledBy, setCreateTaxFilledBy] = useState<TaxFilledBy>(TaxFilledBy.TALENT);
    const [talentTypeChipId, setTalentTypeChipId] = useState<string>(() =>
        staff ? defaultTalentChipIdForStaffType(staff.staffType) : 'contractor'
    );
    const [experienceMode, setExperienceMode] = useState<ExperienceMode>(() =>
        staff?.services?.length ? 'company' : 'talent'
    );

    const [teamMembers, setTeamMembers] = useState<TeamMemberInput[]>(() => {
        if (staff?.staffRole === StaffRole.TEAM && staff.teamMembers && staff.teamMembers.length > 0) {
            return staff.teamMembers.map((tm) => ({
                firstName: tm.firstName,
                lastName: tm.lastName || '',
                email: tm.email,
                phone: tm.phone || '',
                serviceIds: tm.services?.map((s) => s.serviceId) || [],
            }));
        }
        return [];
    });
    const [newTeamMember, setNewTeamMember] = useState<TeamMemberInput>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        serviceIds: [],
    });

    const initialValues = useMemo(() => {
        if (staff) {
            return getFormValuesFromStaff(staff);
        }
        return getDefaultFormValues();
    }, []);

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        control,
        watch,
        setValue,
        getValues,
    } = useForm<StaffFormInput>({
        resolver: zodResolver(formSchema),
        defaultValues: initialValues as StaffFormInput,
    });

    const staffRole = watch('staffRole');
    const firstName = watch('firstName');
    const lastName = watch('lastName');
    const email = watch('email');
    const phone = watch('phone');
    const serviceIds = watch('serviceIds') ?? [];

    useEffect(() => {
        if (staff) return;
        try {
            const raw = sessionStorage.getItem(STAFF_FORM_DRAFT_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw) as {
                values?: StaffFormInput;
                teamMembers?: TeamMemberInput[];
                wizardStep?: WizardStep;
                selectedReqTemplates?: ReqTemplateId[];
                createTaxFilledBy?: TaxFilledBy;
            };
            if (parsed.values) {
                reset(parsed.values as StaffFormInput);
                setTalentTypeChipId(
                    defaultTalentChipIdForStaffType(
                        (parsed.values as StaffFormInput).staffType ?? StaffType.CONTRACTOR
                    )
                );
            }
            if (parsed.teamMembers) setTeamMembers(parsed.teamMembers);
            if (parsed.wizardStep && WIZARD_STEPS.includes(parsed.wizardStep)) {
                setWizardStep(parsed.wizardStep);
            }
            if (parsed.selectedReqTemplates?.length) {
                setSelectedReqTemplates(new Set(parsed.selectedReqTemplates));
            }
            if (parsed.createTaxFilledBy) {
                setCreateTaxFilledBy(parsed.createTaxFilledBy);
            }
        } catch {
            /* ignore */
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- draft restore once on mount for new staff
    }, []);

    useEffect(() => {
        if (!isEdit && wizardStep === 'tax' && taxFormRef.current) {
            taxFormRef.current.setTaxFilledBy(createTaxFilledBy);
        }
    }, [wizardStep, isEdit, createTaxFilledBy]);

    const addTeamMember = useCallback(() => {
        if (newTeamMember.firstName && newTeamMember.email) {
            setTeamMembers((prev) => [...prev, { ...newTeamMember }]);
            setNewTeamMember({ firstName: '', lastName: '', email: '', phone: '', serviceIds: [] });
        }
    }, [newTeamMember]);

    const removeTeamMember = useCallback((index: number) => {
        setTeamMembers((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const emailValid = Boolean(email?.trim() && z.string().email().safeParse(email.trim()).success);
    const phoneValid = Boolean(phone?.trim() && phoneValidation.isValid(phone));
    const canProceedBasic = emailValid;

    const handleFormSubmit: SubmitHandler<StaffFormInput> = async (data) => {
        if (!isEdit && !data.email?.trim()) {
            toast({
                title: 'Email required',
                description: 'A valid email is required to create the record and send an invitation.',
                variant: 'error',
            });
            setWizardStep('basic');
            return;
        }
        const submitData = {
            ...data,
            teamMembers: data.staffRole === StaffRole.TEAM ? teamMembers : undefined,
        };
        if (!isEdit && taxFormRef.current) {
            const taxData = await taxFormRef.current.getFormData();
            onSubmit(submitData, taxData ? (taxData as unknown as Record<string, unknown>) : undefined);
        } else {
            onSubmit(submitData);
        }
    };

    const sectionProps = {
        register,
        control,
        errors,
        watch,
        setValue,
        reset,
        disabled: isSubmitting,
    };

    const stepIndex = WIZARD_STEPS.indexOf(wizardStep);
    const isLastStep = wizardStep === 'review';

    const goNext = () => {
        if (wizardStep === 'basic' && !canProceedBasic) return;
        if (stepIndex < WIZARD_STEPS.length - 1) {
            const nextStep = WIZARD_STEPS[stepIndex + 1];
            if (nextStep) setWizardStep(nextStep);
        }
    };

    const goBack = () => {
        if (stepIndex > 0) {
            const prevStep = WIZARD_STEPS[stepIndex - 1];
            if (prevStep) setWizardStep(prevStep);
        }
    };

    const handleSaveDraft = () => {
        try {
            const payload = {
                values: getValues(),
                teamMembers,
                wizardStep,
                selectedReqTemplates: [...selectedReqTemplates],
                createTaxFilledBy,
            };
            sessionStorage.setItem(STAFF_FORM_DRAFT_KEY, JSON.stringify(payload));
            toast({
                title: 'Draft saved',
                description: 'Your progress is stored in this browser until you submit or clear it.',
            });
        } catch {
            toast({
                title: 'Could not save draft',
                description: 'Try again or continue without saving.',
                variant: 'error',
            });
        }
    };

    const toggleReqTemplate = (id: ReqTemplateId) => {
        setSelectedReqTemplates((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const setCreateTaxMode = (mode: TaxFilledBy) => {
        setCreateTaxFilledBy(mode);
        taxFormRef.current?.setTaxFilledBy(mode);
    };

    const titleText = isEdit ? `Edit ${terminology.staff.singular}` : `Add ${terminology.staff.singular.toLowerCase()}`;

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex h-full min-h-0 flex-col bg-white">
            {/* Header + step tabs */}
            <div className="shrink-0 border-b border-slate-200 px-6 pb-0 pt-5 sm:px-8">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 pr-2">
                        <h2 className="text-2xl font-bold tracking-tight text-slate-900">{titleText}</h2>
                        {/* <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
                            After adding a {terminology.staff.lower}, they will be invited by email or phone to join your
                            network, complete onboarding requirements, review any company-entered information, and sign
                            where required.
                        </p> */}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                        aria-label="Close"
                    >
                        <CloseIcon className="h-5 w-5" />
                    </button>
                </div>

                <div className="mt-6 flex gap-1 overflow-x-auto border-t border-slate-200/90 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {WIZARD_STEPS.map((step) => {
                        const active = wizardStep === step;
                        return (
                            <button
                                key={step}
                                type="button"
                                onClick={() => setWizardStep(step)}
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
                {wizardStep === 'basic' && (
                    <div className="mx-auto max-w-4xl">
                        <h3 className="text-base font-bold text-slate-900">1. Basic invite information</h3>
                        <p className="mt-1 text-xs text-slate-500">
                            These are the core fields used to create the record and send an invitation. At least one of
                            email or phone must be valid before you can continue.
                        </p>

                        <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                            <div>
                                <Label htmlFor="sf-firstName" className="text-sm font-bold text-slate-900">
                                    First name
                                </Label>
                                <Input
                                    id="sf-firstName"
                                    {...register('firstName')}
                                    disabled={isSubmitting}
                                    error={!!errors.firstName}
                                    placeholder="Enter first name"
                                    className="mt-2 rounded-lg border-slate-200"
                                />
                                {errors.firstName && (
                                    <p className="mt-1 text-sm text-destructive">{String(errors.firstName?.message || '')}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="sf-lastName" className="text-sm font-bold text-slate-900">
                                    Last name
                                </Label>
                                <Input
                                    id="sf-lastName"
                                    {...register('lastName')}
                                    disabled={isSubmitting}
                                    error={!!errors.lastName}
                                    placeholder="Enter last name"
                                    className="mt-2 rounded-lg border-slate-200"
                                />
                                {errors.lastName && (
                                    <p className="mt-1 text-sm text-destructive">{String(errors.lastName?.message || '')}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="sf-email" className="text-sm font-bold text-slate-900" required>
                                    Email
                                </Label>
                                <p className="mt-1 text-xs text-slate-500">Used for invite and account setup</p>
                                <Input
                                    id="sf-email"
                                    type="email"
                                    {...register('email')}
                                    disabled={isSubmitting}
                                    error={!!errors.email}
                                    placeholder="talent@email.com"
                                    className="mt-2 rounded-lg border-slate-200"
                                />
                                {errors.email && (
                                    <p className="mt-1 text-sm text-destructive">{String(errors.email?.message || '')}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="sf-phone" className="text-sm font-bold text-slate-900">
                                    Phone
                                </Label>
                                <p className="mt-1 text-xs text-slate-500">Used for invite if SMS is enabled</p>
                                <Input
                                    id="sf-phone"
                                    type="tel"
                                    {...register('phone')}
                                    disabled={isSubmitting}
                                    error={!!errors.phone}
                                    placeholder="(000) 000-0000"
                                    className="mt-2 rounded-lg border-slate-200"
                                />
                                {errors.phone && (
                                    <p className="mt-1 text-sm text-destructive">{String(errors.phone?.message || '')}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="sf-cf1" className="text-sm font-bold text-slate-900">
                                    Company / business name
                                </Label>
                                <Input
                                    id="sf-cf1"
                                    {...register('customField1')}
                                    disabled={isSubmitting}
                                    placeholder="Optional"
                                    className="mt-2 rounded-lg border-slate-200"
                                />
                            </div>
                            <div>
                                <Label htmlFor="sf-cf2" className="text-sm font-bold text-slate-900">
                                    External ID
                                </Label>
                                <Input
                                    id="sf-cf2"
                                    {...register('customField2')}
                                    disabled={isSubmitting}
                                    placeholder="Optional internal reference"
                                    className="mt-2 rounded-lg border-slate-200"
                                />
                            </div>
                            <div>
                                <Label className="text-sm font-bold text-slate-900">Talent type</Label>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {STAFF_TYPE_CHIPS.map(({ id, label, value }) => {
                                        const selected = talentTypeChipId === id;
                                        return (
                                            <button
                                                key={id}
                                                type="button"
                                                onClick={() => {
                                                    setTalentTypeChipId(id);
                                                    setValue('staffType', value, { shouldDirty: true });
                                                }}
                                                disabled={isSubmitting}
                                                className={cn(
                                                    'rounded-full border px-5 py-2 text-sm font-medium transition-all',
                                                    selected
                                                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                                )}
                                            >
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* <div className="mt-2 pt-8 border-t border-slate-100">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Classification & Services</h3>
                            
                        </div> */}
                    </div>
                )}

                {wizardStep === 'talentType' && (
                    <div className="mx-auto max-w-4xl">
                        <h3 className="text-base font-bold text-slate-900">2. Experience Profile</h3>
                        <p className="mt-1 text-xs text-slate-500">
                            Provide background information, skills, or internal notes for this talent.
                        </p>
                        <div className="mt-6 space-y-8">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={() => setExperienceMode('talent')}
                                    disabled={isSubmitting}
                                    className={cn(
                                        'relative rounded-xl border p-5 text-left transition-all',
                                        experienceMode === 'talent'
                                            ? 'border-sky-500 shadow-sm ring-2 ring-sky-400/40'
                                            : 'border-slate-200 hover:border-slate-300'
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">Talent</p>
                                            <p className="mt-2 text-xs leading-relaxed text-slate-600">
                                                Use talent profile defaults and skip service selection in this step.
                                            </p>
                                        </div>
                                        <span
                                            className={cn(
                                                'relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors',
                                                experienceMode === 'talent' ? 'bg-slate-900' : 'bg-slate-200'
                                            )}
                                            aria-hidden
                                        >
                                            <span
                                                className={cn(
                                                    'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all',
                                                    experienceMode === 'talent' ? 'left-5' : 'left-0.5'
                                                )}
                                            />
                                        </span>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setExperienceMode('company')}
                                    disabled={isSubmitting}
                                    className={cn(
                                        'relative rounded-xl border p-5 text-left transition-all',
                                        experienceMode === 'company'
                                            ? 'border-sky-500 shadow-sm ring-2 ring-sky-400/40'
                                            : 'border-slate-200 hover:border-slate-300'
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">Company</p>
                                            <p className="mt-2 text-xs leading-relaxed text-slate-600">
                                                Enable company-led setup and choose services for this talent.
                                            </p>
                                        </div>
                                        <span
                                            className={cn(
                                                'relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors',
                                                experienceMode === 'company' ? 'bg-slate-900' : 'bg-slate-200'
                                            )}
                                            aria-hidden
                                        >
                                            <span
                                                className={cn(
                                                    'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all',
                                                    experienceMode === 'company' ? 'left-5' : 'left-0.5'
                                                )}
                                            />
                                        </span>
                                    </div>
                                </button>
                            </div>
                            {experienceMode === 'company' && (
                                <div>
                                    <Label htmlFor="sf-services" className="text-sm font-bold text-slate-900">Services</Label>
                                    <p className="mt-1 text-xs text-slate-500 mb-3">Select the primary service types for this talent.</p>
                                    <Controller
                                        name="serviceIds"
                                        control={control}
                                        render={({ field }) => (
                                            <MultiSelect
                                                id="sf-services"
                                                options={services.map(s => ({ value: s.id, label: s.title }))}
                                                value={field.value || []}
                                                onChange={field.onChange}
                                                placeholder="Select services..."
                                                disabled={isSubmitting}
                                                error={!!errors.serviceIds}
                                                searchable
                                            />
                                        )}
                                    />
                                </div>
                            )}
                            <div>
                                <Label htmlFor="sf-rating" className="text-sm font-bold text-slate-900">Initial Rating</Label>
                                <p className="mt-1 text-xs text-slate-500 mb-3">Set an initial quality rating if known.</p>
                                <Controller
                                    name="staffRating"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            value={typeof field.value === 'string' ? field.value : undefined}
                                            onValueChange={field.onChange}
                                            disabled={isSubmitting}
                                        >
                                            <SelectTrigger id="sf-rating" className="h-10 w-full max-w-xs rounded-lg border-slate-200">
                                                <SelectValue placeholder="Select rating..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {STAFF_RATING_OPTIONS.map((opt) => (
                                                    <SelectItem key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            
                        </div>
                    </div>
                )}

                {wizardStep === 'requirements' && (
                    <div className="mx-auto max-w-4xl">
                        <h3 className="text-base font-bold text-slate-900">3. Requirement templates</h3>
                        <p className="mt-1 text-xs text-slate-500">
                            Select reusable requirement cards to plan the onboarding packet.
                            {SHOW_REQUIREMENTS_DOCUMENT_UPLOAD
                                ? ' Upload documents below when you have files ready.'
                                : ''}
                        </p>
                        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {REQ_TEMPLATE_CARDS.map((card) => {
                                const selected = selectedReqTemplates.has(card.id);
                                const Icon = card.Icon;
                                return (
                                    <button
                                        key={card.id}
                                        type="button"
                                        onClick={() => toggleReqTemplate(card.id)}
                                        disabled={isSubmitting}
                                        className={cn(
                                            'flex flex-col rounded-xl border bg-white p-4 text-left transition-shadow',
                                            selected
                                                ? 'border-slate-900 shadow-sm ring-1 ring-slate-900/10'
                                                : 'border-slate-200 hover:border-slate-300'
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <span className="text-sm font-bold text-slate-900">
                                                {card.id === 'w9' 
                                                    ? (watch('staffType') === StaffType.EMPLOYEE ? 'Tax form - W-4' : 'Tax form - W-9') 
                                                    : card.title}
                                            </span>
                                            <span
                                                className={cn(
                                                    'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                                                    card.badge === 'Smart'
                                                        ? 'bg-sky-100 text-sky-800'
                                                        : 'bg-slate-100 text-slate-700'
                                                )}
                                            >
                                                {card.badge}
                                            </span>
                                        </div>
                                        <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-500">
                                            {card.description}
                                        </p>
                                        <div className="mt-4 flex h-24 items-center justify-center rounded-lg bg-slate-100/90">
                                            <Icon className="h-10 w-10 text-slate-400" strokeWidth={1.25} />
                                        </div>
                                        <p className="mt-3 text-xs font-bold text-slate-900">{card.footer}</p>
                                    </button>
                                );
                            })}
                        </div>
                        {SHOW_REQUIREMENTS_DOCUMENT_UPLOAD && (
                            <div className="mt-10">
                                <DocumentsSection {...sectionProps} className="border-t border-slate-200 pt-8" />
                            </div>
                        )}
                    </div>
                )}

                {wizardStep === 'tax' && (
                    <div className="mx-auto max-w-4xl">
                        <h3 className="text-base font-bold text-slate-900">4. Tax completion mode</h3>
                        <p className="mt-1 text-xs text-slate-500">
                            Choose who completes tax information for this {terminology.staff.lower}.
                        </p>

                        {!isEdit && (
                            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={() => setCreateTaxMode(TaxFilledBy.TALENT)}
                                    disabled={isSubmitting}
                                    className={cn(
                                        'relative rounded-xl border p-5 text-left transition-all',
                                        createTaxFilledBy === TaxFilledBy.TALENT
                                            ? 'border-sky-500 shadow-sm ring-2 ring-sky-400/40'
                                            : 'border-slate-200 hover:border-slate-300'
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">
                                                {terminology.staff.singular} completes the tax form
                                            </p>
                                            <p className="mt-2 text-xs leading-relaxed text-slate-600">
                                                Best when they should enter tax details directly during onboarding.
                                            </p>
                                        </div>
                                        <span
                                            className={cn(
                                                'relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors',
                                                createTaxFilledBy === TaxFilledBy.TALENT ? 'bg-slate-900' : 'bg-slate-200'
                                            )}
                                            aria-hidden
                                        >
                                            <span
                                                className={cn(
                                                    'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all',
                                                    createTaxFilledBy === TaxFilledBy.TALENT ? 'left-5' : 'left-0.5'
                                                )}
                                            />
                                        </span>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCreateTaxMode(TaxFilledBy.STAFF)}
                                    disabled={isSubmitting}
                                    className={cn(
                                        'relative rounded-xl border p-5 text-left transition-all',
                                        createTaxFilledBy === TaxFilledBy.STAFF
                                            ? 'border-sky-500 shadow-sm ring-2 ring-sky-400/40'
                                            : 'border-slate-200 hover:border-slate-300'
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">Company completes the tax form</p>
                                            <p className="mt-2 text-xs leading-relaxed text-slate-600">
                                                Admin pre-fills tax details now; the {terminology.staff.lower} reviews later.
                                            </p>
                                        </div>
                                        <span
                                            className={cn(
                                                'relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors',
                                                createTaxFilledBy === TaxFilledBy.STAFF ? 'bg-slate-900' : 'bg-slate-200'
                                            )}
                                            aria-hidden
                                        >
                                            <span
                                                className={cn(
                                                    'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all',
                                                    createTaxFilledBy === TaxFilledBy.STAFF ? 'left-5' : 'left-0.5'
                                                )}
                                            />
                                        </span>
                                    </div>
                                </button>
                            </div>
                        )}

                        <div className={cn('mt-8', !isEdit && 'rounded-xl border border-slate-200 bg-slate-50/50 p-4')}>
                            <TaxDetailsForm
                                ref={isEdit ? undefined : taxFormRef}
                                taxFilledByControl={isEdit ? 'select' : 'hidden'}
                                staffW9Presentation={SHOW_TAX_STAFF_W9_FORM ? 'full' : 'hidden'}
                                staffId={staff?.id}
                                staffType={watch('staffType')}
                                initialData={staff?.taxDetails ?? null}
                            />
                        </div>
                    </div>
                )}

                {wizardStep === 'review' && (
                    <div className="mx-auto max-w-4xl space-y-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 shadow-indigo-200 shadow-lg text-white">
                                        <ClipboardCheck className="h-5 w-5" />
                                    </div>
                                    Review & Confirm
                                </h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Verify all details before sending the onboarding invitation.
                                </p>
                            </div>
                        </div>

                        {/* Full Data Summary Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Section 1: Core Profile */}
                            <div className="group relative rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-50/50">
                                <div className="mb-5 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                            <User className="h-4 w-4" />
                                        </div>
                                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Core Profile</h4>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 rounded-full px-3 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                                        onClick={() => setWizardStep('basic')}
                                    >
                                        Edit
                                    </Button>
                                </div>
                                
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Identity</span>
                                        <p className="text-base font-bold text-slate-900">{watch('firstName')} {watch('lastName')}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address</span>
                                            <p className="text-sm font-semibold text-slate-700 truncate">{watch('email')}</p>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone Number</span>
                                            <p className="text-sm font-semibold text-slate-700">{watch('phone') || '—'}</p>
                                        </div>
                                    </div>
                                    {(watch('customField1') || watch('customField2')) && (
                                        <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-3">
                                            {watch('customField1') && (
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Company Name</span>
                                                    <p className="text-sm font-semibold text-slate-700 truncate">{watch('customField1')}</p>
                                                </div>
                                            )}
                                            {watch('customField2') && (
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">External ID</span>
                                                    <p className="text-sm font-semibold text-slate-700">{watch('customField2')}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className="pt-2 flex items-center gap-3">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Talent Type</span>
                                            <span className={cn(
                                                "inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-tight",
                                                watch('staffType') === StaffType.CONTRACTOR ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"
                                            )}>
                                                {watch('staffType')}
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Role</span>
                                            <span className="inline-flex w-fit items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-tight text-slate-700">
                                                {watch('staffRole')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Experience & Skills */}
                            <div className="group relative rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-50/50">
                                <div className="mb-5 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                                            <Star className="h-4 w-4" />
                                        </div>
                                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Professional Profile</h4>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 rounded-full px-3 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                        onClick={() => setWizardStep('talentType')}
                                    >
                                        Edit
                                    </Button>
                                </div>

                                <div className="space-y-5">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Initial Quality Rating</span>
                                        <div className="flex items-center gap-1.5">
                                            {watch('staffRating') !== StaffRating.NA ? (
                                                <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg border border-emerald-100 font-bold text-sm">
                                                    <Star className="h-3 w-3 fill-current" />
                                                    {watch('staffRating')}
                                                </div>
                                            ) : (
                                                <span className="text-sm font-bold text-slate-400 italic">No initial rating set</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selected Services</span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {serviceIds.length > 0 ? (
                                                serviceIds.map(id => {
                                                    const service = services.find(s => s.id === id);
                                                    return (
                                                        <span key={id} className="inline-flex items-center rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                                                            {service?.title || id}
                                                        </span>
                                                    );
                                                })
                                            ) : (
                                                <span className="text-xs font-bold text-slate-400 italic bg-slate-50 border border-dashed border-slate-200 rounded-lg px-3 py-2 w-full text-center">
                                                    No service specialities selected
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Onboarding Requirements */}
                            <div className="group relative rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-sky-300 hover:shadow-xl hover:shadow-sky-50/50 md:col-span-2">
                                <div className="mb-5 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                                            <FileText className="h-4 w-4" />
                                        </div>
                                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Onboarding Packet</h4>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 rounded-full px-3 text-sky-600 hover:bg-sky-50 hover:text-sky-700"
                                        onClick={() => setWizardStep('requirements')}
                                    >
                                        Edit
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    {Array.from(selectedReqTemplates).map(id => {
                                        const card = REQ_TEMPLATE_CARDS.find(c => c.id === id);
                                        return (
                                            <div key={id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-3">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100 text-sky-600">
                                                    {card ? <card.Icon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-slate-900 truncate">
                                                        {id === 'w9' 
                                                            ? (watch('staffType') === StaffType.EMPLOYEE ? 'Form W-4' : 'Form W-9') 
                                                            : card?.title || id}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Active Requirement</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {selectedReqTemplates.size === 0 && (
                                        <p className="col-span-full text-center py-4 bg-slate-50 border border-dashed border-slate-200 rounded-3xl text-sm font-bold text-slate-400 italic">
                                            No requirements selected for this onboarding packet
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Section 4: Collection Strategy (Tax Flow) */}
                            <div className="group relative rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-amber-300 hover:shadow-xl hover:shadow-amber-50/50 md:col-span-2">
                                <div className="mb-5 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                                            <Calculator className="h-4 w-4" />
                                        </div>
                                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Collection Strategy</h4>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 rounded-full px-3 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                                        onClick={() => setWizardStep('tax')}
                                    >
                                        Edit
                                    </Button>
                                </div>

                                <div className="flex flex-col md:flex-row items-stretch gap-6">
                                    <div className="flex-1 rounded-2xl border-2 border-slate-900 bg-slate-900 p-5 text-white shadow-xl shadow-slate-200">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-900 font-black text-xs">
                                                {createTaxFilledBy === TaxFilledBy.TALENT ? 'A' : 'B'}
                                            </div>
                                            <p className="text-sm font-black uppercase tracking-tight">Active Workflow</p>
                                        </div>
                                        <p className="text-lg font-bold leading-tight mb-2">
                                            {createTaxFilledBy === TaxFilledBy.TALENT 
                                                ? `${terminology.staff.singular} will complete their own tax form` 
                                                : "Company will pre-fill tax details"
                                            }
                                        </p>
                                        <p className="text-xs text-slate-400 font-medium">
                                            {createTaxFilledBy === TaxFilledBy.TALENT 
                                                ? "Best for remote onboarding and privacy. The talent will be prompted to provide these details during their setup."
                                                : "Best for internal records or when you already have the paperwork in hand. You have pre-filled the necessary fields."
                                            }
                                        </p>
                                    </div>

                                    <div className="flex-1 space-y-3 py-1">
                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Workflow Steps</h5>
                                        {(createTaxFilledBy === TaxFilledBy.TALENT 
                                            ? [
                                                'Talent reviews invite & signs up',
                                                'Talent verifies basic info accuracy',
                                                'Talent completes digital tax form',
                                                'Submit final onboarding packet'
                                            ] : [
                                                'Talent reviews company-entered fields',
                                                'Talent confirms information is correct',
                                                'Talent accepts onboarding conditions',
                                                'Final profile activation'
                                            ]
                                        ).map((step, i) => (
                                            <div key={i} className="flex items-center gap-3 text-sm font-bold text-slate-700">
                                                <div className="h-5 w-5 shrink-0 flex items-center justify-center rounded-full bg-slate-100 text-[10px] text-slate-500">{i+1}</div>
                                                {step}
                                    </div>
                                ))}
                            </div>
                        </div>
                        </div>
                        {/* Final closing for the grid container */}
                        </div>

                {/* <div className="rounded-xl border border-slate-200 bg-slate-100/70 px-4 py-3">
                            <p className="text-sm font-bold text-slate-900">Suggested statuses after send</p>
                            <p className="mt-1 text-sm text-slate-600">
                                Draft · Invited · In Progress · Awaiting Signature · Completed
                            </p>
                        </div> */}

                        {isEdit && staff && (
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                <p className="text-xs font-medium text-slate-500">{terminology.staff.singular} ID</p>
                                <p className="text-base font-semibold text-slate-900">{staff.staffId}</p>
                            </div>
                        )}

                        {isEdit && staff?.company && (
                            <div className="rounded-lg border border-primary/25 bg-primary/5 p-4">
                                <p className="text-sm font-semibold text-slate-900">Team membership</p>
                                <p className="mt-1 text-sm text-slate-600">
                                    This {terminology.staff.lower} is a member of team:{' '}
                                    <span className="font-semibold text-slate-900">
                                        {staff.company.teamEntityName ||
                                            `${staff.company.firstName} ${staff.company.lastName}`}
                                    </span>{' '}
                                    ({staff.company.staffId})
                                </p>
                            </div>
                        )}

                        {SHOW_REVIEW_PROFILE_ACCOUNT_SETTINGS && (
                            <div className="rounded-xl border border-slate-200">
                                <details className="group">
                                    <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-900 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                                        <ChevronDownIcon className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
                                        Profile, services &amp; account settings
                                    </summary>
                                    <div className="space-y-8 border-t border-slate-200 px-4 py-6">
                                        <AccountDetailsSection
                                            {...sectionProps}
                                            companies={companies}
                                            terminology={terminology}
                                            labels={labels}
                                            omitCustomBasicFields
                                        />
                                        <ServiceDetailsSection
                                            {...sectionProps}
                                            services={services}
                                            onCreateService={onCreateService}
                                            className="border-t border-slate-200 pt-6"
                                        />
                                        <TalentDetailsSection
                                            {...sectionProps}
                                            fields="address"
                                            className="border-t border-slate-200 pt-6"
                                        />
                                        {staffRole === StaffRole.TEAM && (
                                            <>
                                                <TeamDetailsSection
                                                    {...sectionProps}
                                                    className="border-t border-slate-200 pt-6"
                                                />
                                                <TeamMembersSection
                                                    teamMembers={teamMembers}
                                                    newTeamMember={newTeamMember}
                                                    onTeamMembersChange={setTeamMembers}
                                                    onNewTeamMemberChange={setNewTeamMember}
                                                    onAddTeamMember={addTeamMember}
                                                    onRemoveTeamMember={removeTeamMember}
                                                    services={services}
                                                    disabled={isSubmitting}
                                                    className="border-t border-slate-200 pt-6"
                                                />
                                            </>
                                        )}
                                    </div>
                                </details>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-slate-200 px-6 py-5 sm:px-8 bg-slate-50/50">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-1">
                        {!isLastStep ? (
                            <Button
                                type="button"
                                onClick={goNext}
                                disabled={isSubmitting || (wizardStep === 'basic' && !canProceedBasic)}
                                className="h-14 w-full rounded-xl bg-slate-900 px-10 text-lg font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 hover:shadow-none sm:w-auto sm:min-w-[280px]"
                            >
                                Continue
                            </Button>
                        ) : (
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="h-14 w-full rounded-xl bg-indigo-600 px-10 text-lg font-bold text-white shadow-lg shadow-indigo-100 transition-all hover:bg-indigo-700 hover:shadow-none sm:w-auto sm:min-w-[280px]"
                            >
                                {isSubmitting
                                    ? 'Saving...'
                                    : isEdit
                                        ? `Update ${terminology.staff.singular}`
                                        : 'Send invite'}
                            </Button>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                        {isEdit && onViewDetails && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onViewDetails}
                                className="h-10 rounded-xl border-slate-200 bg-white px-5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                            >
                                <EyeIcon className="mr-2 h-4 w-4" />
                                View Details
                            </Button>
                        )}
                        {stepIndex > 0 && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={goBack}
                                disabled={isSubmitting}
                                className="h-10 rounded-xl border-slate-200 bg-white px-5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                            >
                                Back
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="h-10 rounded-xl border-slate-200 bg-white px-5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleSaveDraft}
                            disabled={isSubmitting}
                            className="h-10 rounded-xl border-slate-200 bg-white px-5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                        >
                            Save Draft
                        </Button>
                    </div>
                </div>
            </div>
        </form>
    );
}

export function StaffFormModal({
    staff,
    open,
    onClose,
    onSubmit,
    isSubmitting,
    onViewDetails,
}: StaffFormModalProps) {
    const { terminology } = useTerminology();
    const { labels } = useLabels();
    const [showCreateService, setShowCreateService] = useState(false);
    const [mounted, setMounted] = useState(false);
    const utils = trpc.useUtils();

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Fetch lookup data
    const { data: servicesData } = trpc.staff.getServices.useQuery(undefined, { enabled: open });
    const { data: companiesData } = trpc.staff.getCompanies.useQuery(undefined, { enabled: open });
    const services = (servicesData ?? []) as ServiceOption[];
    const companies = (companiesData ?? []) as CompanyOption[];

    // Service creation mutation
    const createServiceMutation = trpc.service.create.useMutation({
        onSuccess: (data) => {
            toast({
                title: 'Service created',
                description: `Service "${data.title}" created successfully`,
            });
            utils.staff.getServices.invalidate();
            setShowCreateService(false);
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message || 'Failed to create service',
                variant: 'error',
            });
        },
    });

    const handleServiceSubmit = (data: CreateServiceInput) => {
        createServiceMutation.mutate(data);
    };

    const formKey = staff?.id ?? 'new';

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                className="mx-4 flex h-[min(92vh,900px)] w-full max-h-[min(92vh,900px)] max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-card p-0 shadow-xl"
            >
                <DialogContent className="flex h-full min-h-0 flex-1 flex-col overflow-hidden p-0">
                    <StaffFormContent
                        key={formKey}
                        staff={staff}
                        onClose={onClose}
                        onSubmit={onSubmit}
                        isSubmitting={isSubmitting}
                        onViewDetails={onViewDetails}
                        onCreateService={() => setShowCreateService(true)}
                        services={services}
                        companies={companies}
                        terminology={terminology}
                        labels={labels}
                    />
                </DialogContent>
            </Dialog>
            {mounted &&
                showCreateService &&
                createPortal(
                    <ServiceFormModal
                        service={null}
                        open={showCreateService}
                        onClose={() => setShowCreateService(false)}
                        onSubmit={handleServiceSubmit}
                        isSubmitting={createServiceMutation.isPending}
                    />,
                    document.body
                )}
        </>
    );
}
