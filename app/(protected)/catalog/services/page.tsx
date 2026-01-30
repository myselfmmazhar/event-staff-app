'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusIcon } from '@/components/ui/icons';
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
import { ViewServiceModal } from '@/components/catalog/services/view-service-modal';
import { useServicesFilters, type ServiceStatus, type ServiceSortBy, type SortOrder } from '@/store/services-filters.store';
import type { Service } from '@/lib/types/service';
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
  const { backendErrors, setBackendErrors, createMutationOptions, updateMutationOptions, deleteMutationOptions } =
    useCrudMutations();

  const [modals, setModals] = useState({
    form: false,
    view: false,
    delete: false,
  });

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleCreate = () => {
    setSelectedService(null);
    setBackendErrors([]);
    setModals((prev) => ({ ...prev, form: true }));
  };

  useEffect(() => {
    const page = parseNumberParam(searchParams.get('page'), 1);
    const limit = parseNumberParam(searchParams.get('limit'), 10);
    const search = searchParams.get('search') || '';
    const statuses = parseStatusesParam(searchParams.get('statuses'));
    const sortBy = parseSortByParam(searchParams.get('sortBy'));
    const sortOrder = parseSortOrderParam(searchParams.get('sortOrder'));

    filters.setPage(page);
    filters.setLimit(limit);
    filters.setSearch(search);
    filters.setStatuses(statuses);
    filters.setSortBy(sortBy);
    filters.setSortOrder(sortOrder);
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
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  });

  const services = (data?.data ?? []) as Service[];
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
        setModals((prev) => ({ ...prev, form: false, view: false }));
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

  const toggleActiveMutation = trpc.service.toggleActive.useMutation({
    ...updateMutationOptions('Service status updated', {
      onSuccess: () => refetch(),
    }),
  });

  const getServiceById = (id: string): Service | undefined =>
    services.find((service) => service.id === id);

  const clearSelection = () => setSelectedIds(new Set());

  const handleView = (id: string) => {
    const service = getServiceById(id);
    if (service) {
      setSelectedService(service);
      setModals((prev) => ({ ...prev, view: true }));
    }
  };

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Services</h1>
          <p className="text-muted-foreground mt-1">Manage your service catalog.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleCreate}>
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Service
          </Button>
        </div>
      </div>

      <Card className="p-6 overflow-visible relative z-20">
        <div className="space-y-4">
          <ServiceSearch value={filters.search} onChange={filters.setSearch} />
          <ServiceFilters />

          <ActiveFilters filters={activeFilters} />
        </div>
      </Card>

      {/* Selection Info */}
      {selectedIds.size > 0 && (
        <Card className="p-3 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">
              {selectedIds.size} service{selectedIds.size !== 1 ? 's' : ''} selected
            </span>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Clear selection
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="relative z-10">
          <ServiceTable
            services={services}
            isLoading={isLoading}
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder}
            onView={handleView}
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

      <ViewServiceModal
        service={selectedService}
        open={modals.view}
        onClose={() => {
          setModals((prev) => ({ ...prev, view: false }));
          setSelectedService(null);
        }}
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
    </div>
  );
}
