'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EditIcon, TrashIcon } from '@/components/ui/icons';
import { UserRole } from '@prisma/client';
import { format } from 'date-fns';

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

interface UserTableProps {
  users: User[];
  isLoading: boolean;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onToggleStatus: (user: User) => void;
}

const ROLE_COLORS: Record<UserRole, 'purple' | 'primary' | 'info' | 'default'> = {
  SUPER_ADMIN: 'purple',
  ADMIN: 'primary',
  MANAGER: 'info',
  STAFF: 'default',
};

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  STAFF: 'Staff',
};

export function UserTable({ users, isLoading, onEdit, onDelete, onToggleStatus }: UserTableProps) {
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
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                Name
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                Email
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                Role
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                Status
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                Phone
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                Joined
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-foreground">
                Actions
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
                <td className="py-4 px-4">
                  <Badge variant={ROLE_COLORS[user.role]}>
                    {ROLE_LABELS[user.role]}
                  </Badge>
                </td>
                <td className="py-4 px-4">
                  <Badge variant={user.isActive ? 'success' : 'danger'} pulse={user.isActive}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="py-4 px-4 text-sm text-muted-foreground">
                  {user.phone || '-'}
                </td>
                <td className="py-4 px-4 text-sm text-muted-foreground">
                  {format(new Date(user.createdAt), 'MMM d, yyyy')}
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleStatus(user)}
                      title={user.isActive ? 'Deactivate user' : 'Activate user'}
                    >
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(user)}
                      title="Edit user"
                    >
                      <EditIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(user)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      title="Delete user"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
              <Badge variant={user.isActive ? 'success' : 'danger'} pulse={user.isActive}>
                {user.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={ROLE_COLORS[user.role]}>
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggleStatus(user)}
                className="flex-1"
              >
                {user.isActive ? 'Deactivate' : 'Activate'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(user)}
                className="flex-1"
              >
                <EditIcon className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(user)}
                className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
