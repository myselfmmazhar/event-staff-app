'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ActiveFilters } from '@/components/common/active-filters';
import { Pagination } from '@/components/common/pagination';
import { ProductFormModal } from '@/components/catalog/products/product-form-modal';
import { ProductSearch } from '@/components/catalog/products/product-search';
import { ProductFilters } from '@/components/catalog/products/product-filters';
import { ProductTable } from '@/components/catalog/products/product-table';
import { DeleteProductModal } from '@/components/catalog/products/delete-product-modal';
import { ViewProductModal } from '@/components/catalog/products/view-product-modal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlusIcon } from '@/components/ui/icons';
import { trpc } from '@/lib/client/trpc';
import { useCrudMutations } from '@/lib/hooks/useCrudMutations';
import { useUrlSync } from '@/lib/hooks/useUrlSync';
import type { Product } from '@/lib/types/product';
import type { CreateProductInput } from '@/lib/schemas/product.schema';
import {
  useProductsFilters,
  type ProductStatus,
  type ProductSortBy,
  type SortOrder,
} from '@/store/products-filters.store';

function parseNumberParam(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseStatusesParam(value: string | null): ProductStatus[] {
  if (!value) return [];
  const statuses = value.split(',').filter((s): s is ProductStatus =>
    s === 'active' || s === 'inactive'
  );
  return statuses;
}

const PRODUCT_SORT_FIELDS: ProductSortBy[] = ['title', 'cost', 'category', 'createdAt'];
const PRODUCT_SORT_FIELD_SET = new Set<ProductSortBy>(PRODUCT_SORT_FIELDS);

function parseSortByParam(value: string | null): ProductSortBy {
  if (value && PRODUCT_SORT_FIELD_SET.has(value as ProductSortBy)) {
    return value as ProductSortBy;
  }
  return 'title';
}

function parseSortOrderParam(value: string | null): SortOrder {
  return value === 'desc' ? 'desc' : 'asc';
}

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const filters = useProductsFilters();
  const { backendErrors, setBackendErrors, createMutationOptions, updateMutationOptions, deleteMutationOptions } =
    useCrudMutations();

  const [modals, setModals] = useState({
    form: false,
    view: false,
    delete: false,
  });

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleCreate = () => {
    setSelectedProduct(null);
    setBackendErrors([]);
    setModals((prev) => ({ ...prev, form: true }));
  };

  useEffect(() => {
    const page = parseNumberParam(searchParams.get('page'), 1);
    const limit = parseNumberParam(searchParams.get('limit'), 10);
    const search = searchParams.get('search') || '';
    const statusesFromParam = parseStatusesParam(searchParams.get('statuses'));
    const activeParam = searchParams.get('active');
    const statuses =
      statusesFromParam.length > 0
        ? statusesFromParam
        : activeParam === 'active'
          ? (['active'] as ProductStatus[])
          : activeParam === 'inactive'
            ? (['inactive'] as ProductStatus[])
            : [];
    const sortBy = parseSortByParam(searchParams.get('sortBy'));
    const sortOrder = parseSortOrderParam(searchParams.get('sortOrder'));

    filters.setPage(page);
    filters.setLimit(limit);
    filters.setSearch(search);
    filters.setStatuses(statuses);
    filters.setSortBy(sortBy);
    filters.setSortOrder(sortOrder);

    // Category filtering was removed; strip any stale URL param.
    // Active filter was replaced by statuses multi-select; strip old param.
    if (searchParams.has('category') || searchParams.has('active')) {
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.delete('category');
      urlParams.delete('active');
      const newUrl = urlParams.toString()
        ? `${window.location.pathname}?${urlParams.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
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

  const activeFilterValue = useMemo(() => {
    if (filters.statuses.length === 0) return undefined;
    if (filters.statuses.length === 2) return undefined;
    if (filters.statuses.includes('active')) return true;
    if (filters.statuses.includes('inactive')) return false;
    return undefined;
  }, [filters.statuses]);

  const { data, isLoading, refetch } = trpc.product.getAll.useQuery({
    page: filters.page,
    limit: filters.limit,
    search: filters.search || undefined,
    isActive: activeFilterValue,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  });

  const products = (data?.data ?? []) as Product[];
  const totalPages = data?.meta.totalPages ?? 0;

  const createMutation = trpc.product.create.useMutation(
    createMutationOptions('Product created successfully', {
      onSuccess: () => {
        setModals((prev) => ({ ...prev, form: false }));
        setSelectedProduct(null);
        refetch();
      },
    })
  );

  const updateMutation = trpc.product.update.useMutation(
    updateMutationOptions('Product updated successfully', {
      onSuccess: () => {
        setModals((prev) => ({ ...prev, form: false, view: false }));
        setSelectedProduct(null);
        refetch();
      },
    })
  );

  const deleteMutation = trpc.product.delete.useMutation(
    deleteMutationOptions('Product deleted successfully', {
      onSuccess: () => {
        setModals((prev) => ({ ...prev, delete: false }));
        setSelectedProduct(null);
        refetch();
      },
    })
  );

  const toggleActiveMutation = trpc.product.toggleActive.useMutation({
    ...updateMutationOptions('Product status updated', {
      onSuccess: () => refetch(),
    }),
  });

  const getProductById = (id: string): Product | undefined =>
    products.find((product) => product.id === id);

  const clearSelection = () => setSelectedIds(new Set());

  const handleView = (id: string) => {
    const product = getProductById(id);
    if (product) {
      setSelectedProduct(product);
      setModals((prev) => ({ ...prev, view: true }));
    }
  };

  const handleEdit = (id: string) => {
    const product = getProductById(id);
    if (product) {
      setSelectedProduct(product);
      setBackendErrors([]);
      setModals((prev) => ({ ...prev, form: true }));
    }
  };

  const handleDelete = (id: string) => {
    const product = getProductById(id);
    if (product) {
      setSelectedProduct(product);
      setModals((prev) => ({ ...prev, delete: true }));
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedProduct) {
      deleteMutation.mutate({ id: selectedProduct.id });
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
    activeFilters.push({
      key: 'statuses',
      label: 'Status',
      value: filters.statuses.map((s) => (s === 'active' ? 'Active' : 'Inactive')).join(', '),
      onRemove: () => filters.setStatuses([]),
    });
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Products</h1>
          <p className="text-muted-foreground mt-1">Manage your product catalog.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleCreate}>
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      <Card className="p-6 overflow-visible relative z-20">
        <div className="space-y-4">
          <ProductSearch value={filters.search} onChange={filters.setSearch} />
          <ProductFilters />

          <ActiveFilters filters={activeFilters} />
        </div>
      </Card>

      {/* Selection Info */}
      {selectedIds.size > 0 && (
        <Card className="p-3 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">
              {selectedIds.size} product{selectedIds.size !== 1 ? 's' : ''} selected
            </span>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Clear selection
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="relative z-10">
          <ProductTable
            products={products}
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

      <ProductFormModal
        product={selectedProduct}
        open={modals.form}
        onClose={() => {
          setModals((prev) => ({ ...prev, form: false }));
          setSelectedProduct(null);
          setBackendErrors([]);
        }}
        onSubmit={(formData: CreateProductInput) => {
          if (selectedProduct) {
            updateMutation.mutate({ id: selectedProduct.id, ...formData });
          } else {
            createMutation.mutate(formData);
          }
        }}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        backendErrors={backendErrors}
      />

      <ViewProductModal
        product={selectedProduct}
        open={modals.view}
        onClose={() => {
          setModals((prev) => ({ ...prev, view: false }));
          setSelectedProduct(null);
        }}
      />

      <DeleteProductModal
        product={selectedProduct ? { title: selectedProduct.title, productId: selectedProduct.productId } : null}
        open={modals.delete}
        onClose={() => {
          setModals((prev) => ({ ...prev, delete: false }));
          setSelectedProduct(null);
        }}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
