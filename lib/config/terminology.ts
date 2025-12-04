/**
 * Terminology Configuration Module
 *
 * Centralized configuration for customizable terminology throughout the application.
 * Allows users to replace "Staff" with "Talent" (or custom term) and "Event" with
 * "Task", "Project", "Job", etc.
 */

export interface TermConfig {
  singular: string;      // "Staff" or "Talent"
  plural: string;        // "Staff" or "Talents"
  lower: string;         // "staff" or "talent"
  lowerPlural: string;   // "staff" or "talents"
  upper: string;         // "STAFF" or "TALENT"
  upperPlural: string;   // "STAFF" or "TALENTS"
  route: string;         // "staff" or "talent" (for URLs)
}

export interface TerminologyConfig {
  staff: TermConfig;
  event: TermConfig;
  staffIdPrefix: string;   // "STF" or "TAL" (auto-derived)
  eventIdPrefix: string;   // "EVT" or "TSK" (auto-derived)
}

/**
 * Build a complete TermConfig from singular and plural forms
 * Generates all case variations automatically
 */
export function buildTermConfig(singular: string, plural: string): TermConfig {
  return {
    singular,
    plural,
    lower: singular.toLowerCase(),
    lowerPlural: plural.toLowerCase(),
    upper: singular.toUpperCase(),
    upperPlural: plural.toUpperCase(),
    route: plural.toLowerCase(), // URL route segment (plural, lowercase)
  };
}

/**
 * Derive a 3-letter ID prefix from a term
 * Examples:
 * - "Staff" → "STF"
 * - "Talent" → "TAL"
 * - "Event" → "EVT"
 * - "Task" → "TSK"
 * - "Project" → "PRJ"
 */
export function deriveIdPrefix(term: string): string {
  const cleaned = term.trim().toUpperCase();

  // For short terms (3 chars or less), use as-is
  if (cleaned.length <= 3) {
    return cleaned.padEnd(3, 'X');
  }

  // Extract consonants for better abbreviation
  const consonants = cleaned.replace(/[AEIOU]/g, '');

  // If we have enough consonants, use first 3
  if (consonants.length >= 3) {
    return consonants.substring(0, 3);
  }

  // Otherwise, use first 3 letters of the term
  return cleaned.substring(0, 3);
}

/**
 * Build a complete TerminologyConfig from raw terminology data
 */
export function buildTerminologyConfig(data: {
  staffTermSingular: string;
  staffTermPlural: string;
  eventTermSingular: string;
  eventTermPlural: string;
}): TerminologyConfig {
  return {
    staff: buildTermConfig(data.staffTermSingular, data.staffTermPlural),
    event: buildTermConfig(data.eventTermSingular, data.eventTermPlural),
    staffIdPrefix: deriveIdPrefix(data.staffTermSingular),
    eventIdPrefix: deriveIdPrefix(data.eventTermSingular),
  };
}

/**
 * Get default terminology from environment variables
 * Falls back to "Staff" and "Event" if not configured
 */
export function getDefaultTerminology(): TerminologyConfig {
  const staffSingular = process.env.NEXT_PUBLIC_TERM_STAFF_SINGULAR || 'Staff';
  const staffPlural = process.env.NEXT_PUBLIC_TERM_STAFF_PLURAL || 'Staff';
  const eventSingular = process.env.NEXT_PUBLIC_TERM_EVENT_SINGULAR || 'Event';
  const eventPlural = process.env.NEXT_PUBLIC_TERM_EVENT_PLURAL || 'Events';

  return buildTerminologyConfig({
    staffTermSingular: staffSingular,
    staffTermPlural: staffPlural,
    eventTermSingular: eventSingular,
    eventTermPlural: eventPlural,
  });
}

/**
 * Preset terminology configurations for quick selection
 */
export const TERMINOLOGY_PRESETS = {
  default: {
    label: 'Staff / Events',
    staffTermSingular: 'Staff',
    staffTermPlural: 'Staff',
    eventTermSingular: 'Event',
    eventTermPlural: 'Events',
  },
  talentEvents: {
    label: 'Talent / Events',
    staffTermSingular: 'Talent',
    staffTermPlural: 'Talents',
    eventTermSingular: 'Event',
    eventTermPlural: 'Events',
  },
  staffTasks: {
    label: 'Staff / Tasks',
    staffTermSingular: 'Staff',
    staffTermPlural: 'Staff',
    eventTermSingular: 'Task',
    eventTermPlural: 'Tasks',
  },
  talentProjects: {
    label: 'Talent / Projects',
    staffTermSingular: 'Talent',
    staffTermPlural: 'Talents',
    eventTermSingular: 'Project',
    eventTermPlural: 'Projects',
  },
  crewJobs: {
    label: 'Crew / Jobs',
    staffTermSingular: 'Crew',
    staffTermPlural: 'Crew',
    eventTermSingular: 'Job',
    eventTermPlural: 'Jobs',
  },
} as const;

/**
 * Staff term preset options for dropdown
 */
export const STAFF_TERM_OPTIONS = [
  { value: 'Staff', label: 'Staff' },
  { value: 'Talent', label: 'Talent' },
  { value: 'Member', label: 'Member' },
  { value: 'Crew', label: 'Crew' },
  { value: 'Worker', label: 'Worker' },
  { value: 'Employee', label: 'Employee' },
] as const;

/**
 * Event term preset options for dropdown
 */
export const EVENT_TERM_OPTIONS = [
  { value: 'Event', label: 'Event' },
  { value: 'Task', label: 'Task' },
  { value: 'Project', label: 'Project' },
  { value: 'Job', label: 'Job' },
  { value: 'Function', label: 'Function' },
  { value: 'Experience', label: 'Experience' },
  { value: 'Gig', label: 'Gig' },
] as const;
