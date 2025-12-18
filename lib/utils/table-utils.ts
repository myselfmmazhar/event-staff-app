/**
 * Toggle sort order (asc <-> desc)
 */
export function toggleSortOrder(currentOrder: "asc" | "desc"): "asc" | "desc" {
  return currentOrder === "asc" ? "desc" : "asc";
}

/**
 * Get sort icon based on current sort state
 */
export function getSortIcon(
  columnKey: string,
  currentSortBy: string,
  currentSortOrder: "asc" | "desc"
): "asc" | "desc" | "none" {
  if (columnKey !== currentSortBy) {
    return "none";
  }
  return currentSortOrder;
}

/**
 * Handle column sort click
 */
export function handleSort<T extends string>(
  columnKey: T,
  currentSortBy: T,
  currentSortOrder: "asc" | "desc",
  setSortBy: (sortBy: T) => void,
  setSortOrder: (sortOrder: "asc" | "desc") => void
) {
  if (columnKey === currentSortBy) {
    // Toggle sort order for the same column
    setSortOrder(toggleSortOrder(currentSortOrder));
  } else {
    // Set new column with default desc order
    setSortBy(columnKey);
    setSortOrder("desc");
  }
}

/**
 * Generate skeleton rows for loading state
 */
export function generateSkeletonRows(count: number): number[] {
  return Array.from({ length: count }, (_, i) => i);
}

/**
 * Valid filter value types
 */
type FilterValue = string | number | boolean | null | undefined;

/**
 * Check if there are any active filters
 */
export function hasActiveFilters(filters: Record<string, FilterValue>): boolean {
  return Object.entries(filters).some(([key, value]) => {
    // Exclude pagination and sort fields
    if (["page", "limit", "sortBy", "sortOrder"].includes(key)) {
      return false;
    }
    // Check if value is not default/empty
    return value !== "" && value !== "ALL" && value !== "all" && value !== null && value !== undefined;
  });
}

/**
 * Format count text (e.g., "1-10 of 100 users")
 */
export function formatCountText(
  page: number,
  limit: number,
  total: number,
  entityName: string
): string {
  if (total === 0) {
    return `No ${entityName} found`;
  }

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return `${start}-${end} of ${total} ${entityName}`;
}
