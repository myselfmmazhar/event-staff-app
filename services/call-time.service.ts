import {
  PrismaClient,
  CallTimeInvitationStatus,
  SkillLevel,
  Prisma,
  RateType,
  StaffRating,
  EventStatus,
} from '@prisma/client';
import { TRPCError } from '@trpc/server';
import type {
  CreateCallTimeInput,
  UpdateCallTimeInput,
  QueryCallTimesInput,
  SendInvitationsInput,
  RespondToInvitationInput,
  StaffSearchInput,
  EventFormAssignmentInput,
  BulkSyncForEventInput,
} from '@/lib/schemas/call-time.schema';
import { generateCallTimeId } from '@/lib/utils/id-generator';
import { getNotificationTriggerService } from '@/services/notification-trigger.service';

// Skill level order for comparison (higher = more skilled)
const SKILL_LEVEL_ORDER: Record<SkillLevel, number> = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
};

/**
 * Call Time Service - Business logic for call time operations
 */
export class CallTimeService {
  constructor(private prisma: PrismaClient) { }

  /**
   * Create a new call time
   */
  async create(data: CreateCallTimeInput, userId: string) {
    // Verify event exists and user owns it
    const event = await this.prisma.event.findFirst({
      where: { id: data.eventId, createdBy: userId },
    });

    if (!event) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event not found or you do not have permission',
      });
    }

    // Verify service exists
    const service = await this.prisma.service.findUnique({
      where: { id: data.serviceId },
    });

    if (!service) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Service not found',
      });
    }

    const callTimeId = await generateCallTimeId(this.prisma);

    const result = await this.prisma.callTime.create({
      data: {
        callTimeId,
        serviceId: data.serviceId,
        numberOfStaffRequired: data.numberOfStaffRequired,
        skillLevel: data.skillLevel,
        startDate: data.startDate,
        startTime: data.startTime,
        endDate: data.endDate,
        endTime: data.endTime,
        payRate: data.payRate,
        payRateType: data.payRateType,
        billRate: data.billRate,
        billRateType: data.billRateType,
        notes: data.notes,
        eventId: data.eventId,
      },
      include: {
        service: true,
        event: { select: { id: true, eventId: true, title: true, venueName: true, city: true, state: true } },
        _count: { select: { invitations: true } },
      },
    });

    // Notify internal team members (Admins/Managers) about the new task
    try {
      console.log('Task created with ID:', result.callTimeId);
      const { emailService } = await import('@/services/email.service');
      const teamMembers = await this.prisma.user.findMany({
        where: {
          role: { in: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
          isActive: true,
        },
        select: { email: true, firstName: true },
      });

      console.log(`Found ${teamMembers.length} team members to notify.`);

      for (const member of teamMembers) {
        if (member.email) {
          console.log(`Sending email to ${member.email}...`);
          const emailResult = await emailService.sendCallTimeInvitation(
            member.email,
            member.firstName || 'Team Member',
            {
              positionName: result.service?.title || 'Staff',
              eventTitle: result.event.title,
              eventVenue: result.event.venueName || 'To Be Announced',
              eventLocation: `${result.event.city || ''}, ${result.event.state || ''}`.trim() || 'TBD',
              startDate: result.startDate,
              startTime: result.startTime,
              endDate: result.endDate,
              endTime: result.endTime,
              payRate: Number(result.payRate),
              payRateType: result.payRateType,
            }
          );
          console.log(`Email result for ${member.email}:`, emailResult);
        }
      }
    } catch (error) {
      console.error('Failed to send task creation emails to team:', error);
    }

    return result;
  }

  /**
   * Get all call times for an event
   */
  async findByEvent(input: QueryCallTimesInput, userId: string) {
    // Verify event ownership
    const event = await this.prisma.event.findFirst({
      where: { id: input.eventId, createdBy: userId },
    });

    if (!event) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event not found or you do not have permission',
      });
    }

    const page = input.page ?? 1;
    const limit = input.limit ?? 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.callTime.findMany({
        where: { eventId: input.eventId },
        include: {
          service: true,
          invitations: {
            include: {
              staff: {
                select: {
                  id: true,
                  staffId: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          _count: {
            select: {
              invitations: true,
            },
          },
        },
        orderBy: { startDate: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.callTime.count({ where: { eventId: input.eventId } }),
    ]);

    // Calculate confirmed count for each call time
    const dataWithConfirmedCount = data.map((ct) => ({
      ...ct,
      confirmedCount: ct.invitations.filter(
        (inv) => inv.status === 'ACCEPTED' && inv.isConfirmed
      ).length,
    }));

    return {
      data: dataWithConfirmedCount,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get single call time with full details
   */
  async findOne(id: string, userId: string) {
    const callTime = await this.prisma.callTime.findUnique({
      where: { id },
      include: {
        service: true,
        event: {
          select: {
            id: true,
            eventId: true,
            title: true,
            createdBy: true,
            venueName: true,
            city: true,
            state: true,
          },
        },
        invitations: {
          include: {
            staff: {
              select: {
                id: true,
                staffId: true,
                firstName: true,
                lastName: true,
                email: true,
                skillLevel: true,
                city: true,
                state: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!callTime || callTime.event.createdBy !== userId) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Call time not found or you do not have permission',
      });
    }

    // Calculate confirmed count
    const confirmedCount = callTime.invitations.filter(
      (inv) => inv.status === 'ACCEPTED' && inv.isConfirmed
    ).length;

    return { ...callTime, confirmedCount };
  }

  /**
   * Update call time
   */
  async update(
    id: string,
    data: Omit<UpdateCallTimeInput, 'id'>,
    userId: string
  ) {
    await this.findOne(id, userId); // Verify ownership

    // Transform serviceId to Prisma relation syntax
    const { serviceId, ...restData } = data;
    const prismaData: any = { ...restData };

    // Handle service relation
    if (serviceId !== undefined) {
      prismaData.service = serviceId ? { connect: { id: serviceId } } : { disconnect: true };
    }

    return await this.prisma.callTime.update({
      where: { id },
      data: prismaData,
      include: {
        service: true,
        event: { select: { id: true, eventId: true, title: true } },
        _count: { select: { invitations: true } },
      },
    });
  }

  /**
   * Delete call time
   */
  async remove(id: string, userId: string) {
    const callTime = await this.findOne(id, userId); // Verify ownership

    // Check if any staff have accepted offers - notify them before deletion
    const acceptedInvitations = callTime.invitations.filter(
      (inv) => inv.status === 'ACCEPTED'
    );

    if (acceptedInvitations.length > 0) {
      // Notify affected staff that their assignment has been cancelled
      const notificationService = getNotificationTriggerService(this.prisma);
      await notificationService.onCallTimeCancelled(id, {
        positionName: callTime.service?.title || 'Staff',
        eventTitle: callTime.event.title,
        eventId: callTime.event.id,
        startDate: callTime.startDate,
      });
    }

    await this.prisma.callTime.delete({ where: { id } });
    return { success: true, message: 'Call time deleted successfully' };
  }

  /**
   * Search available staff for a call time
   */
  async searchAvailableStaff(input: StaffSearchInput, userId: string) {
    const callTime = await this.findOne(input.callTimeId, userId);

    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    const skip = (page - 1) * limit;

    // Build exclusion list if not including already invited
    let excludeStaffIds: string[] = [];
    if (!input.includeAlreadyInvited) {
      excludeStaffIds = callTime.invitations.map((inv) => inv.staffId);
    }

    // Get skill levels that meet the requirement (>= required)
    const requiredLevel = SKILL_LEVEL_ORDER[callTime.skillLevel];
    const eligibleSkillLevels = (
      Object.entries(SKILL_LEVEL_ORDER) as [SkillLevel, number][]
    )
      .filter(([_, level]) => level >= requiredLevel)
      .map(([name]) => name);

    // Build staff query
    const where: Prisma.StaffWhereInput = {
      // Has the required service (if serviceId is set)
      ...(callTime.serviceId && {
        services: {
          some: { serviceId: callTime.serviceId },
        },
      }),
      // Meets skill level requirement
      skillLevel: { in: eligibleSkillLevels },
      // Active account
      accountStatus: 'ACTIVE',
      // Not on time off during call time dates (only when dates are known)
      ...(callTime.startDate && callTime.endDate ? {
        NOT: {
          AND: [
            { availabilityStatus: 'TIME_OFF' },
            {
              OR: [
                // Time off overlaps with call time
                {
                  timeOffStart: { lte: callTime.endDate as Date },
                  timeOffEnd: { gte: callTime.startDate as Date },
                },
              ],
            },
          ],
        },
      } : {}),
      // Exclude already invited (if requested)
      ...(excludeStaffIds.length > 0 && {
        id: { notIn: excludeStaffIds },
      }),
      // No conflicting confirmed call times (only when dates are known)
      ...(callTime.startDate && callTime.endDate ? {
        callTimeInvitations: {
          none: {
            isConfirmed: true,
            status: 'ACCEPTED',
            callTime: {
              // Call time conflicts (date overlap)
              startDate: { lte: callTime.endDate as Date },
              endDate: { gte: callTime.startDate as Date },
              // Exclude current call time
              id: { not: callTime.id },
            },
          },
        },
      } : {}),
    };

    const [staff, total] = await Promise.all([
      this.prisma.staff.findMany({
        where,
        select: {
          id: true,
          staffId: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          skillLevel: true,
          availabilityStatus: true,
          city: true,
          state: true,
          country: true,
          userId: true, // Include to show warning for unregistered staff
          hasLoginAccess: true,
          services: {
            include: { service: { select: { id: true, title: true } } },
          },
        },
        orderBy: [
          // Prioritize OPEN_TO_OFFERS
          { availabilityStatus: 'asc' },
          // Then by skill level (higher first)
          { skillLevel: 'desc' },
          { lastName: 'asc' },
        ],
        skip,
        take: limit,
      }),
      this.prisma.staff.count({ where }),
    ]);

    // Add location match score
    const scoredStaff = staff.map((s) => ({
      ...s,
      locationMatch: this.calculateLocationMatch(s, {
        city: callTime.event.city,
        state: callTime.event.state,
      }),
    }));

    // Sort by location match, then existing order
    scoredStaff.sort((a, b) => b.locationMatch - a.locationMatch);

    return {
      data: scoredStaff,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Calculate location match score (0-100)
   * Future: Can be enhanced with geo-location/distance calculation
   */
  private calculateLocationMatch(
    staff: { city: string; state: string; country: string },
    eventLocation: { city: string | null; state: string | null }
  ): number {
    if (!eventLocation.city && !eventLocation.state) return 50;

    let score = 0;
    if (
      eventLocation.state &&
      staff.state?.toLowerCase() === eventLocation.state.toLowerCase()
    ) {
      score += 50;
    }
    if (
      eventLocation.city &&
      staff.city?.toLowerCase() === eventLocation.city.toLowerCase()
    ) {
      score += 50;
    }
    return score;
  }

  /**
   * Send invitations to staff
   */
  async sendInvitations(input: SendInvitationsInput, userId: string) {
    const callTime = await this.findOne(input.callTimeId, userId);

    // Get existing invitations
    const existingInvitations = await this.prisma.callTimeInvitation.findMany({
      where: {
        callTimeId: input.callTimeId,
        staffId: { in: input.staffIds },
      },
    });

    const existingStaffIds = existingInvitations.map((inv) => inv.staffId);
    const newStaffIds = input.staffIds.filter(
      (id) => !existingStaffIds.includes(id)
    );

    if (newStaffIds.length === 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'All selected staff have already been invited',
      });
    }

    // Create new invitations
    const invitations = await Promise.all(
      newStaffIds.map(async (staffId) => {
        return this.prisma.callTimeInvitation.create({
          data: {
            callTimeId: input.callTimeId,
            staffId,
            status: 'PENDING',
          },
          include: {
            staff: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                userId: true,
              },
            },
            callTime: {
              include: {
                service: true,
                event: {
                  select: {
                    id: true,
                    title: true,
                    venueName: true,
                    city: true,
                    state: true,
                  },
                },
              },
            },
          },
        });
      })
    );

    // Send notifications to invited staff
    const triggerService = getNotificationTriggerService(this.prisma);
    for (const invitation of invitations) {
      if (invitation.staff.userId) {
        await triggerService.onCallTimeInvitationSent(
          invitation.staff.userId,
          {
            positionName: invitation.callTime.service?.title || 'Service',
            eventTitle: invitation.callTime.event.title,
            eventId: invitation.callTime.event.id,
            callTimeId: invitation.callTime.id,
          }
        );
      }
    }

    // Update event status to ASSIGNED if currently DRAFT
    const event = await this.prisma.event.findUnique({
      where: { id: callTime.eventId },
      select: { status: true },
    });

    if (event && event.status === EventStatus.DRAFT) {
      await this.prisma.event.update({
        where: { id: callTime.eventId },
        data: { status: EventStatus.ASSIGNED },
      });
    }

    return {
      sent: invitations.length,
      invitations,
      callTime,
    };
  }

  /**
   * Respond to call time invitation (staff action)
   */
  async respondToInvitation(input: RespondToInvitationInput, userId: string) {
    // Get invitation and verify staff owns it
    const invitation = await this.prisma.callTimeInvitation.findUnique({
      where: { id: input.invitationId },
      include: {
        callTime: {
          include: {
            service: true,
            event: {
              select: { id: true, title: true, createdBy: true },
            },
          },
        },
        staff: {
          select: { id: true, firstName: true, lastName: true, userId: true },
        },
      },
    });

    if (!invitation) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Invitation not found',
      });
    }

    // Verify staff owns this invitation
    if (invitation.staff.userId !== userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to respond to this invitation',
      });
    }

    if (invitation.status !== 'PENDING') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `This invitation has already been ${invitation.status.toLowerCase()}`,
      });
    }

    const triggerService = getNotificationTriggerService(this.prisma);
    const staffName = `${invitation.staff.firstName} ${invitation.staff.lastName}`;

    if (input.accept) {
      // Check if slots are still available
      const confirmedCount = await this.prisma.callTimeInvitation.count({
        where: {
          callTimeId: invitation.callTimeId,
          status: 'ACCEPTED',
          isConfirmed: true,
        },
      });

      const hasAvailableSlot =
        confirmedCount < invitation.callTime.numberOfStaffRequired;

      const updated = await this.prisma.callTimeInvitation.update({
        where: { id: invitation.id },
        data: {
          status: hasAvailableSlot ? 'ACCEPTED' : 'WAITLISTED',
          respondedAt: new Date(),
          isConfirmed: hasAvailableSlot,
          confirmedAt: hasAvailableSlot ? new Date() : null,
        },
        include: {
          callTime: { include: { service: true, event: true } },
        },
      });

      // Notify the event creator that staff accepted
      await triggerService.onInvitationResponse(
        invitation.callTime.event.createdBy,
        {
          staffName,
          positionName: invitation.callTime.service?.title || 'Service',
          eventTitle: invitation.callTime.event.title,
          eventId: invitation.callTime.event.id,
          status: 'ACCEPTED',
        }
      );

      // Notify the staff member if confirmed
      if (hasAvailableSlot && invitation.staff.userId) {
        await triggerService.onInvitationConfirmed(
          invitation.staff.userId,
          {
            positionName: invitation.callTime.service?.title || 'Service',
            eventTitle: invitation.callTime.event.title,
            eventId: invitation.callTime.event.id,
            callTimeId: invitation.callTime.id,
          }
        );
      }

      return updated;
    } else {
      // Decline
      const updated = await this.prisma.callTimeInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'DECLINED',
          respondedAt: new Date(),
          declineReason: input.declineReason,
        },
        include: {
          callTime: { include: { service: true, event: true } },
        },
      });

      // Notify the event creator that staff declined
      await triggerService.onInvitationResponse(
        invitation.callTime.event.createdBy,
        {
          staffName,
          positionName: invitation.callTime.service?.title || 'Service',
          eventTitle: invitation.callTime.event.title,
          eventId: invitation.callTime.event.id,
          status: 'DECLINED',
        }
      );

      return updated;
    }
  }

  /**
   * Resend invitation (admin action)
   */
  async resendInvitation(invitationId: string, userId: string) {
    const invitation = await this.prisma.callTimeInvitation.findUnique({
      where: { id: invitationId },
      include: {
        callTime: {
          include: {
            service: true,
            event: { select: { id: true, title: true, createdBy: true } },
          },
        },
        staff: { select: { id: true, firstName: true, lastName: true, email: true, userId: true } },
      },
    });

    if (!invitation || invitation.callTime.event.createdBy !== userId) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Invitation not found',
      });
    }

    // Reset invitation to pending
    const updated = await this.prisma.callTimeInvitation.update({
      where: { id: invitationId },
      data: {
        status: 'PENDING',
        respondedAt: null,
        declineReason: null,
        isConfirmed: false,
        confirmedAt: null,
      },
      include: {
        staff: { select: { id: true, firstName: true, lastName: true, email: true, userId: true } },
        callTime: {
          include: {
            service: true,
            event: {
              select: { id: true, title: true, venueName: true, city: true, state: true },
            },
          },
        },
      },
    });

    // Send notification to staff
    if (updated.staff.userId) {
      const triggerService = getNotificationTriggerService(this.prisma);
      await triggerService.onCallTimeInvitationSent(
        updated.staff.userId,
        {
          positionName: updated.callTime.service?.title || 'Service',
          eventTitle: updated.callTime.event.title,
          eventId: updated.callTime.event.id,
          callTimeId: updated.callTime.id,
        }
      );
    }

    return updated;
  }

  /**
   * Cancel invitation (admin action)
   */
  async cancelInvitation(invitationId: string, userId: string) {
    const invitation = await this.prisma.callTimeInvitation.findUnique({
      where: { id: invitationId },
      include: {
        callTime: { include: { event: { select: { createdBy: true } } } },
      },
    });

    if (!invitation || invitation.callTime.event.createdBy !== userId) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Invitation not found',
      });
    }

    return await this.prisma.callTimeInvitation.update({
      where: { id: invitationId },
      data: { status: 'CANCELLED' },
      include: {
        staff: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  /**
   * Get call time invitations for a staff member (staff dashboard)
   */
  async getMyInvitations(userId: string, status?: CallTimeInvitationStatus) {
    const staff = await this.prisma.staff.findUnique({
      where: { userId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    if (!staff) {
      return { pending: [], accepted: [], past: [], declined: [] };
    }

    const now = new Date();

    const invitations = await this.prisma.callTimeInvitation.findMany({
      where: {
        staffId: staff.id,
        ...(status && { status }),
      },
      include: {
        callTime: {
          include: {
            service: true,
            event: {
              select: {
                id: true,
                eventId: true,
                title: true,
                venueName: true,
                city: true,
                state: true,
              },
            },
          },
        },
      },
      orderBy: { callTime: { startDate: 'asc' } },
    });

    // Use start of today for date comparison to include today's events
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Categorize invitations
    // Show all pending invitations regardless of date (to avoid timezone issues hiding today's events)
    const pending = invitations.filter((inv) => inv.status === 'PENDING');
    const accepted = invitations.filter(
      (inv) =>
        inv.status === 'ACCEPTED' &&
        inv.isConfirmed &&
        (!inv.callTime.startDate || new Date(inv.callTime.startDate) >= startOfToday)
    );
    const past = invitations.filter(
      (inv) =>
        inv.status === 'ACCEPTED' &&
        inv.isConfirmed &&
        !!inv.callTime.endDate &&
        new Date(inv.callTime.endDate) < startOfToday
    );
    const declined = invitations.filter((inv) => inv.status === 'DECLINED');

    return { pending, accepted, past, declined };
  }

  /**
   * Get invitation by ID (for staff viewing details)
   */
  async getInvitationById(invitationId: string, userId: string) {
    const invitation = await this.prisma.callTimeInvitation.findUnique({
      where: { id: invitationId },
      include: {
        staff: { select: { userId: true } },
        callTime: {
          include: {
            service: true,
            event: {
              select: {
                id: true,
                eventId: true,
                title: true,
                description: true,
                venueName: true,
                address: true,
                city: true,
                state: true,
                zipCode: true,
                requirements: true,
                meetingPoint: true,
                onsitePocName: true,
                onsitePocPhone: true,
                onsitePocEmail: true,
                preEventInstructions: true,
                eventDocuments: true,
              },
            },
          },
        },
      },
    });

    if (!invitation || invitation.staff.userId !== userId) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Invitation not found',
      });
    }

    return invitation;
  }

  /**
   * Get upcoming call times for timeline view
   * Returns call times from today onwards with event and staff details
   */
  async getUpcoming(userId: string, limit: number = 50) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const callTimes = await this.prisma.callTime.findMany({
      where: {
        // Only upcoming call times
        OR: [
          { startDate: { gte: startOfToday } },
          { endDate: { gte: startOfToday } },
        ],
        // Only events created by this user
        event: {
          createdBy: userId,
        },
      },
      include: {
        service: {
          select: {
            id: true,
            title: true,
          },
        },
        event: {
          select: {
            id: true,
            eventId: true,
            title: true,
            venueName: true,
            city: true,
            state: true,
          },
        },
        invitations: {
          include: {
            staff: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: [
        { startDate: 'asc' },
        { startTime: 'asc' },
      ],
      take: limit,
    });

    return {
      data: callTimes,
      meta: {
        total: callTimes.length,
        limit,
      },
    };
  }

  /**
   * Get all call times for shifts table view
   * Supports pagination, sorting, filtering
   */
  async getAll(
    userId: string,
    input: {
      page?: number;
      limit?: number;
      sortBy?: 'startDate' | 'position' | 'event';
      sortOrder?: 'asc' | 'desc';
      eventId?: string;
      serviceId?: string;
      search?: string;
      dateFrom?: Date;
      dateTo?: Date;
      staffingStatus?: 'needsStaff' | 'fullyStaffed' | 'all';
    }
  ) {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortOrder = input.sortOrder ?? 'asc';

    // Build where clause
    const where: any = {
      event: {
        createdBy: userId,
      },
    };

    if (input.eventId) {
      where.eventId = input.eventId;
    }

    if (input.serviceId) {
      where.serviceId = input.serviceId;
    }

    if (input.dateFrom || input.dateTo) {
      where.startDate = {};
      if (input.dateFrom) where.startDate.gte = input.dateFrom;
      if (input.dateTo) where.startDate.lte = input.dateTo;
    }

    if (input.search) {
      where.OR = [
        { event: { title: { contains: input.search, mode: 'insensitive' } } },
        { service: { title: { contains: input.search, mode: 'insensitive' } } },
      ];
    }

    // Build orderBy
    let orderBy: any = { startDate: sortOrder };
    if (input.sortBy === 'position') {
      orderBy = { service: { title: sortOrder } };
    } else if (input.sortBy === 'event') {
      orderBy = { event: { title: sortOrder } };
    }

    const [callTimes, total] = await Promise.all([
      this.prisma.callTime.findMany({
        where,
        include: {
          service: {
            select: { id: true, title: true },
          },
          event: {
            select: {
              id: true,
              eventId: true,
              title: true,
              venueName: true,
              city: true,
              state: true,
              poNumber: true,
              startDate: true,
              startTime: true,
              endDate: true,
              endTime: true,
              client: {
                select: {
                  id: true,
                  businessName: true,
                },
              },
            },
          },
          invitations: {
            select: {
              id: true,
              status: true,
              isConfirmed: true,
              staff: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          _count: {
            select: { invitations: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.callTime.count({ where }),
    ]);

    // Calculate staffing status and filter if needed
    let filteredData = callTimes.map((ct) => {
      const confirmedCount = ct.invitations.filter(
        (inv) => inv.status === 'ACCEPTED' && inv.isConfirmed
      ).length;
      const needsStaff = confirmedCount < ct.numberOfStaffRequired;

      return {
        ...ct,
        confirmedCount,
        needsStaff,
      };
    });

    // Filter by staffing status if specified
    if (input.staffingStatus === 'needsStaff') {
      filteredData = filteredData.filter((ct) => ct.needsStaff);
    } else if (input.staffingStatus === 'fullyStaffed') {
      filteredData = filteredData.filter((ct) => !ct.needsStaff);
    }

    return {
      data: filteredData,
      meta: {
        total: input.staffingStatus === 'all' ? total : filteredData.length,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Map ExperienceRequirement string to SkillLevel
   */
  private mapExperienceToSkillLevel(experience: string): SkillLevel {
    switch (experience) {
      case 'INTERMEDIATE':
        return SkillLevel.INTERMEDIATE;
      case 'ADVANCED':
        return SkillLevel.ADVANCED;
      case 'ANY':
      case 'BEGINNER':
      default:
        return SkillLevel.BEGINNER;
    }
  }

  /**
   * Map CostUnitType to RateType (best effort)
   */
  private mapCostUnitToRateType(costUnitType: string | null): RateType {
    if (!costUnitType) return RateType.PER_HOUR;

    const lower = costUnitType.toLowerCase();
    if (lower.includes('hour')) return RateType.PER_HOUR;
    if (lower.includes('shift')) return RateType.PER_SHIFT;
    if (lower.includes('day')) return RateType.PER_DAY;
    if (lower.includes('event')) return RateType.PER_EVENT;

    return RateType.PER_HOUR;
  }

  /**
   * Bulk sync CallTimes for an event from Event Form
   * Replaces all existing CallTimes for the event with new ones from assignments
   */
  async bulkSyncForEvent(input: BulkSyncForEventInput, userId: string) {
    // Verify event exists and user owns it
    const event = await this.prisma.event.findFirst({
      where: { id: input.eventId, createdBy: userId },
    });

    if (!event) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event not found or you do not have permission',
      });
    }

    // If no assignments, just delete existing and return
    if (input.assignments.length === 0) {
      await this.prisma.callTime.deleteMany({
        where: { eventId: input.eventId },
      });
      return [];
    }

    // OPTIMIZATION: Batch fetch all services BEFORE the transaction
    const serviceIds = [...new Set(input.assignments.map(a => a.serviceId))];
    const services = await this.prisma.service.findMany({
      where: { id: { in: serviceIds } },
    });
    const serviceMap = new Map(services.map(s => [s.id, s]));

    // Validate all services exist
    for (const serviceId of serviceIds) {
      if (!serviceMap.has(serviceId)) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Service not found: ${serviceId}`,
        });
      }
    }

    // OPTIMIZATION: Generate all CallTime IDs BEFORE the transaction
    // This avoids N*2 queries inside the transaction
    const callTimeIds = await this.generateBatchCallTimeIds(input.assignments.length);

    // Use transaction with increased timeout for atomicity
    return await this.prisma.$transaction(async (tx) => {
      // Delete existing CallTimes for this event
      // Note: This will cascade delete CallTimeInvitations as well
      await tx.callTime.deleteMany({
        where: { eventId: input.eventId },
      });

      // Prepare all call time data
      const callTimeDataList = input.assignments.map((assignment, index) => {
        const service = serviceMap.get(assignment.serviceId)!;
        const callTimeId = callTimeIds[index]!;

        // Parse dates - use event dates as fallback
        const startDate = assignment.startDate
          ? new Date(assignment.startDate)
          : event.startDate;
        const endDate = assignment.endDate
          ? new Date(assignment.endDate)
          : event.endDate;

        // Determine rates
        const payRate = assignment.payRate ?? assignment.customCost ?? Number(service.cost) ?? 0;
        const billRate = assignment.billRate ?? assignment.customPrice ?? Number(service.price) ?? 0;
        const rateType = assignment.rateType ?? this.mapCostUnitToRateType(service.costUnitType);

        // Map rating required
        const ratingRequired = assignment.ratingRequired === 'ANY'
          ? null
          : assignment.ratingRequired as StaffRating;

        return {
          callTimeId,
          eventId: input.eventId,
          serviceId: assignment.serviceId,
          numberOfStaffRequired: assignment.quantity,
          skillLevel: this.mapExperienceToSkillLevel(assignment.experienceRequired),
          startDate,
          startTime: assignment.startTime,
          endDate,
          endTime: assignment.endTime,
          payRate,
          payRateType: rateType,
          billRate,
          billRateType: rateType,
          customCost: assignment.customCost,
          customPrice: assignment.customPrice,
          ratingRequired,
          approveOvertime: assignment.approveOvertime,
          commission: assignment.commission,
          notes: assignment.notes,
        };
      });

      // Create all call times (sequential to maintain order, but minimal queries now)
      const createdCallTimes = [];
      for (const data of callTimeDataList) {
        const callTime = await tx.callTime.create({
          data,
          include: { service: true },
        });
        createdCallTimes.push(callTime);
      }

      return createdCallTimes;
    }, {
      timeout: 15000, // Increase timeout to 15 seconds for bulk operations
    });
  }

  /**
   * Generate multiple unique CallTime IDs efficiently
   * Fetches last ID once and generates sequential IDs
   */
  private async generateBatchCallTimeIds(count: number): Promise<string[]> {
    const year = new Date().getFullYear();
    const prefix = `CT-${year}`;

    // Find the last CallTime ID for the current year
    const lastCallTime = await this.prisma.callTime.findFirst({
      where: {
        callTimeId: { startsWith: prefix },
      },
      orderBy: {
        callTimeId: 'desc',
      },
      select: {
        callTimeId: true,
      },
    });

    let nextNumber = 1;
    if (lastCallTime?.callTimeId) {
      const parts = lastCallTime.callTimeId.split('-');
      const lastPart = parts[parts.length - 1];
      const lastNumber = lastPart ? parseInt(lastPart, 10) : NaN;
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    // Generate sequential IDs
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      ids.push(`${prefix}-${String(nextNumber + i).padStart(3, '0')}`);
    }

    return ids;
  }

  /**
   * Get CallTimes for an event for billing display
   * Returns CallTimes with service details for Event Form edit mode
   */
  async getByEventForBilling(eventId: string, userId: string) {
    // Verify event exists and user owns it
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, createdBy: userId },
    });

    if (!event) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event not found or you do not have permission',
      });
    }

    const callTimes = await this.prisma.callTime.findMany({
      where: { eventId },
      include: {
        service: {
          select: {
            id: true,
            serviceId: true,
            title: true,
            cost: true,
            price: true,
            costUnitType: true,
            description: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return callTimes;
  }
}
