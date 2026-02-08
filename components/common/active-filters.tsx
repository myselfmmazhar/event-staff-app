'use client';

import { Badge } from '@/components/ui/badge';
import { XIcon } from '@/components/ui/icons';

interface ActiveFilter {
  key: string;
  label: string;
  value: string;
  onRemove: () => void;
}

interface ActiveFiltersProps {
  filters: ActiveFilter[];
}

export function ActiveFilters({ filters }: ActiveFiltersProps) {
  if (filters.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-muted-foreground">Active filters:</span>
      {filters.map((filter) => (
        <Badge
          key={filter.key}
          variant="secondary"
          className="gap-2"
          asSpan
        >
          <span className="text-xs">
            <span className="font-semibold">{filter.label}:</span> {filter.value}
          </span>
          <button
            onClick={filter.onRemove}
            className="hover:text-destructive transition-colors"
            aria-label={`Remove ${filter.label} filter`}
          >
            <XIcon className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
}
