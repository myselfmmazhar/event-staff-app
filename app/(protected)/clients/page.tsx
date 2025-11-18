'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { PlusIcon } from '@/components/ui/icons';
import { ClientFormModal } from '@/components/clients/client-form-modal';
import { ClientTable } from '@/components/clients/client-table';
import { ClientSearch } from '@/components/clients/client-search';
import { ClientFilters } from '@/components/clients/client-filters';
import { ViewClientDialog } from '@/components/clients/view-client-dialog';
import { DeleteClientDialog } from '@/components/clients/delete-client-dialog';
import { TemporaryPasswordDialog } from '@/components/clients/temporary-password-dialog';
import { Pagination } from '@/components/users/pagination';
import { ActiveFilters } from '@/components/users/active-filters';
import { trpc } from '@/lib/client/trpc';
import type { Client } from '@/lib/types/client';
import type { CreateClientInput, UpdateClientInput } from '@/lib/schemas/client.schema';
import { handleClientMutationError } from '@/lib/utils/client-error-handler';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

export default function ClientsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Pagination and filtering state (initialized from URL params)
  const [pagination, setPagination] = useState({
    page: Number(searchParams.get('page')) || 1,
    limit: Number(searchParams.get('limit')) || 10,
  });

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    loginAccess: (searchParams.get('loginAccess') as 'all' | 'with' | 'without') || 'all' as const,
    sortBy: (searchParams.get('sortBy') as 'clientId' | 'businessName' | 'createdAt') || 'createdAt' as const,
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc' as const,
  });

  // Modal state
  const [modals, setModals] = useState({
    form: false,
    view: false,
    delete: false,
    tempPassword: false,
  });

  // Client and form state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [backendErrors, setBackendErrors] = useState<Array<{ field: string; message: string }>>([]);

  // Convert filter values for tRPC query
  const getLoginAccessFilter = () => {
    if (filters.loginAccess === 'with') return true;
    if (filters.loginAccess === 'without') return false;
    return undefined;
  };

  // tRPC queries
  const { data, isLoading, refetch } = trpc.client.getAll.useQuery({
    page: pagination.page,
    limit: pagination.limit,
    search: filters.search || undefined,
    hasLoginAccess: getLoginAccessFilter(),
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  });

  // tRPC mutations
  const createMutation = trpc.client.create.useMutation({
    onSuccess: () => {
      toast({
        message: 'Client created successfully',
        type: 'success',
      });
      setModals((prev) => ({ ...prev, form: false }));
      setBackendErrors([]);
      refetch();
    },
    onError: (error) => {
      handleClientMutationError(error, toast, setBackendErrors);
    },
  });

  const updateMutation = trpc.client.update.useMutation({
    onSuccess: (response) => {
      // Handle standardized response format
      const { client, tempPassword } = response;

      if (tempPassword) {
        setTempPassword(tempPassword);
        setSelectedClient(client);
        setModals((prev) => ({ ...prev, tempPassword: true }));
      }

      toast({
        message: 'Client updated successfully',
        type: 'success',
      });
      setModals((prev) => ({ ...prev, form: false, view: false }));
      setSelectedClient(null);
      setBackendErrors([]);
      refetch();
    },
    onError: (error) => {
      handleClientMutationError(error, toast, setBackendErrors);
    },
  });

  const deleteMutation = trpc.client.delete.useMutation({
    onSuccess: () => {
      toast({
        message: 'Client deleted successfully',
        type: 'success',
      });
      setModals((prev) => ({ ...prev, delete: false }));
      setSelectedClient(null);
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
    setSelectedClient(null);
    setBackendErrors([]);
    setModals((prev) => ({ ...prev, form: true }));
  };

  const handleView = (clientId: string) => {
    const client = data?.data.find((c) => c.id === clientId);
    if (client) {
      setSelectedClient({
        ...client,
        createdAt: new Date(client.createdAt || new Date()),
      });
      setModals((prev) => ({ ...prev, view: true }));
    }
  };

  const handleEdit = (clientId: string) => {
    const client = data?.data.find((c) => c.id === clientId);
    if (client) {
      setSelectedClient({
        ...client,
        createdAt: new Date(client.createdAt || new Date()),
      });
      setBackendErrors([]);
      setModals((prev) => ({ ...prev, form: true }));
    }
  };

  const handleDelete = (clientId: string) => {
    const client = data?.data.find((c) => c.id === clientId);
    if (client) {
      setSelectedClient(client);
      setModals((prev) => ({ ...prev, delete: true }));
    }
  };

  const handleFormSubmit = (formData: CreateClientInput | Omit<UpdateClientInput, 'id'>) => {
    if (selectedClient) {
      // Update existing client
      updateMutation.mutate({
        id: selectedClient.id,
        ...formData,
      });
    } else {
      // Create new client
      createMutation.mutate(formData as CreateClientInput);
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedClient) {
      deleteMutation.mutate({ id: selectedClient.id });
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleLimitChange = (newLimit: number) => {
    setPagination({ page: 1, limit: newLimit });
  };

  const handleSearchChange = (newSearch: string) => {
    setFilters((prev) => ({ ...prev, search: newSearch }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleLoginAccessChange = (access: 'all' | 'with' | 'without') => {
    setFilters((prev) => ({ ...prev, loginAccess: access }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSortByChange = (field: string) => {
    setFilters((prev) => ({ ...prev, sortBy: field as 'clientId' | 'businessName' | 'createdAt' }));
  };

  const handleSortOrderChange = (order: 'asc' | 'desc') => {
    setFilters((prev) => ({ ...prev, sortOrder: order }));
  };

  const handleSort = (field: string) => {
    const validField = field as 'clientId' | 'businessName' | 'createdAt';
    if (filters.sortBy === validField) {
      setFilters((prev) => ({
        ...prev,
        sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc',
      }));
    } else {
      setFilters((prev) => ({
        ...prev,
        sortBy: validField,
        sortOrder: 'desc',
      }));
    }
  };

  const handleClearFilters = () => {
    setFilters((prev) => ({
      ...prev,
      loginAccess: 'all',
      search: '',
    }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const totalPages = data ? Math.ceil(data.meta.total / pagination.limit) : 0;

  // Build active filters array
  const activeFilters: Array<{ key: string; label: string; value: string; onRemove: () => void }> = [];

  if (filters.search) {
    activeFilters.push({
      key: 'search',
      label: 'Search',
      value: filters.search,
      onRemove: () => setFilters((prev) => ({ ...prev, search: '' })),
    });
  }

  if (filters.loginAccess !== 'all') {
    activeFilters.push({
      key: 'loginAccess',
      label: 'Login Access',
      value: filters.loginAccess === 'with' ? 'Portal Access' : 'No Access',
      onRemove: () => setFilters((prev) => ({ ...prev, loginAccess: 'all' })),
    });
  }

  // Track the previous URL to prevent unnecessary updates
  const previousUrlRef = useRef<string>('');

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();

    if (pagination.page > 1) params.set('page', pagination.page.toString());
    if (pagination.limit !== 10) params.set('limit', pagination.limit.toString());
    if (filters.search) params.set('search', filters.search);
    if (filters.loginAccess !== 'all') params.set('loginAccess', filters.loginAccess);
    if (filters.sortBy !== 'createdAt') params.set('sortBy', filters.sortBy);
    if (filters.sortOrder !== 'desc') params.set('sortOrder', filters.sortOrder);

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

    // Only update if URL actually changed
    if (newUrl !== previousUrlRef.current) {
      previousUrlRef.current = newUrl;
      router.replace(newUrl, { scroll: false });
    }
  }, [pagination, filters, pathname, router]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clients</h1>
          <p className="text-muted-foreground mt-1">
            Manage clients and their portal access
          </p>
        </div>
        <Button onClick={handleCreate}>
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Client
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="relative z-10 space-y-4">
          <ClientSearch onSearch={handleSearchChange} />
          <ClientFilters
            loginAccess={filters.loginAccess}
            onLoginAccessChange={handleLoginAccessChange}
            sortBy={filters.sortBy}
            onSortByChange={handleSortByChange}
            sortOrder={filters.sortOrder}
            onSortOrderChange={handleSortOrderChange}
          />
          <ActiveFilters filters={activeFilters} />
        </div>
      </Card>

      {/* Table */}
      <Card className="p-6">
        <div className="relative z-10">
          <ClientTable
            clients={data?.data || []}
            isLoading={isLoading}
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onSort={handleSort}
          />

          {/* Pagination */}
          {data && data.meta.total > 0 && (
            <div className="mt-6">
              <Pagination
                currentPage={pagination.page}
                totalPages={totalPages}
                totalItems={data.meta.total}
                itemsPerPage={pagination.limit}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleLimitChange}
              />
            </div>
          )}
        </div>
      </Card>

      {/* Modals */}
      <ClientFormModal
        client={selectedClient}
        open={modals.form}
        onClose={() => {
          setModals((prev) => ({ ...prev, form: false }));
          setSelectedClient(null);
          setBackendErrors([]);
        }}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        backendErrors={backendErrors}
      />

      <ViewClientDialog
        client={selectedClient}
        open={modals.view}
        onClose={() => {
          setModals((prev) => ({ ...prev, view: false }));
          setSelectedClient(null);
        }}
        onEdit={() => {
          setModals((prev) => ({ ...prev, view: false, form: true }));
          setBackendErrors([]);
        }}
      />

      <DeleteClientDialog
        client={selectedClient}
        open={modals.delete}
        onClose={() => {
          setModals((prev) => ({ ...prev, delete: false }));
          setSelectedClient(null);
        }}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteMutation.isPending}
      />

      <TemporaryPasswordDialog
        tempPassword={tempPassword}
        clientName={selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : ''}
        clientEmail={selectedClient?.email || ''}
        open={modals.tempPassword}
        onClose={() => {
          setModals((prev) => ({ ...prev, tempPassword: false }));
          setTempPassword(null);
          setSelectedClient(null);
        }}
      />
    </div>
  );
}
