import { router, protectedProcedure } from "../trpc";
import { UserService } from "@/services/user.service";
import { z } from "zod";

/**
 * Profile Router - Current user profile operations
 */
export const profileRouter = router({
  /**
   * Get current user's profile
   */
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    const userService = new UserService(ctx.prisma);
    // ctx.userId is guaranteed to be a string by protectedProcedure middleware
    return await userService.findOne(ctx.userId!);
  }),

  /**
   * Get current user's client profile (for CLIENT role users)
   * Returns the client record linked to this user
   */
  getMyClientProfile: protectedProcedure.query(async ({ ctx }) => {
    // Find the client record linked to this user
    const client = await ctx.prisma.client.findUnique({
      where: { userId: ctx.userId! },
      select: {
        id: true,
        clientId: true,
        businessName: true,
        firstName: true,
        lastName: true,
        email: true,
        cellPhone: true,
        businessPhone: true,
        details: true,
        businessAddress: true,
        city: true,
        state: true,
        zipCode: true,
        ccEmail: true,
        billingFirstName: true,
        billingLastName: true,
        billingEmail: true,
        billingPhone: true,
        createdAt: true,
        locations: {
          select: {
            id: true,
            venueName: true,
            meetingPoint: true,
            venueAddress: true,
            city: true,
            state: true,
            zipCode: true,
          },
          orderBy: { createdAt: 'asc' as const },
        },
      },
    });

    return client;
  }),

  /**
   * Get events for the current client user
   * Returns events where this client is attached
   */
  getMyClientEvents: protectedProcedure.query(async ({ ctx }) => {
    // First get the client linked to this user
    const client = await ctx.prisma.client.findUnique({
      where: { userId: ctx.userId! },
      select: { id: true },
    });

    if (!client) {
      return [];
    }

    // Get events for this client
    const events = await ctx.prisma.event.findMany({
      where: { clientId: client.id },
      select: {
        id: true,
        eventId: true,
        title: true,
        description: true,
        requirements: true,
        venueName: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        startDate: true,
        startTime: true,
        endDate: true,
        endTime: true,
        timezone: true,
        status: true,
        // Client-visible new fields
        meetingPoint: true,
        onsitePocName: true,
        onsitePocPhone: true,
        onsitePocEmail: true,
        preEventInstructions: true,
        eventDocuments: true,
        _count: {
          select: {
            callTimes: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    return events;
  }),

  /**
   * Get detailed event info for a client
   * Returns event with call times and staff assignments (limited info - no contact details)
   */
  getMyClientEventDetail: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // First get the client linked to this user
      const client = await ctx.prisma.client.findUnique({
        where: { userId: ctx.userId! },
        select: { id: true },
      });

      if (!client) {
        return null;
      }

      // Get the event - verify it belongs to this client
      const event = await ctx.prisma.event.findFirst({
        where: {
          id: input.eventId,
          clientId: client.id,
        },
        select: {
          id: true,
          eventId: true,
          title: true,
          description: true,
          requirements: true,
          venueName: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
          startDate: true,
          startTime: true,
          endDate: true,
          endTime: true,
          timezone: true,
          status: true,
          // Client-visible new fields
          meetingPoint: true,
          onsitePocName: true,
          onsitePocPhone: true,
          onsitePocEmail: true,
          preEventInstructions: true,
          eventDocuments: true,
          callTimes: {
            select: {
              id: true,
              callTimeId: true,
              startTime: true,
              endTime: true,
              startDate: true,
              endDate: true,
              notes: true,
              service: {
                select: {
                  id: true,
                  title: true,
                },
              },
              invitations: {
                where: { isConfirmed: true }, // Only show confirmed staff
                select: {
                  id: true,
                  staff: {
                    select: {
                      // Limited staff info - NO phone, email, or other contact details
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
            orderBy: { startDate: 'asc' },
          },
        },
      });

      return event;
    }),

  /**
   * Get event stats for the current client user
   * Returns upcoming, completed, and total event counts
   */
  getMyClientStats: protectedProcedure.query(async ({ ctx }) => {
    // First get the client linked to this user
    const client = await ctx.prisma.client.findUnique({
      where: { userId: ctx.userId! },
      select: { id: true },
    });

    if (!client) {
      return { upcoming: 0, completed: 0, total: 0 };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count upcoming events (start date >= today and not cancelled/completed)
    const upcoming = await ctx.prisma.event.count({
      where: {
        clientId: client.id,
        startDate: { gte: today },
        status: { notIn: ['CANCELLED', 'COMPLETED'] },
      },
    });

    // Count completed events
    const completed = await ctx.prisma.event.count({
      where: {
        clientId: client.id,
        status: 'COMPLETED',
      },
    });

    // Count total events
    const total = await ctx.prisma.event.count({
      where: {
        clientId: client.id,
      },
    });

    return { upcoming, completed, total };
  }),

  /**
   * Update current user's profile
   * Users can update their own firstName, lastName, phone, address, emergencyContact
   * They cannot change their role, email, or isActive status
   */
  updateMyProfile: protectedProcedure
    .input(
      z.object({
        firstName: z.string().min(1, "First name is required").optional(),
        lastName: z.string().min(1, "Last name is required").optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        emergencyContact: z.string().optional(),
        profilePhoto: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userService = new UserService(ctx.prisma);
      // ctx.userId is guaranteed to be a string by protectedProcedure middleware
      return await userService.update(ctx.userId!, input);
    }),

  /**
   * Change current user's password
   */
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(8),
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userService = new UserService(ctx.prisma);

      // Get current user with password
      // ctx.session is guaranteed to exist by protectedProcedure middleware
      const user = await userService.findByEmail(ctx.session!.user.email);

      if (!user) {
        throw new Error("User not found");
      }

      // Verify current password
      const bcrypt = await import("bcryptjs");
      const isValid = await bcrypt.compare(input.currentPassword, user.password!);

      if (!isValid) {
        throw new Error("Current password is incorrect");
      }

      // Update to new password
      // ctx.userId is guaranteed to be a string by protectedProcedure middleware
      return await userService.update(ctx.userId!, {
        password: input.newPassword,
      });
    }),
});
