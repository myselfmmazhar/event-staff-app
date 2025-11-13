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
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import type { CreateClientInput, UpdateClientInput } from '@/lib/schemas/client.schema';

type Client = {
  id: string;
  clientId: string;
  businessName: string;
  firstName: string;
  lastName: string;
  email: string;
  cellPhone: string;
  businessPhone?: string | null;
  details?: string | null;
  venueName?: string | null;
  room?: string | null;
  streetAddress: string;
  aptSuiteUnit?: string | null;
  city: string;
  country: string;
  state: string;
  zipCode: string;
  hasLoginAccess: boolean;
  userId?: string | null;
  createdAt?: Date;
};

export default function ClientsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize state from URL params
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [limit, setLimit] = useState(Number(searchParams.get('limit')) || 10);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedLoginAccess, setSelectedLoginAccess] = useState<'all' | 'with' | 'without'>(
    (searchParams.get('loginAccess') as 'all' | 'with' | 'without') || 'all'
  );
  const [sortBy, setSortBy] = useState<'clientId' | 'businessName' | 'createdAt'>(
    (searchParams.get('sortBy') as 'clientId' | 'businessName' | 'createdAt') || 'createdAt'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
  );

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isTempPasswordOpen, setIsTempPasswordOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [backendErrors, setBackendErrors] = useState<Array<{ field: string; message: string }>>([]);

  // Convert filter values for tRPC query
  const getLoginAccessFilter = () => {
    if (selectedLoginAccess === 'with') return true;
    if (selectedLoginAccess === 'without') return false;
    return undefined;
  };

  // tRPC queries
  const { data, isLoading, refetch } = trpc.client.getAll.useQuery({
    page,
    limit,
    search: search || undefined,
    hasLoginAccess: getLoginAccessFilter(),
    sortBy,
    sortOrder,
  });

  // tRPC mutations
  const createMutation = trpc.client.create.useMutation({
    onSuccess: (response) => {
      // The create response has { client, tempPassword }
      // tempPassword is null when login access is not granted during creation
      const client = 'client' in response ? response.client : response;

      toast({
        message: 'Client created successfully',
        type: 'success',
      });
      setIsFormOpen(false);
      setBackendErrors([]);
      refetch();
    },
    onError: (error) => {
      const fieldErrors = (error.data as { fieldErrors?: Array<{ field: string; message: string }> })?.fieldErrors || [];

      if (fieldErrors.length > 0) {
        setBackendErrors(fieldErrors);
        toast({
          message: 'Please check the form for errors',
          type: 'error',
        });
      } else {
        setBackendErrors([]);
        toast({
          message: error.message,
          type: 'error',
        });
      }
    },
  });

  const updateMutation = trpc.client.update.useMutation({
    onSuccess: (response) => {
      // Check if temporary password was returned (indicates login access was just granted)
      // The response could be either a ClientSelect or { client, tempPassword }
      const client = 'client' in response && response.client ? response.client : response;
      const tempPwd = 'tempPassword' in response && response.tempPassword ? (response.tempPassword as string) : null;

      if (tempPwd) {
        setTempPassword(tempPwd as string);
        const clientData = client as Client;
        setSelectedClient({
          ...clientData,
          createdAt: clientData.createdAt instanceof Date ? clientData.createdAt : new Date(clientData.createdAt || new Date()),
        });
        setIsTempPasswordOpen(true);
      }

      toast({
        message: 'Client updated successfully',
        type: 'success',
      });
      setIsFormOpen(false);
      setIsViewOpen(false);
      setSelectedClient(null);
      setBackendErrors([]);
      refetch();
    },
    onError: (error) => {
      const fieldErrors = (error.data as { fieldErrors?: Array<{ field: string; message: string }> })?.fieldErrors || [];

      if (fieldErrors.length > 0) {
        setBackendErrors(fieldErrors);
        toast({
          message: 'Please check the form for errors',
          type: 'error',
        });
      } else {
        setBackendErrors([]);
        toast({
          message: error.message,
          type: 'error',
        });
      }
    },
  });

  const deleteMutation = trpc.client.delete.useMutation({
    onSuccess: () => {
      toast({
        message: 'Client deleted successfully',
        type: 'success',
      });
      setIsDeleteOpen(false);
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
    setIsFormOpen(true);
  };

  const handleView = (clientId: string) => {
    const client = data?.data.find((c) => c.id === clientId);
    if (client) {
      setSelectedClient({
        ...client,
        createdAt: new Date(client.createdAt || new Date()),
      });
      setIsViewOpen(true);
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
      setIsFormOpen(true);
    }
  };

  const handleDelete = (clientId: string) => {
    const client = data?.data.find((c) => c.id === clientId);
    if (client) {
      setSelectedClient(client);
      setIsDeleteOpen(true);
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
    setPage(newPage);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  };

  const handleSearchChange = (newSearch: string) => {
    setSearch(newSearch);
    setPage(1);
  };

  const handleLoginAccessChange = (access: 'all' | 'with' | 'without') => {
    setSelectedLoginAccess(access);
    setPage(1);
  };

  const handleSortByChange = (field: string) => {
    setSortBy(field as 'clientId' | 'businessName' | 'createdAt');
  };

  const handleSortOrderChange = (order: 'asc' | 'desc') => {
    setSortOrder(order);
  };

  const handleSort = (field: string) => {
    const validField = field as 'clientId' | 'businessName' | 'createdAt';
    if (sortBy === validField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(validField);
      setSortOrder('desc');
    }
  };

  const handleClearFilters = () => {
    setSelectedLoginAccess('all');
    setSearch('');
    setPage(1);
  };

  const totalPages = data ? Math.ceil(data.meta.total / limit) : 0;

  // Build active filters array
  const activeFilters: Array<{ key: string; label: string; value: string; onRemove: () => void }> = [];

  if (search) {
    activeFilters.push({
      key: 'search',
      label: 'Search',
      value: search,
      onRemove: () => setSearch(''),
    });
  }

  if (selectedLoginAccess !== 'all') {
    activeFilters.push({
      key: 'loginAccess',
      label: 'Login Access',
      value: selectedLoginAccess === 'with' ? 'Portal Access' : 'No Access',
      onRemove: () => setSelectedLoginAccess('all'),
    });
  }

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();

    if (page > 1) params.set('page', page.toString());
    if (limit !== 10) params.set('limit', limit.toString());
    if (search) params.set('search', search);
    if (selectedLoginAccess !== 'all') params.set('loginAccess', selectedLoginAccess);
    if (sortBy !== 'createdAt') params.set('sortBy', sortBy);
    if (sortOrder !== 'desc') params.set('sortOrder', sortOrder);

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

    router.replace(newUrl, { scroll: false });
  }, [
    page,
    limit,
    search,
    selectedLoginAccess,
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
            loginAccess={selectedLoginAccess}
            onLoginAccessChange={handleLoginAccessChange}
            sortBy={sortBy}
            onSortByChange={handleSortByChange}
            sortOrder={sortOrder}
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
            sortBy={sortBy}
            sortOrder={sortOrder}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
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
      <ClientFormModal
        client={selectedClient}
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedClient(null);
          setBackendErrors([]);
        }}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        backendErrors={backendErrors}
      />

      <ViewClientDialog
        client={selectedClient}
        open={isViewOpen}
        onClose={() => {
          setIsViewOpen(false);
          setSelectedClient(null);
        }}
        onEdit={() => {
          setIsViewOpen(false);
          setBackendErrors([]);
          setIsFormOpen(true);
        }}
      />

      <DeleteClientDialog
        client={selectedClient}
        open={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setSelectedClient(null);
        }}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteMutation.isPending}
      />

      <TemporaryPasswordDialog
        tempPassword={tempPassword}
        clientName={selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : ''}
        clientEmail={selectedClient?.email || ''}
        open={isTempPasswordOpen}
        onClose={() => {
          setIsTempPasswordOpen(false);
          setTempPassword(null);
          setSelectedClient(null);
        }}
      />
    </div>
  );
}
