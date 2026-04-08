import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AccountStatus, StaffType, SkillLevel } from "@prisma/client";

export type StaffSortBy =
  | "createdAt"
  | "updatedAt"
  | "staffId"
  | "firstName"
  | "lastName"
  | "email"
  | "accountStatus"
  | "staffType"
  | "skillLevel"
  | "availabilityStatus";
export type SortOrder = "asc" | "desc";

interface StaffFiltersState {
  // Pagination
  page: number;
  limit: number;

  // Search & Filters
  search: string;
  accountStatuses: AccountStatus[];
  staffTypes: StaffType[];
  skillLevels: SkillLevel[];
  createdFrom: string;
  createdTo: string;

  // Sorting
  sortBy: StaffSortBy;
  sortOrder: SortOrder;

  // Actions - Pagination
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;

  // Actions - Search & Filters
  setSearch: (search: string) => void;
  setAccountStatuses: (accountStatuses: AccountStatus[]) => void;
  setStaffTypes: (staffTypes: StaffType[]) => void;
  setSkillLevels: (skillLevels: SkillLevel[]) => void;
  setCreatedFrom: (createdFrom: string) => void;
  setCreatedTo: (createdTo: string) => void;

  // Actions - Sorting
  setSortBy: (sortBy: StaffSortBy) => void;
  setSortOrder: (sortOrder: SortOrder) => void;

  // Actions - Bulk
  resetFilters: () => void;
  resetAll: () => void;
}

const DEFAULT_FILTERS = {
  search: "",
  accountStatuses: [] as AccountStatus[],
  staffTypes: [] as StaffType[],
  skillLevels: [] as SkillLevel[],
  createdFrom: "",
  createdTo: "",
};

const DEFAULT_STATE = {
  page: 1,
  limit: 10,
  ...DEFAULT_FILTERS,
  sortBy: "createdAt" as StaffSortBy,
  sortOrder: "desc" as SortOrder,
};

export const useStaffFilters = create<StaffFiltersState>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,

      // Pagination actions
      setPage: (page) => set({ page }),
      setLimit: (limit) => set({ limit, page: 1 }),

      // Search & Filter actions
      setSearch: (search) => set({ search, page: 1 }),
      setAccountStatuses: (accountStatuses) => set({ accountStatuses, page: 1 }),
      setStaffTypes: (staffTypes) => set({ staffTypes, page: 1 }),
      setSkillLevels: (skillLevels) => set({ skillLevels, page: 1 }),
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
      name: "staff-filters",
      partialize: (state) => ({
        search: state.search,
        accountStatuses: state.accountStatuses,
        staffTypes: state.staffTypes,
        skillLevels: state.skillLevels,
        createdFrom: state.createdFrom,
        createdTo: state.createdTo,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
      }),
      skipHydration: true,
    }
  )
);
