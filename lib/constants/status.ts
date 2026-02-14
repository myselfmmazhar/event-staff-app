import { EventStatus, AccountStatus, CallTimeInvitationStatus } from '@prisma/client';

/**
 * Event Status Colors for Badge component
 */
export const EVENT_STATUS_COLORS: Record<
  EventStatus,
  'default' | 'info' | 'success' | 'primary' | 'purple' | 'danger'
> = {
  DRAFT: 'default',
  PUBLISHED: 'info',
  CONFIRMED: 'success',
  IN_PROGRESS: 'primary',
  COMPLETED: 'purple',
  CANCELLED: 'danger',
};

/**
 * Event Status Labels for display
 */
export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

/**
 * Account Status Colors for Badge component
 */
export const ACCOUNT_STATUS_COLORS: Record<
  AccountStatus,
  'default' | 'info' | 'success' | 'danger' | 'secondary' | 'warning'
> = {
  PENDING: 'secondary',
  ACTIVE: 'success',
  DISABLED: 'danger',
  TERMINATED: 'danger',
  ARCHIVED: 'warning',
};

/**
 * Account Status Labels for display
 */
export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  PENDING: 'Pending',
  ACTIVE: 'Active',
  DISABLED: 'Disabled',
  TERMINATED: 'Terminated',
  ARCHIVED: 'Archived',
};

/**
 * Call Time Invitation Status Badge Variants
 */
export const INVITATION_STATUS_VARIANTS: Record<
  CallTimeInvitationStatus,
  'default' | 'secondary' | 'destructive' | 'outline' | 'success'
> = {
  PENDING: 'secondary',
  ACCEPTED: 'success',
  DECLINED: 'destructive',
  CANCELLED: 'outline',
  WAITLISTED: 'default',
};

/**
 * Call Time Invitation Status Labels for display
 */
export const INVITATION_STATUS_LABELS: Record<CallTimeInvitationStatus, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  CANCELLED: 'Cancelled',
  WAITLISTED: 'Waitlisted',
};
