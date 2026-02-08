'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { updateTerminologySchema } from '@/lib/schemas/settings.schema';
import { trpc } from '@/lib/client/trpc';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import type { TerminologyConfig } from '@/lib/config/terminology';
import { useActionLabels } from '@/lib/hooks/use-labels';

type TerminologyFormData = z.infer<typeof updateTerminologySchema>;

interface TerminologyFormProps {
    currentTerminology: TerminologyConfig;
}

// Preset options
const STAFF_PRESETS = [
    { value: 'Staff', label: 'Staff (Default)' },
    { value: 'Talent', label: 'Talent' },
    { value: 'Member', label: 'Member' },
    { value: 'Crew', label: 'Crew' },
    { value: 'custom', label: 'Custom...' },
];

const EVENT_PRESETS = [
    { value: 'Event', label: 'Event (Default)' },
    { value: 'Task', label: 'Task' },
    { value: 'Project', label: 'Project' },
    { value: 'Job', label: 'Job' },
    { value: 'Function', label: 'Function' },
    { value: 'Experience', label: 'Experience' },
    { value: 'custom', label: 'Custom...' },
];

const ROLE_PRESETS = [
    { value: 'Role', label: 'Role (Default)' },
    { value: 'Position', label: 'Position' },
    { value: 'Access Level', label: 'Access Level' },
    { value: 'Permission', label: 'Permission' },
    { value: 'Level', label: 'Level' },
    { value: 'custom', label: 'Custom...' },
];

