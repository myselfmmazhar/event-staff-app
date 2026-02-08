import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UserRole } from "@prisma/client";

export type UserSortBy = "createdAt" | "updatedAt" | "firstName" | "lastName" | "email" | "role";
export type SortOrder = "asc" | "desc";
export type UserStatusFilter = "active" | "inactive";
export type UserEmailVerifiedFilter = "verified" | "unverified";
export type UserPhoneFilter = "hasPhone" | "noPhone";

interface UsersFiltersState {
  // Pagination
  page: number;
  limit: number;

  // Search & Filters
  search: string;
  roles: UserRole[];
  statuses: UserStatusFilter[];
  emailVerified: UserEmailVerifiedFilter[];
  hasPhone: UserPhoneFilter[];
  createdFrom: string;
  createdTo: string;

  // Sorting
  sortBy: UserSortBy;
  sortOrder: SortOrder;

  // Actions - Pagination
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;

  // Actions - Search & Filters
  setSearch: (search: string) => void;
  setRoles: (roles: UserRole[]) => void;
  setStatuses: (statuses: UserStatusFilter[]) => void;
  setEmailVerified: (emailVerified: UserEmailVerifiedFilter[]) => void;
  setHasPhone: (hasPhone: UserPhoneFilter[]) => void;
  setCreatedFrom: (date: string) => void;
  setCreatedTo: (date: string) => void;

  // Actions - Sorting
  setSortBy: (sortBy: UserSortBy) => void;
  setSortOrder: (sortOrder: SortOrder) => void;

  // Actions - Bulk
  resetFilters: () => void;
  resetAll: () => void;
}

const DEFAULT_FILTERS = {
  search: "",
  roles: [] as UserRole[],
  statuses: [] as UserStatusFilter[],
  emailVerified: [] as UserEmailVerifiedFilter[],
  hasPhone: [] as UserPhoneFilter[],
  createdFrom: "",
  createdTo: "",
};

const DEFAULT_STATE = {
  page: 1,
  limit: 10,
  ...DEFAULT_FILTERS,
  sortBy: "createdAt" as UserSortBy,
  sortOrder: "desc" as SortOrder,
};

export const useUsersFilters = create<UsersFiltersState>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,

      // Pagination actions
      setPage: (page) => set({ page }),
      setLimit: (limit) => set({ limit, page: 1 }),

      // Search & Filter actions
      setSearch: (search) => set({ search, page: 1 }),
      setRoles: (roles) => set({ roles, page: 1 }),
      setStatuses: (statuses) => set({ statuses, page: 1 }),
      setEmailVerified: (emailVerified) => set({ emailVerified, page: 1 }),
      setHasPhone: (hasPhone) => set({ hasPhone, page: 1 }),
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
      name: "users-filters",
      partialize: (state) => ({
        search: state.search,
        roles: state.roles,
        statuses: state.statuses,
        emailVerified: state.emailVerified,
        hasPhone: state.hasPhone,
        createdFrom: state.createdFrom,
        createdTo: state.createdTo,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
      }),
      skipHydration: true,
    }
  )
);
