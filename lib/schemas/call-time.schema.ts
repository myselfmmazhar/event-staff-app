import { z } from 'zod';
import { SkillLevel, RateType, CallTimeInvitationStatus, AmountType, StaffRating, AvailabilityStatus, InternalReviewRating, EventStatus } from '@prisma/client';

// Experience requirement options (matches Prisma ExperienceRequirement enum)
// Using string literals instead of z.nativeEnum for browser compatibility
const experienceRequiredValues = ['ANY', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;

// Staff rating options (matches Prisma StaffRating enum)
const staffRatingValues = ['NA', 'A', 'B', 'C', 'D'] as const;

// Time format validation (HH:MM)
const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

// Field error messages
const FieldErrors = {
  eventId: 'Invalid event ID',
  serviceId: 'Invalid service ID',
  callTimeId: 'Invalid call time ID',
  invitationId: 'Invalid invitation ID',
  staffId: 'Invalid staff ID',
  numberOfStaffRequired: 'At least 1 staff member is required',
  startDate: 'Start date is required',
  endDate: 'End date is required',
  endDateAfterStart: 'End date must be after or equal to start date',
  timeFormat: 'Time must be in HH:MM format',
  payRate: 'Pay rate must be a positive number',
  billRate: 'Bill rate must be a positive number',
  rateTypeMismatch: 'Pay rate type and bill rate type must match',
  declineReasonRequired: 'A reason is required when declining',
};

/**
 * Call Time Schema - Validation schemas for call time operations
 */
export class CallTimeSchema {
  /**
   * Create Call Time Schema
   */
  static create = z
    .object({
      eventId: z.string().uuid(FieldErrors.eventId),
      serviceId: z.string().uuid(FieldErrors.serviceId),
      numberOfStaffRequired: z
        .number()
        .int()
        .min(1, FieldErrors.numberOfStaffRequired)
        .default(1),
      skillLevel: z.nativeEnum(SkillLevel).default(SkillLevel.BEGINNER),

      // Date/Time (nullable for UBD support)
      // Note: z.null() must come first, otherwise z.coerce.date(null) produces epoch date
      startDate: z.union([z.null(), z.coerce.date()]).optional(),
      startTime: z
        .string()
        .refine((val) => !val || timeRegex.test(val), {
          message: FieldErrors.timeFormat,
        })
        .optional()
        .nullable(),
      endDate: z.union([z.null(), z.coerce.date()]).optional(),
      endTime: z
        .string()
        .refine((val) => !val || timeRegex.test(val), {
          message: FieldErrors.timeFormat,
        })
        .optional()
        .nullable(),

      // Rates
      payRate: z
        .number()
        .positive(FieldErrors.payRate)
        .transform((val) => parseFloat(val.toFixed(2))),
      payRateType: z.nativeEnum(RateType),
      billRate: z
        .number()
        .positive(FieldErrors.billRate)
        .transform((val) => parseFloat(val.toFixed(2))),
      billRateType: z.nativeEnum(RateType),

      notes: z
        .string()
        .max(5000)
        .optional()
        .transform((val) => val?.trim()),
      // Commission & Overtime
      approveOvertime: z.boolean().default(false),
      overtimeRate: z.number().min(0).optional().nullable(),
      overtimeRateType: z.nativeEnum(AmountType).optional().nullable(),
      commission: z.boolean().default(false),
      commissionAmount: z.number().min(0).optional().nullable(),
      commissionAmountType: z.nativeEnum(AmountType).optional().nullable(),
      expenditure: z.boolean().default(false),
      expenditureAmount: z.number().min(0).optional().nullable(),
      expenditureAmountType: z.nativeEnum(AmountType).optional().nullable(),
      expenditureCost: z.number().min(0).optional().nullable(),
      expenditurePrice: z.number().min(0).optional().nullable(),
      travelInMinimum: z.boolean().default(false),
    })
    .refine((data) => data.payRateType === data.billRateType, {
      message: FieldErrors.rateTypeMismatch,
      path: ['billRateType'],
    })
    .refine(
      (data) => {
        // Only validate if both dates are provided (not UBD)
        if (data.startDate && data.endDate) {
          return data.endDate >= data.startDate;
        }
        return true;
      },
      {
        message: FieldErrors.endDateAfterStart,
        path: ['endDate'],
      }
    );

  /**
   * Update Call Time Schema
   */
  static update = z
    .object({
      id: z.string().uuid(FieldErrors.callTimeId),
      serviceId: z.string().uuid(FieldErrors.serviceId).optional(),
      numberOfStaffRequired: z.number().int().min(1).optional(),
      skillLevel: z.nativeEnum(SkillLevel).optional(),
      // Note: z.null() must come first, otherwise z.coerce.date(null) produces epoch date
      startDate: z.union([z.null(), z.coerce.date()]).optional(),
      startTime: z
        .string()
        .refine((val) => !val || timeRegex.test(val), {
          message: FieldErrors.timeFormat,
        })
        .optional()
        .nullable(),
      endDate: z.union([z.null(), z.coerce.date()]).optional(),
      endTime: z
        .string()
        .refine((val) => !val || timeRegex.test(val), {
          message: FieldErrors.timeFormat,
        })
        .optional()
        .nullable(),
      payRate: z
        .number()
        .positive()
        .transform((val) => parseFloat(val.toFixed(2)))
        .optional(),
      payRateType: z.nativeEnum(RateType).optional(),
      billRate: z
        .number()
        .positive()
        .transform((val) => parseFloat(val.toFixed(2)))
        .optional(),
      billRateType: z.nativeEnum(RateType).optional(),
      notes: z
        .string()
        .max(5000)
        .optional()
        .nullable()
        .transform((val) => val?.trim()),
      // Commission & Overtime
      approveOvertime: z.boolean().optional(),
      overtimeRate: z.number().min(0).optional().nullable(),
      overtimeRateType: z.nativeEnum(AmountType).optional().nullable(),
      commission: z.boolean().optional(),
      commissionAmount: z.number().min(0).optional().nullable(),
      commissionAmountType: z.nativeEnum(AmountType).optional().nullable(),
      expenditure: z.boolean().optional(),
      expenditureAmount: z.number().min(0).optional().nullable(),
      expenditureAmountType: z.nativeEnum(AmountType).optional().nullable(),
      expenditureCost: z.number().min(0).optional().nullable(),
      expenditurePrice: z.number().min(0).optional().nullable(),
      travelInMinimum: z.boolean().optional(),
    })
    .refine(
      (data) => {
        // Only validate if both are provided
        if (data.payRateType && data.billRateType) {
          return data.payRateType === data.billRateType;
        }
        return true;
      },
      {
        message: FieldErrors.rateTypeMismatch,
        path: ['billRateType'],
      }
    )
    .refine(
      (data) => {
        // Only validate if both are provided
        if (data.startDate && data.endDate) {
          return data.endDate >= data.startDate;
        }
        return true;
      },
      {
        message: FieldErrors.endDateAfterStart,
        path: ['endDate'],
      }
    );

  /**
   * Query Call Times Schema
   */
  static query = z.object({
    eventId: z.string().uuid(FieldErrors.eventId),
    page: z.number().int().min(1).default(1).optional(),
    limit: z.number().int().min(1).max(100).default(10).optional(),
  });

  /**
   * ID Schema
   */
  static id = z.object({
    id: z.string().uuid(FieldErrors.callTimeId),
  });

  /**
   * Send Invitations Schema
   */
  static sendInvitations = z.object({
    callTimeIds: z.array(z.string().uuid(FieldErrors.callTimeId)).min(1),
    staffIds: z
      .array(z.string().uuid(FieldErrors.staffId))
      .min(1, 'At least one staff member is required'),
  });

  /**
   * Respond to Invitation Schema (for staff)
   */
  static respondToInvitation = z
    .object({
      invitationId: z.string().uuid(FieldErrors.invitationId),
      accept: z.boolean(),
      declineReason: z.string().max(500).optional(),
    })
    .refine(
      (data) => {
        // Require reason when declining
        if (!data.accept && !data.declineReason?.trim()) {
          return false;
        }
        return true;
      },
      {
        message: FieldErrors.declineReasonRequired,
        path: ['declineReason'],
      }
    );

  /**
   * Batch Respond to Invitations Schema
   */
  static batchRespond = z.object({
    invitationIds: z.array(z.string().uuid(FieldErrors.invitationId)).min(1),
    accept: z.boolean(),
  });

  /**
   * Staff Search Schema
   */
  static staffSearch = z.object({
    callTimeIds: z.array(z.string().uuid(FieldErrors.callTimeId)).min(1),
    callTimeId: z.string().uuid(FieldErrors.callTimeId).optional(),
    includeAlreadyInvited: z.boolean().default(false),
    // Filters
    maxDistance: z.number().positive().optional(),
    skillLevels: z.array(z.nativeEnum(SkillLevel)).optional(),
    ratings: z.array(z.nativeEnum(StaffRating)).optional(),
    availabilityStatuses: z.array(z.nativeEnum(AvailabilityStatus)).optional(),
    page: z.number().int().min(1).default(1).optional(),
    limit: z.number().int().min(1).max(100).default(20).optional(),
  });

  /**
   * Resend Invitation Schema
   */
  static resendInvitation = z.object({
    invitationId: z.string().uuid(FieldErrors.invitationId),
  });

  /**
   * Cancel Invitation Schema
   */
  static cancelInvitation = z.object({
    invitationId: z.string().uuid(FieldErrors.invitationId),
  });

  /**
   * Batch Accept Invitations Schema
   */
  static batchAccept = z.object({
    invitationIds: z.array(z.string().uuid(FieldErrors.invitationId)).min(1),
  });

  /**
   * Batch Cancel Invitations Schema
   */
  static batchCancel = z.object({
    invitationIds: z.array(z.string().uuid(FieldErrors.invitationId)).min(1),
  });

  /**
   * Get My Invitations Schema (staff dashboard)
   */
  static getMyInvitations = z
    .object({
      status: z.nativeEnum(CallTimeInvitationStatus).optional(),
    })
    .optional();

  /**
   * Get Upcoming Call Times Schema (timeline view)
   */
  static getUpcoming = z.object({
    limit: z.number().int().min(1).max(100).default(50).optional(),
  });

  /**
   * Get All Call Times Schema (shift page table view)
   */
  static getAll = z.object({
    page: z.number().int().min(1).default(1).optional(),
    limit: z.number().int().min(1).max(100).default(20).optional(),
    sortBy: z.enum(['startDate', 'position', 'event']).default('startDate').optional(),
    sortOrder: z.enum(['asc', 'desc']).default('asc').optional(),
    eventId: z.string().uuid().optional(),
    serviceId: z.string().uuid().optional(),
    search: z.string().optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    staffingStatus: z.enum(['needsStaff', 'fullyStaffed', 'pending', 'accepted', 'all']).default('all').optional(),
    eventStatuses: z.array(z.nativeEnum(EventStatus)).optional(),
  });

  /**
   * Event Form Assignment Schema - For creating CallTimes from Event Form
   */
  static eventFormAssignment = z.object({
    serviceId: z.string().uuid(FieldErrors.serviceId),
    quantity: z.number().int().min(1).default(1),
    customCost: z.number().min(0).optional().nullable(),
    customPrice: z.number().min(0).optional().nullable(),
    startDate: z.string().optional().nullable(), // YYYY-MM-DD
    startTime: z
      .string()
      .refine((val) => !val || timeRegex.test(val), { message: FieldErrors.timeFormat })
      .optional()
      .nullable(),
    endDate: z.string().optional().nullable(), // YYYY-MM-DD
    endTime: z
      .string()
      .refine((val) => !val || timeRegex.test(val), { message: FieldErrors.timeFormat })
      .optional()
      .nullable(),
    experienceRequired: z.enum(experienceRequiredValues).default('ANY'),
    ratingRequired: z.enum([...staffRatingValues, 'ANY']).default('ANY'),
    approveOvertime: z.boolean().default(false),
    overtimeRate: z.number().min(0).optional().nullable(),
    overtimeRateType: z.nativeEnum(AmountType).optional().nullable(),
    commission: z.boolean().default(false),
    commissionAmount: z.number().min(0).optional().nullable(),
    commissionAmountType: z.nativeEnum(AmountType).optional().nullable(),
    expenditure: z.boolean().default(false).optional(),
    expenditureAmount: z.number().min(0).optional().nullable(),
    expenditureAmountType: z.nativeEnum(AmountType).optional().nullable(),
    expenditureCost: z.number().min(0).optional().nullable(),
    expenditurePrice: z.number().min(0).optional().nullable(),
    travelInMinimum: z.boolean().default(false).optional(),

    notes: z.string().max(5000).optional().nullable(),
  });

  /**
   * Bulk Sync For Event Schema - Replace all CallTimes for an event from Event Form
   */
  static bulkSyncForEvent = z.object({
    eventId: z.string().uuid(FieldErrors.eventId),
    assignments: z.array(CallTimeSchema.eventFormAssignment),
  });

  /**
   * Get By Event For Billing Schema - Query CallTimes for billing display
   */
  static getByEventForBilling = z.object({
    eventId: z.string().uuid(FieldErrors.eventId),
  });

  /**
   * Submit Internal Review Schema - For managers to review staff after assignment completion
   * Reviews are locked after submission and cannot be edited
   */
  static submitReview = z
    .object({
      invitationId: z.string().uuid(FieldErrors.invitationId),
      rating: z.nativeEnum(InternalReviewRating),
      notes: z.string().max(1000).optional().nullable(),
    })
    .refine(
      (data) => {
        // Require notes for NO_CALL_NO_SHOW
        if (data.rating === InternalReviewRating.NO_CALL_NO_SHOW && !data.notes?.trim()) {
          return false;
        }
        return true;
      },
      {
        message: 'Notes are required for No Call / No Show',
        path: ['notes'],
      }
    );

  /**
   * Get Staff Assignment History Schema - Get past, current, and upcoming assignments for a staff member
   */
  static getStaffAssignmentHistory = z.object({
    staffId: z.string().uuid(FieldErrors.staffId),
  });

  /**
   * Get Many Call Times Schema
   */
  static getManyByIds = z.object({
    ids: z.array(z.string().uuid(FieldErrors.callTimeId)),
  });
}

// Export types
export type CreateCallTimeInput = z.infer<typeof CallTimeSchema.create>;
export type UpdateCallTimeInput = z.infer<typeof CallTimeSchema.update>;
export type QueryCallTimesInput = z.infer<typeof CallTimeSchema.query>;
export type SendInvitationsInput = z.infer<typeof CallTimeSchema.sendInvitations>;
export type RespondToInvitationInput = z.infer<typeof CallTimeSchema.respondToInvitation>;
export type StaffSearchInput = z.infer<typeof CallTimeSchema.staffSearch>;
export type ResendInvitationInput = z.infer<typeof CallTimeSchema.resendInvitation>;
export type CancelInvitationInput = z.infer<typeof CallTimeSchema.cancelInvitation>;
export type GetMyInvitationsInput = z.infer<typeof CallTimeSchema.getMyInvitations>;
export type EventFormAssignmentInput = z.infer<typeof CallTimeSchema.eventFormAssignment>;
export type BulkSyncForEventInput = z.infer<typeof CallTimeSchema.bulkSyncForEvent>;
export type GetByEventForBillingInput = z.infer<typeof CallTimeSchema.getByEventForBilling>;
export type SubmitReviewInput = z.infer<typeof CallTimeSchema.submitReview>;
export type GetStaffAssignmentHistoryInput = z.infer<typeof CallTimeSchema.getStaffAssignmentHistory>;

// Rate type labels for UI
export const RATE_TYPE_LABELS: Record<RateType, string> = {
  [RateType.PER_HOUR]: 'Per Hour',
  [RateType.PER_SHIFT]: 'Per Shift',
  [RateType.PER_DAY]: 'Per Day',
  [RateType.PER_EVENT]: 'Per Event',
};

// Invitation status labels for UI
export const INVITATION_STATUS_LABELS: Record<CallTimeInvitationStatus, string> = {
  [CallTimeInvitationStatus.PENDING]: 'Pending',
  [CallTimeInvitationStatus.ACCEPTED]: 'Accepted',
  [CallTimeInvitationStatus.DECLINED]: 'Declined',
  [CallTimeInvitationStatus.CANCELLED]: 'Cancelled',
  [CallTimeInvitationStatus.WAITLISTED]: 'Waitlisted',
};

// Internal review rating labels for UI
export const INTERNAL_REVIEW_LABELS: Record<InternalReviewRating, { label: string; description: string }> = {
  [InternalReviewRating.MET_EXPECTATIONS]: { label: 'Met Expectations', description: 'Default' },
  [InternalReviewRating.NEEDS_IMPROVEMENT]: { label: 'Needs Improvement', description: 'Coach & monitor' },
  [InternalReviewRating.DID_NOT_MEET]: { label: 'Did Not Meet', description: 'Pause / review' },
  [InternalReviewRating.NO_CALL_NO_SHOW]: { label: 'No Call / No Show', description: 'Comment required' },
};
