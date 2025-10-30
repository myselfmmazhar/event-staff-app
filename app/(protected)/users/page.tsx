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
        title: 'Success',
        description: 'User created successfully',
        variant: 'success',
      });
      setIsFormOpen(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'error',
      });
    },
  });

  const updateMutation = trpc.user.update.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'User updated successfully',
        variant: 'success',
      });
      setIsFormOpen(false);
      setSelectedUser(null);
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'error',
      });
    },
  });

  const deleteMutation = trpc.user.delete.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'User deleted successfully',
        variant: 'success',
      });
      setIsDeleteOpen(false);
      setSelectedUser(null);
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'error',
      });
    },
  });

  const activateMutation = trpc.user.activate.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'User activated successfully',
        variant: 'success',
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'error',
      });
    },
  });

  const deactivateMutation = trpc.user.deactivate.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'User deactivated successfully',
        variant: 'success',
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'error',
      });
    },
  });

  // Handlers
  const handleCreate = () => {
    setSelectedUser(null);
    setIsFormOpen(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
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
        }}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
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
