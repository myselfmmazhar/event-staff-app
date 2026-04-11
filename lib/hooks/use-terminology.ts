import { useTerminologyContext } from "@/lib/providers/terminology-provider";
import type { TermConfig, TerminologyConfig } from "@/lib/config/terminology";

/**
 * Hook to access full terminology configuration
 *
 * Returns the complete terminology config including staff and event terms,
 * ID prefixes, and all case variations.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { terminology, isLoading, refreshTerminology } = useTerminology();
 *
 *   return (
 *     <div>
 *       <h1>{terminology.staff.plural}</h1>
 *       <h2>{terminology.event.plural}</h2>
 *       <p>ID Prefix: {terminology.staffIdPrefix}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTerminology() {
  return useTerminologyContext();
}

/**
 * Convenience hook to access only staff terminology
 *
 * Returns staff term configuration with all case variations:
 * - singular: "Staff" or "Talent"
 * - plural: "Staff" or "Talents"
 * - lower: "staff" or "talent"
 * - lowerPlural: "staff" or "talents"
 * - upper: "STAFF" or "TALENT"
 * - upperPlural: "STAFF" or "TALENTS"
 * - route: "staff" or "talent" (for URLs)
 *
 * @example
 * ```tsx
 * function StaffList() {
 *   const staffTerm = useStaffTerm();
 *
 *   return (
 *     <div>
 *       <h1>{staffTerm.plural}</h1>
 *       <Link href={`/${staffTerm.route}`}>View {staffTerm.plural}</Link>
 *       <Button>Add {staffTerm.singular}</Button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useStaffTerm(): TermConfig {
  const { terminology } = useTerminologyContext();
  return terminology.staff;
}

/**
 * Convenience hook to access only event terminology
 *
 * Returns event term configuration with all case variations:
 * - singular: "Event" or "Task"
 * - plural: "Events" or "Tasks"
 * - lower: "event" or "task"
 * - lowerPlural: "events" or "tasks"
 * - upper: "EVENT" or "TASK"
 * - upperPlural: "EVENTS" or "TASKS"
 * - route: "events" or "tasks" (for URLs)
 *
 * @example
 * ```tsx
 * function EventList() {
 *   const eventTerm = useEventTerm();
 *
 *   return (
 *     <div>
 *       <h1>{eventTerm.plural}</h1>
 *       <Link href={`/${eventTerm.route}`}>View {eventTerm.plural}</Link>
 *       <Button>Create {eventTerm.singular}</Button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useEventTerm(): TermConfig {
  const { terminology } = useTerminologyContext();
  return terminology.event;
}

/**
 * Hook to get staff ID prefix
 *
 * Returns the 3-letter prefix used for staff IDs (e.g., "STF", "TAL")
 *
 * @example
 * ```tsx
 * function StaffIdDisplay() {
 *   const prefix = useStaffIdPrefix();
 *   return <span>{prefix}-2025-001</span>;
 * }
 * ```
 */
export function useStaffIdPrefix(): string {
  const { terminology } = useTerminologyContext();
  return terminology.staffIdPrefix;
}

/**
 * Hook to get event ID prefix
 *
 * Returns the 3-letter prefix used for event IDs (e.g., "EVT", "TSK")
 *
 * @example
 * ```tsx
 * function EventIdDisplay() {
 *   const prefix = useEventIdPrefix();
 *   return <span>{prefix}-2025-042</span>;
 * }
 * ```
 */
export function useEventIdPrefix(): string {
  const { terminology } = useTerminologyContext();
  return terminology.eventIdPrefix;
}

/**
 * Convenience hook to access only role terminology
 *
 * Returns role term configuration with all case variations:
 * - singular: "Role" or "Position"
 * - plural: "Roles" or "Positions"
 * - lower: "role" or "position"
 * - lowerPlural: "roles" or "positions"
 * - upper: "ROLE" or "POSITION"
 * - upperPlural: "ROLES" or "POSITIONS"
 * - route: "roles" or "positions" (for URLs)
 *
 * @example
 * ```tsx
 * function UserForm() {
 *   const roleTerm = useRoleTerm();
 *
 *   return (
 *     <div>
 *       <Label>{roleTerm.singular}</Label>
 *       <p>Select a {roleTerm.lower}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useRoleTerm(): TermConfig {
  const { terminology } = useTerminologyContext();
  return terminology.role;
}

/**
 * Hook to get the complete terminology config object
 * Useful for passing to utility functions or export handlers
 *
 * @example
 * ```tsx
 * function ExportButton() {
 *   const config = useTerminologyConfig();
 *
 *   const handleExport = () => {
 *     exportToCSV(data, config); // Pass config to export function
 *   };
 *
 *   return <Button onClick={handleExport}>Export</Button>;
 * }
 * ```
 */
export function useTerminologyConfig(): TerminologyConfig {
  const { terminology } = useTerminologyContext();
  return terminology;
}
