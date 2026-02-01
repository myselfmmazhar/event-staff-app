import { create } from 'zustand';

export type ProductStatus = 'active' | 'inactive';
export type ProductSortBy = 'title' | 'cost' | 'price' | 'category' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

interface ProductsFiltersState {
  // Pagination
  page: number;
  limit: number;

  // Search & Filters
  search: string;
  statuses: ProductStatus[];
  createdFrom: string;
  createdTo: string;

  // Sorting
  sortBy: ProductSortBy;
  sortOrder: SortOrder;

  // Actions - Pagination
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;

  // Actions - Search & Filters
  setSearch: (search: string) => void;
  setStatuses: (statuses: ProductStatus[]) => void;
  setCreatedFrom: (createdFrom: string) => void;
  setCreatedTo: (createdTo: string) => void;

  // Actions - Sorting
  setSortBy: (sortBy: ProductSortBy) => void;
  setSortOrder: (sortOrder: SortOrder) => void;

  // Actions - Bulk
  resetFilters: () => void;
  resetAll: () => void;
}

const DEFAULT_FILTERS = {
  search: '',
  statuses: [] as ProductStatus[],
  createdFrom: '',
  createdTo: '',
};

const DEFAULT_STATE = {
  page: 1,
  limit: 10,
  ...DEFAULT_FILTERS,
  sortBy: 'title' as ProductSortBy,
  sortOrder: 'asc' as SortOrder,
};

export const useProductsFilters = create<ProductsFiltersState>((set) => ({
  ...DEFAULT_STATE,

  setPage: (page) => set({ page }),
  setLimit: (limit) => set({ limit, page: 1 }),

  setSearch: (search) => set({ search, page: 1 }),
  setStatuses: (statuses) => set({ statuses, page: 1 }),
  setCreatedFrom: (createdFrom) => set({ createdFrom, page: 1 }),
  setCreatedTo: (createdTo) => set({ createdTo, page: 1 }),

  setSortBy: (sortBy) => set({ sortBy }),
  setSortOrder: (sortOrder) => set({ sortOrder }),

  resetFilters: () => set({ ...DEFAULT_FILTERS, page: 1 }),
  resetAll: () => set(DEFAULT_STATE),
}));
