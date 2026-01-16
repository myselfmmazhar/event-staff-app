'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-picker';
import { FilterIcon } from '@/components/ui/icons';
import { useUsersFilters } from '@/store/users-filters.store';
import { UserRole } from '@prisma/client';
import { useRoleTerm } from '@/lib/hooks/use-terminology';
import { useFilterLabels, useUsersPageLabels } from '@/lib/hooks/use-labels';

// Note: STAFF role is excluded - staff are managed separately in the Staff module
const ROLE_VALUES: Array<{ value: UserRole | 'ALL'; label: string }> = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MANAGER', label: 'Manager' },
];

const STATUSES: Array<{ value: boolean | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All Status' },
  { value: true, label: 'Active' },
  { value: false, label: 'Inactive' },
];

const EMAIL_VERIFICATION: Array<{ value: boolean | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: true, label: 'Verified' },
  { value: false, label: 'Unverified' },
];

const PHONE_STATUS: Array<{ value: boolean | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: true, label: 'Has Phone' },
  { value: false, label: 'No Phone' },
];

export function UserFilters() {
  const roleTerm = useRoleTerm();
  const filterLabels = useFilterLabels();
  const usersLabels = useUsersPageLabels();
  const {
    selectedRole,
    selectedStatus,
    selectedEmailVerified,
    selectedHasPhone,
    createdFrom,
    createdTo,
    setSelectedRole,
    setSelectedStatus,
    setSelectedEmailVerified,
    setSelectedHasPhone,
    setCreatedFrom,
    setCreatedTo,
    resetFilters,
  } = useUsersFilters();

  // Build ROLES array with dynamic "All Roles" label
  const ROLES = [
    { value: 'ALL' as const, label: `All ${roleTerm.plural}` },
    ...ROLE_VALUES,
  ];

  const hasActiveFilters =
    selectedRole !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    selectedEmailVerified !== 'ALL' ||
    selectedHasPhone !== 'ALL' ||
    createdFrom !== '' ||
    createdTo !== '';

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
        {/* Role Filter */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <FilterIcon className="h-4 w-4" />
            {usersLabels.filters?.role || roleTerm.singular}
          </label>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((role) => (
              <Badge
                key={role.value}
                variant={selectedRole === role.value ? 'primary' : 'secondary'}
                onClick={() => setSelectedRole(role.value)}
              >
                {role.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <FilterIcon className="h-4 w-4" />
            {usersLabels.filters?.status || 'Status'}
          </label>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((status) => (
              <Badge
                key={String(status.value)}
                variant={selectedStatus === status.value ? 'primary' : 'secondary'}
                onClick={() => setSelectedStatus(status.value)}
              >
                {status.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Email Verification Filter */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <FilterIcon className="h-4 w-4" />
            {usersLabels.filters?.emailVerified || 'Email Status'}
          </label>
          <div className="flex flex-wrap gap-2">
            {EMAIL_VERIFICATION.map((item) => (
              <Badge
                key={String(item.value)}
                variant={selectedEmailVerified === item.value ? 'primary' : 'secondary'}
                onClick={() => setSelectedEmailVerified(item.value)}
              >
                {item.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Phone Status Filter */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <FilterIcon className="h-4 w-4" />
            {usersLabels.filters?.hasPhone || 'Phone Status'}
          </label>
          <div className="flex flex-wrap gap-2">
            {PHONE_STATUS.map((item) => (
              <Badge
                key={String(item.value)}
                variant={selectedHasPhone === item.value ? 'primary' : 'secondary'}
                onClick={() => setSelectedHasPhone(item.value)}
              >
                {item.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="flex flex-col gap-2">
          <DateRangePicker
            fromDate={createdFrom}
            toDate={createdTo}
            onFromDateChange={setCreatedFrom}
            onToDateChange={setCreatedTo}
            label={usersLabels.filters?.createdDate || 'Created Date'}
          />
        </div>
      </div>
    </div>
  );
}

