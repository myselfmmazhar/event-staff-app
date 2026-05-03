'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusIcon, TrashIcon } from '@/components/ui/icons';
import { ConfirmModal } from '@/components/common/confirm-modal';
import { Pagination } from '@/components/common/pagination';
import { ActiveFilters } from '@/components/common/active-filters';
import { trpc } from '@/lib/client/trpc';
import { useUrlSync } from '@/lib/hooks/useUrlSync';
import { useCrudMutations } from '@/lib/hooks/useCrudMutations';
import { ServiceSearch } from '@/components/catalog/services/service-search';
import { ServiceFilters } from '@/components/catalog/services/service-filters';
import { ServiceTable } from '@/components/catalog/services/service-table';
import { ServiceFormModal } from '@/components/catalog/services/service-form-modal';
import { DeleteServiceModal } from '@/components/catalog/services/delete-service-modal';
import { useServicesFilters, type ServiceStatus, type ServiceSortBy, type SortOrder } from '@/store/services-filters.store';
import type { Service, ServiceTableRow } from '@/lib/types/service';
import type { CreateServiceInput } from '@/lib/schemas/service.schema';

const STATUS_LABELS: Record<ServiceStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
};

function parseNumberParam(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseStatusesParam(value: string | null): ServiceStatus[] {
  if (!value) return [];
  const statuses = value.split(',').filter((s): s is ServiceStatus =>
    s === 'active' || s === 'inactive'
  );
  return statuses;
}

const SERVICE_SORT_FIELDS: ServiceSortBy[] = ['title', 'cost', 'createdAt'];
const SERVICE_SORT_FIELD_SET = new Set<ServiceSortBy>(SERVICE_SORT_FIELDS);

function parseSortByParam(value: string | null): ServiceSortBy {
  if (value && SERVICE_SORT_FIELD_SET.has(value as ServiceSortBy)) {
    return value as ServiceSortBy;
  }
  return 'title';
}

function parseSortOrderParam(value: string | null): SortOrder {
  return value === 'desc' ? 'desc' : 'asc';
}

export default function ServicesPage() {
  const searchParams = useSearchParams();
  const filters = useServicesFilters();
  const { backendErrors, setBackendErrors, createMutationOptions, updateMutationOptions, deleteMutationOptions, handleSuccess, handleError } =
    useCrudMutations();

  const [modals, setModals] = useState({
    form: false,
    delete: false,
  });

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  const handleCreate = () => {
    setSelectedService(null);
    setBackendErrors([]);
    setModals((prev) => ({ ...prev, form: true }));
  };

  // Rehydrate filters from localStorage on mount, then apply URL params if present
  useEffect(() => {
    useServicesFilters.persist.rehydrate();

    // Only override with URL params if they are explicitly set
    if (searchParams.has('page')) filters.setPage(parseNumberParam(searchParams.get('page'), 1));
    if (searchParams.has('limit')) filters.setLimit(parseNumberParam(searchParams.get('limit'), 10));
    if (searchParams.has('search')) filters.setSearch(searchParams.get('search') || '');
    if (searchParams.has('statuses')) filters.setStatuses(parseStatusesParam(searchParams.get('statuses')));
    if (searchParams.has('sortBy')) filters.setSortBy(parseSortByParam(searchParams.get('sortBy')));
    if (searchParams.has('sortOrder')) filters.setSortOrder(parseSortOrderParam(searchParams.get('sortOrder')));
  }, []); // only on mount

  useEffect(() => {
    const createParam = searchParams.get('create');
    if (createParam === 'true') {
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.delete('create');
      const newUrl = urlParams.toString()
        ? `${window.location.pathname}?${urlParams.toString()}`
        : window.location.pathname;

      window.history.replaceState({}, '', newUrl);

      const frame = window.requestAnimationFrame(() => handleCreate());
      return () => window.cancelAnimationFrame(frame);
    }
    return undefined;
  }, [searchParams]);

  useUrlSync(filters, {
    keys: ['page', 'limit', 'search', 'statuses', 'sortBy', 'sortOrder'],
  });

  // Convert statuses array to isActive filter for API
  const getIsActiveFilter = (): boolean | undefined => {
    if (filters.statuses.length === 0) return undefined;
    if (filters.statuses.length === 2) return undefined; // Both selected = all
    if (filters.statuses.includes('active')) return true;
    if (filters.statuses.includes('inactive')) return false;
    return undefined;
  };

  const { data, isLoading, refetch } = trpc.service.getAll.useQuery({
    page: filters.page,
    limit: filters.limit,
    search: filters.search || undefined,
    isActive: getIsActiveFilter(),
    createdFrom: filters.createdFrom ? new Date(filters.createdFrom) : undefined,
    createdTo: filters.createdTo ? new Date(filters.createdTo) : undefined,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  });

  const services = ((data?.data ?? []) as unknown[]).map((service) => service as Service);
  const serviceRows: ServiceTableRow[] = services.map((service: Service) => ({
    id: service.id,
    serviceId: service.serviceId,
    title: service.title,
    costUnitType: service.costUnitType,
    cost: service.cost,
    price: service.price,
    minimum: service.minimum ?? null,
    expenditure: service.expenditure ?? false,
    expenditureAmount: service.expenditureAmount ?? null,
    expenditureAmountType: service.expenditureAmountType ?? null,
    isActive: service.isActive,
    createdAt: service.createdAt,
    category: service.category ?? null,
  }));

  // Get selected services for bulk delete modal display
  const selectedServicesList = services.filter((s) => selectedIds.has(s.id));
  const totalPages = data?.meta.totalPages ?? 0;

  const createMutation = trpc.service.create.useMutation(
    createMutationOptions('Service created successfully', {
      onSuccess: () => {
        setModals((prev) => ({ ...prev, form: false }));
        setSelectedService(null);
        refetch();
      },
    })
  );

  const updateMutation = trpc.service.update.useMutation(
    updateMutationOptions('Service updated successfully', {
      onSuccess: () => {
        setModals((prev) => ({ ...prev, form: false }));
        setSelectedService(null);
        refetch();
      },
    })
  );

  const deleteMutation = trpc.service.delete.useMutation(
    deleteMutationOptions('Service deleted successfully', {
      onSuccess: () => {
        setModals((prev) => ({ ...prev, delete: false }));
        setSelectedService(null);
        refetch();
      },
    })
  );

  // Delete many mutation
  const deleteManyMutation = trpc.service.deleteMany.useMutation({
    onSuccess: (result) => {
      const message = result.count === 1
        ? 'Service deleted successfully'
        : `${result.count} services deleted successfully`;
      handleSuccess(message);
      setIsBulkDeleteOpen(false);
      clearSelection();
      refetch();
    },
    onError: handleError,
  });

  const toggleActiveMutation = trpc.service.toggleActive.useMutation({
    ...updateMutationOptions('Service status updated', {
      onSuccess: () => refetch(),
    }),
  });

  const getServiceById = (id: string): Service | undefined =>
    services.find((service) => service.id === id);

  const clearSelection = () => setSelectedIds(new Set());

  const handleEdit = (id: string) => {
    const service = getServiceById(id);
    if (service) {
      setSelectedService(service);
      setBackendErrors([]);
      setModals((prev) => ({ ...prev, form: true }));
    }
  };

  const handleDelete = (id: string) => {
    const service = getServiceById(id);
    if (service) {
      setSelectedService(service);
      setModals((prev) => ({ ...prev, delete: true }));
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedService) {
      deleteMutation.mutate({ id: selectedService.id });
    }
  };

  const handleToggleActive = (id: string, isActive: boolean) => {
    toggleActiveMutation.mutate({ id, isActive });
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
      filters.setSortOrder('asc');
    }
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

  if (filters.statuses.length > 0) {
    const statusLabels = filters.statuses.map((s) => STATUS_LABELS[s]).join(', ');
    activeFilters.push({
      key: 'statuses',
      label: 'Status',
      value: statusLabels,
      onRemove: () => filters.setStatuses([]),
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button onClick={handleCreate} size="lg" className="rounded-xl shadow-lg shadow-primary/10">
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Service
        </Button>
      </div>

      <Card className="p-6 overflow-visible relative z-20">
        <div className="space-y-4">
          <ServiceSearch value={filters.search} onChange={filters.setSearch} />
          <ServiceFilters />

          <ActiveFilters filters={activeFilters} />
        </div>
      </Card>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-20 bg-muted/95 backdrop-blur-sm border-b border-border p-4 mb-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Badge variant="primary" size="lg">
                {selectedIds.size} service{selectedIds.size !== 1 ? 's' : ''} selected
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

      <Card className="p-6">
        <div className="relative z-10">
          <ServiceTable
            services={serviceRows}
            isLoading={isLoading}
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
            onSort={handleSort}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />

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

      <ServiceFormModal
        service={selectedService}
        open={modals.form}
        onClose={() => {
          setModals((prev) => ({ ...prev, form: false }));
          setSelectedService(null);
          setBackendErrors([]);
        }}
        onSubmit={(formData: CreateServiceInput) => {
          if (selectedService) {
            updateMutation.mutate({ id: selectedService.id, ...formData });
          } else {
            createMutation.mutate(formData);
          }
        }}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        backendErrors={backendErrors}
      />

      <DeleteServiceModal
        service={
          selectedService
            ? { title: selectedService.title, serviceId: selectedService.serviceId }
            : null
        }
        open={modals.delete}
        onClose={() => {
          setModals((prev) => ({ ...prev, delete: false }));
          setSelectedService(null);
        }}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteMutation.isPending}
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmModal
        open={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        onConfirm={handleBulkDeleteConfirm}
        title="Delete Selected Services"
        description={`Are you sure you want to delete ${selectedIds.size} service${selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone.`}
        confirmText={deleteManyMutation.isPending ? 'Deleting...' : 'Delete'}
        variant="danger"
        isLoading={deleteManyMutation.isPending}
      >
        {selectedServicesList.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-3 bg-muted/50 rounded-md border border-border">
              {selectedServicesList.map((service) => (
                <Badge key={service.id} variant="secondary" size="sm">
                  {service.title}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </ConfirmModal>
    </div>
  );
}
