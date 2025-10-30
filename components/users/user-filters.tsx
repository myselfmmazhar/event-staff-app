'use client';

import { Badge } from '@/components/ui/badge';
import { FilterIcon } from '@/components/ui/icons';
import { UserRole } from '@prisma/client';

interface UserFiltersProps {
  selectedRole: UserRole | 'ALL';
  selectedStatus: boolean | 'ALL';
  onRoleChange: (role: UserRole | 'ALL') => void;
  onStatusChange: (status: boolean | 'ALL') => void;
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

export function UserFilters({
  selectedRole,
  selectedStatus,
  onRoleChange,
  onStatusChange,
}: UserFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
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
              className="cursor-pointer hover:scale-105 transition-transform"
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
              className="cursor-pointer hover:scale-105 transition-transform"
              onClick={() => onStatusChange(status.value)}
            >
              {status.label}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
