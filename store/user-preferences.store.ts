import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TableDensity = "compact" | "comfortable";

interface UserPreferencesState {
  // Table preferences
  defaultItemsPerPage: number;
  tableDensity: TableDensity;

  // Actions
  setDefaultItemsPerPage: (limit: number) => void;
  setTableDensity: (density: TableDensity) => void;
  reset: () => void;
}

const DEFAULT_STATE = {
  defaultItemsPerPage: 10,
  tableDensity: "comfortable" as TableDensity,
};

export const useUserPreferences = create<UserPreferencesState>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,

      setDefaultItemsPerPage: (limit) =>
        set({ defaultItemsPerPage: limit }),

      setTableDensity: (density) =>
        set({ tableDensity: density }),

      reset: () => set(DEFAULT_STATE),
    }),
    {
      name: "user-preferences-storage",
    }
  )
);
