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
import { PageLabelsModal } from '@/components/common/page-labels-modal';
import { trpc } from '@/lib/client/trpc';
import { UserRole } from '@prisma/client';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, type ComponentProps } from 'react';
import type { InviteUserInput, UpdateUserInput } from '@/lib/schemas/user.schema';
import {
  useUsersFilters,
  type UserSortBy,
  type SortOrder,
  type UserStatusFilter,
  type UserEmailVerifiedFilter,
  type UserPhoneFilter,
} from '@/store/users-filters.store';
import { useUrlSync } from '@/lib/hooks/useUrlSync';
import { useCrudMutations } from '@/lib/hooks/useCrudMutations';
import { useRoleTerm, useTerminology } from '@/lib/hooks/use-terminology';
import { useUsersPageLabels } from '@/lib/hooks/use-labels';
type UserTableRow = ComponentProps<typeof UserTable>['users'][number];

const USER_SORT_FIELDS: UserSortBy[] = ['createdAt', 'updatedAt', 'firstName', 'lastName', 'email', 'role'];
const USER_SORT_FIELD_SET = new Set<UserSortBy>(USER_SORT_FIELDS);
const USER_ROLE_SET = new Set<UserRole>(Object.values(UserRole));

function parseNumberParam(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseCsvParam(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function parseRolesParam(value: string | null): UserRole[] {
  return parseCsvParam(value).filter((v): v is UserRole => USER_ROLE_SET.has(v as UserRole));
}

function parseStatusesParam(value: string | null): UserStatusFilter[] {
  if (value === 'true') return ['active'];
  if (value === 'false') return ['inactive'];
  if (value === 'ALL' || value === 'all') return [];
  return parseCsvParam(value).filter((v): v is UserStatusFilter => v === 'active' || v === 'inactive');
}

function parseEmailVerifiedParam(value: string | null): UserEmailVerifiedFilter[] {
  if (value === 'true') return ['verified'];
  if (value === 'false') return ['unverified'];
  if (value === 'ALL' || value === 'all') return [];
  return parseCsvParam(value).filter((v): v is UserEmailVerifiedFilter => v === 'verified' || v === 'unverified');
}

function parseHasPhoneParam(value: string | null): UserPhoneFilter[] {
  if (value === 'true') return ['hasPhone'];
  if (value === 'false') return ['noPhone'];
  if (value === 'ALL' || value === 'all') return [];
  return parseCsvParam(value).filter((v): v is UserPhoneFilter => v === 'hasPhone' || v === 'noPhone');
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
  const { terminology } = useTerminology();
  const usersLabels = useUsersPageLabels();

  // Use CRUD mutations hook
  const { backendErrors, setBackendErrors, createMutationOptions, updateMutationOptions, deleteMutationOptions } = useCrudMutations();

  // Local modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isResendConfirmOpen, setIsResendConfirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserTableRow | null>(null);
  const [userToResend, setUserToResend] = useState<UserTableRow | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Initialize store from URL params on mount
  useEffect(() => {
    const page = parseNumberParam(searchParams.get('page'), 1);
    const limit = parseNumberParam(searchParams.get('limit'), 10);
    const search = searchParams.get('search') || '';
    const roles = parseRolesParam(searchParams.get('roles') ?? searchParams.get('selectedRole') ?? searchParams.get('role'));
    const statuses = parseStatusesParam(searchParams.get('statuses') ?? searchParams.get('selectedStatus') ?? searchParams.get('status'));
    const emailVerified = parseEmailVerifiedParam(searchParams.get('emailVerified') ?? searchParams.get('selectedEmailVerified'));
    const hasPhone = parseHasPhoneParam(searchParams.get('hasPhone') ?? searchParams.get('selectedHasPhone'));
    const createdFrom = parseDateParam(searchParams.get('createdFrom'));
    const createdTo = parseDateParam(searchParams.get('createdTo'));
    const sortBy = parseSortByParam(searchParams.get('sortBy'));
    const sortOrder = parseSortOrderParam(searchParams.get('sortOrder'));

    filters.setPage(page);
    filters.setLimit(limit);
    filters.setSearch(search);
    filters.setRoles(roles);
    filters.setStatuses(statuses);
    filters.setEmailVerified(emailVerified);
    filters.setHasPhone(hasPhone);
    filters.setCreatedFrom(createdFrom);
    filters.setCreatedTo(createdTo);
    filters.setSortBy(sortBy);
    filters.setSortOrder(sortOrder);
  }, []); // Only run on mount

  // Sync store with URL
  useUrlSync(filters, {
    keys: ['page', 'limit', 'search', 'roles', 'statuses', 'emailVerified', 'hasPhone', 'createdFrom', 'createdTo', 'sortBy', 'sortOrder'],
  });

  // tRPC queries
  const { data, isLoading, refetch } = trpc.user.getAll.useQuery({
    page: filters.page,
    limit: filters.limit,
    search: filters.search || undefined,
    role:
      filters.roles.length === 0
        ? undefined
        : filters.roles.length === 1
          ? filters.roles[0]
          : filters.roles,
    isActive:
      filters.statuses.length === 0 || filters.statuses.length === 2
        ? undefined
        : filters.statuses.includes('active')
          ? true
          : false,
    emailVerified:
      filters.emailVerified.length === 0 || filters.emailVerified.length === 2
        ? undefined
        : filters.emailVerified.includes('verified')
          ? true
          : false,
    hasPhone:
      filters.hasPhone.length === 0 || filters.hasPhone.length === 2
        ? undefined
        : filters.hasPhone.includes('hasPhone')
          ? true
          : false,
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

  const clearSelection = () => setSelectedIds(new Set());

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

  if (filters.roles.length > 0) {
    activeFilters.push({
      key: 'roles',
      label: roleTerm.singular,
      value: filters.roles.length === 1 ? ROLE_LABELS[filters.roles[0]!] : `${filters.roles.length} selected`,
      onRemove: () => filters.setRoles([]),
    });
  }

  if (filters.statuses.length > 0) {
    activeFilters.push({
      key: 'statuses',
      label: 'Status',
      value: filters.statuses.length === 1 ? (filters.statuses[0] === 'active' ? 'Active' : 'Inactive') : `${filters.statuses.length} selected`,
      onRemove: () => filters.setStatuses([]),
    });
  }

  if (filters.emailVerified.length > 0) {
    activeFilters.push({
      key: 'emailVerified',
      label: 'Email',
      value: filters.emailVerified.length === 1 ? (filters.emailVerified[0] === 'verified' ? 'Verified' : 'Unverified') : `${filters.emailVerified.length} selected`,
      onRemove: () => filters.setEmailVerified([]),
    });
  }

  if (filters.hasPhone.length > 0) {
    activeFilters.push({
      key: 'hasPhone',
      label: 'Phone',
      value: filters.hasPhone.length === 1 ? (filters.hasPhone[0] === 'hasPhone' ? 'Has Phone' : 'No Phone') : `${filters.hasPhone.length} selected`,
      onRemove: () => filters.setHasPhone([]),
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
          <h1 className="text-3xl font-bold text-foreground">{usersLabels.pageTitle}</h1>
          <p className="text-muted-foreground mt-1">
            {usersLabels.pageSubtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PageLabelsModal
            page="users"
            sections={[
              {
                id: 'page',
                title: 'Page Labels',
                description: 'Customize heading and button text',
                prefix: 'page',
                labels: [
                  { key: 'pageTitle', label: 'Page Title', defaultLabel: 'Users' },
                  { key: 'pageSubtitle', label: 'Page Subtitle', defaultLabel: 'Manage user accounts and permissions' },
                  { key: 'addButton', label: 'Add Button', defaultLabel: 'Invite User' },
                  { key: 'searchPlaceholder', label: 'Search Placeholder', defaultLabel: 'Search by name or email...' },
                ],
              },
              {
                id: 'filters',
                title: 'Filter Labels',
                description: 'Customize filter names',
                prefix: 'filters',
                labels: [
                  { key: 'title', label: 'Filters Heading', defaultLabel: 'Filters' },
                  { key: 'role', label: 'Role Filter', defaultLabel: `${terminology.role.singular}` },
                  { key: 'status', label: 'Status Filter', defaultLabel: 'Status' },
                  { key: 'emailVerified', label: 'Email Status Filter', defaultLabel: 'Email Status' },
                  { key: 'hasPhone', label: 'Phone Status Filter', defaultLabel: 'Phone Status' },
                  { key: 'createdDate', label: 'Created Date Filter', defaultLabel: 'Created Date' },
                ],
              },
              {
                id: 'columns',
                title: 'Table Columns',
                description: 'Customize table column headers',
                prefix: 'columns',
                labels: [
                  { key: 'name', label: 'Name', defaultLabel: 'Name' },
                  { key: 'email', label: 'Email', defaultLabel: 'Email' },
                  { key: 'role', label: 'Permission', defaultLabel: `${terminology.role.singular}` },
                  { key: 'joined', label: 'Joined', defaultLabel: 'Joined' },
                  { key: 'invitation', label: 'Invitation', defaultLabel: 'Invitation' },
                  { key: 'phone', label: 'Phone', defaultLabel: 'Phone' },
                  { key: 'actions', label: 'Actions', defaultLabel: 'Actions' },
                ],
              },
            ]}
            buttonVariant="outline"
            buttonSize="md"
          />
          <Button onClick={handleCreate}>
            <PlusIcon className="h-5 w-5 mr-2" />
            {usersLabels.addButton}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-6 overflow-visible relative z-20">
        <div className="space-y-4">
          <UserSearch value={filters.search} onChange={filters.setSearch} placeholder={usersLabels.searchPlaceholder} />
          <UserFilters />
          <ActiveFilters filters={activeFilters} />
        </div>
      </Card>

      {/* Selection Info */}
      {selectedIds.size > 0 && (
        <Card className="p-3 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">
              {selectedIds.size} user{selectedIds.size !== 1 ? 's' : ''} selected
            </span>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Clear selection
            </Button>
          </div>
        </Card>
      )}

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
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
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
