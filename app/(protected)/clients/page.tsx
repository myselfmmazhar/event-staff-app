'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlusIcon, UploadIcon, TrashIcon } from '@/components/ui/icons';
import { ConfirmModal } from '@/components/common/confirm-modal';
import { ClientFormModal, type CreateClientInputWithLocations } from '@/components/clients/client-form-modal';
import { ClientTable } from '@/components/clients/client-table';
import { ClientSearch } from '@/components/clients/client-search';
import { ClientFilters } from '@/components/clients/client-filters';
import { ViewClientModal } from '@/components/clients/view-client-modal';
import { DeleteClientModal } from '@/components/clients/delete-client-modal';
import { TemporaryPasswordModal } from '@/components/clients/temporary-password-modal';
import { ClientExportDropdown } from '@/components/clients/client-export-dropdown';
import { ClientImportModal } from '@/components/clients/client-import-modal';
import { Pagination } from '@/components/common/pagination';
import { ActiveFilters } from '@/components/common/active-filters';
import { PageLabelsModal } from '@/components/common/page-labels-modal';
import { trpc } from '@/lib/client/trpc';
import type { Client } from '@/lib/types/client';
import type { CreateClientInput, UpdateClientInput } from '@/lib/schemas/client.schema';
import { handleClientMutationError } from '@/lib/utils/client-error-handler';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, useMemo, type ComponentProps } from 'react';
import { useClientsFilters, type ClientLoginAccess, type ClientSortBy, type SortOrder } from '@/store/clients-filters.store';
import { useUrlSync } from '@/lib/hooks/useUrlSync';
import { useCrudMutations } from '@/lib/hooks/useCrudMutations';
import { useClientsPageLabels } from '@/lib/hooks/use-labels';
import type { ClientExport } from '@/lib/utils/client-export';

type ClientTableData = ComponentProps<typeof ClientTable>['clients'][number];

