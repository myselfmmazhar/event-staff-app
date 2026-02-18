'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';
import { FilterIcon, CalendarIcon } from '@/components/ui/icons';
import { useEventsFilters } from '@/store/events-filters.store';
import { trpc } from '@/lib/client/trpc';
import { useFilterLabels, useEventsPageLabels } from '@/lib/hooks/use-labels';
import { EventStatus } from '@prisma/client';

const STATUS_OPTIONS: Array<{ value: EventStatus; label: string }> = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export function EventFilters() {
  const {
    selectedStatuses,
    setSelectedStatuses,
    selectedClientIds,
    setSelectedClientIds,
    startDateFrom,
    setStartDateFrom,
    startDateTo,
    setStartDateTo,
    resetFilters,
  } = useEventsFilters();

  const filterLabels = useFilterLabels();
  const eventsLabels = useEventsPageLabels();

  // Fetch clients for filter
  const { data: clientsData } = trpc.clients.getAll.useQuery({
    page: 1,
    limit: 100
  });

  // Build client options for multi-select
  const clientOptions = (clientsData?.data || []).map((client) => ({
    value: client.id,
    label: client.businessName,
  }));

  const hasActiveFilters =
    selectedStatuses.length > 0 ||
    selectedClientIds.length > 0 ||
    startDateFrom !== null ||
    startDateTo !== null;

  return (
    <div className="space-y-4">
      {/* Header with Clear All button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">{eventsLabels.filters.title}</h3>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Filter */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-foreground flex items-center gap-2">
            <FilterIcon className="h-4 w-4" />
            {eventsLabels.filters.status}
          </Label>
          <MultiSelect
            options={STATUS_OPTIONS}
            value={selectedStatuses}
            onChange={setSelectedStatuses}
            placeholder="All"
          />
        </div>

        {/* Client Filter */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-foreground flex items-center gap-2">
            <FilterIcon className="h-4 w-4" />
            {eventsLabels.filters.client}
          </Label>
          <MultiSelect
            options={clientOptions}
            value={selectedClientIds}
            onChange={setSelectedClientIds}
            placeholder="All"
          />
        </div>

        {/* Date From Filter */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-foreground flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Date From
          </Label>
          <Input
            type="date"
            value={startDateFrom || ''}
            onChange={(e) => setStartDateFrom(e.target.value || null)}
          />
        </div>

        {/* Date To Filter */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-foreground flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Date To
          </Label>
          <Input
            type="date"
            value={startDateTo || ''}
            onChange={(e) => setStartDateTo(e.target.value || null)}
          />
        </div>
      </div>
    </div>
  );
}
