import {
  SkillLevel,
  AvailabilityStatus,
  StaffType,
  StaffRating,
  RateType,
  CostUnitType,
  ExperienceRequirement,
} from '@prisma/client';

/**
 * Skill Level Labels for display
 */
export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

/**
 * Skill Level Options for forms
 */
export const SKILL_LEVEL_OPTIONS: Array<{ value: SkillLevel; label: string }> = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
];

/**
 * Availability Status Labels for display
 */
export const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  OPEN_TO_OFFERS: 'Available',
  BUSY: 'Busy',
  TIME_OFF: 'Time Off',
};

/**
 * Availability Status Options for forms
 */
export const AVAILABILITY_OPTIONS: Array<{ value: AvailabilityStatus; label: string }> = [
  { value: 'OPEN_TO_OFFERS', label: 'Available' },
  { value: 'BUSY', label: 'Busy' },
  { value: 'TIME_OFF', label: 'Time Off' },
];

/**
 * Staff Type Labels for display
 */
export const STAFF_TYPE_LABELS: Record<StaffType, string> = {
  EMPLOYEE: 'Employee',
  CONTRACTOR: 'Contractor',
};

/**
 * Staff Type Options for forms
 */
export const STAFF_TYPE_OPTIONS: Array<{ value: StaffType; label: string }> = [
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'CONTRACTOR', label: 'Contractor' },
];

/**
 * Staff Rating Labels for display
 */
export const STAFF_RATING_LABELS: Record<StaffRating, string> = {
  NA: 'N/A',
  A: 'A',
  B: 'B',
  C: 'C',
};

/**
 * Rate Type Labels for display
 */
export const RATE_TYPE_LABELS: Record<RateType, string> = {
  PER_HOUR: 'Per Hour',
  PER_SHIFT: 'Per Shift',
  PER_DAY: 'Per Day',
  PER_EVENT: 'Per Event',
};

/**
 * Rate Type Options for forms
 */
export const RATE_TYPE_OPTIONS: Array<{ value: RateType; label: string }> = [
  { value: 'PER_HOUR', label: 'Per Hour' },
  { value: 'PER_SHIFT', label: 'Per Shift' },
  { value: 'PER_DAY', label: 'Per Day' },
  { value: 'PER_EVENT', label: 'Per Event' },
];

/**
 * Cost Unit Type Labels for display
 */
export const COST_UNIT_TYPE_LABELS: Record<CostUnitType, string> = {
  EVENT: 'Per Event',
  ASSIGNMENT: 'Per Assignment',
  HOURLY: 'Hourly',
};

/**
 * Cost Unit Type Options for forms
 */
export const COST_UNIT_TYPE_OPTIONS: Array<{ value: CostUnitType; label: string }> = [
  { value: 'EVENT', label: 'Per Event' },
  { value: 'ASSIGNMENT', label: 'Per Assignment' },
  { value: 'HOURLY', label: 'Hourly' },
];

/**
 * Experience Requirement Labels for display
 */
export const EXPERIENCE_REQUIREMENT_LABELS: Record<ExperienceRequirement, string> = {
  ANY: 'Any',
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

/**
 * Experience Requirement Options for forms
 */
export const EXPERIENCE_REQUIREMENT_OPTIONS: Array<{
  value: ExperienceRequirement;
  label: string;
}> = [
  { value: 'ANY', label: 'Any' },
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
];
