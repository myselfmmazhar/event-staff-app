import { create } from 'zustand';

export type ServiceActiveFilter = 'all' | 'active' | 'inactive';
export type ServiceSortBy = 'title' | 'cost' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

interface ServicesFiltersState {
  // Pagination
  page: number;
  limit: number;

  // Search & Filters
  search: string;
  active: ServiceActiveFilter;

  // Sorting
  sortBy: ServiceSortBy;
  sortOrder: SortOrder;

  // Actions - Pagination
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;

  // Actions - Search & Filters
  setSearch: (search: string) => void;
  setActive: (active: ServiceActiveFilter) => void;

  // Actions - Sorting
  setSortBy: (sortBy: ServiceSortBy) => void;
  setSortOrder: (sortOrder: SortOrder) => void;

  // Actions - Bulk
  resetFilters: () => void;
  resetAll: () => void;
}

const DEFAULT_FILTERS = {
  search: '',
  active: 'all' as ServiceActiveFilter,
};

const DEFAULT_STATE = {
  page: 1,
  limit: 10,
  ...DEFAULT_FILTERS,
  sortBy: 'title' as ServiceSortBy,
  sortOrder: 'asc' as SortOrder,
};

export const useServicesFilters = create<ServicesFiltersState>((set) => ({
  ...DEFAULT_STATE,

  setPage: (page) => set({ page }),
  setLimit: (limit) => set({ limit, page: 1 }),

  setSearch: (search) => set({ search, page: 1 }),
  setActive: (active) => set({ active, page: 1 }),

  setSortBy: (sortBy) => set({ sortBy }),
  setSortOrder: (sortOrder) => set({ sortOrder }),

  resetFilters: () => set({ ...DEFAULT_FILTERS, page: 1 }),
  resetAll: () => set(DEFAULT_STATE),
}));

