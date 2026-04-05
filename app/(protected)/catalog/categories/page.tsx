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
import { CategorySearch } from '@/components/catalog/categories/category-search';
import { CategoryFilters } from '@/components/catalog/categories/category-filters';
import { CategoryTable } from '@/components/catalog/categories/category-table';
import { CategoryFormModal } from '@/components/catalog/categories/category-form-modal';
import { DeleteCategoryModal } from '@/components/catalog/categories/delete-category-modal';
import { useCategoriesFilters, type CategoryStatus, type CategorySortBy, type SortOrder } from '@/store/categories-filters.store';
import type { Category, CategoryTableRow } from '@/lib/types/category';
import type { CreateCategoryInput } from '@/lib/schemas/category.schema';

const STATUS_LABELS: Record<CategoryStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
};

function parseNumberParam(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseStatusesParam(value: string | null): CategoryStatus[] {
  if (!value) return [];
  const statuses = value.split(',').filter((s): s is CategoryStatus =>
    s === 'active' || s === 'inactive'
  );
  return statuses;
}

const CATEGORY_SORT_FIELDS: CategorySortBy[] = ['name', 'createdAt'];
const CATEGORY_SORT_FIELD_SET = new Set<CategorySortBy>(CATEGORY_SORT_FIELDS);

function parseSortByParam(value: string | null): CategorySortBy {
  if (value && CATEGORY_SORT_FIELD_SET.has(value as CategorySortBy)) {
    return value as CategorySortBy;
  }
  return 'name';
}

function parseSortOrderParam(value: string | null): SortOrder {
  return value === 'desc' ? 'desc' : 'asc';
}

export default function CategoriesPage() {
  const searchParams = useSearchParams();
  const filters = useCategoriesFilters();
  const { backendErrors, setBackendErrors, createMutationOptions, updateMutationOptions, deleteMutationOptions, handleSuccess, handleError } =
    useCrudMutations();

  const [modals, setModals] = useState({
    form: false,
    delete: false,
  });

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  const handleCreate = () => {
    setSelectedCategory(null);
    setBackendErrors([]);
    setModals((prev) => ({ ...prev, form: true }));
  };

  useEffect(() => {
    useCategoriesFilters.persist.rehydrate();

    if (searchParams.has('page')) filters.setPage(parseNumberParam(searchParams.get('page'), 1));
    if (searchParams.has('limit')) filters.setLimit(parseNumberParam(searchParams.get('limit'), 10));
    if (searchParams.has('search')) filters.setSearch(searchParams.get('search') || '');
    if (searchParams.has('statuses')) filters.setStatuses(parseStatusesParam(searchParams.get('statuses')));
    if (searchParams.has('sortBy')) filters.setSortBy(parseSortByParam(searchParams.get('sortBy')));
    if (searchParams.has('sortOrder')) filters.setSortOrder(parseSortOrderParam(searchParams.get('sortOrder')));
  }, []);

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

  const getIsActiveFilter = (): boolean | undefined => {
    if (filters.statuses.length === 0) return undefined;
    if (filters.statuses.length === 2) return undefined;
    if (filters.statuses.includes('active')) return true;
    if (filters.statuses.includes('inactive')) return false;
    return undefined;
  };

  const { data, isLoading, refetch } = trpc.category.getAll.useQuery({
    page: filters.page,
    limit: filters.limit,
    search: filters.search || undefined,
    isActive: getIsActiveFilter(),
    createdFrom: filters.createdFrom ? new Date(filters.createdFrom) : undefined,
    createdTo: filters.createdTo ? new Date(filters.createdTo) : undefined,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  });

  const categories = ((data?.data ?? []) as unknown[]).map((c) => c as Category);
  const categoryRows: CategoryTableRow[] = categories.map((category: Category) => ({
    id: category.id,
    categoryId: category.categoryId,
    name: category.name,
    description: category.description ?? null,
    isActive: category.isActive,
    createdAt: category.createdAt,
  }));

  const selectedCategoriesList = categories.filter((c) => selectedIds.has(c.id));
  const totalPages = data?.meta.totalPages ?? 0;

  const createMutation = trpc.category.create.useMutation(
    createMutationOptions('Category created successfully', {
      onSuccess: () => {
        setModals((prev) => ({ ...prev, form: false }));
        setSelectedCategory(null);
        refetch();
      },
    })
  );

  const updateMutation = trpc.category.update.useMutation(
    updateMutationOptions('Category updated successfully', {
      onSuccess: () => {
        setModals((prev) => ({ ...prev, form: false }));
        setSelectedCategory(null);
        refetch();
      },
    })
  );

  const deleteMutation = trpc.category.delete.useMutation(
    deleteMutationOptions('Category deleted successfully', {
      onSuccess: () => {
        setModals((prev) => ({ ...prev, delete: false }));
        setSelectedCategory(null);
        refetch();
      },
    })
  );

  const deleteManyMutation = trpc.category.deleteMany.useMutation({
    onSuccess: (result) => {
      const message = result.count === 1
        ? 'Category deleted successfully'
        : `${result.count} categories deleted successfully`;
      handleSuccess(message);
      setIsBulkDeleteOpen(false);
      clearSelection();
      refetch();
    },
    onError: handleError,
  });

  const toggleActiveMutation = trpc.category.toggleActive.useMutation({
    ...updateMutationOptions('Category status updated', {
      onSuccess: () => refetch(),
    }),
  });

  const getCategoryById = (id: string): Category | undefined =>
    categories.find((c) => c.id === id);

  const clearSelection = () => setSelectedIds(new Set());

  const handleEdit = (id: string) => {
    const category = getCategoryById(id);
    if (category) {
      setSelectedCategory(category);
      setBackendErrors([]);
      setModals((prev) => ({ ...prev, form: true }));
    }
  };

  const handleDelete = (id: string) => {
    const category = getCategoryById(id);
    if (category) {
      setSelectedCategory(category);
      setModals((prev) => ({ ...prev, delete: true }));
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedCategory) {
      deleteMutation.mutate({ id: selectedCategory.id });
    }
  };

  const handleToggleActive = (id: string, isActive: boolean) => {
    toggleActiveMutation.mutate({ id, isActive });
  };

  const handleBulkDelete = () => setIsBulkDeleteOpen(true);

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
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Categories</h1>
          <p className="text-muted-foreground mt-1">Manage your service categories.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleCreate}>
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Category
          </Button>
        </div>
      </div>

      <Card className="p-6 overflow-visible relative z-20">
        <div className="space-y-4">
          <CategorySearch value={filters.search} onChange={filters.setSearch} />
          <CategoryFilters />
          <ActiveFilters filters={activeFilters} />
        </div>
      </Card>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-20 bg-muted/95 backdrop-blur-sm border-b border-border p-4 mb-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Badge variant="primary" size="lg">
                {selectedIds.size} categor{selectedIds.size !== 1 ? 'ies' : 'y'} selected
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
          <CategoryTable
            categories={categoryRows}
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

      <CategoryFormModal
        category={selectedCategory}
        open={modals.form}
        onClose={() => {
          setModals((prev) => ({ ...prev, form: false }));
          setSelectedCategory(null);
          setBackendErrors([]);
        }}
        onSubmit={(formData: CreateCategoryInput) => {
          if (selectedCategory) {
            updateMutation.mutate({ id: selectedCategory.id, ...formData });
          } else {
            createMutation.mutate(formData);
          }
        }}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        backendErrors={backendErrors}
      />

      <DeleteCategoryModal
        category={
          selectedCategory
            ? { name: selectedCategory.name, categoryId: selectedCategory.categoryId }
            : null
        }
        open={modals.delete}
        onClose={() => {
          setModals((prev) => ({ ...prev, delete: false }));
          setSelectedCategory(null);
        }}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteMutation.isPending}
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmModal
        open={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        onConfirm={handleBulkDeleteConfirm}
        title="Delete Selected Categories"
        description={`Are you sure you want to delete ${selectedIds.size} categor${selectedIds.size !== 1 ? 'ies' : 'y'}? This action cannot be undone.`}
        confirmText={deleteManyMutation.isPending ? 'Deleting...' : 'Delete'}
        variant="danger"
        isLoading={deleteManyMutation.isPending}
      >
        {selectedCategoriesList.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-3 bg-muted/50 rounded-md border border-border">
              {selectedCategoriesList.map((category) => (
                <Badge key={category.id} variant="secondary" size="sm">
                  {category.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </ConfirmModal>
    </div>
  );
}
