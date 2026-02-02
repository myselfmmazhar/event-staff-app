import { router, protectedProcedure } from '../trpc';
import { CallTimeService } from '@/services/call-time.service';
import { CallTimeSchema } from '@/lib/schemas/call-time.schema';
import { emailService } from '@/services/email.service';

/**
 * Call Time Router - All call time related tRPC procedures
 */
export const callTimeRouter = router({
  /**
   * Create a new call time
   * Requires: Authentication (event owner)
   */
  create: protectedProcedure
    .input(CallTimeSchema.create)
    .mutation(async ({ ctx, input }) => {
      const service = new CallTimeService(ctx.prisma);
      return await service.create(input, ctx.userId!);
    }),

  /**
   * Get call times for an event
   * Requires: Authentication (event owner)
   */
  getByEvent: protectedProcedure
    .input(CallTimeSchema.query)
    .query(async ({ ctx, input }) => {
      const service = new CallTimeService(ctx.prisma);
      return await service.findByEvent(input, ctx.userId!);
    }),

  /**
   * Get single call time with details
   * Requires: Authentication (event owner)
   */
  getById: protectedProcedure
    .input(CallTimeSchema.id)
    .query(async ({ ctx, input }) => {
      const service = new CallTimeService(ctx.prisma);
      return await service.findOne(input.id, ctx.userId!);
    }),

  /**
   * Update a call time
   * Requires: Authentication (event owner)
   */
  update: protectedProcedure
    .input(CallTimeSchema.update)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const service = new CallTimeService(ctx.prisma);
      return await service.update(id, data, ctx.userId!);
    }),

  /**
   * Delete a call time
   * Requires: Authentication (event owner)
   */
  delete: protectedProcedure
    .input(CallTimeSchema.id)
    .mutation(async ({ ctx, input }) => {
      const service = new CallTimeService(ctx.prisma);
      return await service.remove(input.id, ctx.userId!);
    }),
  /**
   * Get upcoming call times for timeline view
   * Requires: Authentication
   */
  getUpcoming: protectedProcedure
    .input(CallTimeSchema.getUpcoming.optional())
    .query(async ({ ctx, input }) => {
      const service = new CallTimeService(ctx.prisma);
      return await service.getUpcoming(ctx.userId!, input?.limit ?? 50);
    }),

  /**
   * Get all call times for shifts table view
   * Requires: Authentication
   */
  getAll: protectedProcedure
    .input(CallTimeSchema.getAll.optional())
    .query(async ({ ctx, input }) => {
      const service = new CallTimeService(ctx.prisma);
      return await service.getAll(ctx.userId!, input ?? {});
    }),

  /**
   * Search available staff for a call time
   * Requires: Authentication (event owner)
   */
  searchStaff: protectedProcedure
    .input(CallTimeSchema.staffSearch)
    .query(async ({ ctx, input }) => {
      const service = new CallTimeService(ctx.prisma);
      return await service.searchAvailableStaff(input, ctx.userId!);
    }),

  /**
   * Send invitations to staff
   * Requires: Authentication (event owner)
   */
  sendInvitations: protectedProcedure
    .input(CallTimeSchema.sendInvitations)
    .mutation(async ({ ctx, input }) => {
      const service = new CallTimeService(ctx.prisma);
      const result = await service.sendInvitations(input, ctx.userId!);

      // Send emails to all invited staff
      for (const invitation of result.invitations) {
        try {
          await emailService.sendCallTimeInvitation(
            invitation.staff.email,
            invitation.staff.firstName,
            {
              positionName: invitation.callTime.service.title,
              eventTitle: invitation.callTime.event.title,
              eventVenue: invitation.callTime.event.venueName,
              eventLocation: `${invitation.callTime.event.city}, ${invitation.callTime.event.state}`,
              startDate: invitation.callTime.startDate,
              startTime: invitation.callTime.startTime,
              endDate: invitation.callTime.endDate,
              endTime: invitation.callTime.endTime,
              payRate: Number(invitation.callTime.payRate),
              payRateType: invitation.callTime.payRateType,
            }
          );
        } catch (error) {
          console.error(
            `Failed to send invitation email to ${invitation.staff.email}:`,
            error
          );
        }
      }

      return result;
    }),

  /**
   * Respond to call time invitation
   * Requires: Authentication (staff member who received invitation)
   */
  respondToInvitation: protectedProcedure
    .input(CallTimeSchema.respondToInvitation)
    .mutation(async ({ ctx, input }) => {
      const service = new CallTimeService(ctx.prisma);
      const result = await service.respondToInvitation(input, ctx.userId!);

      // Send confirmation or waitlist email
      if (result.status === 'ACCEPTED' && result.isConfirmed) {
        // Send confirmation email (to be implemented)
      } else if (result.status === 'WAITLISTED') {
        // Send waitlist email (to be implemented)
      }

      return result;
    }),

  /**
   * Resend invitation to staff
   * Requires: Authentication (event owner)
   */
  resendInvitation: protectedProcedure
    .input(CallTimeSchema.resendInvitation)
    .mutation(async ({ ctx, input }) => {
      const service = new CallTimeService(ctx.prisma);
      const invitation = await service.resendInvitation(
        input.invitationId,
        ctx.userId!
      );

      // Send email
      try {
        await emailService.sendCallTimeInvitation(
          invitation.staff.email,
          invitation.staff.firstName,
          {
            positionName: invitation.callTime.service.title,
            eventTitle: invitation.callTime.event.title,
            eventVenue: invitation.callTime.event.venueName,
            eventLocation: `${invitation.callTime.event.city}, ${invitation.callTime.event.state}`,
            startDate: invitation.callTime.startDate,
            startTime: invitation.callTime.startTime,
            endDate: invitation.callTime.endDate,
            endTime: invitation.callTime.endTime,
            payRate: Number(invitation.callTime.payRate),
            payRateType: invitation.callTime.payRateType,
          }
        );
      } catch (error) {
        console.error(
          `Failed to resend invitation email to ${invitation.staff.email}:`,
          error
        );
      }

      return invitation;
    }),

  /**
   * Cancel invitation
   * Requires: Authentication (event owner)
   */
  cancelInvitation: protectedProcedure
    .input(CallTimeSchema.cancelInvitation)
    .mutation(async ({ ctx, input }) => {
      const service = new CallTimeService(ctx.prisma);
      return await service.cancelInvitation(input.invitationId, ctx.userId!);
    }),

  /**
   * Get my invitations (staff dashboard)
   * Requires: Authentication (staff member)
   */
  getMyInvitations: protectedProcedure
    .input(CallTimeSchema.getMyInvitations)
    .query(async ({ ctx, input }) => {
      const service = new CallTimeService(ctx.prisma);
      return await service.getMyInvitations(ctx.userId!, input?.status);
    }),

  /**
   * Get invitation by ID (staff viewing details)
   * Requires: Authentication (staff member who received invitation)
   */
  getInvitationById: protectedProcedure
    .input(CallTimeSchema.resendInvitation) // Uses same schema (just invitationId)
    .query(async ({ ctx, input }) => {
      const service = new CallTimeService(ctx.prisma);
      return await service.getInvitationById(input.invitationId, ctx.userId!);
    }),
});
