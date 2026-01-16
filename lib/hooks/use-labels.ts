import { useLabelsContext } from "@/lib/providers/labels-provider";
import { useTerminology } from "@/lib/hooks/use-terminology";
import type {
  LabelsConfig,
  GlobalLabels,
  PageLabels,
  ActionLabels,
  SearchLabels,
  FilterLabels,
  TableLabels,
  PaginationLabels,
  CommonLabels,
  StatusLabels,
  FormLabels,
  MessageLabels,
  StaffPageLabels,
  EventsPageLabels,
  ClientsPageLabels,
  UsersPageLabels,
  DashboardPageLabels,
  MySchedulePageLabels,
  SettingsPageLabels,
} from "@/lib/config/labels";
import { getNestedValue, interpolateLabel } from "@/lib/config/labels";
import type { TerminologyConfig } from "@/lib/config/terminology";
import { useMemo } from "react";

/**
 * Deep interpolate all string values in an object with terminology
 */
function interpolateObject<T>(obj: T, terminology: TerminologyConfig): T {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return obj;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as unknown as Record<string, unknown>)) {
    if (typeof value === "string") {
      result[key] = interpolateLabel(value, terminology);
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = interpolateObject(value as unknown, terminology);
    } else {
      result[key] = value;
    }
  }

  return result as unknown as T;
}

/**
 * Hook to access full labels configuration
 *
 * Returns the complete labels config including global and page-specific labels.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { labels, isLoading, refreshLabels } = useLabels();
 *
 *   return (
 *     <button>{labels.global.actions.save}</button>
 *   );
 * }
 * ```
 */
export function useLabels() {
  return useLabelsContext();
}

/**
 * Hook to access global labels
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const globalLabels = useGlobalLabels();
 *   return <button>{globalLabels.actions.save}</button>;
 * }
 * ```
 */
export function useGlobalLabels(): GlobalLabels {
  const { labels } = useLabelsContext();
  return labels.global;
}

/**
 * Hook to access action labels (save, cancel, delete, etc.)
 *
 * @example
 * ```tsx
 * function FormButtons() {
 *   const actions = useActionLabels();
 *   return (
 *     <div>
 *       <button>{actions.save}</button>
 *       <button>{actions.cancel}</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useActionLabels(): ActionLabels {
  const { labels } = useLabelsContext();
  return labels.global.actions;
}

/**
 * Hook to access search labels
 *
 * @example
 * ```tsx
 * function SearchInput() {
 *   const search = useSearchLabels();
 *   return <input placeholder={search.placeholder} />;
 * }
 * ```
 */
export function useSearchLabels(): SearchLabels {
  const { labels } = useLabelsContext();
  return labels.global.search;
}

/**
 * Hook to access filter labels
 *
 * @example
 * ```tsx
 * function FilterBar() {
 *   const filters = useFilterLabels();
 *   return <button>{filters.clearAll}</button>;
 * }
 * ```
 */
export function useFilterLabels(): FilterLabels {
  const { labels } = useLabelsContext();
  return labels.global.filters;
}

/**
 * Hook to access table labels
 *
 * @example
 * ```tsx
 * function DataTable() {
 *   const table = useTableLabels();
 *   return <th>{table.actions}</th>;
 * }
 * ```
 */
export function useTableLabels(): TableLabels {
  const { labels } = useLabelsContext();
  return labels.global.table;
}

/**
 * Hook to access pagination labels
 *
 * @example
 * ```tsx
 * function Pagination() {
 *   const pagination = usePaginationLabels();
 *   return <span>{pagination.itemsPerPage}</span>;
 * }
 * ```
 */
export function usePaginationLabels(): PaginationLabels {
  const { labels } = useLabelsContext();
  return labels.global.pagination;
}

/**
 * Hook to access common labels
 *
 * @example
 * ```tsx
 * function CommonUI() {
 *   const common = useCommonLabels();
 *   return <span>{common.loading}</span>;
 * }
 * ```
 */
export function useCommonLabels(): CommonLabels {
  const { labels } = useLabelsContext();
  return labels.global.common;
}

/**
 * Hook to access status labels
 *
 * @example
 * ```tsx
 * function StatusBadge() {
 *   const status = useStatusLabels();
 *   return <span>{status.active}</span>;
 * }
 * ```
 */
export function useStatusLabels(): StatusLabels {
  const { labels } = useLabelsContext();
  return labels.global.status;
}

/**
 * Hook to access form labels
 *
 * @example
 * ```tsx
 * function UserForm() {
 *   const form = useFormLabels();
 *   return <label>{form.firstName}</label>;
 * }
 * ```
 */
export function useFormLabels(): FormLabels {
  const { labels } = useLabelsContext();
  return labels.global.form;
}

/**
 * Hook to access message labels
 *
 * @example
 * ```tsx
 * function ToastMessage() {
 *   const messages = useMessageLabels();
 *   return <span>{messages.saveSuccess}</span>;
 * }
 * ```
 */
