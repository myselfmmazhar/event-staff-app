'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';
import { Badge } from '@/components/ui/badge';
import { FilterIcon, CalendarIcon, SearchIcon, AlertIcon, CheckCircleIcon } from '@/components/ui/icons';
import { useAssignmentsFilters, type QuickFilter } from '@/store/assignments-filters.store';
import { trpc } from '@/lib/client/trpc';
import { useStaffTerm, useTerminology } from '@/lib/hooks/use-terminology';

export function AssignmentFilters() {
  const staffTerm = useStaffTerm();
  const { terminology } = useTerminology();

  const QUICK_FILTERS: Array<{ value: QuickFilter; label: string; icon?: React.ComponentType<{ className?: string }> }> = [
    { value: 'all', label: 'All Assignments' },
    { value: 'needsStaff', label: `Needs ${staffTerm.singular}`, icon: AlertIcon },
    { value: 'filled', label: 'Filled', icon: CheckCircleIcon },
    { value: 'today', label: 'Today', icon: CalendarIcon },
    { value: 'thisWeek', label: 'This Week', icon: CalendarIcon },
  ];
  const {
    search,
    setSearch,
    selectedEventIds,
    setSelectedEventIds,
    selectedServiceIds,
    setSelectedServiceIds,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    quickFilter,
    setQuickFilter,
    resetFilters,
  } = useAssignmentsFilters();

  // Fetch events for filter
  const { data: eventsData } = trpc.event.getAll.useQuery({
    page: 1,
    limit: 100,
  });

  // Fetch services for filter
  const { data: servicesData } = trpc.service.getAll.useQuery({
    page: 1,
    limit: 100,
  });

  // Build event options for multi-select
  const eventOptions = (eventsData?.data || []).map((event) => ({
    value: event.id,
    label: event.title,
  }));

  // Build service options for multi-select
  const serviceOptions = (servicesData?.data || []).map((service) => ({
    value: service.id,
    label: service.title,
  }));

  const hasActiveFilters =
    search.length > 0 ||
    selectedEventIds.length > 0 ||
    selectedServiceIds.length > 0 ||
    dateFrom !== null ||
    dateTo !== null;

  return (
    <div className="space-y-4">
      {/* Quick Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {QUICK_FILTERS.map((filter) => {
          const Icon = filter.icon;
          const isActive = quickFilter === filter.value;
          return (
            <Badge
              key={filter.value}
              variant={isActive ? 'default' : 'outline'}
              className="cursor-pointer hover:bg-primary/10"
              onClick={() => setQuickFilter(filter.value)}
            >
              {Icon && <Icon className="h-3 w-3 mr-1" />}
              {filter.label}
            </Badge>
          );
        })}
      </div>

      {/* Header with Clear All button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Filters</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Search */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-foreground flex items-center gap-2">
            <SearchIcon className="h-4 w-4" />
            Search
          </Label>
          <Input
            type="text"
            placeholder="Search assignments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Event Filter */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-foreground flex items-center gap-2">
            <FilterIcon className="h-4 w-4" />
            {terminology.event.singular}
          </Label>
          <MultiSelect
            options={eventOptions}
            value={selectedEventIds}
            onChange={setSelectedEventIds}
            placeholder={`All ${terminology.event.plural}`}
          />
        </div>

        {/* Service Filter */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-foreground flex items-center gap-2">
            <FilterIcon className="h-4 w-4" />
            Service
          </Label>
          <MultiSelect
            options={serviceOptions}
            value={selectedServiceIds}
            onChange={setSelectedServiceIds}
            placeholder="All Services"
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
            value={dateFrom || ''}
            onChange={(e) => setDateFrom(e.target.value || null)}
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
            value={dateTo || ''}
            onChange={(e) => setDateTo(e.target.value || null)}
          />
        </div>
      </div>
    </div>
  );
}
