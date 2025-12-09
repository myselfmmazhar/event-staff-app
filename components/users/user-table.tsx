'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EditIcon, TrashIcon } from '@/components/ui/icons';
import { UserRole } from '@prisma/client';
import { format } from 'date-fns';
import { DataTable, ColumnDef } from '@/components/common/data-table';
import { useRoleTerm } from '@/lib/hooks/use-terminology';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  phone?: string | null;
  createdAt: Date;
  address?: string | null;
  emergencyContact?: string | null;
}

type SortableField = 'createdAt' | 'updatedAt' | 'firstName' | 'lastName' | 'email' | 'role';

interface UserTableProps {
  users: User[];
  isLoading: boolean;
  sortBy?: SortableField;
  sortOrder?: 'asc' | 'desc';
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onToggleStatus: (user: User) => void;
  onSort: (field: SortableField) => void;
}

const ROLE_COLORS: Record<UserRole, 'purple' | 'primary' | 'info' | 'default'> = {
  SUPER_ADMIN: 'purple',
  ADMIN: 'primary',
  MANAGER: 'info',
  STAFF: 'default',
  CLIENT: 'default',
};

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  STAFF: 'Staff',
  CLIENT: 'Client',
};

export function UserTable({
  users,
  isLoading,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  onEdit,
  onDelete,
  onToggleStatus,
  onSort
}: UserTableProps) {
  const roleTerm = useRoleTerm();

  const columns: ColumnDef<User>[] = [
    {
      key: 'firstName',
      label: 'Name',
      sortable: true,
      className: 'py-4 px-4',
      render: (user) => (
        <div className="font-medium text-foreground">
          {user.firstName} {user.lastName}
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      className: 'py-4 px-4 text-sm text-muted-foreground',
      render: (user) => user.email,
    },
    {
      key: 'role',
      label: roleTerm.singular,
      sortable: true,
      className: 'py-4 px-4 text-center',
      headerClassName: 'text-center py-3 px-4',
      render: (user) => (
        <Badge variant={ROLE_COLORS[user.role]} asSpan>
          {ROLE_LABELS[user.role]}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      label: 'Joined',
      sortable: true,
      className: 'py-4 px-4 text-sm text-muted-foreground',
      render: (user) => format(new Date(user.createdAt), 'MMM d, yyyy'),
    },
    {
      key: 'status',
      label: 'Status',
      className: 'py-4 px-4',
      render: (user) => (
        <Badge variant={user.isActive ? 'success' : 'danger'} pulse={user.isActive} asSpan>
          {user.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      className: 'py-4 px-4 text-sm text-muted-foreground',
      render: (user) => user.phone || '-',
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'py-4 px-4',
      headerClassName: 'text-right py-3 px-4',
      render: (user) => (
        <div className="flex items-center justify-end gap-2">
          {user.role !== 'SUPER_ADMIN' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleStatus(user)}
              title={user.isActive ? 'Deactivate user' : 'Activate user'}
            >
              {user.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(user)}
            title="Edit user"
          >
            <EditIcon className="h-4 w-4" />
          </Button>
          {user.role !== 'SUPER_ADMIN' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(user)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              title="Delete user"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const renderMobileCard = (user: User) => (
    <div
      key={user.id}
      className="bg-card rounded-lg border border-border p-4 space-y-3"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold text-card-foreground">
            {user.firstName} {user.lastName}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {user.email}
          </div>
        </div>
        <Badge variant={user.isActive ? 'success' : 'danger'} pulse={user.isActive} asSpan>
          {user.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant={ROLE_COLORS[user.role]} asSpan>
          {ROLE_LABELS[user.role]}
        </Badge>
        {user.phone && (
          <span className="text-sm text-muted-foreground">{user.phone}</span>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        Joined {format(new Date(user.createdAt), 'MMM d, yyyy')}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-border">
        {user.role !== 'SUPER_ADMIN' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleStatus(user)}
            className="flex-1"
          >
            {user.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(user)}
          className="flex-1"
        >
          <EditIcon className="h-4 w-4 mr-1" />
          Edit
        </Button>
        {user.role !== 'SUPER_ADMIN' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(user)}
            className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <DataTable
      data={users}
      columns={columns}
      isLoading={isLoading}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={(field) => onSort(field as SortableField)}
      emptyMessage="No users found"
      emptyDescription="Try adjusting your search or filters"
      mobileCard={renderMobileCard}
      getRowKey={(user) => user.id}
    />
  );
}