export function useMessageLabels(): MessageLabels {
  const { labels } = useLabelsContext();
  return labels.global.messages;
}

// ============================================================================
// PAGE-SPECIFIC LABEL HOOKS
// ============================================================================

/**
 * Hook to access all page labels
 *
 * @example
 * ```tsx
 * function PageComponent() {
 *   const pages = usePageLabels();
 *   return <h1>{pages.staff.pageTitle}</h1>;
 * }
 * ```
 */
export function usePageLabels(): PageLabels {
  const { labels } = useLabelsContext();
  return labels.pages;
}

/**
 * Hook to access staff page labels
 * Interpolates terminology placeholders automatically
 *
 * @example
 * ```tsx
 * function StaffPage() {
 *   const staff = useStaffPageLabels();
 *   return <h1>{staff.pageTitle}</h1>;
 * }
 * ```
 */
export function useStaffPageLabels(): StaffPageLabels {
  const { labels } = useLabelsContext();
  const { terminology } = useTerminology();
  
  return useMemo(
    () => interpolateObject(labels.pages.staff, terminology),
    [labels.pages.staff, terminology]
  );
}

/**
 * Hook to access events page labels
 * Interpolates terminology placeholders automatically
 *
 * @example
 * ```tsx
 * function EventsPage() {
 *   const events = useEventsPageLabels();
 *   return <h1>{events.pageTitle}</h1>;
 * }
 * ```
 */
export function useEventsPageLabels(): EventsPageLabels {
  const { labels } = useLabelsContext();
  const { terminology } = useTerminology();
  
  return useMemo(
    () => interpolateObject(labels.pages.events, terminology),
    [labels.pages.events, terminology]
  );
}

/**
 * Hook to access clients page labels
 *
 * @example
 * ```tsx
 * function ClientsPage() {
 *   const clients = useClientsPageLabels();
 *   return <h1>{clients.pageTitle}</h1>;
 * }
 * ```
 */
export function useClientsPageLabels(): ClientsPageLabels {
  const { labels } = useLabelsContext();
  return labels.pages.clients;
}

/**
 * Hook to access users page labels
 * Interpolates terminology placeholders automatically
 *
 * @example
 * ```tsx
 * function UsersPage() {
 *   const users = useUsersPageLabels();
 *   return <h1>{users.pageTitle}</h1>;
 * }
 * ```
 */
export function useUsersPageLabels(): UsersPageLabels {
  const { labels } = useLabelsContext();
  const { terminology } = useTerminology();
  
  return useMemo(
    () => interpolateObject(labels.pages.users, terminology),
    [labels.pages.users, terminology]
  );
}

/**
 * Hook to access dashboard page labels
 * Interpolates terminology placeholders automatically
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const dashboard = useDashboardPageLabels();
 *   return <h1>{dashboard.welcome}</h1>;
 * }
 * ```
 */
export function useDashboardPageLabels(): DashboardPageLabels {
  const { labels } = useLabelsContext();
  const { terminology } = useTerminology();
  
  return useMemo(
    () => interpolateObject(labels.pages.dashboard, terminology),
    [labels.pages.dashboard, terminology]
  );
}

/**
 * Hook to access my schedule page labels
 * Interpolates terminology placeholders automatically
 *
 * @example
 * ```tsx
 * function MySchedule() {
 *   const mySchedule = useMySchedulePageLabels();
 *   return <h1>{mySchedule.pageTitle}</h1>;
 * }
 * ```
 */
export function useMySchedulePageLabels(): MySchedulePageLabels {
  const { labels } = useLabelsContext();
  const { terminology } = useTerminology();
  
  return useMemo(
    () => interpolateObject(labels.pages.mySchedule, terminology),
    [labels.pages.mySchedule, terminology]
  );
}

/**
 * Hook to access settings page labels
 * Interpolates terminology placeholders automatically
 *
 * @example
 * ```tsx
 * function Settings() {
 *   const settings = useSettingsPageLabels();
 *   return <h1>{settings.pageTitle}</h1>;
 * }
 * ```
 */
export function useSettingsPageLabels(): SettingsPageLabels {
  const { labels } = useLabelsContext();
  const { terminology } = useTerminology();
  
  return useMemo(
    () => interpolateObject(labels.pages.settings, terminology),
    [labels.pages.settings, terminology]
  );
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook to get a specific label by path with fallback
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const saveLabel = useLabel('global.actions.save', 'Save');
 *   return <button>{saveLabel}</button>;
 * }
 * ```
 */
export function useLabel(path: string, fallback: string): string {
  const { labels } = useLabelsContext();
  const value = getNestedValue<string>(labels as unknown as Record<string, unknown>, path);
  return value ?? fallback;
}

/**
 * Hook to get the complete labels config object
 * Useful for passing to utility functions
 *
 * @example
 * ```tsx
 * function ExportButton() {
 *   const config = useLabelsConfig();
 *   // Pass config to export function
 * }
 * ```
 */
export function useLabelsConfig(): LabelsConfig {
  const { labels } = useLabelsContext();
  return labels;
}
