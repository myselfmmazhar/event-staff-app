'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { CloseIcon } from '@/components/ui/icons';
import { trpc } from '@/lib/client/trpc';
import {
    TeamUnitSchema,
    TEAM_UNIT_STATUS,
    TEAM_UNIT_AVAILABILITY,
    type CreateTeamUnitFormValues,
} from '@/lib/schemas/team-unit.schema';
import { toast } from '@/components/ui/use-toast';

type ExistingUnit = {
    id: string;
    unitName: string;
    primaryContact: string | null;
    serviceId: string | null;
    service?: { id: string; title: string } | null;
    status: typeof TEAM_UNIT_STATUS[number];
    availability: typeof TEAM_UNIT_AVAILABILITY[number];
    capacityNotes: string | null;
    internalNotes: string | null;
};

interface AddTeamUnitModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    unit?: ExistingUnit | null;
}

const STATUS_OPTIONS: { value: typeof TEAM_UNIT_STATUS[number]; label: string }[] = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'PENDING_REVIEW', label: 'Pending Review' },
    { value: 'ARCHIVED', label: 'Archived' },
];

const AVAILABILITY_OPTIONS: { value: typeof TEAM_UNIT_AVAILABILITY[number]; label: string }[] = [
    { value: 'AVAILABLE', label: 'Available' },
    { value: 'LIMITED', label: 'Limited Availability' },
    { value: 'NOT_AVAILABLE', label: 'Not Available' },
];

const DEFAULT_VALUES: CreateTeamUnitFormValues = {
    unitName: '',
    primaryContact: '',
    serviceId: null,
    status: 'ACTIVE',
    availability: 'AVAILABLE',
    capacityNotes: '',
    internalNotes: '',
};

