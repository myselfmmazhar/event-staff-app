import type { TerminologyConfig } from "@/lib/config/terminology";
import { interpolateLabel as interpolateLabelFromConfig } from "@/lib/config/labels";

/**
 * Interpolate terminology placeholders in a label string
 *
 * Replaces placeholders like {Staff}, {staff}, {StaffPlural}, etc. with
 * the corresponding terminology values.
 *
 * @example
 * ```tsx
 * const label = interpolateLabel("Add {Staff}", terminology);
 * // Returns "Add Talent" if staff term is "Talent"
 * ```
 */
export function interpolateLabel(
  label: string,
  terminology: TerminologyConfig
): string {
  return interpolateLabelFromConfig(label, terminology);
}

/**
 * Get a label value with terminology interpolation
 *
 * @example
 * ```tsx
 * const label = getLabelWithTerminology(
 *   customLabel,      // "Add {Staff}" or undefined
 *   defaultLabel,     // "Add Staff"
 *   terminology
 * );
 * // Returns interpolated custom label or interpolated default
 * ```
 */
export function getLabelWithTerminology(
  customLabel: string | undefined,
  defaultLabel: string,
  terminology: TerminologyConfig
): string {
  const label = customLabel ?? defaultLabel;
  return interpolateLabel(label, terminology);
}

/**
 * Check if a string contains terminology placeholders
 *
 * @example
 * ```tsx
 * hasPlaceholders("Add {Staff}"); // true
 * hasPlaceholders("Add Staff");   // false
 * ```
 */
export function hasPlaceholders(label: string): boolean {
  return /{(?:Staff|staff|StaffPlural|staffPlural|STAFF|STAFFPLURAL|Event|event|EventPlural|eventPlural|EVENT|EVENTPLURAL|Role|role|RolePlural|rolePlural|ROLE|ROLEPLURAL)}/.test(
    label
  );
}

/**
 * Format a label key for display
 *
 * Converts a dot-separated key to a human-readable format.
 *
 * @example
 * ```tsx
 * formatLabelKey("columns.staffId"); // "Columns Staff Id"
 * formatLabelKey("pageTitle");       // "Page Title"
 * ```
 */
export function formatLabelKey(key: string): string {
  return key
    .split(".")
    .map((part) =>
      part
        // Insert space before capital letters
        .replace(/([A-Z])/g, " $1")
        // Capitalize first letter
        .replace(/^./, (str) => str.toUpperCase())
        .trim()
    )
    .join(" › ");
}

/**
 * Get the parent key from a nested key path
 *
 * @example
 * ```tsx
 * getParentKey("columns.staffId"); // "columns"
 * getParentKey("pageTitle");       // ""
 * ```
 */
export function getParentKey(key: string): string {
  const parts = key.split(".");
  parts.pop();
  return parts.join(".");
}

/**
 * Get the leaf key from a nested key path
 *
 * @example
 * ```tsx
 * getLeafKey("columns.staffId"); // "staffId"
 * getLeafKey("pageTitle");       // "pageTitle"
 * ```
 */
export function getLeafKey(key: string): string {
  const parts = key.split(".");
  return parts[parts.length - 1] ?? key;
}

/**
 * Build a full label key from page and field path
 *
 * @example
 * ```tsx
 * buildLabelKey("staff", "columns.staffId"); // "pages.staff.columns.staffId"
 * buildLabelKey("staff", "pageTitle");       // "pages.staff.pageTitle"
 * ```
 */
export function buildLabelKey(page: string, fieldPath: string): string {
  return `pages.${page}.${fieldPath}`;
}

/**
 * Build a page-relative label key
 *
 * @example
 * ```tsx
 * buildPageLabelKey("columns", "staffId"); // "columns.staffId"
 * ```
 */
export function buildPageLabelKey(category: string, field: string): string {
  return `${category}.${field}`;
}
