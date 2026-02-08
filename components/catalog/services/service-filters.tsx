'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';
import { FilterIcon, CalendarIcon } from '@/components/ui/icons';
import { useServicesFilters, type ServiceStatus } from '@/store/services-filters.store';
import { useFilterLabels } from '@/lib/hooks/use-labels';

const STATUS_OPTIONS: Array<{ value: ServiceStatus; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export function ServiceFilters() {
  const {
    statuses,
    setStatuses,
    createdFrom,
    createdTo,
    setCreatedFrom,
    setCreatedTo,
    resetFilters,
  } = useServicesFilters();
  const filterLabels = useFilterLabels();

  const hasActiveFilters = statuses.length > 0 || createdFrom !== '' || createdTo !== '';

  return (
    <div className="space-y-4">
      {/* Header with Clear All button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">{filterLabels.title}</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            {filterLabels.clearAll}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Status Filter */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-foreground flex items-center gap-2">
            <FilterIcon className="h-4 w-4" />
            Status
          </Label>
          <MultiSelect
            options={STATUS_OPTIONS}
            value={statuses}
            onChange={setStatuses}
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
            onChange={(e) => setCreatedFrom(e.target.value || '')}
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
            onChange={(e) => setCreatedTo(e.target.value || '')}
          />
        </div>
      </div>
    </div>
  );
}
