'use client';

import { Label } from '@/components/ui/label';
import { EventStatus } from '@prisma/client';

interface EventFiltersProps {
  status: string;
  onStatusChange: (status: string) => void;
  sortBy: string;
  onSortByChange: (sortBy: string) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (sortOrder: 'asc' | 'desc') => void;
}

const STATUSES = [
  { value: 'ALL', label: 'All Statuses' },
  { value: EventStatus.DRAFT, label: 'Draft' },
  { value: EventStatus.PUBLISHED, label: 'Published' },
  { value: EventStatus.CONFIRMED, label: 'Confirmed' },
  { value: EventStatus.IN_PROGRESS, label: 'In Progress' },
  { value: EventStatus.COMPLETED, label: 'Completed' },
  { value: EventStatus.CANCELLED, label: 'Cancelled' },
];

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Created Date' },
  { value: 'startDate', label: 'Start Date' },
  { value: 'endDate', label: 'End Date' },
  { value: 'title', label: 'Title' },
  { value: 'eventId', label: 'Event ID' },
  { value: 'venueName', label: 'Venue Name' },
];

export function EventFilters({
  status,
  onStatusChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
}: EventFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1">
        <Label htmlFor="status-filter" className="sr-only">
          Filter by status
        </Label>
        <select
          id="status-filter"
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1">
        <Label htmlFor="sort-by-filter" className="sr-only">
          Sort by
        </Label>
        <select
          id="sort-by-filter"
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value)}
          className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              Sort: {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="w-full sm:w-auto">
        <Label htmlFor="sort-order-filter" className="sr-only">
          Sort order
        </Label>
        <select
          id="sort-order-filter"
          value={sortOrder}
          onChange={(e) => onSortOrderChange(e.target.value as 'asc' | 'desc')}
          className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="desc">Newest First</option>
          <option value="asc">Oldest First</option>
        </select>
      </div>
    </div>
  );
}
