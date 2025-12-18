import {
  PrismaClient,
  CallTimeInvitationStatus,
  SkillLevel,
  Prisma,
} from '@prisma/client';
import { TRPCError } from '@trpc/server';
import type {
  CreateCallTimeInput,
  UpdateCallTimeInput,
  QueryCallTimesInput,
  SendInvitationsInput,
  RespondToInvitationInput,
  StaffSearchInput,
} from '@/lib/schemas/call-time.schema';
import { generateCallTimeId } from '@/lib/utils/id-generator';

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
  constructor(private prisma: PrismaClient) {}

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

    // Verify position exists
    const position = await this.prisma.staffPosition.findUnique({
      where: { id: data.positionId },
    });

    if (!position) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Position not found',
      });
    }

    const callTimeId = await generateCallTimeId(this.prisma);

    return await this.prisma.callTime.create({
      data: {
        callTimeId,
        positionId: data.positionId,
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
        position: true,
        event: { select: { id: true, eventId: true, title: true } },
        _count: { select: { invitations: true } },
      },
    });
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
          position: true,
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
        position: true,
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

    return await this.prisma.callTime.update({
      where: { id },
      data,
      include: {
        position: true,
        event: { select: { id: true, eventId: true, title: true } },
        _count: { select: { invitations: true } },
      },
    });
  }

  /**
   * Delete call time
   */
  async remove(id: string, userId: string) {
    await this.findOne(id, userId); // Verify ownership

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
      // Has the required position
      positions: {
        some: { positionId: callTime.positionId },
      },
      // Meets skill level requirement
      skillLevel: { in: eligibleSkillLevels },
      // Active account
      accountStatus: 'ACTIVE',
      // Not on time off during call time dates
      NOT: {
        AND: [
          { availabilityStatus: 'TIME_OFF' },
          {
            OR: [
              // Time off overlaps with call time
              {
                timeOffStart: { lte: callTime.endDate },
                timeOffEnd: { gte: callTime.startDate },
              },
            ],
          },
        ],
      },
      // Exclude already invited (if requested)
      ...(excludeStaffIds.length > 0 && {
        id: { notIn: excludeStaffIds },
      }),
      // No conflicting confirmed call times
      callTimeInvitations: {
        none: {
          isConfirmed: true,
          status: 'ACCEPTED',
          callTime: {
            // Call time conflicts (date overlap)
            startDate: { lte: callTime.endDate },
            endDate: { gte: callTime.startDate },
            // Exclude current call time
            id: { not: callTime.id },
          },
        },
      },
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
          positions: {
            include: { position: { select: { id: true, name: true } } },
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
              },
            },
            callTime: {
              include: {
                position: true,
                event: {
                  select: {
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
        callTime: true,
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

      return await this.prisma.callTimeInvitation.update({
        where: { id: invitation.id },
        data: {
          status: hasAvailableSlot ? 'ACCEPTED' : 'WAITLISTED',
          respondedAt: new Date(),
          isConfirmed: hasAvailableSlot,
          confirmedAt: hasAvailableSlot ? new Date() : null,
        },
        include: {
          callTime: { include: { position: true, event: true } },
        },
      });
    } else {
      // Decline
      return await this.prisma.callTimeInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'DECLINED',
          respondedAt: new Date(),
          declineReason: input.declineReason,
        },
        include: {
          callTime: { include: { position: true, event: true } },
        },
      });
    }
  }

  /**
   * Resend invitation (admin action)
   */
  async resendInvitation(invitationId: string, userId: string) {
    const invitation = await this.prisma.callTimeInvitation.findUnique({
      where: { id: invitationId },
      include: {
        callTime: { include: { event: { select: { createdBy: true } } } },
        staff: { select: { id: true, firstName: true, lastName: true, email: true } },
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
        staff: { select: { id: true, firstName: true, lastName: true, email: true } },
        callTime: {
          include: {
            position: true,
            event: {
              select: { title: true, venueName: true, city: true, state: true },
            },
          },
        },
      },
    });

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
      select: { id: true },
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
            position: true,
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

    // Categorize invitations
    const pending = invitations.filter(
      (inv) => inv.status === 'PENDING' && inv.callTime.startDate >= now
    );
    const accepted = invitations.filter(
      (inv) =>
        inv.status === 'ACCEPTED' &&
        inv.isConfirmed &&
        inv.callTime.startDate >= now
    );
    const past = invitations.filter(
      (inv) =>
        inv.status === 'ACCEPTED' &&
        inv.isConfirmed &&
        inv.callTime.endDate < now
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
            position: true,
            event: {
              select: {
                id: true,
                eventId: true,
                title: true,
                description: true,
                venueName: true,
                address: true,
                room: true,
                city: true,
                state: true,
                zipCode: true,
                dressCode: true,
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
}
