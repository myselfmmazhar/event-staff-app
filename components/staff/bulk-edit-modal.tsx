'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { InfoIcon } from 'lucide-react';
import { AccountStatus, StaffType, SkillLevel, StaffRating, AvailabilityStatus } from '@prisma/client';
import { useTerminology } from '@/lib/hooks/use-terminology';
import type { StaffWithRelations } from './staff-table';

export type BulkEditFormData = {
    accountStatus?: { enabled: boolean; value?: AccountStatus };
    staffType?: { enabled: boolean; value?: StaffType };
    skillLevel?: { enabled: boolean; value?: SkillLevel };
    availabilityStatus?: { enabled: boolean; value?: AvailabilityStatus };
    staffRating?: { enabled: boolean; value?: StaffRating };
};

interface BulkEditModalProps {
    staff: StaffWithRelations[];
    open: boolean;
    onClose: () => void;
    onSubmit: (data: BulkEditFormData) => void;
    isSubmitting: boolean;
}

const DEFAULT_FORM_STATE: BulkEditFormData = {
    accountStatus: { enabled: false, value: undefined },
    staffType: { enabled: false, value: undefined },
    skillLevel: { enabled: false, value: undefined },
    availabilityStatus: { enabled: false, value: undefined },
    staffRating: { enabled: false, value: undefined },
};

