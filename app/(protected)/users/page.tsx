'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { PlusIcon } from '@/components/ui/icons';
import { DeleteUserDialog } from '@/components/users/delete-user-dialog';
import { Pagination } from '@/components/users/pagination';
import { UserFilters } from '@/components/users/user-filters';
import { UserFormModal } from '@/components/users/user-form-modal';
import { UserSearch } from '@/components/users/user-search';
import { UserTable } from '@/components/users/user-table';
import { trpc } from '@/lib/client/trpc';
import { UserRole } from '@prisma/client';
import { useState } from 'react';

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

  // State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<boolean | 'ALL'>('ALL');
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

  const totalPages = data ? Math.ceil(data.meta.total / limit) : 0;

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
        <div className="space-y-4">
          <UserSearch value={search} onChange={handleSearchChange} />
          <UserFilters
            selectedRole={selectedRole}
            selectedStatus={selectedStatus}
            onRoleChange={handleRoleChange}
            onStatusChange={handleStatusChange}
          />
        </div>
      </Card>

      {/* Table */}
      <Card className="p-6">
        <UserTable
          users={data?.data || []}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleStatus={handleToggleStatus}
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