function parseNumberParam(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseLoginAccessParam(value: string | null): ClientLoginAccess {
  if (value === 'with' || value === 'without') {
    return value;
  }
  return 'all';
}

const CLIENT_SORT_FIELDS: ClientSortBy[] = ['clientId', 'businessName', 'createdAt'];
const CLIENT_SORT_FIELD_SET = new Set<ClientSortBy>(CLIENT_SORT_FIELDS);

function parseSortByParam(value: string | null): ClientSortBy {
  if (value && CLIENT_SORT_FIELD_SET.has(value as ClientSortBy)) {
    return value as ClientSortBy;
  }
  return 'createdAt';
}

function parseSortOrderParam(value: string | null): SortOrder {
  return value === 'asc' ? 'asc' : 'desc';
}

export default function ClientsPage() {
  const searchParams = useSearchParams();

  // Use filters store
  const filters = useClientsFilters();

  // Use CRUD mutations hook
  const { backendErrors, setBackendErrors, createMutationOptions, updateMutationOptions, deleteMutationOptions, handleSuccess, handleError } = useCrudMutations();

  // Modal state
  const [modals, setModals] = useState({
    form: false,
    view: false,
    delete: false,
    tempPassword: false,
  });

  // Import modal state
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Bulk delete modal state
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // Row selection for export
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Client and form state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  // Rehydrate filters from localStorage on mount, then apply URL params if present
  useEffect(() => {
    useClientsFilters.persist.rehydrate();

    // Only override with URL params if they are explicitly set
    if (searchParams.has('page')) filters.setPage(parseNumberParam(searchParams.get('page'), 1));
    if (searchParams.has('limit')) filters.setLimit(parseNumberParam(searchParams.get('limit'), 10));
    if (searchParams.has('search')) filters.setSearch(searchParams.get('search') || '');
    if (searchParams.has('loginAccess')) filters.setLoginAccess(parseLoginAccessParam(searchParams.get('loginAccess')));
    if (searchParams.has('createdFrom')) filters.setCreatedFrom(searchParams.get('createdFrom') || '');
    if (searchParams.has('createdTo')) filters.setCreatedTo(searchParams.get('createdTo') || '');
    if (searchParams.has('sortBy')) filters.setSortBy(parseSortByParam(searchParams.get('sortBy')));
    if (searchParams.has('sortOrder')) filters.setSortOrder(parseSortOrderParam(searchParams.get('sortOrder')));
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
    createdFrom: filters.createdFrom ? new Date(filters.createdFrom) : undefined,
    createdTo: filters.createdTo ? new Date(filters.createdTo) : undefined,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  });
  const clients = data?.data ?? [];

  // Fetch all clients for export (no pagination)
  const { data: allClientsData, refetch: refetchExport } = trpc.clients.getAllForExport.useQuery();
  const allClients = allClientsData ?? [];

  const selectedClients = useMemo(() => {
    return allClients.filter((c) => selectedIds.has(c.id)) as ClientExport[];
  }, [allClients, selectedIds]);

  const clearSelection = () => setSelectedIds(new Set());

  // Get selected clients for bulk delete modal display
  const selectedClientsList = clients.filter((c) => selectedIds.has(c.id));

  // tRPC mutations with standardized error handling
  const createMutation = trpc.clients.create.useMutation({
    ...createMutationOptions('Client created successfully', {}),
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
        refetchExport();
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
        refetchExport();
      },
    })
  );

  // Delete many mutation
  const deleteManyMutation = trpc.clients.deleteMany.useMutation({
    onSuccess: (result) => {
      const message = result.count === 1
        ? 'Client deleted successfully'
        : `${result.count} clients deleted successfully`;
      handleSuccess(message);
      setIsBulkDeleteOpen(false);
      clearSelection();
      refetch();
      refetchExport();
    },
    onError: handleError,
  });

  // Mutation for creating locations after client creation
  const createLocationMutation = trpc.clientLocation.create.useMutation();

  // Handlers
  const handleCreate = () => {
    setSelectedClient(null);
    setBackendErrors([]);
    setModals((prev) => ({ ...prev, form: true }));
  };

  const getClientById = (clientId: string): Client | undefined =>
    clients.find((client) => client.id === clientId);

  const handleEdit = (clientId: string) => {
    const client = getClientById(clientId);
    if (client) {
      setSelectedClient(client);
      setBackendErrors([]);
      setModals((prev) => ({ ...prev, form: true }));
    }
  };

  const handleDelete = (clientId: string) => {
    const client = getClientById(clientId);
    if (client) {
      setSelectedClient(client);
      setModals((prev) => ({ ...prev, delete: true }));
    }
  };

  const handleViewFromEdit = () => {
    setModals((prev) => ({ ...prev, form: false, view: true }));
  };

  const handleFormSubmit = async (formData: CreateClientInputWithLocations | Omit<UpdateClientInput, 'id'>) => {
    if (selectedClient) {
      // Update existing client
      updateMutation.mutate({
        id: selectedClient.id,
        ...formData,
      });
    } else {
      // Create new client
      const { pendingLocations, ...clientData } = formData as CreateClientInputWithLocations;

      createMutation.mutate(clientData as CreateClientInput, {
        onSuccess: async (response: any) => {
          // Create locations if any pending
          if (pendingLocations && pendingLocations.length > 0) {
            const newClientId = response.client?.id || response.id;
            if (newClientId) {
              // Create all pending locations
              await Promise.all(
                pendingLocations.map((location) =>
                  createLocationMutation.mutateAsync({
                    clientId: newClientId,
                    venueName: location.venueName,
                    meetingPoint: location.meetingPoint,
                    venueAddress: location.venueAddress,
                    city: location.city,
                    state: location.state,
                    zipCode: location.zipCode,
                  })
                )
              );
            }
          }
          setModals((prev) => ({ ...prev, form: false }));
          refetch();
          refetchExport();
        },
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedClient) {
      deleteMutation.mutate({ id: selectedClient.id });
    }
  };

  const handleBulkDelete = () => {
    setIsBulkDeleteOpen(true);
  };

  const handleBulkDeleteConfirm = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    deleteManyMutation.mutate({ ids });
  };

  const handleSort = (field: string) => {
    const sortField = parseSortByParam(field);
    if (filters.sortBy === sortField) {
      filters.setSortOrder(filters.sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      filters.setSortBy(sortField);
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

  if (filters.createdFrom) {
    activeFilters.push({
      key: 'createdFrom',
      label: 'From',
      value: filters.createdFrom,
      onRemove: () => filters.setCreatedFrom(''),
    });
  }

  if (filters.createdTo) {
    activeFilters.push({
      key: 'createdTo',
      label: 'To',
      value: filters.createdTo,
      onRemove: () => filters.setCreatedTo(''),
    });
  }

  // Get page labels from context
  const clientsLabels = useClientsPageLabels();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{clientsLabels.pageTitle}</h1>
          <p className="text-muted-foreground mt-1">
            {clientsLabels.pageSubtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PageLabelsModal
            page="clients"
            sections={[
              {
                id: 'page',
                title: 'Page Labels',
                description: 'Customize heading and button text',
                prefix: 'page',
                labels: [
                  { key: 'pageTitle', label: 'Page Title', defaultLabel: 'Clients' },
                  { key: 'pageSubtitle', label: 'Page Subtitle', defaultLabel: 'Manage clients and their portal access' },
                  { key: 'addButton', label: 'Add Button', defaultLabel: 'Create Client' },
                  { key: 'searchPlaceholder', label: 'Search Placeholder', defaultLabel: 'Search by business name, contact, or email...' },
                ],
              },
              {
                id: 'filters',
                title: 'Filter Labels',
                description: 'Customize filter names',
                prefix: 'filters',
                labels: [
                  { key: 'title', label: 'Filters Heading', defaultLabel: 'Filters' },
                  { key: 'loginAccess', label: 'Portal Access', defaultLabel: 'Portal Access' },
                ],
              },
              {
                id: 'columns',
                title: 'Table Columns',
                description: 'Customize table column headers',
                prefix: 'columns',
                labels: [
                  { key: 'clientId', label: 'Client ID', defaultLabel: 'Client ID' },
                  { key: 'businessName', label: 'Business Name', defaultLabel: 'Business Name' },
                  { key: 'contact', label: 'Contact Person', defaultLabel: 'Contact Person' },
                  { key: 'email', label: 'Email', defaultLabel: 'Email' },
                  { key: 'phone', label: 'Cell Phone', defaultLabel: 'Cell Phone' },
                  { key: 'location', label: 'Location', defaultLabel: 'Location' },
                  { key: 'access', label: 'Access', defaultLabel: 'Access' },
                  { key: 'actions', label: 'Actions', defaultLabel: 'Actions' },
                ],
              },
            ]}
            buttonVariant="outline"
            buttonSize="md"
          />
          <ClientExportDropdown
            clients={allClients as ClientExport[]}
            selectedClients={selectedClients}
            selectedCount={selectedIds.size}
          />
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <UploadIcon className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button onClick={handleCreate}>
            <PlusIcon className="h-5 w-5 mr-2" />
            {clientsLabels.addButton}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="relative z-10 space-y-4">
          <ClientSearch
            value={filters.search}
            onChange={filters.setSearch}
            placeholder={clientsLabels.searchPlaceholder}
          />
          <ClientFilters />
          <ActiveFilters filters={activeFilters} />
        </div>
      </Card>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-20 bg-muted/95 backdrop-blur-sm border-b border-border p-4 mb-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Badge variant="primary" size="lg">
                {selectedIds.size} client{selectedIds.size !== 1 ? 's' : ''} selected
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={clearSelection}>
                Clear Selection
              </Button>
              <Button variant="danger" onClick={handleBulkDelete} disabled={deleteManyMutation.isPending}>
                <TrashIcon className="h-4 w-4 mr-2" />
                {deleteManyMutation.isPending ? 'Deleting...' : 'Delete Selected'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <Card className="p-6">
        <div className="relative z-10">
          <ClientTable
            clients={data?.data || []}
            isLoading={isLoading}
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder}
            onEdit={handleEdit}
            onDelete={handleDelete}
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
        onLocationsChange={() => refetch()}
        onViewDetails={handleViewFromEdit}
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

      <ClientImportModal
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={() => {
          setIsImportOpen(false);
          refetch();
          refetchExport();
        }}
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmModal
        open={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        onConfirm={handleBulkDeleteConfirm}
        title="Delete Selected Clients"
        description={`Are you sure you want to delete ${selectedIds.size} client${selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone.`}
        confirmText={deleteManyMutation.isPending ? 'Deleting...' : 'Delete'}
        variant="danger"
        isLoading={deleteManyMutation.isPending}
      >
        {selectedClientsList.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-3 bg-muted/50 rounded-md border border-border">
              {selectedClientsList.map((client) => (
                <Badge key={client.id} variant="secondary" size="sm">
                  {`${client.firstName} ${client.lastName}`.trim() || client.email}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </ConfirmModal>
    </div>
  );
}
