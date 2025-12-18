'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlusIcon } from '@/components/ui/icons';
import { ActiveFilters } from '@/components/common/active-filters';
import { ConfirmModal } from '@/components/common/confirm-modal';
import { DeleteUserModal } from '@/components/users/delete-user-modal';
import { Pagination } from '@/components/common/pagination';
import { UserFilters } from '@/components/users/user-filters';
import { UserFormModal } from '@/components/users/user-form-modal';
import { UserSearch } from '@/components/users/user-search';
import { UserTable } from '@/components/users/user-table';
import { trpc } from '@/lib/client/trpc';
import { UserRole } from '@prisma/client';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, type ComponentProps } from 'react';
import type { InviteUserInput, UpdateUserInput } from '@/lib/schemas/user.schema';
import { useUsersFilters, type UserSortBy, type SortOrder } from '@/store/users-filters.store';
import { useUrlSync } from '@/lib/hooks/useUrlSync';
import { useCrudMutations } from '@/lib/hooks/useCrudMutations';
import { useRoleTerm } from '@/lib/hooks/use-terminology';
type UserTableRow = ComponentProps<typeof UserTable>['users'][number];

const USER_SORT_FIELDS: UserSortBy[] = ['createdAt', 'updatedAt', 'firstName', 'lastName', 'email', 'role'];
const USER_SORT_FIELD_SET = new Set<UserSortBy>(USER_SORT_FIELDS);
const USER_ROLE_SET = new Set<UserRole>(Object.values(UserRole));

