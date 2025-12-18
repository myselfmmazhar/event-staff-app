'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlusIcon } from '@/components/ui/icons';
import { ClientFormModal } from '@/components/clients/client-form-modal';
import { ClientTable } from '@/components/clients/client-table';
import { ClientSearch } from '@/components/clients/client-search';
import { ClientFilters } from '@/components/clients/client-filters';
import { ViewClientModal } from '@/components/clients/view-client-modal';
import { DeleteClientModal } from '@/components/clients/delete-client-modal';
import { TemporaryPasswordModal } from '@/components/clients/temporary-password-modal';
import { Pagination } from '@/components/common/pagination';
import { ActiveFilters } from '@/components/common/active-filters';
import { trpc } from '@/lib/client/trpc';
import type { Client } from '@/lib/types/client';
import type { CreateClientInput, UpdateClientInput } from '@/lib/schemas/client.schema';
import { handleClientMutationError } from '@/lib/utils/client-error-handler';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useClientsFilters } from '@/store/clients-filters.store';
import { useUrlSync } from '@/lib/hooks/useUrlSync';
import { useCrudMutations } from '@/lib/hooks/useCrudMutations';

export default function ClientsPage() {
  const searchParams = useSearchParams();

  // Use filters store
  const filters = useClientsFilters();

  // Use CRUD mutations hook
  const { backendErrors, setBackendErrors, createMutationOptions, updateMutationOptions, deleteMutationOptions } = useCrudMutations();

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

  // Initialize store from URL params on mount
  useEffect(() => {
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 10;
    const search = searchParams.get('search') || '';
    const loginAccess = (searchParams.get('loginAccess') as 'all' | 'with' | 'without') || 'all';
    const sortBy = (searchParams.get('sortBy') as 'clientId' | 'businessName' | 'createdAt') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';

    filters.setPage(page);
    filters.setLimit(limit);
    filters.setSearch(search);
    filters.setLoginAccess(loginAccess);
    filters.setSortBy(sortBy);
    filters.setSortOrder(sortOrder);
  }, []); // Only run on mount

  // Handle create query parameter
  useEffect(() => {
    const createParam = searchParams.get('create');
    if (createParam === 'true') {
      handleCreate();
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams]);

  // Sync store with URL
  useUrlSync(filters, {
    keys: ['page', 'limit', 'search', 'loginAccess', 'sortBy', 'sortOrder'],
  });

  // Convert filter values for tRPC query
  const getLoginAccessFilter = () => {
    if (filters.loginAccess === 'with') return true;
    if (filters.loginAccess === 'without') return false;
    return undefined;
  };

  // tRPC queries
  const { data, isLoading, refetch } = trpc.clients.getAll.useQuery({
    page: filters.page,
    limit: filters.limit,
    search: filters.search || undefined,
    hasLoginAccess: getLoginAccessFilter(),
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  });

  // tRPC mutations with standardized error handling
  const createMutation = trpc.clients.create.useMutation({
    ...createMutationOptions('Client created successfully', {
      onSuccess: () => {
        setModals((prev) => ({ ...prev, form: false }));
        refetch();
      },
    }),
    onError: (error) => {
      handleClientMutationError(error, (_opts: any) => { }, setBackendErrors);
    },
  });

  const updateMutation = trpc.clients.update.useMutation({
    ...updateMutationOptions('Client updated successfully', {
      onSuccess: (response: any) => {
        // Handle standardized response format
        const { client, tempPassword } = response;

        if (tempPassword) {
          setTempPassword(tempPassword);
          setSelectedClient(client);
          setModals((prev) => ({ ...prev, tempPassword: true }));
        }

        setModals((prev) => ({ ...prev, form: false, view: false }));
        setSelectedClient(null);
        refetch();
      },
    }),
    onError: (error) => {
      handleClientMutationError(error, (_opts: any) => { }, setBackendErrors);
    },
  });

  const deleteMutation = trpc.clients.delete.useMutation(
    deleteMutationOptions('Client deleted successfully', {
      onSuccess: () => {
        setModals((prev) => ({ ...prev, delete: false }));
        setSelectedClient(null);
        refetch();
      },
    })
  );

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

  const handleSort = (field: string) => {
    const validField = field as 'clientId' | 'businessName' | 'createdAt';
    if (filters.sortBy === validField) {
      filters.setSortOrder(filters.sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      filters.setSortBy(validField);
      filters.setSortOrder('desc');
    }
  };

  const totalPages = data ? Math.ceil(data.meta.total / filters.limit) : 0;

  // Build active filters array
  const activeFilters: Array<{ key: string; label: string; value: string; onRemove: () => void }> = [];

  if (filters.search) {
    activeFilters.push({
      key: 'search',
      label: 'Search',
      value: filters.search,
      onRemove: () => filters.setSearch(''),
    });
  }

  if (filters.loginAccess !== 'all') {
    activeFilters.push({
      key: 'loginAccess',
      label: 'Login Access',
      value: filters.loginAccess === 'with' ? 'Portal Access' : 'No Access',
      onRemove: () => filters.setLoginAccess('all'),
    });
  }

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
          <ClientSearch value={filters.search} onChange={filters.setSearch} />
          <ClientFilters />
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

      <ViewClientModal
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

      <DeleteClientModal
        client={selectedClient}
        open={modals.delete}
        onClose={() => {
          setModals((prev) => ({ ...prev, delete: false }));
          setSelectedClient(null);
        }}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteMutation.isPending}
      />

      <TemporaryPasswordModal
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
