'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlusIcon } from '@/components/ui/icons';
import { ActiveFilters } from '@/components/common/active-filters';
import { DeleteUserDialog } from '@/components/users/delete-user-dialog';
import { Pagination } from '@/components/common/pagination';
import { UserFilters } from '@/components/users/user-filters';
import { UserFormModal } from '@/components/users/user-form-modal';
import { UserSearch } from '@/components/users/user-search';
import { UserTable } from '@/components/users/user-table';
import { trpc } from '@/lib/client/trpc';
import { UserRole } from '@prisma/client';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import type { CreateUserInput, UpdateUserInput } from '@/lib/schemas/user.schema';
import { useUsersFilters } from '@/store/users-filters.store';
import { useUrlSync } from '@/lib/hooks/useUrlSync';
import { useCrudMutations } from '@/lib/hooks/useCrudMutations';

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  phone?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
  createdAt: Date;
};

export default function UsersPage() {
  const searchParams = useSearchParams();

  // Use filters store
  const filters = useUsersFilters();

  // Use CRUD mutations hook
  const { backendErrors, setBackendErrors, createMutationOptions, updateMutationOptions, deleteMutationOptions } = useCrudMutations();

  // Local modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Initialize store from URL params on mount
  useEffect(() => {
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 10;
    const search = searchParams.get('search') || '';
    const role = (searchParams.get('role') as UserRole) || 'ALL';
    const status = searchParams.get('status') === 'true' ? true : searchParams.get('status') === 'false' ? false : 'ALL';
    const emailVerified = searchParams.get('emailVerified') === 'true' ? true : searchParams.get('emailVerified') === 'false' ? false : 'ALL';
    const hasPhone = searchParams.get('hasPhone') === 'true' ? true : searchParams.get('hasPhone') === 'false' ? false : 'ALL';
    const createdFrom = searchParams.get('createdFrom') || '';
    const createdTo = searchParams.get('createdTo') || '';
    const sortBy = (searchParams.get('sortBy') as any) || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';

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
  const createMutation = trpc.user.create.useMutation(
    createMutationOptions('User created successfully', {
      onSuccess: () => {
        setIsFormOpen(false);
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

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setBackendErrors([]);
    setIsFormOpen(true);
  };

  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setIsDeleteOpen(true);
  };

  const handleToggleStatus = (user: User) => {
    if (user.isActive) {
      deactivateMutation.mutate({ id: user.id });
    } else {
      activateMutation.mutate({ id: user.id });
    }
  };

  const handleFormSubmit = (formData: CreateUserInput | Omit<UpdateUserInput, 'id'>) => {
    if (selectedUser) {
      updateMutation.mutate({ id: selectedUser.id, ...formData });
    } else {
      createMutation.mutate(formData as any);
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
      label: 'Role',
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
          Create User
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
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        backendErrors={backendErrors}
      />

      <DeleteUserDialog
        user={selectedUser}
        open={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setSelectedUser(null);
        }}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
