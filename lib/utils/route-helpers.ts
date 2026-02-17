import { type TerminologyConfig } from "@/lib/config/terminology";

/**
 * Route Helper Utilities
 *
 * These utilities generate dynamic routes based on the current terminology configuration.
 * Use these helpers instead of hardcoded routes to ensure URLs update when terminology changes.
 */

/**
 * Get the staff route based on current terminology
 *
 * @param terminology - The terminology configuration
 * @returns The staff route (e.g., "/staff" or "/talent")
 *
 * @example
 * ```tsx
 * const { terminology } = useTerminology();
 * const route = getStaffRoute(terminology); // "/talent"
 * <Link href={route}>View All Talent</Link>
 * ```
 */
export function getStaffRoute(terminology: TerminologyConfig): string {
  return `/${terminology.staff.route}`;
}

/**
 * Get a specific staff member route
 *
 * @param terminology - The terminology configuration
 * @param staffId - The staff member's ID
 * @returns The staff member route (e.g., "/staff/123" or "/talent/123")
 *
 * @example
 * ```tsx
 * const { terminology } = useTerminology();
 * const route = getStaffMemberRoute(terminology, "abc-123"); // "/talent/abc-123"
 * <Link href={route}>View Profile</Link>
 * ```
 */
export function getStaffMemberRoute(
  terminology: TerminologyConfig,
  staffId: string
): string {
  return `/${terminology.staff.route}/${staffId}`;
}

/**
 * Get the event route based on current terminology
 *
 * @param terminology - The terminology configuration
 * @returns The event route (e.g., "/events" or "/tasks")
 *
 * @example
 * ```tsx
 * const { terminology } = useTerminology();
 * const route = getEventRoute(terminology); // "/tasks"
 * <Link href={route}>View All Tasks</Link>
 * ```
 */
export function getEventRoute(terminology: TerminologyConfig): string {
  return `/${terminology.event.route}`;
}

/**
 * Get a specific event route
 *
 * @param terminology - The terminology configuration
 * @param eventId - The event's ID
 * @returns The event route (e.g., "/events/123" or "/tasks/123")
 *
 * @example
 * ```tsx
 * const { terminology } = useTerminology();
 * const route = getEventDetailsRoute(terminology, "evt-123"); // "/tasks/evt-123"
 * <Link href={route}>View Details</Link>
 * ```
 */
export function getEventDetailsRoute(
  terminology: TerminologyConfig,
  eventId: string
): string {
  return `/${terminology.event.route}/${eventId}`;
}

/**
 * Get the event calendar route
 *
 * @param terminology - The terminology configuration
 * @returns The calendar route (e.g., "/events?view=calendar" or "/tasks?view=calendar")
 *
 * @example
 * ```tsx
 * const { terminology } = useTerminology();
 * const route = getEventCalendarRoute(terminology); // "/tasks?view=calendar"
 * <Link href={route}>Calendar View</Link>
 * ```
 */
export function getEventCalendarRoute(terminology: TerminologyConfig): string {
  return `/${terminology.event.route}?view=calendar`;
}

/**
 * Get the timesheet route
 *
 * @param terminology - The terminology configuration (kept for API compatibility)
 * @returns The timesheet route ("/timesheet")
 *
 * @example
 * ```tsx
 * const { terminology } = useTerminology();
 * const route = getTimesheetRoute(terminology); // "/timesheet"
 * <Link href={route}>Time Sheet</Link>
 * ```
 */
export function getTimesheetRoute(terminology: TerminologyConfig): string {
  return '/timesheet';
}

/**
 * Get the dashboard route
 *
 * @returns The dashboard route
 *
 * @example
 * ```tsx
 * const route = getDashboardRoute(); // "/dashboard"
 * <Link href={route}>Dashboard</Link>
 * ```
 */
export function getDashboardRoute(): string {
  return "/dashboard";
}

/**
 * Get the settings labels route (includes terminology settings)
 *
 * @returns The labels settings route
 *
 * @example
 * ```tsx
 * const route = getSettingsLabelsRoute(); // "/settings/labels"
 * <Link href={route}>Customize Labels</Link>
 * ```
 */
export function getSettingsLabelsRoute(): string {
  return "/settings/labels";
}

/**
 * Check if the current path matches the staff route
 *
 * @param pathname - The current pathname
 * @param terminology - The terminology configuration
 * @returns True if the path is a staff route
 *
 * @example
 * ```tsx
 * const { terminology } = useTerminology();
 * const pathname = usePathname();
 * const isStaffPage = isStaffRoutePath(pathname, terminology); // true if on /talent
 * ```
 */
export function isStaffRoutePath(
  pathname: string,
  terminology: TerminologyConfig
): boolean {
  return pathname.startsWith(`/${terminology.staff.route}`);
}

/**
 * Check if the current path matches the event route
 *
 * @param pathname - The current pathname
 * @param terminology - The terminology configuration
 * @returns True if the path is an event route
 *
 * @example
 * ```tsx
 * const { terminology } = useTerminology();
 * const pathname = usePathname();
 * const isEventPage = isEventRoutePath(pathname, terminology); // true if on /tasks
 * ```
 */
export function isEventRoutePath(
  pathname: string,
  terminology: TerminologyConfig
): boolean {
  return pathname.startsWith(`/${terminology.event.route}`);
}
