'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EditIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon } from '@/components/ui/icons';
import { UserRole } from '@prisma/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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

const SORTABLE_COLUMNS: Array<{ key: SortableField; label: string }> = [
  { key: 'firstName', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
  { key: 'createdAt', label: 'Joined' },
];

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
  const renderSortIcon = (columnKey: SortableField) => {
    if (sortBy !== columnKey) {
      return <ChevronUpIcon className="h-4 w-4 opacity-30" />;
    }
    return sortOrder === 'asc' ? (
      <ChevronUpIcon className="h-4 w-4" />
    ) : (
      <ChevronDownIcon className="h-4 w-4" />
    );
  };
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-foreground text-lg">No users found</p>
        <p className="text-muted-foreground text-sm mt-2">
          Try adjusting your search or filters
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <div className="min-w-full inline-block">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-border">
                {SORTABLE_COLUMNS.map((col) => {
                  // Special alignment for Role column
                  const isRole = col.key === 'role';
                  return (
                    <th 
                      key={col.key} 
                      className={cn(
                        "py-3 px-4",
                        isRole ? "text-center" : "text-left"
                      )}
                    >
                      <button
                        onClick={() => onSort(col.key)}
                        className={cn(
                          "flex items-center gap-2 font-semibold text-sm text-foreground hover:text-primary transition-colors",
                          isRole && "justify-center"
                        )}
                      >
                        {col.label}
                        {renderSortIcon(col.key)}
                      </button>
                    </th>
                  );
                })}
                <th className="text-left py-3 px-4">
                  <span className="font-semibold text-sm text-foreground">Status</span>
                </th>
                <th className="text-left py-3 px-4">
                  <span className="font-semibold text-sm text-foreground">Phone</span>
                </th>
                <th className="text-right py-3 px-4">
                  <span className="font-semibold text-sm text-foreground">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="font-medium text-foreground">
                      {user.firstName} {user.lastName}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">
                    {user.email}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <Badge variant={ROLE_COLORS[user.role]} asSpan>
                      {ROLE_LABELS[user.role]}
                    </Badge>
                  </td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">
                    {format(new Date(user.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td className="py-4 px-4">
                    <Badge variant={user.isActive ? 'success' : 'danger'} pulse={user.isActive} asSpan>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">
                    {user.phone || '-'}
                  </td>
                  <td className="py-4 px-4">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {users.map((user) => (
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
        ))}
      </div>
    </>
  );
}
