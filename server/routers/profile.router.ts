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
        client: {
          select: {
            businessName: true,
            firstName: true,
            lastName: true,
          },
        },
        callTimes: {
          select: {
            numberOfStaffRequired: true,
            invitations: {
              select: {
                status: true,
                isConfirmed: true,
                staff: { select: { firstName: true, lastName: true } },
              },
            },
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

    // Count total event requests
    const requests = await ctx.prisma.eventRequest.count({
      where: {
        clientId: client.id,
      },
    });

    return { upcoming, completed, total, requests };
  }),

  getMyStaffBills: protectedProcedure.query(async ({ ctx }) => {
    const staff = await ctx.prisma.staff.findUnique({
      where: { userId: ctx.userId! },
      select: { id: true },
    });

    if (!staff) {
      return { previous: [], upcoming: [], paid: [] };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bills = await ctx.prisma.bill.findMany({
      where: {
        staffId: staff.id,
        isArchived: false,
      },
      select: {
        id: true,
        billNo: true,
        status: true,
        billDate: true,
        dueDate: true,
        items: {
          select: { amount: true },
        },
      },
      orderBy: { billDate: "desc" },
    });

    const withTotal = bills.map((bill) => ({
      ...bill,
      total: bill.items.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    }));

    return {
      previous: withTotal.filter((b) => new Date(b.billDate) < today),
      upcoming: withTotal.filter((b) => new Date(b.billDate) >= today && b.status !== "PAID"),
      paid: withTotal.filter((b) => b.status === "PAID"),
    };
  }),

  getMyClientFinance: protectedProcedure.query(async ({ ctx }) => {
    const client = await ctx.prisma.client.findUnique({
      where: { userId: ctx.userId! },
      select: { id: true },
    });

    if (!client) {
      return { invoices: [], estimates: [] };
    }

    const [invoices, estimates] = await Promise.all([
      ctx.prisma.invoice.findMany({
        where: {
          clientId: client.id,
          isArchived: false,
          status: { not: "DRAFT" },
        },
        select: {
          id: true,
          invoiceNo: true,
          status: true,
          invoiceDate: true,
          items: { select: { amount: true } },
        },
        orderBy: { invoiceDate: "desc" },
        take: 10,
      }),
      ctx.prisma.estimate.findMany({
        where: {
          clientId: client.id,
          isArchived: false,
          status: { not: "DRAFT" },
        },
        select: {
          id: true,
          estimateNo: true,
          status: true,
          estimateDate: true,
          items: { select: { amount: true } },
        },
        orderBy: { estimateDate: "desc" },
        take: 10,
      }),
    ]);

    return {
      invoices: invoices.map((inv) => ({
        ...inv,
        total: inv.items.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      })),
      estimates: estimates.map((est) => ({
        ...est,
        total: est.items.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      })),
    };
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
   * Update current client user's business profile
   * Clients can update their own business info, contact, and address - but NOT clientId
   */
  updateMyClientProfile: protectedProcedure
    .input(
      z.object({
        businessName: z.string().min(1, "Business name is required").max(200).optional(),
        firstName: z.string().min(1, "First name is required").max(50).optional(),
        lastName: z.string().min(1, "Last name is required").max(50).optional(),
        email: z.string().email("Invalid email address").optional(),
        cellPhone: z.string().optional(),
        businessPhone: z.string().optional(),
        details: z.string().max(5000).optional(),
        businessAddress: z.string().max(300).optional(),
        city: z.string().min(1, "City is required").max(100).optional(),
        state: z.string().min(1, "State is required").max(50).optional(),
        zipCode: z.string().min(1, "ZIP code is required").max(20).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const client = await ctx.prisma.client.findUnique({
        where: { userId: ctx.userId! },
        select: { id: true },
      });

      if (!client) {
        throw new Error("Client profile not found");
      }

      return await ctx.prisma.client.update({
        where: { id: client.id },
        data: input,
      });
    }),

  /**
   * Change current user's password
   */
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userService = new UserService(ctx.prisma);

      // Get current user with password
      const user = await userService.findByEmail(ctx.session!.user.email);

      if (!user) {
        throw new Error("User not found");
      }

      if (!user.password) {
        throw new Error("No password set for this account. Please use social login.");
      }

      // Verify current password using better-auth's scrypt verifier
      const { verifyPassword, hashPassword } = await import("better-auth/crypto");
      const isValid = await verifyPassword({ hash: user.password, password: input.currentPassword });

      if (!isValid) {
        throw new Error("Current password is incorrect");
      }

      // Hash the new password once using better-auth's scrypt
      const hashedPassword = await hashPassword(input.newPassword);

      // Update user table password
      await ctx.prisma.user.update({
        where: { id: ctx.userId! },
        data: { password: hashedPassword },
      });

      // Update account table password — better-auth credential provider authenticates against this
      await ctx.prisma.account.updateMany({
        where: { userId: ctx.userId!, providerId: "credential" },
        data: { password: hashedPassword },
      });

      return await userService.findOne(ctx.userId!);
    }),

  /**
   * Mark onboarding as seen for the current user
   */
  markOnboardingAsSeen: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.userId!;
    
    // Update or create user preferences
    return await ctx.prisma.userPreference.upsert({
      where: { userId },
      update: { hasSeenOnboarding: true },
      create: { 
        userId,
        hasSeenOnboarding: true 
      },
    });
  }),
});
