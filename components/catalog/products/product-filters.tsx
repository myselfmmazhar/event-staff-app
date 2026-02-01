'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';
import { FilterIcon, CalendarIcon } from '@/components/ui/icons';
import { useFilterLabels } from '@/lib/hooks/use-labels';
import { useProductsFilters, type ProductStatus } from '@/store/products-filters.store';

const STATUS_OPTIONS: Array<{ value: ProductStatus; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export function ProductFilters() {
  const {
    statuses,
    setStatuses,
    createdFrom,
    createdTo,
    setCreatedFrom,
    setCreatedTo,
    resetFilters,
  } = useProductsFilters();
  const filterLabels = useFilterLabels();

  const hasActiveFilters = statuses.length > 0 || createdFrom !== '' || createdTo !== '';

  return (
    <div className="space-y-4">
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
