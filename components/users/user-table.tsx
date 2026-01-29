'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EditIcon, TrashIcon, MailIcon } from '@/components/ui/icons';
import { UserRole } from '@prisma/client';
import { format } from 'date-fns';
import { DataTable, ColumnDef } from '@/components/common/data-table';
import { useRoleTerm } from '@/lib/hooks/use-terminology';
import { useColumnLabels } from '@/lib/hooks/use-column-labels';

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
  invitationToken?: string | null;
  invitationExpiresAt?: Date | null;
}

// Helper to determine invitation status
function getInvitationStatus(user: User): 'pending' | 'expired' | 'accepted' {
  if (!user.invitationToken) {
    return 'accepted';
  }
  if (user.invitationExpiresAt && new Date(user.invitationExpiresAt) < new Date()) {
    return 'expired';
  }
  return 'pending';
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
  onResendInvitation: (user: User) => void;
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
  onResendInvitation,
  onSort
}: UserTableProps) {
  const roleTerm = useRoleTerm();

  // Get column labels from saved configuration
  const columnLabels = useColumnLabels('users', {
    name: 'Name',
    email: 'Email',
    role: roleTerm.singular,
    joined: 'Joined',
    invitation: 'Invitation',
    phone: 'Phone',
    actions: 'Actions',
  });

  const columns: ColumnDef<User>[] = [
    {
      key: 'firstName',
      label: columnLabels.name,
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
      label: columnLabels.email,
      sortable: true,
      className: 'py-4 px-4 text-sm text-muted-foreground',
      render: (user) => user.email,
    },
    {
      key: 'role',
      label: columnLabels.role,
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
      label: columnLabels.joined,
      sortable: true,
      className: 'py-4 px-4 text-sm text-muted-foreground',
      render: (user) => format(new Date(user.createdAt), 'MMM d, yyyy'),
    },
    {
      key: 'invitationStatus',
      label: columnLabels.invitation,
      className: 'py-4 px-4',
      render: (user) => {
        const status = getInvitationStatus(user);
        if (status === 'pending') {
          return (
            <div className="flex flex-col gap-1">
              <Badge variant="warning" asSpan>Pending</Badge>
              {user.invitationExpiresAt && (
                <span className="text-xs text-muted-foreground">
                  Expires {format(new Date(user.invitationExpiresAt), 'MMM d')}
                </span>
              )}
            </div>
          );
        }
        if (status === 'expired') {
          return <Badge variant="danger" asSpan>Expired</Badge>;
        }
        return (
          <Badge variant={user.isActive ? 'success' : 'default'} pulse={user.isActive} asSpan>
            {user.isActive ? 'Active' : 'Inactive'}
          </Badge>
        );
      },
    },
    {
      key: 'phone',
      label: columnLabels.phone,
      className: 'py-4 px-4 text-sm text-muted-foreground',
      render: (user) => user.phone || '-',
    },
    {
      key: 'actions',
      label: columnLabels.actions,
      className: 'py-4 px-4',
      headerClassName: 'text-right py-3 px-4',
      render: (user) => {
        const invitationStatus = getInvitationStatus(user);
        const canResendInvitation = invitationStatus === 'pending' || invitationStatus === 'expired';

        return (
          <div className="flex items-center justify-end gap-1">
            {/* Resend Invitation - for pending/expired users */}
            {canResendInvitation && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onResendInvitation(user)}
                title="Resend invitation email"
                className="text-primary hover:text-primary"
              >
                <MailIcon className="h-4 w-4 mr-1" />
                Resend
              </Button>
            )}
            {/* Toggle Status - only for accepted invitations and non-SUPER_ADMIN */}
            {invitationStatus === 'accepted' && user.role !== 'SUPER_ADMIN' && (
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
              className="px-0"
              onClick={() => onEdit(user)}
              title="Edit user"
            >
              <EditIcon className="h-4 w-4" />
            </Button>
            {user.role !== 'SUPER_ADMIN' && (
              <Button
                variant="ghost"
                size="sm"
                className="px-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onDelete(user)}
                title="Delete user"
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const renderMobileCard = (user: User) => {
    const invitationStatus = getInvitationStatus(user);
    const canResendInvitation = invitationStatus === 'pending' || invitationStatus === 'expired';

    return (
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
          {invitationStatus === 'pending' ? (
            <div className="flex flex-col items-end gap-1">
              <Badge variant="warning" asSpan>Pending</Badge>
              {user.invitationExpiresAt && (
                <span className="text-xs text-muted-foreground">
                  Expires {format(new Date(user.invitationExpiresAt), 'MMM d')}
                </span>
              )}
            </div>
          ) : invitationStatus === 'expired' ? (
            <Badge variant="danger" asSpan>Expired</Badge>
          ) : (
            <Badge variant={user.isActive ? 'success' : 'default'} pulse={user.isActive} asSpan>
              {user.isActive ? 'Active' : 'Inactive'}
            </Badge>
          )}
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
          {canResendInvitation && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onResendInvitation(user)}
              className="flex-1"
            >
              <MailIcon className="h-4 w-4 mr-1" />
              Resend
            </Button>
          )}
          {invitationStatus === 'accepted' && user.role !== 'SUPER_ADMIN' && (
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
  };

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
