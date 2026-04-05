'use client';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { CloseIcon, EyeIcon, ChevronDownIcon, ChevronUpIcon } from '@/components/ui/icons';
import { StaffSchema, type CreateStaffInput, type UpdateStaffInput } from '@/lib/schemas/staff.schema';
import { AccountStatus, StaffType, StaffRole, SkillLevel, StaffRating, AvailabilityStatus } from '@prisma/client';
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
import { TaxDetailsForm, type TaxDetailsFormRef } from './tax-details-form';

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
type StaffFormInput = z.input<typeof formSchema>;
type StaffFormOutput = z.infer<typeof formSchema>;

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
    const isEdit = !!staff;
    const [serviceSearch, setServiceSearch] = useState('');
    const [showAccountDetails, setShowAccountDetails] = useState(false);
    const taxFormRef = useRef<TaxDetailsFormRef>(null);

    // Team members state for TEAM role
    const [teamMembers, setTeamMembers] = useState<TeamMemberInput[]>(() => {
        // Initialize from staff data
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

    // Filter services by search term
    const filteredServices = useMemo<ServiceOption[]>(() => {
        if (!serviceSearch.trim()) return services;
        const searchLower = serviceSearch.toLowerCase();
        return services.filter((service) =>
            service.title.toLowerCase().includes(searchLower)
        );
    }, [services, serviceSearch]);

    // Compute initial form values - only once on mount
    const initialValues = useMemo(() => {
        if (staff) {
            return getFormValuesFromStaff(staff);
        }
        return getDefaultFormValues();
    }, []); // Empty deps - only compute once on mount

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        control,
        watch,
        setValue,
    } = useForm<StaffFormInput, undefined, StaffFormOutput>({
        resolver: zodResolver(formSchema),
        defaultValues: initialValues,
    });

    const staffRole = watch('staffRole');

    // Helper functions for team members
    const addTeamMember = useCallback(() => {
        if (newTeamMember.firstName && newTeamMember.email) {
            setTeamMembers(prev => [...prev, { ...newTeamMember }]);
            setNewTeamMember({ firstName: '', lastName: '', email: '', phone: '', serviceIds: [] });
        }
    }, [newTeamMember]);

    const removeTeamMember = useCallback((index: number) => {
        setTeamMembers(prev => prev.filter((_, i) => i !== index));
    }, []);

    // Properly typed submit handler
    const handleFormSubmit: SubmitHandler<StaffFormOutput> = async (data) => {
        const submitData = {
            ...data,
            teamMembers: data.staffRole === StaffRole.TEAM ? teamMembers : undefined,
        };
        // In create mode, collect tax data from the ref
        if (!isEdit && taxFormRef.current) {
            const taxData = await taxFormRef.current.getFormData();
            onSubmit(submitData, taxData ? (taxData as unknown as Record<string, unknown>) : undefined);
        } else {
            onSubmit(submitData);
        }
    };

    // Shared props for form sections
    const sectionProps = {
        register,
        control,
        errors,
        watch,
        setValue,
        reset,
        disabled: isSubmitting,
    };

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="h-full flex flex-col">
            <DialogHeader>
                <div className="flex items-center justify-between">
                    <DialogTitle>{isEdit ? `Edit ${terminology.staff.singular}` : `Add New ${terminology.staff.singular}`}</DialogTitle>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <CloseIcon className="h-5 w-5" />
                    </button>
                </div>
                {!isEdit && (
                    <p className="text-sm text-muted-foreground mt-1">
                        An invitation email will be sent to complete their registration.
                    </p>
                )}
            </DialogHeader>

            <DialogContent className="flex-1 overflow-y-auto">
                {/* Staff ID (Read-only in edit mode) */}
                {isEdit && staff && (
                    <div className="mb-6 p-3 bg-muted/30 rounded-md border border-border">
                        <p className="text-sm text-muted-foreground">{terminology.staff.singular} ID</p>
                        <p className="text-base font-medium">{staff.staffId}</p>
                    </div>
                )}

                {/* Team Membership Info (Read-only - shown if staff belongs to a team) */}
                {isEdit && staff?.company && (
                    <div className="mb-6 p-4 bg-primary/10 rounded-md border border-primary/30">
                        <p className="text-sm font-medium text-foreground mb-2">Team Membership</p>
                        <p className="text-sm text-muted-foreground">
                            This {terminology.staff.lower} is a member of team:{' '}
                            <span className="font-semibold text-foreground">
                                {staff.company.teamEntityName || `${staff.company.firstName} ${staff.company.lastName}`}
                            </span>
                            {' '}({staff.company.staffId})
                        </p>
                    </div>
                )}

                {/* Account Details Section Toggle */}
                <div className="mb-6">
                    <button
                        type="button"
                        onClick={() => setShowAccountDetails(!showAccountDetails)}
                        className="flex items-center gap-2 w-full p-3 bg-muted/20 hover:bg-muted/30 rounded-md border border-border transition-colors text-left"
                    >
                        {showAccountDetails ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
                        <span className="font-semibold text-lg">Account Details</span>
                        {!showAccountDetails && (
                            <span className="text-sm text-muted-foreground ml-auto italic">
                                (Status, Type, Role, Skill Level, Rating, Availability)
                            </span>
                        )}
                    </button>

                    {showAccountDetails && (
                        <div className="mt-4 border-l-2 border-primary/30 pl-4 py-2 space-y-6">
                            <AccountDetailsSection
                                {...sectionProps}
                                companies={companies}
                                terminology={terminology}
                                labels={labels.global}
                            />
                            
                            {/* Tax Details Section (also part of account/legal info) */}
                            <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
                                <h4 className="text-base font-semibold border-b border-border pb-2 mb-4">Tax Details</h4>
                                <TaxDetailsForm
                                    ref={isEdit ? undefined : taxFormRef}
                                    staffId={staff?.id}
                                    initialData={staff?.taxDetails ?? null}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Service Details Section */}
                <ServiceDetailsSection
                    {...sectionProps}
                    services={filteredServices}
                    serviceSearch={serviceSearch}
                    onServiceSearchChange={setServiceSearch}
                    onCreateService={onCreateService}
                    className="mb-6 border-b pb-6"
                />

                {/* Talent Details Section */}
                <TalentDetailsSection
                    {...sectionProps}
                    className="mb-6 border-b pb-6"
                />

                {/* Team Details Section - Only for TEAM role */}
                {staffRole === StaffRole.TEAM && (
                    <>
                        <TeamDetailsSection
                            {...sectionProps}
                            className="mb-6 border-b pb-6"
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
                            className="mb-6 border-b pb-6"
                        />
                    </>
                )}

                {/* Documents Section */}
                <DocumentsSection {...sectionProps} className="mb-6" />
            </DialogContent>

            <DialogFooter>
                {isEdit && onViewDetails && (
                    <Button type="button" variant="outline" onClick={onViewDetails} className="mr-auto">
                        <EyeIcon className="h-4 w-4 mr-2" />
                        View Details
                    </Button>
                )}
                <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : isEdit ? `Update ${terminology.staff.singular}` : `Create & Send Invitation`}
                </Button>
            </DialogFooter>
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

    // Key based on staff ID to force remount of form content
    const formKey = staff?.id ?? 'new';

    return (
        <>
            <Dialog open={open} onClose={onClose}>
                <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col p-6">
                    {/* Key on the form content forces complete remount when staff changes */}
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
            {/* Service Modal rendered via portal to avoid nested form issues */}
            {mounted && showCreateService && createPortal(
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
