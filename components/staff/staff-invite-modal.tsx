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
import { Select } from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { CloseIcon } from '@/components/ui/icons';
import { StaffSchema, type InviteStaffInput } from '@/lib/schemas/staff.schema';
import { StaffType } from '@prisma/client';
import { trpc } from '@/lib/client/trpc';
import { useTerminology } from '@/lib/hooks/use-terminology';

// Form schema for invitation
const formSchema = StaffSchema.invite;
type InviteFormInput = z.input<typeof formSchema>;
type InviteFormOutput = z.infer<typeof formSchema>;

type ServiceOption = { id: string; title: string };

interface StaffInviteModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: InviteStaffInput) => void;
    isSubmitting: boolean;
}

export function StaffInviteModal({
    open,
    onClose,
    onSubmit,
    isSubmitting,
}: StaffInviteModalProps) {
    const { terminology } = useTerminology();

    // Fetch services
    const { data: servicesData } = trpc.staff.getServices.useQuery(undefined, { enabled: open });
    const services = (servicesData ?? []) as ServiceOption[];

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        control,
    } = useForm<InviteFormInput, undefined, InviteFormOutput>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
            firstName: '',
            lastName: '',
            staffType: StaffType.EMPLOYEE,
            serviceIds: [],
        },
    });

    // Reset form when modal closes
    const handleClose = () => {
        reset();
        onClose();
    };

    const handleFormSubmit: SubmitHandler<InviteFormOutput> = (data) => {
        onSubmit(data);
    };

    return (
        <Dialog open={open} onClose={handleClose} className="max-w-lg">
            <form onSubmit={handleSubmit(handleFormSubmit)}>
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle>Invite {terminology.staff.singular}</DialogTitle>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <CloseIcon className="h-5 w-5" />
                        </button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        Send an invitation email for the {terminology.staff.lower} to complete their profile.
                    </p>
                </DialogHeader>

                <DialogContent>
                    <div className="space-y-4">
                        {/* Basic Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="firstName" required>First Name</Label>
                                <Input
                                    id="firstName"
                                    {...register('firstName')}
                                    error={!!errors.firstName}
                                    disabled={isSubmitting}
                                    placeholder="John"
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
                                    placeholder="Doe"
                                />
                                {errors.lastName && (
                                    <p className="text-sm text-destructive mt-1">{errors.lastName.message}</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="email" required>Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                {...register('email')}
                                error={!!errors.email}
                                disabled={isSubmitting}
                                placeholder="john.doe@example.com"
                            />
                            {errors.email && (
                                <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                                An invitation will be sent to this email address.
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="staffType" required>{terminology.staff.singular} Type</Label>
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

                        {/* Services */}
                        <div>
                            <Label required>Assigned Services</Label>
                            <Controller
                                name="serviceIds"
                                control={control}
                                render={({ field }) => (
                                    <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto p-3 border rounded-md">
                                        {services.map((service) => (
                                            <div key={service.id} className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    id={`invite-service-${service.id}`}
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
                                                <label htmlFor={`invite-service-${service.id}`} className="text-sm cursor-pointer">
                                                    {service.title}
                                                </label>
                                            </div>
                                        ))}
                                        {services.length === 0 && (
                                            <p className="text-sm text-muted-foreground col-span-2">
                                                No services available. Create services first.
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
                </DialogContent>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Sending...' : 'Send Invitation'}
                    </Button>
                </DialogFooter>
            </form>
        </Dialog>
    );
}
