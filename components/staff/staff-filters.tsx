'use client';

import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AccountStatus, StaffType, SkillLevel } from '@prisma/client';
import { FilterIcon, XIcon } from '@/components/ui/icons';
import { useFilterLabels, useStaffPageLabels } from '@/lib/hooks/use-labels';

type StaffFilterKey = 'accountStatus' | 'staffType' | 'skillLevel';

interface StaffFiltersProps {
    filters: Partial<Record<StaffFilterKey, string>>;
    onFilterChange: (key: StaffFilterKey, value: string) => void;
    onClearFilters: () => void;
}

export function StaffFilters({ filters, onFilterChange, onClearFilters }: StaffFiltersProps) {
    const filterLabels = useFilterLabels();
    const staffLabels = useStaffPageLabels();
    const hasActiveFilters = filters.accountStatus || filters.staffType || filters.skillLevel;

    return (
        <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FilterIcon className="h-4 w-4" />
                    <h3 className="font-semibold">{staffLabels.filters.title}</h3>
                </div>
                {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={onClearFilters}>
                        <XIcon className="h-4 w-4 mr-1" />
                        {filterLabels.clearAll}
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <Label>{staffLabels.filters.accountStatus}</Label>
                    <Select
                        value={filters.accountStatus || ''}
                        onChange={(e) => onFilterChange('accountStatus', e.target.value)}
                    >
                        <option value="">All statuses</option>
                        <option value={AccountStatus.ACTIVE}>Active</option>
                        <option value={AccountStatus.PENDING}>Pending</option>
                        <option value={AccountStatus.DISABLED}>Disabled</option>
                    </Select>
                </div>

                <div>
                    <Label>{staffLabels.filters.staffType}</Label>
                    <Select
                        value={filters.staffType || ''}
                        onChange={(e) => onFilterChange('staffType', e.target.value)}
                    >
                        <option value="">All types</option>
                        <option value={StaffType.EMPLOYEE}>Employee</option>
                        <option value={StaffType.CONTRACTOR}>Contractor</option>
                    </Select>
                </div>

                <div>
                    <Label>{staffLabels.filters.skillLevel}</Label>
                    <Select
                        value={filters.skillLevel || ''}
                        onChange={(e) => onFilterChange('skillLevel', e.target.value)}
                    >
                        <option value="">All levels</option>
                        <option value={SkillLevel.BEGINNER}>Beginner</option>
                        <option value={SkillLevel.INTERMEDIATE}>Intermediate</option>
                        <option value={SkillLevel.ADVANCED}>Advanced</option>
                    </Select>
                </div>
            </div>
        </div>
    );
}
