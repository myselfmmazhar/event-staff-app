import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CategoryStatus = 'active' | 'inactive';
export type CategorySortBy = 'name' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

interface CategoriesFiltersState {
  // Pagination
  page: number;
  limit: number;

  // Search & Filters
  search: string;
  statuses: CategoryStatus[];
  createdFrom: string;
  createdTo: string;

  // Sorting
  sortBy: CategorySortBy;
  sortOrder: SortOrder;

  // Actions - Pagination
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;

  // Actions - Search & Filters
  setSearch: (search: string) => void;
  setStatuses: (statuses: CategoryStatus[]) => void;
  setCreatedFrom: (createdFrom: string) => void;
  setCreatedTo: (createdTo: string) => void;

  // Actions - Sorting
  setSortBy: (sortBy: CategorySortBy) => void;
  setSortOrder: (sortOrder: SortOrder) => void;

  // Actions - Bulk
  resetFilters: () => void;
  resetAll: () => void;
}

const DEFAULT_FILTERS = {
  search: '',
  statuses: [] as CategoryStatus[],
  createdFrom: '',
  createdTo: '',
};

const DEFAULT_STATE = {
  page: 1,
  limit: 10,
  ...DEFAULT_FILTERS,
  sortBy: 'name' as CategorySortBy,
  sortOrder: 'asc' as SortOrder,
};

export const useCategoriesFilters = create<CategoriesFiltersState>()(
  persist(
    (set) => ({
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
    }),
    {
      name: 'categories-filters',
      partialize: (state) => ({
        search: state.search,
        statuses: state.statuses,
        createdFrom: state.createdFrom,
        createdTo: state.createdTo,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
      }),
      skipHydration: true,
    }
  )
);