function parseNumberParam(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseRoleParam(value: string | null): UserRole | 'ALL' {
  if (value && USER_ROLE_SET.has(value as UserRole)) {
    return value as UserRole;
  }
  return 'ALL';
}

function parseTriStateBoolean(value: string | null): boolean | 'ALL' {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return 'ALL';
}

function parseSortByParam(value: string | null): UserSortBy {
  if (value && USER_SORT_FIELD_SET.has(value as UserSortBy)) {
    return value as UserSortBy;
  }
  return 'createdAt';
}

function parseSortOrderParam(value: string | null): SortOrder {
  return value === 'asc' ? 'asc' : 'desc';
}

function parseDateParam(value: string | null): string {
  return value ?? '';
}

export default function UsersPage() {
  const searchParams = useSearchParams();

  // Use filters store
  const filters = useUsersFilters();
  const roleTerm = useRoleTerm();

  // Use CRUD mutations hook
  const { backendErrors, setBackendErrors, createMutationOptions, updateMutationOptions, deleteMutationOptions } = useCrudMutations();

  // Local modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isResendConfirmOpen, setIsResendConfirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserTableRow | null>(null);
  const [userToResend, setUserToResend] = useState<UserTableRow | null>(null);

  // Initialize store from URL params on mount
  useEffect(() => {
    const page = parseNumberParam(searchParams.get('page'), 1);
    const limit = parseNumberParam(searchParams.get('limit'), 10);
    const search = searchParams.get('search') || '';
    const role = parseRoleParam(searchParams.get('role'));
    const status = parseTriStateBoolean(searchParams.get('status'));
    const emailVerified = parseTriStateBoolean(searchParams.get('emailVerified'));
    const hasPhone = parseTriStateBoolean(searchParams.get('hasPhone'));
    const createdFrom = parseDateParam(searchParams.get('createdFrom'));
    const createdTo = parseDateParam(searchParams.get('createdTo'));
    const sortBy = parseSortByParam(searchParams.get('sortBy'));
    const sortOrder = parseSortOrderParam(searchParams.get('sortOrder'));

    filters.setPage(page);
    filters.setLimit(limit);
    filters.setSearch(search);
    filters.setSelectedRole(role);
    filters.setSelectedStatus(status);
    filters.setSelectedEmailVerified(emailVerified);
    filters.setSelectedHasPhone(hasPhone);
    filters.setCreatedFrom(createdFrom);
    filters.setCreatedTo(createdTo);
    filters.setSortBy(sortBy);
    filters.setSortOrder(sortOrder);
  }, []); // Only run on mount

  // Sync store with URL
  useUrlSync(filters, {
    keys: ['page', 'limit', 'search', 'selectedRole', 'selectedStatus', 'selectedEmailVerified', 'selectedHasPhone', 'createdFrom', 'createdTo', 'sortBy', 'sortOrder'],
  });

  // tRPC queries
  const { data, isLoading, refetch } = trpc.user.getAll.useQuery({
    page: filters.page,
    limit: filters.limit,
    search: filters.search || undefined,
    role: filters.selectedRole === 'ALL' ? undefined : filters.selectedRole,
    isActive: filters.selectedStatus === 'ALL' ? undefined : filters.selectedStatus,
    emailVerified: filters.selectedEmailVerified === 'ALL' ? undefined : filters.selectedEmailVerified,
    hasPhone: filters.selectedHasPhone === 'ALL' ? undefined : filters.selectedHasPhone,
    createdFrom: filters.createdFrom || undefined,
    createdTo: filters.createdTo || undefined,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  });

  // tRPC mutations with standardized error handling
  const inviteMutation = trpc.user.invite.useMutation(
    createMutationOptions('User invited successfully. An invitation email has been sent.', {
      onSuccess: () => {
        setIsFormOpen(false);
        refetch();
      },
    })
  );

  const resendInvitationMutation = trpc.user.resendInvitation.useMutation(
    createMutationOptions('Invitation resent successfully', {
      onSuccess: () => {
        setIsResendConfirmOpen(false);
        setUserToResend(null);
        refetch();
      },
    })
  );

  const updateMutation = trpc.user.update.useMutation(
    updateMutationOptions('User updated successfully', {
      onSuccess: () => {
        setIsFormOpen(false);
        setSelectedUser(null);
        refetch();
      },
    })
  );

  const deleteMutation = trpc.user.delete.useMutation(
    deleteMutationOptions('User deleted successfully', {
      onSuccess: () => {
        setIsDeleteOpen(false);
        setSelectedUser(null);
        refetch();
      },
    })
  );

  const activateMutation = trpc.user.activate.useMutation(
    updateMutationOptions('User activated successfully', {
      onSuccess: () => refetch(),
    })
  );

  const deactivateMutation = trpc.user.deactivate.useMutation(
    updateMutationOptions('User deactivated successfully', {
      onSuccess: () => refetch(),
    })
  );

  // Handlers
  const handleCreate = () => {
    setSelectedUser(null);
    setBackendErrors([]);
    setIsFormOpen(true);
  };

  const handleEdit = (user: UserTableRow) => {
    setSelectedUser(user);
    setBackendErrors([]);
    setIsFormOpen(true);
  };

  const handleDelete = (user: UserTableRow) => {
    setSelectedUser(user);
    setIsDeleteOpen(true);
  };

  const handleToggleStatus = (user: UserTableRow) => {
    if (user.isActive) {
      deactivateMutation.mutate({ id: user.id });
    } else {
      activateMutation.mutate({ id: user.id });
    }
  };

  const handleResendInvitation = (user: UserTableRow) => {
    setUserToResend(user);
    setIsResendConfirmOpen(true);
  };

  const handleResendConfirm = () => {
    if (userToResend) {
      resendInvitationMutation.mutate({ id: userToResend.id });
    }
  };

  const handleFormSubmit = (formData: InviteUserInput | Omit<UpdateUserInput, 'id'>) => {
    if (selectedUser) {
      updateMutation.mutate({ id: selectedUser.id, ...formData });
    } else {
      inviteMutation.mutate(formData as InviteUserInput);
    }
  };

  const handleDeleteConfirm = (userId: string) => {
    deleteMutation.mutate({ id: userId });
  };

  const handleSort = (field: 'createdAt' | 'updatedAt' | 'firstName' | 'lastName' | 'email' | 'role') => {
    if (filters.sortBy === field) {
      filters.setSortOrder(filters.sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      filters.setSortBy(field);
      filters.setSortOrder('desc');
    }
  };

  const totalPages = data ? Math.ceil(data.meta.total / filters.limit) : 0;

  // Build active filters array
  const ROLE_LABELS: Record<UserRole, string> = {
    SUPER_ADMIN: 'Super Admin',
    ADMIN: 'Admin',
    MANAGER: 'Manager',
    STAFF: 'Staff',
    CLIENT: 'Client',
  };

  const activeFilters: Array<{ key: string; label: string; value: string; onRemove: () => void }> = [];

  if (filters.search) {
    activeFilters.push({
      key: 'search',
      label: 'Search',
      value: filters.search,
      onRemove: () => filters.setSearch(''),
    });
  }

  if (filters.selectedRole !== 'ALL') {
    activeFilters.push({
      key: 'role',
      label: roleTerm.singular,
      value: ROLE_LABELS[filters.selectedRole],
      onRemove: () => filters.setSelectedRole('ALL'),
    });
  }

  if (filters.selectedStatus !== 'ALL') {
    activeFilters.push({
      key: 'status',
      label: 'Status',
      value: filters.selectedStatus ? 'Active' : 'Inactive',
      onRemove: () => filters.setSelectedStatus('ALL'),
    });
  }

  if (filters.selectedEmailVerified !== 'ALL') {
    activeFilters.push({
      key: 'emailVerified',
      label: 'Email',
      value: filters.selectedEmailVerified ? 'Verified' : 'Unverified',
      onRemove: () => filters.setSelectedEmailVerified('ALL'),
    });
  }

  if (filters.selectedHasPhone !== 'ALL') {
    activeFilters.push({
      key: 'hasPhone',
      label: 'Phone',
      value: filters.selectedHasPhone ? 'Has Phone' : 'No Phone',
      onRemove: () => filters.setSelectedHasPhone('ALL'),
    });
  }

  if (filters.createdFrom) {
    activeFilters.push({
      key: 'createdFrom',
      label: 'From',
      value: new Date(filters.createdFrom).toLocaleDateString(),
      onRemove: () => filters.setCreatedFrom(''),
    });
  }

  if (filters.createdTo) {
    activeFilters.push({
      key: 'createdTo',
      label: 'To',
      value: new Date(filters.createdTo).toLocaleDateString(),
      onRemove: () => filters.setCreatedTo(''),
    });
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Users</h1>
          <p className="text-muted-foreground mt-1">
            Manage users and their permissions
          </p>
        </div>
        <Button onClick={handleCreate}>
          <PlusIcon className="h-5 w-5 mr-2" />
          Invite User
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="relative z-10 space-y-4">
          <UserSearch value={filters.search} onChange={filters.setSearch} />
          <UserFilters />
          <ActiveFilters filters={activeFilters} />
        </div>
      </Card>

      {/* Table */}
      <Card className="p-6">
        <div className="relative z-10">
          <UserTable
            users={data?.data || []}
            isLoading={isLoading}
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleStatus={handleToggleStatus}
            onResendInvitation={handleResendInvitation}
            onSort={handleSort}
          />

          {/* Pagination */}
          {data && data.meta.total > 0 && (
            <div className="mt-6">
              <Pagination
                currentPage={filters.page}
                totalPages={totalPages}
                totalItems={data.meta.total}
                itemsPerPage={filters.limit}
                onPageChange={filters.setPage}
                onItemsPerPageChange={filters.setLimit}
              />
            </div>
          )}
        </div>
      </Card>

      {/* Modals */}
      <UserFormModal
        user={selectedUser}
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedUser(null);
          setBackendErrors([]);
        }}
        onSubmit={handleFormSubmit}
        isSubmitting={inviteMutation.isPending || updateMutation.isPending}
        backendErrors={backendErrors}
      />

      <DeleteUserModal
        user={selectedUser}
        open={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setSelectedUser(null);
        }}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleteMutation.isPending}
      />

      <ConfirmModal
        open={isResendConfirmOpen}
        onClose={() => {
          setIsResendConfirmOpen(false);
          setUserToResend(null);
        }}
        onConfirm={handleResendConfirm}
        isLoading={resendInvitationMutation.isPending}
        title="Resend Invitation"
        description={`Are you sure you want to resend the invitation to ${userToResend?.firstName} ${userToResend?.lastName}?`}
        confirmText="Resend"
        variant="default"
      >
        <p className="text-sm text-muted-foreground">
          A new invitation email will be sent to <strong>{userToResend?.email}</strong>.
          The previous invitation link will be invalidated.
        </p>
      </ConfirmModal>
    </div>
  );
}
