'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { FilterIcon } from '@/components/ui/icons';
import { useEventsFilters } from '@/store/events-filters.store';
import { EventStatus } from '@prisma/client';
import { trpc } from '@/lib/client/trpc';
import { useFilterLabels, useEventsPageLabels } from '@/lib/hooks/use-labels';

const STATUSES: Array<{ value: EventStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All Statuses' },
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
    resetFilters,
  } = useEventsFilters();

  const filterLabels = useFilterLabels();
  const eventsLabels = useEventsPageLabels();

  // Fetch clients for filter
  const { data: clientsData } = trpc.clients.getAll.useQuery({
    page: 1,
    limit: 100
  });

  const hasActiveFilters = selectedStatus !== 'ALL' || selectedClientId !== 'ALL';

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Status Filter */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <FilterIcon className="h-4 w-4" />
            {eventsLabels.filters.status}
          </label>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((status) => (
              <Badge
                key={status.value}
                variant={selectedStatus === status.value ? 'primary' : 'secondary'}
                onClick={() => setSelectedStatus(status.value)}
              >
                {status.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Client Filter */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <FilterIcon className="h-4 w-4" />
            {eventsLabels.filters.client}
          </label>
          <Select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
          >
            <option value="ALL">All Clients</option>
            <option value="NONE">Not Applicable</option>
            {clientsData?.data.map((client) => (
              <option key={client.id} value={client.id}>
                {client.businessName}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
}