export function TerminologyForm({ currentTerminology }: TerminologyFormProps) {
    const { toast } = useToast();
    const actionLabels = useActionLabels();
    const [showStaffCustom, setShowStaffCustom] = useState(false);
    const [showEventCustom, setShowEventCustom] = useState(false);
    const [showRoleCustom, setShowRoleCustom] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isDirty },
        reset,
        control,
        watch,
        setValue,
    } = useForm<TerminologyFormData>({
        resolver: zodResolver(updateTerminologySchema),
        defaultValues: {
            staffTermSingular: currentTerminology.staff.singular,
            staffTermPlural: currentTerminology.staff.plural,
            eventTermSingular: currentTerminology.event.singular,
            eventTermPlural: currentTerminology.event.plural,
            roleTermSingular: currentTerminology.role.singular,
            roleTermPlural: currentTerminology.role.plural,
        },
    });

    const staffSingular = watch('staffTermSingular');
    const eventSingular = watch('eventTermSingular');
    const roleSingular = watch('roleTermSingular');

    // tRPC mutations
    const utils = trpc.useUtils();
    const updateMutation = trpc.settings.updateTerminology.useMutation({
        onSuccess: (data) => {
            toast({
                title: 'Success',
                description: 'Terminology updated successfully. Refreshing...',
            });
            // Invalidate terminology cache
            utils.settings.getTerminology.invalidate();
            // Refresh the page to apply new routes
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message || 'Failed to update terminology',
                variant: 'error',
            });
        },
    });

    const resetMutation = trpc.settings.resetTerminology.useMutation({
        onSuccess: () => {
            toast({
                title: 'Success',
                description: 'Terminology reset to defaults. Refreshing...',
            });
            // Invalidate terminology cache
            utils.settings.getTerminology.invalidate();
            // Refresh the page to apply default routes
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message || 'Failed to reset terminology',
                variant: 'error',
            });
        },
    });

    const onSubmit = (data: TerminologyFormData) => {
        updateMutation.mutate(data);
    };

    const handleReset = () => {
        if (confirm('Are you sure you want to reset terminology to defaults? This will reload the page.')) {
            resetMutation.mutate();
        }
    };

    const handlePreset = (preset: string) => {
        if (preset === 'Staff/Events') {
            setValue('staffTermSingular', 'Staff', { shouldDirty: true });
            setValue('staffTermPlural', 'Staff', { shouldDirty: true });
            setValue('eventTermSingular', 'Event', { shouldDirty: true });
            setValue('eventTermPlural', 'Events', { shouldDirty: true });
            setValue('roleTermSingular', 'Role', { shouldDirty: true });
            setValue('roleTermPlural', 'Roles', { shouldDirty: true });
        } else if (preset === 'Talent/Events') {
            setValue('staffTermSingular', 'Talent', { shouldDirty: true });
            setValue('staffTermPlural', 'Talents', { shouldDirty: true });
            setValue('eventTermSingular', 'Event', { shouldDirty: true });
            setValue('eventTermPlural', 'Events', { shouldDirty: true });
            setValue('roleTermSingular', 'Role', { shouldDirty: true });
            setValue('roleTermPlural', 'Roles', { shouldDirty: true });
        } else if (preset === 'Staff/Tasks') {
            setValue('staffTermSingular', 'Staff', { shouldDirty: true });
            setValue('staffTermPlural', 'Staff', { shouldDirty: true });
            setValue('eventTermSingular', 'Task', { shouldDirty: true });
            setValue('eventTermPlural', 'Tasks', { shouldDirty: true });
            setValue('roleTermSingular', 'Role', { shouldDirty: true });
            setValue('roleTermPlural', 'Roles', { shouldDirty: true });
        } else if (preset === 'Talent/Tasks') {
            setValue('staffTermSingular', 'Talent', { shouldDirty: true });
            setValue('staffTermPlural', 'Talents', { shouldDirty: true });
            setValue('eventTermSingular', 'Task', { shouldDirty: true });
            setValue('eventTermPlural', 'Tasks', { shouldDirty: true });
            setValue('roleTermSingular', 'Role', { shouldDirty: true });
            setValue('roleTermPlural', 'Roles', { shouldDirty: true });
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Quick Presets */}
            <div>
                <h3 className="text-sm font-medium mb-3">Quick Presets</h3>
                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreset('Staff/Events')}
                    >
                        Staff / Events
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreset('Talent/Events')}
                    >
                        Talent / Events
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreset('Staff/Tasks')}
                    >
                        Staff / Tasks
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreset('Talent/Tasks')}
                    >
                        Talent / Tasks
                    </Button>
                </div>
            </div>

            {/* Staff Term Section */}
            <div className="space-y-4">
                <h3 className="text-sm font-medium">Staff Term</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="staffTermSingular">Singular Form</Label>
                        <Controller
                            name="staffTermSingular"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    {...field}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (value === 'custom') {
                                            setShowStaffCustom(true);
                                            field.onChange('');
                                        } else {
                                            setShowStaffCustom(false);
                                            field.onChange(value);
                                        }
                                    }}
                                >
                                    {STAFF_PRESETS.map((preset) => (
                                        <option key={preset.value} value={preset.value}>
                                            {preset.label}
                                        </option>
                                    ))}
                                </Select>
                            )}
                        />
                        {showStaffCustom && (
                            <Input
                                {...register('staffTermSingular')}
                                placeholder="Enter custom singular term"
                            />
                        )}
                        {errors.staffTermSingular && (
                            <p className="text-sm text-red-500">{errors.staffTermSingular.message}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="staffTermPlural">Plural Form</Label>
                        <Input
                            {...register('staffTermPlural')}
                            placeholder="e.g., Staff, Talents, Members"
                        />
                        {errors.staffTermPlural && (
                            <p className="text-sm text-red-500">{errors.staffTermPlural.message}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Event Term Section */}
            <div className="space-y-4">
                <h3 className="text-sm font-medium">Event Term</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="eventTermSingular">Singular Form</Label>
                        <Controller
                            name="eventTermSingular"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    {...field}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (value === 'custom') {
                                            setShowEventCustom(true);
                                            field.onChange('');
                                        } else {
                                            setShowEventCustom(false);
                                            field.onChange(value);
                                        }
                                    }}
                                >
                                    {EVENT_PRESETS.map((preset) => (
                                        <option key={preset.value} value={preset.value}>
                                            {preset.label}
                                        </option>
                                    ))}
                                </Select>
                            )}
                        />
                        {showEventCustom && (
                            <Input
                                {...register('eventTermSingular')}
                                placeholder="Enter custom singular term"
                            />
                        )}
                        {errors.eventTermSingular && (
                            <p className="text-sm text-red-500">{errors.eventTermSingular.message}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="eventTermPlural">Plural Form</Label>
                        <Input
                            {...register('eventTermPlural')}
                            placeholder="e.g., Events, Tasks, Projects"
                        />
                        {errors.eventTermPlural && (
                            <p className="text-sm text-red-500">{errors.eventTermPlural.message}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Role Term Section */}
            <div className="space-y-4">
                <h3 className="text-sm font-medium">Role Term</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="roleTermSingular">Singular Form</Label>
                        <Controller
                            name="roleTermSingular"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    {...field}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (value === 'custom') {
                                            setShowRoleCustom(true);
                                            field.onChange('');
                                        } else {
                                            setShowRoleCustom(false);
                                            field.onChange(value);
                                        }
                                    }}
                                >
                                    {ROLE_PRESETS.map((preset) => (
                                        <option key={preset.value} value={preset.value}>
                                            {preset.label}
                                        </option>
                                    ))}
                                </Select>
                            )}
                        />
                        {showRoleCustom && (
                            <Input
                                {...register('roleTermSingular')}
                                placeholder="Enter custom singular term"
                            />
                        )}
                        {errors.roleTermSingular && (
                            <p className="text-sm text-red-500">{errors.roleTermSingular.message}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="roleTermPlural">Plural Form</Label>
                        <Input
                            {...register('roleTermPlural')}
                            placeholder="e.g., Roles, Positions, Levels"
                        />
                        {errors.roleTermPlural && (
                            <p className="text-sm text-red-500">{errors.roleTermPlural.message}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Preview Section */}
            <div className="border border-border rounded-lg p-4 bg-muted/50">
                <h3 className="text-sm font-medium mb-3">Preview</h3>
                <div className="space-y-2 text-sm">
                    <p>
                        <span className="text-muted-foreground">Example button:</span>{' '}
                        <span className="font-medium">Add {staffSingular}</span>
                    </p>
                    <p>
                        <span className="text-muted-foreground">Example heading:</span>{' '}
                        <span className="font-medium">{eventSingular} Details</span>
                    </p>
                    <p>
                        <span className="text-muted-foreground">User form label:</span>{' '}
                        <span className="font-medium">{roleSingular}</span>
                    </p>
                    <p>
                        <span className="text-muted-foreground">ID formats:</span>{' '}
                        <span className="font-mono text-xs">
                            {staffSingular.substring(0, 3).toUpperCase()}-2025-001, {' '}
                            {eventSingular.substring(0, 3).toUpperCase()}-2025-001
                        </span>
                    </p>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between">
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    disabled={resetMutation.isPending}
                >
                    {resetMutation.isPending ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Resetting...
                        </>
                    ) : (
                        <>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Reset to Defaults
                        </>
                    )}
                </Button>
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => reset()}
                        disabled={!isDirty || updateMutation.isPending}
                    >
                        {actionLabels.cancel}
                    </Button>
                    <Button
                        type="submit"
                        disabled={!isDirty || updateMutation.isPending}
                    >
                        {updateMutation.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            actionLabels.save
                        )}
                    </Button>
                </div>
            </div>
        </form>
    );
}
