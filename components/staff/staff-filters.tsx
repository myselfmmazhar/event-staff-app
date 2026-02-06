'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';
import { AccountStatus, StaffType, SkillLevel } from '@prisma/client';
import { FilterIcon, CalendarIcon } from '@/components/ui/icons';
import { useFilterLabels, useStaffPageLabels } from '@/lib/hooks/use-labels';

const STATUS_OPTIONS: Array<{ value: AccountStatus; label: string }> = [
    { value: AccountStatus.ACTIVE, label: 'Active' },
    { value: AccountStatus.PENDING, label: 'Pending' },
    { value: AccountStatus.DISABLED, label: 'Disabled' },
];

const STAFF_TYPE_OPTIONS: Array<{ value: StaffType; label: string }> = [
    { value: StaffType.COMPANY, label: 'Company' },
    { value: StaffType.CONTRACTOR, label: 'Contractor' },
    { value: StaffType.EMPLOYEE, label: 'Employee' },
];

const SKILL_LEVEL_OPTIONS: Array<{ value: SkillLevel; label: string }> = [
    { value: SkillLevel.BEGINNER, label: 'Beginner' },
    { value: SkillLevel.INTERMEDIATE, label: 'Intermediate' },
    { value: SkillLevel.ADVANCED, label: 'Advanced' },
];

interface StaffFiltersProps {
    selectedStatuses: AccountStatus[];
    selectedTypes: StaffType[];
    selectedSkillLevels: SkillLevel[];
    createdFrom: string;
    createdTo: string;
    onStatusChange: (statuses: AccountStatus[]) => void;
    onTypeChange: (types: StaffType[]) => void;
    onSkillLevelChange: (levels: SkillLevel[]) => void;
    onCreatedFromChange: (date: string) => void;
    onCreatedToChange: (date: string) => void;
    onClearFilters: () => void;
}

export function StaffFilters({
    selectedStatuses,
    selectedTypes,
    selectedSkillLevels,
    createdFrom,
    createdTo,
    onStatusChange,
    onTypeChange,
    onSkillLevelChange,
    onCreatedFromChange,
    onCreatedToChange,
    onClearFilters,
}: StaffFiltersProps) {
    const filterLabels = useFilterLabels();
    const staffLabels = useStaffPageLabels();
    const hasActiveFilters =
        selectedStatuses.length > 0 ||
        selectedTypes.length > 0 ||
        selectedSkillLevels.length > 0 ||
        createdFrom !== '' ||
        createdTo !== '';

    return (
        <div className="space-y-4">
            {/* Header with Clear All button */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">{staffLabels.filters.title}</h3>
                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClearFilters}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        {filterLabels.clearAll}
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Account Status Filter */}
                <div className="flex flex-col gap-2">
                    <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <FilterIcon className="h-4 w-4" />
                        {staffLabels.filters.accountStatus}
                    </Label>
                    <MultiSelect
                        options={STATUS_OPTIONS}
                        value={selectedStatuses}
                        onChange={onStatusChange}
                        placeholder="All"
                    />
                </div>

                {/* Staff Type Filter */}
                <div className="flex flex-col gap-2">
                    <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <FilterIcon className="h-4 w-4" />
                        {staffLabels.filters.staffType}
                    </Label>
                    <MultiSelect
                        options={STAFF_TYPE_OPTIONS}
                        value={selectedTypes}
                        onChange={onTypeChange}
                        placeholder="All"
                    />
                </div>

                {/* Skill Level Filter */}
                <div className="flex flex-col gap-2">
                    <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <FilterIcon className="h-4 w-4" />
                        {staffLabels.filters.skillLevel}
                    </Label>
                    <MultiSelect
                        options={SKILL_LEVEL_OPTIONS}
                        value={selectedSkillLevels}
                        onChange={onSkillLevelChange}
                        placeholder="All"
                    />
                </div>

                {/* Date From Filter */}
                <div className="flex flex-col gap-2">
                    <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        Created Date (From)
                    </Label>
                    <Input
                        type="date"
                        value={createdFrom || ''}
                        onChange={(e) => onCreatedFromChange(e.target.value || '')}
                    />
                </div>

                {/* Date To Filter */}
                <div className="flex flex-col gap-2">
                    <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        Created Date (To)
                    </Label>
                    <Input
                        type="date"
                        value={createdTo || ''}
                        onChange={(e) => onCreatedToChange(e.target.value || '')}
                    />
                </div>
            </div>
        </div>
    );
}
