'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-picker';
import { FilterIcon } from '@/components/ui/icons';
import { UserRole } from '@prisma/client';

interface UserFiltersProps {
  selectedRole: UserRole | 'ALL';
  selectedStatus: boolean | 'ALL';
  selectedEmailVerified: boolean | 'ALL';
  selectedHasPhone: boolean | 'ALL';
  createdFrom: string;
  createdTo: string;
  onRoleChange: (role: UserRole | 'ALL') => void;
  onStatusChange: (status: boolean | 'ALL') => void;
  onEmailVerifiedChange: (verified: boolean | 'ALL') => void;
  onHasPhoneChange: (hasPhone: boolean | 'ALL') => void;
  onCreatedFromChange: (date: string) => void;
  onCreatedToChange: (date: string) => void;
  onClearAll: () => void;
}

const ROLES: Array<{ value: UserRole | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All Roles' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'STAFF', label: 'Staff' },
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

export function UserFilters({
  selectedRole,
  selectedStatus,
  selectedEmailVerified,
  selectedHasPhone,
  createdFrom,
  createdTo,
  onRoleChange,
  onStatusChange,
  onEmailVerifiedChange,
  onHasPhoneChange,
  onCreatedFromChange,
  onCreatedToChange,
  onClearAll,
}: UserFiltersProps) {
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
        <h3 className="text-sm font-medium text-foreground">Filters</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Role Filter */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <FilterIcon className="h-4 w-4" />
            Role
          </label>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((role) => (
              <Badge
                key={role.value}
                variant={selectedRole === role.value ? 'primary' : 'secondary'}
                onClick={() => onRoleChange(role.value)}
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
            Status
          </label>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((status) => (
              <Badge
                key={String(status.value)}
                variant={selectedStatus === status.value ? 'primary' : 'secondary'}
                onClick={() => onStatusChange(status.value)}
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
            Email Status
          </label>
          <div className="flex flex-wrap gap-2">
            {EMAIL_VERIFICATION.map((item) => (
              <Badge
                key={String(item.value)}
                variant={selectedEmailVerified === item.value ? 'primary' : 'secondary'}
                onClick={() => onEmailVerifiedChange(item.value)}
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
            Phone Status
          </label>
          <div className="flex flex-wrap gap-2">
            {PHONE_STATUS.map((item) => (
              <Badge
                key={String(item.value)}
                variant={selectedHasPhone === item.value ? 'primary' : 'secondary'}
                onClick={() => onHasPhoneChange(item.value)}
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
            onFromDateChange={onCreatedFromChange}
            onToDateChange={onCreatedToChange}
            label="Created Date"
          />
        </div>
      </div>
    </div>
  );
}
