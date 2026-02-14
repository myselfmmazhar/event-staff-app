import {
  AccountStatus,
  StaffType,
  StaffRole,
  SkillLevel,
  StaffRating,
  AvailabilityStatus,
} from '@prisma/client';

/**
 * Account status options for dropdown
 */
export const ACCOUNT_STATUS_OPTIONS = [
  { value: AccountStatus.ACTIVE, label: 'Active' },
  { value: AccountStatus.PENDING, label: 'Pending' },
  { value: AccountStatus.DISABLED, label: 'Disabled' },
  { value: AccountStatus.TERMINATED, label: 'Terminated' },
  { value: AccountStatus.ARCHIVED, label: 'Archived' },
] as const;

/**
 * Staff type options for dropdown
 */
export const STAFF_TYPE_OPTIONS = [
  { value: StaffType.EMPLOYEE, label: 'Employee' },
  { value: StaffType.CONTRACTOR, label: 'Contractor' },
  { value: StaffType.FREELANCE, label: 'Freelance' },
  { value: StaffType.COMPANY, label: 'Company' },
] as const;

/**
 * Staff role options for dropdown
 */
export const STAFF_ROLE_OPTIONS = [
  { value: StaffRole.INDIVIDUAL, label: 'Individual' },
  { value: StaffRole.TEAM, label: 'Team' },
] as const;

/**
 * Skill level options for dropdown
 */
export const SKILL_LEVEL_OPTIONS = [
  { value: SkillLevel.BEGINNER, label: 'Beginner' },
  { value: SkillLevel.INTERMEDIATE, label: 'Intermediate' },
  { value: SkillLevel.ADVANCED, label: 'Advanced' },
] as const;

/**
 * Staff rating options for dropdown
 */
export const STAFF_RATING_OPTIONS = [
  { value: StaffRating.NA, label: 'Pending' },
  { value: StaffRating.A, label: 'A' },
  { value: StaffRating.B, label: 'B' },
  { value: StaffRating.C, label: 'C' },
  { value: StaffRating.D, label: 'D' },
] as const;

/**
 * Availability status options for dropdown
 */
export const AVAILABILITY_STATUS_OPTIONS = [
  { value: AvailabilityStatus.OPEN_TO_OFFERS, label: 'Open to Offers' },
  { value: AvailabilityStatus.BUSY, label: 'Busy' },
  { value: AvailabilityStatus.TIME_OFF, label: 'Time Off' },
] as const;
