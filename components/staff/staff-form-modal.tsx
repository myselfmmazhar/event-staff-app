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
import { useEffect } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { CloseIcon } from '@/components/ui/icons';
import { StaffSchema, type CreateStaffInput, type UpdateStaffInput } from '@/lib/schemas/staff.schema';
import { AccountStatus, StaffType, RateType, SkillLevel, StaffRating, Staff, StaffPositionAssignment, StaffPosition, StaffWorkTypeAssignment, WorkType } from '@prisma/client';
import { trpc } from '@/lib/client/trpc';
import { useTerminology } from '@/lib/hooks/use-terminology';

// Form schema for client-side
const formSchema = StaffSchema.create;
type StaffFormData = z.infer<typeof formSchema>;

// Define the type with relations included (same as in staff-table)
type StaffWithRelations = Staff & {
    positions: (StaffPositionAssignment & { position: StaffPosition })[];
    workTypes: (StaffWorkTypeAssignment & { workType: WorkType })[];
};

interface StaffFormModalProps {
    staff: StaffWithRelations | null;
    open: boolean;
    onClose: () => void;
    onSubmit: (data: CreateStaffInput | Omit<UpdateStaffInput, 'id'>) => void;
    isSubmitting: boolean;
}

export function StaffFormModal({
    staff,
    open,
    onClose,
    onSubmit,
    isSubmitting,
}: StaffFormModalProps) {
    const { terminology } = useTerminology();
    const isEdit = !!staff;

    // Fetch lookup data
    const { data: positions = [] } = trpc.staff.getPositions.useQuery(undefined, { enabled: open });
    const { data: workTypes = [] } = trpc.staff.getWorkTypes.useQuery(undefined, { enabled: open });
    const { data: contractors = [] } = trpc.staff.getContractors.useQuery(undefined, { enabled: open });

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        control,
        watch,
    } = useForm<StaffFormData>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            accountStatus: AccountStatus.PENDING,
            staffType: StaffType.EMPLOYEE,
            firstName: '',
            lastName: '',
            phone: '',
            email: '',
            dateOfBirth: new Date(),
            payRate: 0,
            billRate: 0,
            rateType: RateType.HOURLY,
            skillLevel: SkillLevel.BEGINNER,
            streetAddress: '',
            aptSuiteUnit: '',
            city: '',
            country: '',
            state: '',
            zipCode: '',
            experience: '',
            staffRating: StaffRating.NA,
            internalNotes: '',
            contractorId: null,
            positionIds: [],
            workTypeIds: [],
        },
    });

    const staffType = watch('staffType');

    useEffect(() => {
        if (staff && open) {
            reset({
                accountStatus: staff.accountStatus,
                staffType: staff.staffType,
                firstName: staff.firstName,
                lastName: staff.lastName,
                phone: staff.phone,
                email: staff.email,
                dateOfBirth: new Date(staff.dateOfBirth),
                payRate: Number(staff.payRate),
                billRate: Number(staff.billRate),
                rateType: staff.rateType,
                skillLevel: staff.skillLevel,
                streetAddress: staff.streetAddress,
                aptSuiteUnit: staff.aptSuiteUnit || '',
                city: staff.city,
                country: staff.country,
                state: staff.state,
                zipCode: staff.zipCode,
                experience: staff.experience || '',
                staffRating: staff.staffRating,
                internalNotes: staff.internalNotes || '',
                contractorId: staff.contractorId || null,
                positionIds: staff.positions?.map((p) => p.position.id) || [],
                workTypeIds: staff.workTypes?.map((w) => w.workType.id) || [],
            });
        } else if (!staff && open) {
            reset({
                accountStatus: AccountStatus.PENDING,
                staffType: StaffType.EMPLOYEE,
                firstName: '',
                lastName: '',
                phone: '',
                email: '',
                dateOfBirth: new Date(),
                payRate: 0,
                billRate: 0,
                rateType: RateType.HOURLY,
                skillLevel: SkillLevel.BEGINNER,
                streetAddress: '',
                aptSuiteUnit: '',
                city: '',
                country: '',
                state: '',
                zipCode: '',
                experience: '',
                staffRating: StaffRating.NA,
                internalNotes: '',
                contractorId: null,
                positionIds: [],
                workTypeIds: [],
            });
        }
    }, [staff, open, reset]);

    // Properly typed submit handler to match react-hook-form expectations
    const handleFormSubmit: SubmitHandler<StaffFormData> = (data) => {
        onSubmit(data);
    };

    return (
        <Dialog open={open} onClose={onClose} className="max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col h-full overflow-hidden">
                <DialogHeader className="shrink-0">
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
                </DialogHeader>

                <DialogContent className="flex-1 overflow-y-auto">
                    {/* Staff ID (Read-only in edit mode) */}
                    {isEdit && staff && (
                        <div className="mb-6 p-3 bg-muted/30 rounded-md border border-border">
                            <p className="text-sm text-muted-foreground">{terminology.staff.singular} ID</p>
                            <p className="text-base font-medium">{staff.staffId}</p>
                        </div>
                    )}

                    {/* Account Details */}
                    <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
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
                                <Label htmlFor="staffType" required>Staff Type</Label>
                                <Controller
                                    name="staffType"
                                    control={control}
                                    render={({ field }) => (
                                        <Select {...field} disabled={isSubmitting}>
                                            <option value={StaffType.EMPLOYEE}>Employee</option>
                                            <option value={StaffType.CONTRACTOR}>Contractor</option>
                                        </Select>
                                    )}
                                />
                                {errors.staffType && (
                                    <p className="text-sm text-destructive mt-1">{errors.staffType.message}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Staff Information */}
                    <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
                        <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Staff Information</h3>
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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                                <div>
                                    <Label htmlFor="phone" required>Phone</Label>
                                    <Input
                                        id="phone"
                                        {...register('phone')}
                                        error={!!errors.phone}
                                        disabled={isSubmitting}
                                    />
                                    {errors.phone && (
                                        <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="dateOfBirth" required>Date of Birth</Label>
                                    <Input
                                        id="dateOfBirth"
                                        type="date"
                                        {...register('dateOfBirth', { valueAsDate: true })}
                                        error={!!errors.dateOfBirth}
                                        disabled={isSubmitting}
                                    />
                                    {errors.dateOfBirth && (
                                        <p className="text-sm text-destructive mt-1">{errors.dateOfBirth.message}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="skillLevel" required>Skill Level</Label>
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

                                {staffType === StaffType.EMPLOYEE && (
                                    <div>
                                        <Label htmlFor="contractorId">Contractor</Label>
                                        <Controller
                                            name="contractorId"
                                            control={control}
                                            render={({ field }) => (
                                                <Select
                                                    value={field.value || ''}
                                                    onChange={(e) => field.onChange(e.target.value || null)}
                                                    disabled={isSubmitting}
                                                >
                                                    <option value="">None</option>
                                                    {contractors.map((c) => (
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

                            {/* Rate Information */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="rateType" required>Rate Type</Label>
                                    <Controller
                                        name="rateType"
                                        control={control}
                                        render={({ field }) => (
                                            <Select {...field} disabled={isSubmitting}>
                                                <option value={RateType.HOURLY}>Hourly</option>
                                                <option value={RateType.DAILY}>Daily</option>
                                                <option value={RateType.SHIFT}>Shift</option>
                                                <option value={RateType.EVENT}>Event</option>
                                            </Select>
                                        )}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="payRate" required>Pay Rate</Label>
                                    <Input
                                        id="payRate"
                                        type="number"
                                        step="0.01"
                                        {...register('payRate', { valueAsNumber: true })}
                                        error={!!errors.payRate}
                                        disabled={isSubmitting}
                                    />
                                    {errors.payRate && (
                                        <p className="text-sm text-destructive mt-1">{errors.payRate.message}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="billRate" required>Bill Rate</Label>
                                    <Input
                                        id="billRate"
                                        type="number"
                                        step="0.01"
                                        {...register('billRate', { valueAsNumber: true })}
                                        error={!!errors.billRate}
                                        disabled={isSubmitting}
                                    />
                                    {errors.billRate && (
                                        <p className="text-sm text-destructive mt-1">{errors.billRate.message}</p>
                                    )}
                                </div>
                            </div>

                            {/* Positions */}
                            <div>
                                <Label required>Assigned Positions</Label>
                                <Controller
                                    name="positionIds"
                                    control={control}
                                    render={({ field }) => (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 max-h-40 overflow-y-auto p-3 border rounded-md">
                                            {positions.map((position) => (
                                                <div key={position.id} className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        id={`position-${position.id}`}
                                                        checked={field.value?.includes(position.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                field.onChange([...(field.value || []), position.id]);
                                                            } else {
                                                                field.onChange(field.value?.filter((id) => id !== position.id));
                                                            }
                                                        }}
                                                        disabled={isSubmitting}
                                                        className="rounded border-gray-300"
                                                    />
                                                    <label htmlFor={`position-${position.id}`} className="text-sm cursor-pointer">
                                                        {position.name}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                />
                                {errors.positionIds && (
                                    <p className="text-sm text-destructive mt-1">{errors.positionIds.message}</p>
                                )}
                            </div>

                            {/* Work Types */}
                            <div>
                                <Label required>Work Type(s) Desired</Label>
                                <Controller
                                    name="workTypeIds"
                                    control={control}
                                    render={({ field }) => (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 max-h-40 overflow-y-auto p-3 border rounded-md">
                                            {workTypes.map((workType) => (
                                                <div key={workType.id} className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        id={`worktype-${workType.id}`}
                                                        checked={field.value?.includes(workType.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                field.onChange([...(field.value || []), workType.id]);
                                                            } else {
                                                                field.onChange(field.value?.filter((id) => id !== workType.id));
                                                            }
                                                        }}
                                                        disabled={isSubmitting}
                                                        className="rounded border-gray-300"
                                                    />
                                                    <label htmlFor={`worktype-${workType.id}`} className="text-sm cursor-pointer">
                                                        {workType.name}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                />
                                {errors.workTypeIds && (
                                    <p className="text-sm text-destructive mt-1">{errors.workTypeIds.message}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Address */}
                    <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
                        <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Address</h3>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="streetAddress" required>Street Address</Label>
                                <Input
                                    id="streetAddress"
                                    {...register('streetAddress')}
                                    error={!!errors.streetAddress}
                                    disabled={isSubmitting}
                                />
                                {errors.streetAddress && (
                                    <p className="text-sm text-destructive mt-1">{errors.streetAddress.message}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="aptSuiteUnit">Apt/Suite/Unit</Label>
                                <Input
                                    id="aptSuiteUnit"
                                    {...register('aptSuiteUnit')}
                                    error={!!errors.aptSuiteUnit}
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <Label htmlFor="city" required>City</Label>
                                    <Input
                                        id="city"
                                        {...register('city')}
                                        error={!!errors.city}
                                        disabled={isSubmitting}
                                    />
                                    {errors.city && (
                                        <p className="text-sm text-destructive mt-1">{errors.city.message}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="state" required>State</Label>
                                    <Input
                                        id="state"
                                        {...register('state')}
                                        error={!!errors.state}
                                        disabled={isSubmitting}
                                    />
                                    {errors.state && (
                                        <p className="text-sm text-destructive mt-1">{errors.state.message}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="zipCode" required>ZIP Code</Label>
                                    <Input
                                        id="zipCode"
                                        {...register('zipCode')}
                                        error={!!errors.zipCode}
                                        disabled={isSubmitting}
                                    />
                                    {errors.zipCode && (
                                        <p className="text-sm text-destructive mt-1">{errors.zipCode.message}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="country" required>Country</Label>
                                    <Input
                                        id="country"
                                        {...register('country')}
                                        error={!!errors.country}
                                        disabled={isSubmitting}
                                    />
                                    {errors.country && (
                                        <p className="text-sm text-destructive mt-1">{errors.country.message}</p>
                                    )}
                                </div>
                            </div>
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
                                    placeholder="Staff experience and background"
                                />
                            </div>

                            <div>
                                <Label htmlFor="staffRating">Staff Rating</Label>
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
                                    placeholder="Internal notes (not visible to staff)"
                                />
                            </div>
                        </div>
                    </div>
                </DialogContent>

                <DialogFooter className="shrink-0">
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : isEdit ? `Update ${terminology.staff.singular}` : `Create ${terminology.staff.singular}`}
                    </Button>
                </DialogFooter>
            </form>
        </Dialog>
    );
}
