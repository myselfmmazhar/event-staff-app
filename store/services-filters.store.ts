import { create } from 'zustand';

export type ServiceStatus = 'active' | 'inactive';
export type ServiceSortBy = 'title' | 'cost' | 'price' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

interface ServicesFiltersState {
  // Pagination
  page: number;
  limit: number;

  // Search & Filters
  search: string;
  statuses: ServiceStatus[];
  createdFrom: string;
  createdTo: string;

  // Sorting
  sortBy: ServiceSortBy;
  sortOrder: SortOrder;

  // Actions - Pagination
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;

  // Actions - Search & Filters
  setSearch: (search: string) => void;
  setStatuses: (statuses: ServiceStatus[]) => void;
  setCreatedFrom: (createdFrom: string) => void;
  setCreatedTo: (createdTo: string) => void;

  // Actions - Sorting
  setSortBy: (sortBy: ServiceSortBy) => void;
  setSortOrder: (sortOrder: SortOrder) => void;

  // Actions - Bulk
  resetFilters: () => void;
  resetAll: () => void;
}

const DEFAULT_FILTERS = {
  search: '',
  statuses: [] as ServiceStatus[],
  createdFrom: '',
  createdTo: '',
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
  setStatuses: (statuses) => set({ statuses, page: 1 }),
  setCreatedFrom: (createdFrom) => set({ createdFrom, page: 1 }),
  setCreatedTo: (createdTo) => set({ createdTo, page: 1 }),

  setSortBy: (sortBy) => set({ sortBy }),
  setSortOrder: (sortOrder) => set({ sortOrder }),

  resetFilters: () => set({ ...DEFAULT_FILTERS, page: 1 }),
  resetAll: () => set(DEFAULT_STATE),
}));
