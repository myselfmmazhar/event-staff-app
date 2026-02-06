'use client';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { SearchIcon, PlusIcon, XIcon } from 'lucide-react';
import { z } from 'zod';
import { CloseIcon, EyeIcon } from '@/components/ui/icons';
import { StaffSchema, type CreateStaffInput, type UpdateStaffInput } from '@/lib/schemas/staff.schema';
import { AccountStatus, StaffType, SkillLevel, StaffRating, AvailabilityStatus } from '@prisma/client';
import { trpc } from '@/lib/client/trpc';
import { useTerminology } from '@/lib/hooks/use-terminology';
import type { StaffWithRelations } from '@/components/staff/staff-table';
import { ServiceFormModal } from '@/components/catalog/services/service-form-modal';
import type { CreateServiceInput } from '@/lib/schemas/service.schema';
import { toast } from '@/components/ui/use-toast';

// Form schema for client-side
const formSchema = StaffSchema.create;
type StaffFormInput = z.input<typeof formSchema>;
type StaffFormOutput = z.infer<typeof formSchema>;

type ServiceOption = { id: string; title: string };
type CompanyOption = { id: string; firstName: string; lastName: string; staffId: string };
type TeamMemberInput = { email: string; firstName: string; lastName: string; staffType: 'CONTRACTOR' | 'EMPLOYEE' };

interface StaffFormModalProps {
    staff: StaffWithRelations | null;
    open: boolean;
    onClose: () => void;
    onSubmit: (data: CreateStaffInput | Omit<UpdateStaffInput, 'id'>) => void;
    isSubmitting: boolean;
    onViewDetails?: () => void;
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
    const isEdit = !!staff;
    const [serviceSearch, setServiceSearch] = useState('');
    const [showCreateService, setShowCreateService] = useState(false);
    const [mounted, setMounted] = useState(false);
    const utils = trpc.useUtils();

    // Team members state for COMPANY type
    const [teamMembers, setTeamMembers] = useState<TeamMemberInput[]>([]);
    const [newTeamMember, setNewTeamMember] = useState<TeamMemberInput>({
        email: '',
        firstName: '',
        lastName: '',
        staffType: 'EMPLOYEE',
    });

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Fetch lookup data
    const { data: servicesData } = trpc.staff.getServices.useQuery(undefined, { enabled: open });
    const { data: companiesData } = trpc.staff.getCompanies.useQuery(undefined, { enabled: open });
    const services = (servicesData ?? []) as ServiceOption[];
    const companies = (companiesData ?? []) as CompanyOption[];

    // Filter services by search term
    const filteredServices = useMemo<ServiceOption[]>(() => {
        if (!serviceSearch.trim()) return services;
        const searchLower = serviceSearch.toLowerCase();
        return services.filter((service) =>
            service.title.toLowerCase().includes(searchLower)
        );
    }, [services, serviceSearch]);

