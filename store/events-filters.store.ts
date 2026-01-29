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
  selectedStatuses: EventStatus[];
  selectedClientIds: string[];

  // Date Filters
  startDateFrom: string | null;
  startDateTo: string | null;

  // Sorting
  sortBy: EventSortBy;
  sortOrder: SortOrder;

  // Actions - Pagination
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;

  // Actions - Search & Filters
  setSearch: (search: string) => void;
  setSelectedStatuses: (statuses: EventStatus[]) => void;
  setSelectedClientIds: (clientIds: string[]) => void;

  // Actions - Date Filters
  setStartDateFrom: (date: string | null) => void;
  setStartDateTo: (date: string | null) => void;

  // Actions - Sorting
  setSortBy: (sortBy: EventSortBy) => void;
  setSortOrder: (sortOrder: SortOrder) => void;

  // Actions - Bulk
  resetFilters: () => void;
  resetAll: () => void;
}

const DEFAULT_FILTERS = {
  search: "",
  selectedStatuses: [] as EventStatus[],
  selectedClientIds: [] as string[],
  startDateFrom: null as string | null,
  startDateTo: null as string | null,
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
  setSelectedStatuses: (selectedStatuses) => set({ selectedStatuses, page: 1 }),
  setSelectedClientIds: (selectedClientIds) => set({ selectedClientIds, page: 1 }),

  // Date Filter actions
  setStartDateFrom: (startDateFrom) => set({ startDateFrom, page: 1 }),
  setStartDateTo: (startDateTo) => set({ startDateTo, page: 1 }),

  // Sorting actions
  setSortBy: (sortBy) => set({ sortBy }),
  setSortOrder: (sortOrder) => set({ sortOrder }),

  // Bulk actions
  resetFilters: () => set({ ...DEFAULT_FILTERS, page: 1 }),
  resetAll: () => set(DEFAULT_STATE),
}));
