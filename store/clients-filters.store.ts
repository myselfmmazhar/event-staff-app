import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ClientLoginAccess = "all" | "with" | "without";
export type ClientSortBy = "clientId" | "businessName" | "createdAt";
export type SortOrder = "asc" | "desc";

interface ClientsFiltersState {
  // Pagination
  page: number;
  limit: number;

  // Search & Filters
  search: string;
  loginAccess: ClientLoginAccess;
  createdFrom: string;
  createdTo: string;

  // Sorting
  sortBy: ClientSortBy;
  sortOrder: SortOrder;

  // Actions - Pagination
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;

  // Actions - Search & Filters
  setSearch: (search: string) => void;
  setLoginAccess: (loginAccess: ClientLoginAccess) => void;
  setCreatedFrom: (createdFrom: string) => void;
  setCreatedTo: (createdTo: string) => void;

  // Actions - Sorting
  setSortBy: (sortBy: ClientSortBy) => void;
  setSortOrder: (sortOrder: SortOrder) => void;

  // Actions - Bulk
  resetFilters: () => void;
  resetAll: () => void;
}

const DEFAULT_FILTERS = {
  search: "",
  loginAccess: "all" as ClientLoginAccess,
  createdFrom: "",
  createdTo: "",
};

const DEFAULT_STATE = {
  page: 1,
  limit: 10,
  ...DEFAULT_FILTERS,
  sortBy: "createdAt" as ClientSortBy,
  sortOrder: "desc" as SortOrder,
};

export const useClientsFilters = create<ClientsFiltersState>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,

      // Pagination actions
      setPage: (page) => set({ page }),
      setLimit: (limit) => set({ limit, page: 1 }),

      // Search & Filter actions
      setSearch: (search) => set({ search, page: 1 }),
      setLoginAccess: (loginAccess) => set({ loginAccess, page: 1 }),
      setCreatedFrom: (createdFrom) => set({ createdFrom, page: 1 }),
      setCreatedTo: (createdTo) => set({ createdTo, page: 1 }),

      // Sorting actions
      setSortBy: (sortBy) => set({ sortBy }),
      setSortOrder: (sortOrder) => set({ sortOrder }),

      // Bulk actions
      resetFilters: () => set({ ...DEFAULT_FILTERS, page: 1 }),
      resetAll: () => set(DEFAULT_STATE),
    }),
    {
      name: "clients-filters",
      partialize: (state) => ({
        search: state.search,
        loginAccess: state.loginAccess,
        createdFrom: state.createdFrom,
        createdTo: state.createdTo,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
      }),
      skipHydration: true,
    }
  )
);