    // Service creation mutation
    const createServiceMutation = trpc.service.create.useMutation({
        onSuccess: (data) => {
            toast({
                title: 'Service created',
                description: `Service "${data.title}" created successfully`,
            });
            // Refresh services list
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

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        control,
        watch,
    } = useForm<StaffFormInput, undefined, StaffFormOutput>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            accountStatus: AccountStatus.PENDING,
            staffType: StaffType.EMPLOYEE,
            firstName: '',
            lastName: '',
            email: '',
            skillLevel: SkillLevel.BEGINNER,
            availabilityStatus: AvailabilityStatus.OPEN_TO_OFFERS,
            timeOffStart: null,
            timeOffEnd: null,
            experience: '',
            staffRating: StaffRating.NA,
            internalNotes: '',
            companyId: null,
            serviceIds: [],
        },
    });

    const staffType = watch('staffType');

    // Helper functions for team members
    const addTeamMember = () => {
        if (newTeamMember.email && newTeamMember.firstName && newTeamMember.lastName) {
            setTeamMembers([...teamMembers, { ...newTeamMember }]);
            setNewTeamMember({ email: '', firstName: '', lastName: '', staffType: 'EMPLOYEE' });
        }
    };

    const removeTeamMember = (index: number) => {
        setTeamMembers(teamMembers.filter((_, i) => i !== index));
    };

    useEffect(() => {
        if (staff && open) {
            setServiceSearch('');
            reset({
                accountStatus: staff.accountStatus,
                staffType: staff.staffType,
                firstName: staff.firstName,
                lastName: staff.lastName,
                email: staff.email,
                skillLevel: staff.skillLevel,
                availabilityStatus: staff.availabilityStatus,
                timeOffStart: staff.timeOffStart ? new Date(staff.timeOffStart) : null,
                timeOffEnd: staff.timeOffEnd ? new Date(staff.timeOffEnd) : null,
                experience: staff.experience || '',
                staffRating: staff.staffRating ?? StaffRating.NA,
                internalNotes: staff.internalNotes || '',
                companyId: staff.companyId || null,
                serviceIds: staff.services?.map((s) => s.service.id) || [],
            });
            // Populate team members from fetched data for COMPANY type
            if (staff.staffType === StaffType.COMPANY && staff.teamMembers) {
                setTeamMembers(
                    staff.teamMembers.map((tm) => ({
                        email: tm.email,
                        firstName: tm.firstName,
                        lastName: tm.lastName,
                        staffType: tm.staffType === 'CONTRACTOR' ? 'CONTRACTOR' : 'EMPLOYEE',
                    }))
                );
            } else {
                setTeamMembers([]);
            }
        } else if (!staff && open) {
            setServiceSearch('');
            reset({
                accountStatus: AccountStatus.PENDING,
                staffType: StaffType.EMPLOYEE,
                firstName: '',
                lastName: '',
                email: '',
                skillLevel: SkillLevel.BEGINNER,
                availabilityStatus: AvailabilityStatus.OPEN_TO_OFFERS,
                timeOffStart: null,
                timeOffEnd: null,
                experience: '',
                staffRating: StaffRating.NA,
                internalNotes: '',
                companyId: null,
                serviceIds: [],
            });
            setTeamMembers([]);
        }
    }, [staff, open, reset]);

    // Properly typed submit handler to match react-hook-form expectations
    const handleFormSubmit: SubmitHandler<StaffFormOutput> = (data) => {
        // Include team members if staff type is COMPANY
        const submitData = {
            ...data,
            teamMembers: data.staffType === StaffType.COMPANY ? teamMembers : undefined,
        };
        onSubmit(submitData);
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} fullScreen>
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

                        {/* Row 1: Staff Information + Account Details & Availability (side-by-side on lg+) */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            {/* Staff Information */}
                            <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
                                <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">{terminology.staff.singular} Information</h3>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="firstName" required>First Name</Label>
                                            <Input
                                                id="firstName"
                                                {...register('firstName')}
                                                error={!!errors.firstName}
                                                disabled={isSubmitting}
                                            />
                                            {errors.firstName && (
                                                <p className="text-sm text-destructive mt-1">{errors.firstName.message}</p>
                                            )}
                                        </div>

                                        <div>
                                            <Label htmlFor="lastName" required>Last Name</Label>
                                            <Input
                                                id="lastName"
                                                {...register('lastName')}
                                                error={!!errors.lastName}
                                                disabled={isSubmitting}
                                            />
                                            {errors.lastName && (
                                                <p className="text-sm text-destructive mt-1">{errors.lastName.message}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <Label htmlFor="email" required>Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            {...register('email')}
                                            error={!!errors.email}
                                            disabled={isSubmitting}
                                        />
                                        {errors.email && (
                                            <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="skillLevel" required>Experience</Label>
                                            <Controller
                                                name="skillLevel"
                                                control={control}
                                                render={({ field }) => (
                                                    <Select {...field} disabled={isSubmitting}>
                                                        <option value={SkillLevel.BEGINNER}>Beginner</option>
                                                        <option value={SkillLevel.INTERMEDIATE}>Intermediate</option>
                                                        <option value={SkillLevel.ADVANCED}>Advanced</option>
                                                    </Select>
                                                )}
                                            />
                                            {errors.skillLevel && (
                                                <p className="text-sm text-destructive mt-1">{errors.skillLevel.message}</p>
                                            )}
                                        </div>

                                        {(staffType === StaffType.CONTRACTOR || staffType === StaffType.EMPLOYEE) && (
                                            <div>
                                                <Label htmlFor="companyId">Company</Label>
                                                <Controller
                                                    name="companyId"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Select
                                                            value={field.value || ''}
                                                            onChange={(e) => field.onChange(e.target.value || null)}
                                                            disabled={isSubmitting}
                                                        >
                                                            <option value="">None</option>
                                                            {companies.map((c) => (
                                                                <option key={c.id} value={c.id}>
                                                                    {c.firstName} {c.lastName} ({c.staffId})
                                                                </option>
                                                            ))}
                                                        </Select>
                                                    )}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Account Details + Availability (stacked in right column) */}
                            <div className="space-y-6">
                                {/* Account Details */}
                                <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
                                    <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Account Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="accountStatus" required>Account Status</Label>
                                            <Controller
                                                name="accountStatus"
                                                control={control}
                                                render={({ field }) => (
                                                    <Select {...field} disabled={isSubmitting}>
                                                        <option value={AccountStatus.ACTIVE}>Active</option>
                                                        <option value={AccountStatus.DISABLED}>Disabled</option>
                                                        <option value={AccountStatus.PENDING}>Pending</option>
                                                    </Select>
                                                )}
                                            />
                                            {errors.accountStatus && (
                                                <p className="text-sm text-destructive mt-1">{errors.accountStatus.message}</p>
                                            )}
                                        </div>

                                        <div>
                                            <Label htmlFor="staffType" required>{terminology.staff.singular} Type</Label>
                                            <Controller
                                                name="staffType"
                                                control={control}
                                                render={({ field }) => (
                                                    <Select {...field} disabled={isSubmitting}>
                                                        <option value={StaffType.COMPANY}>Company</option>
                                                        <option value={StaffType.CONTRACTOR}>Contractor</option>
                                                        <option value={StaffType.EMPLOYEE}>Employee</option>
                                                    </Select>
                                                )}
                                            />
                                            {errors.staffType && (
                                                <p className="text-sm text-destructive mt-1">{errors.staffType.message}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Availability Status */}
                                <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
                                    <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Availability</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <Label htmlFor="availabilityStatus">Availability Status</Label>
                                            <Controller
                                                name="availabilityStatus"
                                                control={control}
                                                render={({ field }) => (
                                                    <Select {...field} disabled={isSubmitting}>
                                                        <option value={AvailabilityStatus.OPEN_TO_OFFERS}>Open to Offers</option>
                                                        <option value={AvailabilityStatus.BUSY}>Busy</option>
                                                        <option value={AvailabilityStatus.TIME_OFF}>Time Off</option>
                                                    </Select>
                                                )}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="timeOffStart">Time Off Start</Label>
                                                <Input
                                                    id="timeOffStart"
                                                    type="date"
                                                    {...register('timeOffStart', { valueAsDate: true })}
                                                    disabled={isSubmitting}
                                                />
                                            </div>

                                            <div>
                                                <Label htmlFor="timeOffEnd">Time Off End</Label>
                                                <Input
                                                    id="timeOffEnd"
                                                    type="date"
                                                    {...register('timeOffEnd', { valueAsDate: true })}
                                                    disabled={isSubmitting}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Team Members Section - Only for COMPANY type */}
                        {staffType === StaffType.COMPANY && (
                            <div className="mb-6 bg-accent/5 border border-border/30 p-5 rounded-lg">
                                <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Team Members</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Add team members who will be invited when this company is created.
                                </p>

                                {/* Add new team member form */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                                    <div>
                                        <Label htmlFor="tm-email">Email</Label>
                                        <Input
                                            id="tm-email"
                                            type="email"
                                            placeholder="email@example.com"
                                            value={newTeamMember.email}
                                            onChange={(e) => setNewTeamMember({ ...newTeamMember, email: e.target.value })}
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="tm-firstName">First Name</Label>
                                        <Input
                                            id="tm-firstName"
                                            placeholder="First name"
                                            value={newTeamMember.firstName}
                                            onChange={(e) => setNewTeamMember({ ...newTeamMember, firstName: e.target.value })}
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="tm-lastName">Last Name</Label>
                                        <Input
                                            id="tm-lastName"
                                            placeholder="Last name"
                                            value={newTeamMember.lastName}
                                            onChange={(e) => setNewTeamMember({ ...newTeamMember, lastName: e.target.value })}
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <div className="flex-1">
                                            <Label htmlFor="tm-type">Type</Label>
                                            <Select
                                                id="tm-type"
                                                value={newTeamMember.staffType}
                                                onChange={(e) => setNewTeamMember({ ...newTeamMember, staffType: e.target.value as 'CONTRACTOR' | 'EMPLOYEE' })}
                                                disabled={isSubmitting}
                                            >
                                                <option value="CONTRACTOR">Contractor</option>
                                                <option value="EMPLOYEE">Employee</option>
                                            </Select>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={addTeamMember}
                                            disabled={isSubmitting || !newTeamMember.email || !newTeamMember.firstName || !newTeamMember.lastName}
                                        >
                                            <PlusIcon className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Team members list */}
                                {teamMembers.length > 0 && (
                                    <div className="border rounded-md divide-y">
                                        {teamMembers.map((member, index) => (
                                            <div key={index} className="flex items-center justify-between p-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-medium">{member.firstName} {member.lastName}</span>
                                                    <span className="text-sm text-muted-foreground">{member.email}</span>
                                                    <span className="text-xs bg-muted px-2 py-0.5 rounded">
                                                        {member.staffType === 'CONTRACTOR' ? 'Contractor' : 'Employee'}
                                                    </span>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeTeamMember(index)}
                                                    disabled={isSubmitting}
                                                >
                                                    <XIcon className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {teamMembers.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-4 border rounded-md">
                                        No team members added yet. Use the form above to add team members.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Row 2: Assigned Services + Admin Only Fields (side-by-side on lg+) */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Assigned Services */}
                            <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
                                <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Assigned Services</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label required>Services</Label>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setShowCreateService(true)}
                                            disabled={isSubmitting}
                                            className="text-xs"
                                        >
                                            <PlusIcon className="h-3 w-3 mr-1" />
                                            Add New
                                        </Button>
                                    </div>
                                    <div className="relative">
                                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search services..."
                                            value={serviceSearch}
                                            onChange={(e) => setServiceSearch(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                    <Controller
                                        name="serviceIds"
                                        control={control}
                                        render={({ field }) => (
                                            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 border rounded-md">
                                                {filteredServices.length > 0 ? (
                                                    filteredServices.map((service) => (
                                                        <div key={service.id} className="flex items-center space-x-2">
                                                            <input
                                                                type="checkbox"
                                                                id={`service-${service.id}`}
                                                                checked={field.value?.includes(service.id)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        field.onChange([...(field.value || []), service.id]);
                                                                    } else {
                                                                        field.onChange(field.value?.filter((id) => id !== service.id));
                                                                    }
                                                                }}
                                                                disabled={isSubmitting}
                                                                className="rounded border-gray-300"
                                                            />
                                                            <label htmlFor={`service-${service.id}`} className="text-sm cursor-pointer">
                                                                {service.title}
                                                            </label>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-sm text-muted-foreground col-span-full text-center py-2">
                                                        {serviceSearch ? `No services found matching "${serviceSearch}"` : 'No services available'}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    />
                                    {errors.serviceIds && (
                                        <p className="text-sm text-destructive mt-1">{errors.serviceIds.message}</p>
                                    )}
                                </div>
                            </div>

                            {/* Admin Only Fields */}
                            <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
                                <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">
                                    Admin Only Fields
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="experience">Experience</Label>
                                        <Textarea
                                            id="experience"
                                            {...register('experience')}
                                            disabled={isSubmitting}
                                            rows={3}
                                            placeholder={`${terminology.staff.singular} experience and background`}
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="staffRating">{terminology.staff.singular} Rating</Label>
                                        <Controller
                                            name="staffRating"
                                            control={control}
                                            render={({ field }) => (
                                                <Select {...field} disabled={isSubmitting}>
                                                    <option value={StaffRating.NA}>N/A</option>
                                                    <option value={StaffRating.A}>A</option>
                                                    <option value={StaffRating.B}>B</option>
                                                    <option value={StaffRating.C}>C</option>
                                                </Select>
                                            )}
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="internalNotes">Internal Admin Notes</Label>
                                        <Textarea
                                            id="internalNotes"
                                            {...register('internalNotes')}
                                            disabled={isSubmitting}
                                            rows={3}
                                            placeholder={`Internal notes (not visible to ${terminology.staff.lower})`}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
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