export function BulkEditModal({
    staff,
    open,
    onClose,
    onSubmit,
    isSubmitting,
}: BulkEditModalProps) {
    const { terminology } = useTerminology();
    const [formData, setFormData] = useState<BulkEditFormData>(DEFAULT_FORM_STATE);

    // Reset form when modal opens
    useEffect(() => {
        if (open) {
            setFormData(DEFAULT_FORM_STATE);
        }
    }, [open]);

    // Count how many fields are enabled
    const enabledFieldCount = Object.values(formData).filter(
        (field) => field?.enabled
    ).length;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Only include enabled fields
        const enabledData: BulkEditFormData = {};

        if (formData.accountStatus?.enabled) {
            enabledData.accountStatus = formData.accountStatus;
        }
        if (formData.staffType?.enabled) {
            enabledData.staffType = formData.staffType;
        }
        if (formData.skillLevel?.enabled) {
            enabledData.skillLevel = formData.skillLevel;
        }
        if (formData.availabilityStatus?.enabled) {
            enabledData.availabilityStatus = formData.availabilityStatus;
        }
        if (formData.staffRating?.enabled) {
            enabledData.staffRating = formData.staffRating;
        }

        onSubmit(enabledData);
    };

    const updateField = <K extends keyof BulkEditFormData>(
        field: K,
        updates: Partial<NonNullable<BulkEditFormData[K]>>
    ) => {
        setFormData((prev) => ({
            ...prev,
            [field]: {
                ...prev[field],
                ...updates,
            },
        }));
    };

    return (
        <Dialog open={open} onClose={onClose} className="max-w-2xl">
            <form onSubmit={handleSubmit}>
                <DialogHeader>
                    <DialogTitle>Batch Edit {terminology.staff.plural}</DialogTitle>
                    <DialogDescription>
                        Edit multiple {terminology.staff.lowerPlural} at once. Only enabled fields will be updated.
                    </DialogDescription>
                </DialogHeader>

                <DialogContent>
                    <div className="space-y-6">
                        {/* Selected Staff Summary with Names */}
                        <div className="p-4 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2 mb-3">
                                <Badge variant="primary" size="lg">
                                    {staff.length} {staff.length === 1 ? terminology.staff.lower : terminology.staff.lowerPlural} selected
                                </Badge>
                            </div>
                            {/* Staff Names List */}
                            <div className="flex flex-wrap gap-2">
                                {staff.map((member) => (
                                    <Badge key={member.id} variant="secondary" size="sm">
                                        {member.firstName} {member.lastName}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        {/* Info Alert */}
                        <div className="p-3 bg-info/10 border border-info/20 rounded-lg flex gap-2">
                            <InfoIcon className="h-4 w-4 text-info mt-0.5 shrink-0" />
                            <p className="text-sm text-foreground">
                                Toggle the checkbox next to each field to enable editing.
                                {enabledFieldCount === 0 && ' Enable at least one field to save changes.'}
                            </p>
                        </div>

                        {/* Field Toggles - Reordered as requested */}
                        <div className="space-y-4">
                            {/* 1. Account Status */}
                            <div className="flex items-start gap-4 py-3 border-b border-border">
                                <div className="flex items-center gap-2 w-40 shrink-0 pt-2">
                                    <Checkbox
                                        checked={formData.accountStatus?.enabled}
                                        onChange={(e) =>
                                            updateField('accountStatus', { enabled: e.target.checked })
                                        }
                                    />
                                    <Label className="text-sm font-medium mb-0">Account Status</Label>
                                </div>
                                <div className="flex-1">
                                    {formData.accountStatus?.enabled ? (
                                        <Select
                                            value={formData.accountStatus.value || ''}
                                            onValueChange={(value) =>
                                                updateField('accountStatus', {
                                                    value: value as AccountStatus,
                                                })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select status..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={AccountStatus.ACTIVE}>Active</SelectItem>
                                                <SelectItem value={AccountStatus.DISABLED}>Disabled</SelectItem>
                                                <SelectItem value={AccountStatus.PENDING}>Pending</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <p className="text-sm text-muted-foreground py-2">
                                            Enable to edit this field
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* 2. Talent Type (after Account Status) */}
                            <div className="flex items-start gap-4 py-3 border-b border-border">
                                <div className="flex items-center gap-2 w-40 shrink-0 pt-2">
                                    <Checkbox
                                        checked={formData.staffType?.enabled}
                                        onChange={(e) =>
                                            updateField('staffType', { enabled: e.target.checked })
                                        }
                                    />
                                    <Label className="text-sm font-medium mb-0">{terminology.staff.singular} Type</Label>
                                </div>
                                <div className="flex-1">
                                    {formData.staffType?.enabled ? (
                                        <Select
                                            value={formData.staffType.value || ''}
                                            onValueChange={(value) =>
                                                updateField('staffType', {
                                                    value: value as StaffType,
                                                })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select type..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={StaffType.COMPANY}>Company</SelectItem>
                                                <SelectItem value={StaffType.CONTRACTOR}>Contractor</SelectItem>
                                                <SelectItem value={StaffType.EMPLOYEE}>Employee</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <p className="text-sm text-muted-foreground py-2">
                                            Enable to edit this field
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* 3. Experience */}
                            <div className="flex items-start gap-4 py-3 border-b border-border">
                                <div className="flex items-center gap-2 w-40 shrink-0 pt-2">
                                    <Checkbox
                                        checked={formData.skillLevel?.enabled}
                                        onChange={(e) =>
                                            updateField('skillLevel', { enabled: e.target.checked })
                                        }
                                    />
                                    <Label className="text-sm font-medium mb-0">Experience</Label>
                                </div>
                                <div className="flex-1">
                                    {formData.skillLevel?.enabled ? (
                                        <Select
                                            value={formData.skillLevel.value || ''}
                                            onValueChange={(value) =>
                                                updateField('skillLevel', {
                                                    value: value as SkillLevel,
                                                })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select experience..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={SkillLevel.BEGINNER}>Beginner</SelectItem>
                                                <SelectItem value={SkillLevel.INTERMEDIATE}>Intermediate</SelectItem>
                                                <SelectItem value={SkillLevel.ADVANCED}>Advanced</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <p className="text-sm text-muted-foreground py-2">
                                            Enable to edit this field
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* 4. Availability Status (after Experience) */}
                            <div className="flex items-start gap-4 py-3 border-b border-border">
                                <div className="flex items-center gap-2 w-40 shrink-0 pt-2">
                                    <Checkbox
                                        checked={formData.availabilityStatus?.enabled}
                                        onChange={(e) =>
                                            updateField('availabilityStatus', { enabled: e.target.checked })
                                        }
                                    />
                                    <Label className="text-sm font-medium mb-0">Availability Status</Label>
                                </div>
                                <div className="flex-1">
                                    {formData.availabilityStatus?.enabled ? (
                                        <Select
                                            value={formData.availabilityStatus.value || ''}
                                            onValueChange={(value) =>
                                                updateField('availabilityStatus', {
                                                    value: value as AvailabilityStatus,
                                                })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select availability..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={AvailabilityStatus.OPEN_TO_OFFERS}>Open to Offers</SelectItem>
                                                <SelectItem value={AvailabilityStatus.BUSY}>Busy</SelectItem>
                                                <SelectItem value={AvailabilityStatus.TIME_OFF}>Time Off</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <p className="text-sm text-muted-foreground py-2">
                                            Enable to edit this field
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* 5. Talent Rating (after Availability Status) */}
                            <div className="flex items-start gap-4 py-3">
                                <div className="flex items-center gap-2 w-40 shrink-0 pt-2">
                                    <Checkbox
                                        checked={formData.staffRating?.enabled}
                                        onChange={(e) =>
                                            updateField('staffRating', { enabled: e.target.checked })
                                        }
                                    />
                                    <Label className="text-sm font-medium mb-0">{terminology.staff.singular} Rating</Label>
                                </div>
                                <div className="flex-1">
                                    {formData.staffRating?.enabled ? (
                                        <Select
                                            value={formData.staffRating.value || ''}
                                            onValueChange={(value) =>
                                                updateField('staffRating', {
                                                    value: value as StaffRating,
                                                })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select rating..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={StaffRating.NA}>N/A</SelectItem>
                                                <SelectItem value={StaffRating.A}>A</SelectItem>
                                                <SelectItem value={StaffRating.B}>B</SelectItem>
                                                <SelectItem value={StaffRating.C}>C</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <p className="text-sm text-muted-foreground py-2">
                                            Enable to edit this field
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting} type="button">
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting || enabledFieldCount === 0}>
                        {isSubmitting
                            ? 'Saving...'
                            : `Update ${staff.length} ${staff.length === 1 ? terminology.staff.lower : terminology.staff.lowerPlural}`}
                    </Button>
                </DialogFooter>
            </form>
        </Dialog>
    );
}
