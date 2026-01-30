'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';
import { CalendarIcon, FilterIcon } from '@/components/ui/icons';
import {
  useUsersFilters,
  type UserStatusFilter,
  type UserEmailVerifiedFilter,
  type UserPhoneFilter,
} from '@/store/users-filters.store';
import { UserRole } from '@prisma/client';
import { useRoleTerm } from '@/lib/hooks/use-terminology';
import { useFilterLabels, useUsersPageLabels } from '@/lib/hooks/use-labels';

// Note: STAFF role is excluded - staff are managed separately in the Staff module
const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MANAGER', label: 'Manager' },
];

const STATUS_OPTIONS: Array<{ value: UserStatusFilter; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const EMAIL_VERIFICATION_OPTIONS: Array<{ value: UserEmailVerifiedFilter; label: string }> = [
  { value: 'verified', label: 'Verified' },
  { value: 'unverified', label: 'Unverified' },
];

const PHONE_STATUS_OPTIONS: Array<{ value: UserPhoneFilter; label: string }> = [
  { value: 'hasPhone', label: 'Has Phone' },
  { value: 'noPhone', label: 'No Phone' },
];

export function UserFilters() {
  const roleTerm = useRoleTerm();
  const filterLabels = useFilterLabels();
  const usersLabels = useUsersPageLabels();
  const {
    roles,
    statuses,
    emailVerified,
    hasPhone,
    createdFrom,
    createdTo,
    setRoles,
    setStatuses,
    setEmailVerified,
    setHasPhone,
    setCreatedFrom,
    setCreatedTo,
    resetFilters,
  } = useUsersFilters();

  const createdDateLabel = usersLabels.filters?.createdDate || 'Created Date';

  const hasActiveFilters =
    roles.length > 0 ||
    statuses.length > 0 ||
    emailVerified.length > 0 ||
    hasPhone.length > 0 ||
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
          <Label className="text-sm font-medium text-foreground flex items-center gap-2">
            <FilterIcon className="h-4 w-4" />
            {usersLabels.filters?.role || roleTerm.singular}
          </Label>
          <MultiSelect
            options={ROLE_OPTIONS}
            value={roles}
            onChange={setRoles}
            placeholder={`All ${roleTerm.plural}`}
          />
        </div>

        {/* Status Filter */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-foreground flex items-center gap-2">
            <FilterIcon className="h-4 w-4" />
            {usersLabels.filters?.status || 'Status'}
          </Label>
          <MultiSelect
            options={STATUS_OPTIONS}
            value={statuses}
            onChange={setStatuses}
            placeholder="All"
          />
        </div>

        {/* Email Verification Filter */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-foreground flex items-center gap-2">
            <FilterIcon className="h-4 w-4" />
            {usersLabels.filters?.emailVerified || 'Email Status'}
          </Label>
          <MultiSelect
            options={EMAIL_VERIFICATION_OPTIONS}
            value={emailVerified}
            onChange={setEmailVerified}
            placeholder="All"
          />
        </div>

        {/* Phone Status Filter */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-foreground flex items-center gap-2">
            <FilterIcon className="h-4 w-4" />
            {usersLabels.filters?.hasPhone || 'Phone Status'}
          </Label>
          <MultiSelect
            options={PHONE_STATUS_OPTIONS}
            value={hasPhone}
            onChange={setHasPhone}
            placeholder="All"
          />
        </div>

        {/* Date From Filter */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-foreground flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            {createdDateLabel} (From)
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
            {createdDateLabel} (To)
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
