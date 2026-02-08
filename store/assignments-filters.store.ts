import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AssignmentTab = 'all' | 'accepted' | 'open';
export type AssignmentSortBy = 'startDate' | 'position' | 'event';
export type SortOrder = 'asc' | 'desc';
export type QuickFilter = 'all' | 'needsStaff' | 'filled' | 'today' | 'thisWeek';

interface AssignmentsFiltersState {
  // Active tab
  activeTab: AssignmentTab;

  // Pagination
  page: number;
  limit: number;

  // Search & Filters
  search: string;
  selectedEventIds: string[];
  selectedServiceIds: string[];

  // Date Filters
  dateFrom: string | null;
  dateTo: string | null;

  // Sorting
  sortBy: AssignmentSortBy;
  sortOrder: SortOrder;

  // Quick Filter
  quickFilter: QuickFilter;

  // Selected assignment for Open view staff search
  selectedAssignmentId: string | null;

  // Actions - Tab
  setActiveTab: (tab: AssignmentTab) => void;

  // Actions - Pagination
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;

  // Actions - Search & Filters
  setSearch: (search: string) => void;
  setSelectedEventIds: (eventIds: string[]) => void;
  setSelectedServiceIds: (serviceIds: string[]) => void;

  // Actions - Date Filters
  setDateFrom: (date: string | null) => void;
  setDateTo: (date: string | null) => void;

  // Actions - Sorting
  setSortBy: (sortBy: AssignmentSortBy) => void;
  setSortOrder: (sortOrder: SortOrder) => void;

  // Actions - Quick Filter
  setQuickFilter: (filter: QuickFilter) => void;

  // Actions - Selected Assignment
  setSelectedAssignmentId: (id: string | null) => void;

  // Actions - Bulk
  resetFilters: () => void;
  resetAll: () => void;
}

const DEFAULT_FILTERS = {
  search: '',
  selectedEventIds: [] as string[],
  selectedServiceIds: [] as string[],
  dateFrom: null as string | null,
  dateTo: null as string | null,
};

const DEFAULT_STATE = {
  activeTab: 'all' as AssignmentTab,
  page: 1,
  limit: 20,
  ...DEFAULT_FILTERS,
  sortBy: 'startDate' as AssignmentSortBy,
  sortOrder: 'asc' as SortOrder,
  quickFilter: 'all' as QuickFilter,
  selectedAssignmentId: null as string | null,
};

export const useAssignmentsFilters = create<AssignmentsFiltersState>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,

      // Tab action
      setActiveTab: (activeTab) => set({ activeTab, page: 1, selectedAssignmentId: null }),

      // Pagination actions
      setPage: (page) => set({ page }),
      setLimit: (limit) => set({ limit, page: 1 }),

      // Search & Filter actions
      setSearch: (search) => set({ search, page: 1 }),
      setSelectedEventIds: (selectedEventIds) => set({ selectedEventIds, page: 1 }),
      setSelectedServiceIds: (selectedServiceIds) => set({ selectedServiceIds, page: 1 }),

      // Date Filter actions
      setDateFrom: (dateFrom) => set({ dateFrom, page: 1 }),
      setDateTo: (dateTo) => set({ dateTo, page: 1 }),

      // Sorting actions
      setSortBy: (sortBy) => set({ sortBy }),
      setSortOrder: (sortOrder) => set({ sortOrder }),

      // Quick Filter action
      setQuickFilter: (quickFilter) => set({ quickFilter, page: 1 }),

      // Selected Assignment action
      setSelectedAssignmentId: (selectedAssignmentId) => set({ selectedAssignmentId }),

      // Bulk actions
      resetFilters: () => set({ ...DEFAULT_FILTERS, page: 1 }),
      resetAll: () => set(DEFAULT_STATE),
    }),
    {
      name: 'assignments-filters',
      partialize: (state) => ({
        activeTab: state.activeTab,
        search: state.search,
        selectedEventIds: state.selectedEventIds,
        selectedServiceIds: state.selectedServiceIds,
        dateFrom: state.dateFrom,
        dateTo: state.dateTo,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
        quickFilter: state.quickFilter,
      }),
      skipHydration: true,
    }
  )
);
