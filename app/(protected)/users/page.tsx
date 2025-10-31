'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { PlusIcon } from '@/components/ui/icons';
import { ActiveFilters } from '@/components/users/active-filters';
import { DeleteUserDialog } from '@/components/users/delete-user-dialog';
import { Pagination } from '@/components/users/pagination';
import { UserFilters } from '@/components/users/user-filters';
import { UserFormModal } from '@/components/users/user-form-modal';
import { UserSearch } from '@/components/users/user-search';
import { UserTable } from '@/components/users/user-table';
import { trpc } from '@/lib/client/trpc';
import { UserRole } from '@prisma/client';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

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
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize state from URL params
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [limit, setLimit] = useState(Number(searchParams.get('limit')) || 10);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedRole, setSelectedRole] = useState<UserRole | 'ALL'>(
    (searchParams.get('role') as UserRole) || 'ALL'
  );
  const [selectedStatus, setSelectedStatus] = useState<boolean | 'ALL'>(
    searchParams.get('status') === 'true' ? true :
    searchParams.get('status') === 'false' ? false : 'ALL'
  );
  const [selectedEmailVerified, setSelectedEmailVerified] = useState<boolean | 'ALL'>(
    searchParams.get('emailVerified') === 'true' ? true :
    searchParams.get('emailVerified') === 'false' ? false : 'ALL'
  );
  const [selectedHasPhone, setSelectedHasPhone] = useState<boolean | 'ALL'>(
    searchParams.get('hasPhone') === 'true' ? true :
    searchParams.get('hasPhone') === 'false' ? false : 'ALL'
  );
  const [createdFrom, setCreatedFrom] = useState(searchParams.get('createdFrom') || '');
  const [createdTo, setCreatedTo] = useState(searchParams.get('createdTo') || '');
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'firstName' | 'lastName' | 'email' | 'role'>(
    (searchParams.get('sortBy') as 'createdAt' | 'updatedAt' | 'firstName' | 'lastName' | 'email' | 'role') || 'createdAt'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [backendErrors, setBackendErrors] = useState<Array<{ field: string; message: string }>>([]);

  // tRPC queries
  const { data, isLoading, refetch } = trpc.user.getAll.useQuery({
    page,
    limit,
    search: search || undefined,
    role: selectedRole === 'ALL' ? undefined : selectedRole,
    isActive: selectedStatus === 'ALL' ? undefined : selectedStatus,
    emailVerified: selectedEmailVerified === 'ALL' ? undefined : selectedEmailVerified,
    hasPhone: selectedHasPhone === 'ALL' ? undefined : selectedHasPhone,
    createdFrom: createdFrom || undefined,
    createdTo: createdTo || undefined,
    sortBy,
    sortOrder,
  });

  // tRPC mutations
  const createMutation = trpc.user.create.useMutation({
    onSuccess: () => {
      toast({
        message: 'User created successfully',
        type: 'success',
      });
      setIsFormOpen(false);
      setBackendErrors([]);
      refetch();
    },
    onError: (error) => {
      // Extract field errors from error response
      const fieldErrors = (error.data as any)?.fieldErrors || [];

      if (fieldErrors.length > 0) {
        // Set field errors to be displayed on the form
        setBackendErrors(fieldErrors);
        // Show general error toast
        toast({
          message: 'Please check the form for errors',
          type: 'error',
        });
      } else {
        // Show specific error message for non-validation errors
        setBackendErrors([]);
        toast({
          message: error.message,
          type: 'error',
        });
      }
    },
  });

  const updateMutation = trpc.user.update.useMutation({
    onSuccess: () => {
      toast({
        message: 'User updated successfully',
        type: 'success',
      });
      setIsFormOpen(false);
      setSelectedUser(null);
      setBackendErrors([]);
      refetch();
    },
    onError: (error) => {
      // Extract field errors from error response
      const fieldErrors = (error.data as any)?.fieldErrors || [];

      if (fieldErrors.length > 0) {
        // Set field errors to be displayed on the form
        setBackendErrors(fieldErrors);
        // Show general error toast
        toast({
          message: 'Please check the form for errors',
          type: 'error',
        });
      } else {
        // Show specific error message for non-validation errors
        setBackendErrors([]);
        toast({
          message: error.message,
          type: 'error',
        });
      }
    },
  });

  const deleteMutation = trpc.user.delete.useMutation({
    onSuccess: () => {
      toast({
        message: 'User deleted successfully',
        type: 'success',
      });
      setIsDeleteOpen(false);
      setSelectedUser(null);
      refetch();
    },
    onError: (error) => {
      toast({
        message: error.message,
        type: 'error',
      });
    },
  });

  const activateMutation = trpc.user.activate.useMutation({
    onSuccess: () => {
      toast({
        message: 'User activated successfully',
        type: 'success',
      });
      refetch();
    },
    onError: (error) => {
      toast({
        message: error.message,
        type: 'error',
      });
    },
  });

  const deactivateMutation = trpc.user.deactivate.useMutation({
    onSuccess: () => {
      toast({
        message: 'User deactivated successfully',
        type: 'success',
      });
      refetch();
    },
    onError: (error) => {
      toast({
        message: error.message,
        type: 'error',
      });
    },
  });

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

  const handleFormSubmit = (formData: any) => {
    if (selectedUser) {
      // Update existing user
      updateMutation.mutate({
        id: selectedUser.id,
        ...formData,
      });
    } else {
      // Create new user
      createMutation.mutate(formData);
    }
  };

  const handleDeleteConfirm = (userId: string) => {
    deleteMutation.mutate({ id: userId });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1); // Reset to first page
  };

  const handleSearchChange = (newSearch: string) => {
    setSearch(newSearch);
    setPage(1); // Reset to first page
  };

  const handleRoleChange = (role: UserRole | 'ALL') => {
    setSelectedRole(role);
    setPage(1); // Reset to first page
  };

  const handleStatusChange = (status: boolean | 'ALL') => {
    setSelectedStatus(status);
    setPage(1); // Reset to first page
  };

  const handleSort = (field: 'createdAt' | 'updatedAt' | 'firstName' | 'lastName' | 'email' | 'role') => {
    if (sortBy === field) {
      // Toggle order if same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to desc
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleEmailVerifiedChange = (verified: boolean | 'ALL') => {
    setSelectedEmailVerified(verified);
    setPage(1);
  };

  const handleHasPhoneChange = (hasPhone: boolean | 'ALL') => {
    setSelectedHasPhone(hasPhone);
    setPage(1);
  };

  const handleCreatedFromChange = (date: string) => {
    setCreatedFrom(date);
    setPage(1);
  };

  const handleCreatedToChange = (date: string) => {
    setCreatedTo(date);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSelectedRole('ALL');
    setSelectedStatus('ALL');
    setSelectedEmailVerified('ALL');
    setSelectedHasPhone('ALL');
    setCreatedFrom('');
    setCreatedTo('');
    setSearch('');
    setPage(1);
  };

  const totalPages = data ? Math.ceil(data.meta.total / limit) : 0;

  // Build active filters array
  const ROLE_LABELS: Record<UserRole, string> = {
    SUPER_ADMIN: 'Super Admin',
    ADMIN: 'Admin',
    MANAGER: 'Manager',
    STAFF: 'Staff',
  };

  const activeFilters: Array<{ key: string; label: string; value: string; onRemove: () => void }> = [];

  if (search) {
    activeFilters.push({
      key: 'search',
      label: 'Search',
      value: search,
      onRemove: () => setSearch(''),
    });
  }

  if (selectedRole !== 'ALL') {
    activeFilters.push({
      key: 'role',
      label: 'Role',
      value: ROLE_LABELS[selectedRole],
      onRemove: () => setSelectedRole('ALL'),
    });
  }

  if (selectedStatus !== 'ALL') {
    activeFilters.push({
      key: 'status',
      label: 'Status',
      value: selectedStatus ? 'Active' : 'Inactive',
      onRemove: () => setSelectedStatus('ALL'),
    });
  }

  if (selectedEmailVerified !== 'ALL') {
    activeFilters.push({
      key: 'emailVerified',
      label: 'Email',
      value: selectedEmailVerified ? 'Verified' : 'Unverified',
      onRemove: () => setSelectedEmailVerified('ALL'),
    });
  }

  if (selectedHasPhone !== 'ALL') {
    activeFilters.push({
      key: 'hasPhone',
      label: 'Phone',
      value: selectedHasPhone ? 'Has Phone' : 'No Phone',
      onRemove: () => setSelectedHasPhone('ALL'),
    });
  }

  if (createdFrom) {
    activeFilters.push({
      key: 'createdFrom',
      label: 'From',
      value: new Date(createdFrom).toLocaleDateString(),
      onRemove: () => setCreatedFrom(''),
    });
  }

  if (createdTo) {
    activeFilters.push({
      key: 'createdTo',
      label: 'To',
      value: new Date(createdTo).toLocaleDateString(),
      onRemove: () => setCreatedTo(''),
    });
  }

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();

    if (page > 1) params.set('page', page.toString());
    if (limit !== 10) params.set('limit', limit.toString());
    if (search) params.set('search', search);
    if (selectedRole !== 'ALL') params.set('role', selectedRole);
    if (selectedStatus !== 'ALL') params.set('status', String(selectedStatus));
    if (selectedEmailVerified !== 'ALL') params.set('emailVerified', String(selectedEmailVerified));
    if (selectedHasPhone !== 'ALL') params.set('hasPhone', String(selectedHasPhone));
    if (createdFrom) params.set('createdFrom', createdFrom);
    if (createdTo) params.set('createdTo', createdTo);
    if (sortBy !== 'createdAt') params.set('sortBy', sortBy);
    if (sortOrder !== 'desc') params.set('sortOrder', sortOrder);

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

    router.replace(newUrl, { scroll: false });
  }, [
    page,
    limit,
    search,
    selectedRole,
    selectedStatus,
    selectedEmailVerified,
    selectedHasPhone,
    createdFrom,
    createdTo,
    sortBy,
    sortOrder,
    pathname,
    router,
  ]);

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
          <UserSearch value={search} onChange={handleSearchChange} />
          <UserFilters
            selectedRole={selectedRole}
            selectedStatus={selectedStatus}
            selectedEmailVerified={selectedEmailVerified}
            selectedHasPhone={selectedHasPhone}
            createdFrom={createdFrom}
            createdTo={createdTo}
            onRoleChange={handleRoleChange}
            onStatusChange={handleStatusChange}
            onEmailVerifiedChange={handleEmailVerifiedChange}
            onHasPhoneChange={handleHasPhoneChange}
            onCreatedFromChange={handleCreatedFromChange}
            onCreatedToChange={handleCreatedToChange}
            onClearAll={handleClearFilters}
          />
          <ActiveFilters filters={activeFilters} />
        </div>
      </Card>

      {/* Table */}
      <Card className="p-6">
        <div className="relative z-10">
          <UserTable
            users={data?.data || []}
            isLoading={isLoading}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleStatus={handleToggleStatus}
            onSort={handleSort}
          />

          {/* Pagination */}
          {data && data.meta.total > 0 && (
            <div className="mt-6">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={data.meta.total}
                itemsPerPage={limit}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleLimitChange}
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
