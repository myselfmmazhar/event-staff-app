import {
  AccountStatus,
  SkillLevel,
  AvailabilityStatus,
  StaffType,
  StaffRating,
  RateType,
  AmountType,
  CostUnitType,
  ExperienceRequirement,
  MinimumPurchase,
  PriceUnitType,
} from '@prisma/client';

/**
 * Account Status Options for forms
 */
export const ACCOUNT_STATUS_OPTIONS: Array<{ value: AccountStatus; label: string }> = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'DISABLED', label: 'Disabled' },
  { value: 'TERMINATED', label: 'Terminated' },
  { value: 'ARCHIVED', label: 'Archived' },
];

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
  COMPANY: 'Company',
  EMPLOYEE: 'Employee',
  CONTRACTOR: 'Contractor',
  FREELANCE: 'Freelance',
};

/**
 * Staff Type Options for forms
 */
export const STAFF_TYPE_OPTIONS: Array<{ value: StaffType; label: string }> = [
  { value: 'COMPANY', label: 'Company' },
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'CONTRACTOR', label: 'Contractor' },
  { value: 'FREELANCE', label: 'Freelance' },
];

/**
 * Staff Rating Labels for display
 */
export const STAFF_RATING_LABELS: Record<StaffRating, string> = {
  NA: 'N/A',
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
};

/**
 * Staff Rating Options for forms (including 'Any' option)
 */
export const STAFF_RATING_OPTIONS: Array<{ value: StaffRating | 'ANY'; label: string }> = [
  { value: 'ANY', label: 'Any' },
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
  { value: 'D', label: 'D' },
  { value: 'NA', label: 'N/A' },
];

/**
 * Assignment Type Options for forms
 */
export const ASSIGNMENT_TYPE_OPTIONS: Array<{ value: 'PRODUCT' | 'SERVICE'; label: string }> = [
  { value: 'PRODUCT', label: 'Product' },
  { value: 'SERVICE', label: 'Service' },
];

/**
 * Rate Type Labels for display
 */
export const RATE_TYPE_LABELS: Record<RateType, string> = {
  PER_HOUR: 'Per Hour',
  PER_SHIFT: 'Per Assignment',
  PER_DAY: 'Per Day',
  PER_EVENT: 'Per Event',
};

/**
 * Rate Type Options for forms (simplified to 2 options)
 */
export const RATE_TYPE_OPTIONS: Array<{ value: RateType; label: string }> = [
  { value: 'PER_HOUR', label: 'Per Hour' },
  { value: 'PER_SHIFT', label: 'Per Assignment' },
];

/**
 * Amount Type Labels for display
 */
export const AMOUNT_TYPE_LABELS: Record<AmountType, string> = {
  MULTIPLIER: 'Multiplier',
  FIXED: 'Fixed',
};

/**
 * Amount Type Options for forms
 */
export const AMOUNT_TYPE_OPTIONS: Array<{ value: AmountType; label: string }> = [
  { value: 'MULTIPLIER', label: 'Multiplier' },
  { value: 'FIXED', label: 'Fixed' },
];

/**
 * Cost Unit Type Labels for display
 */
export const COST_UNIT_TYPE_LABELS: Record<CostUnitType, string> = {
  HOURLY: 'Per Hour',
  ASSIGNMENT: 'Per Assignment',
  SHIFT: 'Per Shift',
  DAY: 'Per Day',
  JOB: 'Per Job',
};

/**
 * Cost Unit Type Options for forms
 */
export const COST_UNIT_TYPE_OPTIONS: Array<{ value: CostUnitType; label: string }> = [
  { value: 'HOURLY', label: 'Per Hour' },
  { value: 'ASSIGNMENT', label: 'Per Assignment' },
];

/**
 * Price Unit Type Labels for display
 */
export const PRICE_UNIT_TYPE_LABELS: Record<PriceUnitType, string> = {
  UNIT: 'Per Unit',
  PACK: 'Per Pack',
  WEIGHT: 'Per Weight',
};

/**
 * Price Unit Type Options for forms
 */
export const PRICE_UNIT_TYPE_OPTIONS: Array<{ value: PriceUnitType; label: string }> = (
  Object.entries(PRICE_UNIT_TYPE_LABELS) as Array<[PriceUnitType, string]>
).map(([value, label]) => ({ value, label }));

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

/**
 * Minimum Purchase Labels for display
 */
export const MINIMUM_PURCHASE_LABELS: Record<MinimumPurchase, string> = {
  ANY: 'Any',
  ONE: '1',
  TWO_TO_FIVE: '2-5',
  SIX_TO_TEN: '6-10',
};

/**
 * Minimum Purchase Options for forms
 */
export const MINIMUM_PURCHASE_OPTIONS: Array<{ value: MinimumPurchase; label: string }> = (
  Object.entries(MINIMUM_PURCHASE_LABELS) as Array<[MinimumPurchase, string]>
).map(([value, label]) => ({ value, label }));
