'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { ServiceTable } from '@/components/catalog/services/service-table';
import { ServiceFormModal } from '@/components/catalog/services/service-form-modal';
import { DeleteServiceModal } from '@/components/catalog/services/delete-service-modal';
import { ViewServiceModal } from '@/components/catalog/services/view-service-modal';
import { useServicesFilters, type ServiceActiveFilter, type ServiceSortBy, type SortOrder } from '@/store/services-filters.store';
import type { Service } from '@/lib/types/service';
import type { CreateServiceInput } from '@/lib/schemas/service.schema';

function parseNumberParam(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseActiveParam(value: string | null): ServiceActiveFilter {
  if (value === 'active' || value === 'inactive') return value;
  return 'all';
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

  const handleCreate = () => {
    setSelectedService(null);
    setBackendErrors([]);
    setModals((prev) => ({ ...prev, form: true }));
  };

  useEffect(() => {
    const page = parseNumberParam(searchParams.get('page'), 1);
    const limit = parseNumberParam(searchParams.get('limit'), 10);
    const search = searchParams.get('search') || '';
    const active = parseActiveParam(searchParams.get('active'));
    const sortBy = parseSortByParam(searchParams.get('sortBy'));
    const sortOrder = parseSortOrderParam(searchParams.get('sortOrder'));

    filters.setPage(page);
    filters.setLimit(limit);
    filters.setSearch(search);
    filters.setActive(active);
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
    keys: ['page', 'limit', 'search', 'active', 'sortBy', 'sortOrder'],
  });

  const activeFilterValue = useMemo(() => {
    if (filters.active === 'active') return true;
    if (filters.active === 'inactive') return false;
    return undefined;
  }, [filters.active]);

  const { data, isLoading, refetch } = trpc.service.getAll.useQuery({
    page: filters.page,
    limit: filters.limit,
    search: filters.search || undefined,
    isActive: activeFilterValue,
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

  if (filters.active !== 'all') {
    activeFilters.push({
      key: 'active',
      label: 'Status',
      value: filters.active === 'active' ? 'Active' : 'Inactive',
      onRemove: () => filters.setActive('all'),
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

      <Card className="p-6">
        <div className="relative z-10 space-y-4">
          <ServiceSearch value={filters.search} onChange={filters.setSearch} />

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Status</label>
              <select
                value={filters.active}
                onChange={(e) => filters.setActive(e.target.value as ServiceActiveFilter)}
                className="rounded-lg border-2 border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <ActiveFilters filters={activeFilters} />
        </div>
      </Card>

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
