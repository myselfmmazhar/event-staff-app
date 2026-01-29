'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { FilterIcon, CalendarIcon } from '@/components/ui/icons';
import { useEventsFilters } from '@/store/events-filters.store';
import { trpc } from '@/lib/client/trpc';
import { useFilterLabels, useEventsPageLabels } from '@/lib/hooks/use-labels';
import { EventStatus } from '@prisma/client';

const STATUS_OPTIONS: Array<{ value: EventStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: '—' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export function EventFilters() {
  const {
    selectedStatus,
    setSelectedStatus,
    selectedClientId,
    setSelectedClientId,
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

  const hasActiveFilters =
    selectedStatus !== 'ALL' ||
    selectedClientId !== 'ALL' ||
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
          <Select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as EventStatus | 'ALL')}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Client Filter */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-foreground flex items-center gap-2">
            <FilterIcon className="h-4 w-4" />
            {eventsLabels.filters.client}
          </Label>
          <Select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
          >
            <option value="ALL">—</option>
            {clientsData?.data.map((client) => (
              <option key={client.id} value={client.id}>
                {client.businessName}
              </option>
            ))}
          </Select>
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
