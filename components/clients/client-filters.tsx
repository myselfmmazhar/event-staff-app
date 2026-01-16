'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FilterIcon } from '@/components/ui/icons';
import { useClientsFilters } from '@/store/clients-filters.store';
import { useFilterLabels, useClientsPageLabels } from '@/lib/hooks/use-labels';

const LOGIN_ACCESS_OPTIONS = [
  { value: 'all', label: 'All Clients' },
  { value: 'with', label: 'With Portal Access' },
  { value: 'without', label: 'Without Portal Access' },
] as const;

export function ClientFilters() {
  const {
    loginAccess,
    setLoginAccess,
    resetFilters,
  } = useClientsFilters();

  const filterLabels = useFilterLabels();
  const clientsLabels = useClientsPageLabels();
  const hasActiveFilters = loginAccess !== 'all';

  return (
    <div className="space-y-4">
      {/* Header with Clear All button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">{clientsLabels.filters.title}</h3>
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
        {/* Login Access Filter */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <FilterIcon className="h-4 w-4" />
            {clientsLabels.filters.loginAccess}
          </label>
          <div className="flex flex-wrap gap-2">
            {LOGIN_ACCESS_OPTIONS.map((option) => (
              <Badge
                key={option.value}
                variant={loginAccess === option.value ? 'primary' : 'secondary'}
                onClick={() => setLoginAccess(option.value)}
              >
                {option.label}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

