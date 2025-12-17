import { z } from 'zod';
import { SkillLevel, RateType, CallTimeInvitationStatus } from '@prisma/client';

// Time format validation (HH:MM)
const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

// Field error messages
const FieldErrors = {
  eventId: 'Invalid event ID',
  positionId: 'Invalid position ID',
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
      positionId: z.string().uuid(FieldErrors.positionId),
      numberOfStaffRequired: z
        .number()
        .int()
        .min(1, FieldErrors.numberOfStaffRequired)
        .default(1),
      skillLevel: z.nativeEnum(SkillLevel).default(SkillLevel.BEGINNER),

      // Date/Time
      startDate: z.coerce.date({ message: FieldErrors.startDate }),
      startTime: z
        .string()
        .refine((val) => !val || timeRegex.test(val), {
          message: FieldErrors.timeFormat,
        })
        .optional()
        .nullable(),
      endDate: z.coerce.date({ message: FieldErrors.endDate }),
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
    })
    .refine((data) => data.payRateType === data.billRateType, {
      message: FieldErrors.rateTypeMismatch,
      path: ['billRateType'],
    })
    .refine((data) => data.endDate >= data.startDate, {
      message: FieldErrors.endDateAfterStart,
      path: ['endDate'],
    });

  /**
   * Update Call Time Schema
   */
  static update = z
    .object({
      id: z.string().uuid(FieldErrors.callTimeId),
      positionId: z.string().uuid(FieldErrors.positionId).optional(),
      numberOfStaffRequired: z.number().int().min(1).optional(),
      skillLevel: z.nativeEnum(SkillLevel).optional(),
      startDate: z.coerce.date().optional(),
      startTime: z
        .string()
        .refine((val) => !val || timeRegex.test(val), {
          message: FieldErrors.timeFormat,
        })
        .optional()
        .nullable(),
      endDate: z.coerce.date().optional(),
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
    callTimeId: z.string().uuid(FieldErrors.callTimeId),
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
   * Staff Search Schema
   */
  static staffSearch = z.object({
    callTimeId: z.string().uuid(FieldErrors.callTimeId),
    includeAlreadyInvited: z.boolean().default(false),
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
   * Get My Invitations Schema (staff dashboard)
   */
  static getMyInvitations = z
    .object({
      status: z.nativeEnum(CallTimeInvitationStatus).optional(),
    })
    .optional();
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
