import { create } from "zustand";
import { EventStatus } from "@prisma/client";

export type EventSortBy = "createdAt" | "updatedAt" | "startDate" | "endDate" | "title" | "eventId" | "venueName" | "status";
export type SortOrder = "asc" | "desc";

interface EventsFiltersState {
  // Pagination
  page: number;
  limit: number;

  // Search & Filters
  search: string;
  selectedStatus: EventStatus | "ALL";
  selectedClientId: string | "ALL";

  // Sorting
  sortBy: EventSortBy;
  sortOrder: SortOrder;

  // Actions - Pagination
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;

  // Actions - Search & Filters
  setSearch: (search: string) => void;
  setSelectedStatus: (status: EventStatus | "ALL") => void;
  setSelectedClientId: (clientId: string | "ALL") => void;

  // Actions - Sorting
  setSortBy: (sortBy: EventSortBy) => void;
  setSortOrder: (sortOrder: SortOrder) => void;

  // Actions - Bulk
  resetFilters: () => void;
  resetAll: () => void;
}

const DEFAULT_FILTERS = {
  search: "",
  selectedStatus: "ALL" as EventStatus | "ALL",
  selectedClientId: "ALL" as string | "ALL",
};

const DEFAULT_STATE = {
  page: 1,
  limit: 10,
  ...DEFAULT_FILTERS,
  sortBy: "createdAt" as EventSortBy,
  sortOrder: "desc" as SortOrder,
};

export const useEventsFilters = create<EventsFiltersState>((set) => ({
  ...DEFAULT_STATE,

  // Pagination actions
  setPage: (page) => set({ page }),
  setLimit: (limit) => set({ limit, page: 1 }),

  // Search & Filter actions
  setSearch: (search) => set({ search, page: 1 }),
  setSelectedStatus: (selectedStatus) => set({ selectedStatus, page: 1 }),
  setSelectedClientId: (selectedClientId) => set({ selectedClientId, page: 1 }),

  // Sorting actions
  setSortBy: (sortBy) => set({ sortBy }),
  setSortOrder: (sortOrder) => set({ sortOrder }),

  // Bulk actions
  resetFilters: () => set({ ...DEFAULT_FILTERS, page: 1 }),
  resetAll: () => set(DEFAULT_STATE),
}));