export function AddTeamUnitModal({ open, onClose, onSuccess, unit }: AddTeamUnitModalProps) {
    const utils = trpc.useUtils();
    const isEditing = !!unit;

    const { data: myProfile } = trpc.staff.getMyProfile.useQuery(undefined, { enabled: open });

    const staffServices = myProfile?.services ?? [];
    const { data: allServices } = trpc.staff.getServices.useQuery(undefined, {
        enabled: open && staffServices.length === 0,
    });

    const baseServiceOptions = staffServices.length > 0
        ? staffServices.map((s: any) => ({ id: s.service.id, title: s.service.title }))
        : (allServices ?? []).map((s: any) => ({ id: s.id, title: s.title }));

    // Always include the unit's existing service so the label resolves immediately on edit
    const serviceOptions = (() => {
        if (unit?.service && !baseServiceOptions.find((s) => s.id === unit.service!.id)) {
            return [...baseServiceOptions, { id: unit.service.id, title: unit.service.title }];
        }
        return baseServiceOptions;
    })();

    const createMutation = trpc.teamUnit.create.useMutation({
        onSuccess: () => {
            toast({ title: 'Team unit created successfully.' });
            utils.teamUnit.getAll.invalidate();
            reset();
            onSuccess?.();
            onClose();
        },
        onError: (err) => {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        },
    });

    const updateMutation = trpc.teamUnit.update.useMutation({
        onSuccess: () => {
            toast({ title: 'Team unit updated successfully.' });
            utils.teamUnit.getAll.invalidate();
            onSuccess?.();
            onClose();
        },
        onError: (err) => {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        },
    });

    const {
        register,
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<CreateTeamUnitFormValues>({
        resolver: zodResolver(TeamUnitSchema.create) as any,
        defaultValues: DEFAULT_VALUES,
    });

    useEffect(() => {
        if (open && unit) {
            reset({
                unitName: unit.unitName,
                primaryContact: unit.primaryContact ?? '',
                serviceId: unit.serviceId ?? null,
                status: unit.status,
                availability: unit.availability,
                capacityNotes: unit.capacityNotes ?? '',
                internalNotes: unit.internalNotes ?? '',
            });
        } else if (!open) {
            reset(DEFAULT_VALUES);
        }
    }, [open, unit, reset]);

    const isPending = createMutation.isPending || updateMutation.isPending;

    const onSubmit = (data: CreateTeamUnitFormValues) => {
        if (isEditing && unit) {
            updateMutation.mutate({ id: unit.id, ...data });
        } else {
            createMutation.mutate(data);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            className="mx-4 flex h-[min(94vh,1000px)] w-full max-h-[min(94vh,1000px)] max-w-[1400px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-card p-0 shadow-xl"
        >
            <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex h-full min-h-0 flex-col bg-white"
            >
                {/* Header */}
                <div className="shrink-0 border-b border-slate-200 px-6 pb-5 pt-5 sm:px-8">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1 pr-2">
                            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                                {isEditing ? 'Edit Team Unit' : 'Add New Team Unit'}
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                {isEditing
                                    ? 'Update the details for this team unit.'
                                    : 'Add a new unit that may be assigned to offers, tasks, or assignments based on the services approved for this team.'}
                            </p>
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
                </div>

                {/* Body */}
                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
                    <div className="mx-auto max-w-6xl">
                        <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">

                            {/* Unit Name / Number */}
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="tu-unitName" className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                    Unit Name / Number
                                </Label>
                                <Input
                                    id="tu-unitName"
                                    placeholder="Example: Truck #122"
                                    {...register('unitName')}
                                    className="h-10 rounded-lg border-slate-200"
                                />
                                {errors.unitName && (
                                    <p className="text-xs text-red-500">{errors.unitName.message}</p>
                                )}
                            </div>

                            {/* Service Type */}
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="tu-service" className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                    Service Type
                                </Label>
                                <Controller
                                    name="serviceId"
                                    control={control}
                                    render={({ field }) => {
                                        const selectedLabel = field.value
                                            ? serviceOptions.find(s => s.id === field.value)?.title
                                            : undefined;
                                        return (
                                        <Select
                                            value={field.value ?? '__none__'}
                                            onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
                                        >
                                            <SelectTrigger id="tu-service" className="h-10 rounded-lg border-slate-200">
                                                <SelectValue placeholder="Select service type">
                                                    {selectedLabel ?? (field.value ? 'Loading…' : 'Select service type')}
                                                </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="__none__">None</SelectItem>
                                                {serviceOptions.map((s) => (
                                                    <SelectItem key={s.id} value={s.id}>
                                                        {s.title}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        );
                                    }}
                                />
                            </div>

                            {/* Primary Contact / Operator */}
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="tu-contact" className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                    Primary Contact / Operator
                                </Label>
                                <Input
                                    id="tu-contact"
                                    placeholder="Example: W. Johnson"
                                    {...register('primaryContact')}
                                    className="h-10 rounded-lg border-slate-200"
                                />
                            </div>

                            {/* Status */}
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="tu-status" className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                    Status
                                </Label>
                                <Controller
                                    name="status"
                                    control={control}
                                    render={({ field }) => (
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <SelectTrigger id="tu-status" className="h-10 rounded-lg border-slate-200">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {STATUS_OPTIONS.map((o) => (
                                                    <SelectItem key={o.value} value={o.value}>
                                                        {o.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>

                            {/* Capacity / Notes */}
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="tu-capacity" className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                    Capacity / Notes
                                </Label>
                                <Input
                                    id="tu-capacity"
                                    placeholder="Example: 18 tons, 2-person crew, liftgate, etc."
                                    {...register('capacityNotes')}
                                    className="h-10 rounded-lg border-slate-200"
                                />
                            </div>

                            {/* Availability */}
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="tu-avail" className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                    Availability
                                </Label>
                                <Controller
                                    name="availability"
                                    control={control}
                                    render={({ field }) => (
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <SelectTrigger id="tu-avail" className="h-10 rounded-lg border-slate-200">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {AVAILABILITY_OPTIONS.map((o) => (
                                                    <SelectItem key={o.value} value={o.value}>
                                                        {o.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>

                            {/* Internal Notes — full width */}
                            <div className="flex flex-col gap-1.5 sm:col-span-2">
                                <Label htmlFor="tu-notes" className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                    Internal Notes
                                </Label>
                                <Textarea
                                    id="tu-notes"
                                    placeholder="Add any details about this unit. Example: preferred service area, equipment notes, restrictions, or assignment reminders."
                                    rows={4}
                                    {...register('internalNotes')}
                                    className="rounded-lg border-slate-200 resize-none"
                                />
                            </div>

                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="shrink-0 border-t border-slate-200 px-6 py-5 sm:px-8 bg-slate-50/50">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <Button
                            type="submit"
                            disabled={isPending}
                            className="h-14 w-full rounded-xl bg-slate-900 px-10 text-lg font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 hover:shadow-none sm:w-auto sm:min-w-[280px]"
                        >
                            {isPending ? 'Saving...' : isEditing ? 'Update Team Unit' : 'Save Team Unit'}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isPending}
                            className="h-10 rounded-xl border-slate-200 bg-white px-5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </form>
        </Dialog>
    );
}
