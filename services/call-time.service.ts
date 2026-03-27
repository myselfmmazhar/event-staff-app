import {
  PrismaClient,
  CallTimeInvitationStatus,
  SkillLevel,
  Prisma,
  RateType,
  StaffRating,
  EventStatus,
  InternalReviewRating,
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
  SubmitReviewInput,
  GetStaffAssignmentHistoryInput,
} from '@/lib/schemas/call-time.schema';
import { generateCallTimeId } from '@/lib/utils/id-generator';
import { getNotificationTriggerService } from '@/services/notification-trigger.service';
import { calculateDistance } from '@/services/mapbox.service';
import type { CallTimeWithDetailsAndConfirmedCount } from '@/lib/types/prisma-types';

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
  async create(data: CreateCallTimeInput, userId: string, userRole?: string | null) {
    const isSuperAdmin = userRole === 'SUPER_ADMIN';
    const isAdmin = userRole === 'ADMIN';

    // Verify event exists and user owns it
    const event = await this.prisma.event.findFirst({
      where: {
        id: data.eventId,
        ...(isSuperAdmin ? {} :
          isAdmin ? { createdByUser: { role: { not: 'SUPER_ADMIN' } } } :
            { createdBy: userId }),
      },
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
        approveOvertime: data.approveOvertime ?? false,
        overtimeRate: data.overtimeRate ?? null,
        overtimeRateType: data.overtimeRateType ?? null,
        commission: data.commission ?? false,
        commissionAmount: data.commissionAmount ?? null,
        commissionAmountType: data.commissionAmountType ?? null,
        expenditure: data.expenditure ?? false,
        expenditurePrice: data.expenditurePrice ?? null,
        expenditureCost: data.expenditureCost ?? null,
        expenditureAmount: data.expenditureAmount ?? null,
        expenditureAmountType: data.expenditureAmountType ?? null,
        travelInMinimum: data.travelInMinimum ?? false,
        notes: data.notes,
        eventId: data.eventId,
      },
      include: {
        service: true,
        event: { select: { id: true, eventId: true, title: true, venueName: true, city: true, state: true, description: true, requirements: true, preEventInstructions: true, privateComments: true } },
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
              description: result.event.description,
              requirements: result.event.requirements,
              preEventInstructions: result.event.preEventInstructions,
              privateComments: result.event.privateComments,
            }
          );
          console.log(`Email result for ${member.email}:`, emailResult);
        }
      }
    } catch (error) {
      console.error('Failed to send task creation emails to team:', error);
    }

    // Auto-sync estimate for this event based on current tasks (best-effort)
    try {
      await this.syncEstimateForEvent(data.eventId, userId);
    } catch (err) {
      console.error('Failed to sync estimate after call time create:', err);
    }

    return result;
  }

  /**
   * Get all call times for an event
   */
  async findByEvent(input: QueryCallTimesInput, userId: string, userRole?: string | null) {
    const isSuperAdmin = userRole === 'SUPER_ADMIN';
    const isAdmin = userRole === 'ADMIN';

    // Verify event ownership
    const event = await this.prisma.event.findFirst({
      where: {
        id: input.eventId,
        ...(isSuperAdmin ? {} :
          isAdmin ? { createdByUser: { role: { not: 'SUPER_ADMIN' } } } :
            { createdBy: userId }),
      },
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

  async findOne(id: string, userId: string, userRole?: string | null) {
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
            createdByUser: { select: { role: true } },
            venueName: true,
            city: true,
            state: true,
            latitude: true,
            longitude: true,
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

    const isSuperAdmin = userRole === 'SUPER_ADMIN';
    const isAdmin = userRole === 'ADMIN';

    if (!callTime) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Call time not found',
      });
    }

    // Verify ownership
    const hasPermission = isSuperAdmin ||
      (isAdmin && (callTime as any).event.createdByUser?.role !== 'SUPER_ADMIN') ||
      callTime.event.createdBy === userId;

    if (!hasPermission) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to access this call time',
      });
    }

    // Calculate confirmed count
    const confirmedCount = callTime.invitations.filter(
      (inv) => inv.status === 'ACCEPTED' && inv.isConfirmed
    ).length;

    return { ...callTime, confirmedCount };
  }

  async findManyByIds(ids: string[], userId: string, userRole?: string | null) {
    const isSuperAdmin = userRole === 'SUPER_ADMIN';
    const isAdmin = userRole === 'ADMIN';

    const callTimes = await this.prisma.callTime.findMany({
      where: {
        id: { in: ids },
        event: {
          ...(isSuperAdmin ? {} :
            isAdmin ? { createdByUser: { role: { not: 'SUPER_ADMIN' } } } :
              { createdBy: userId }),
        },
      },
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
            latitude: true,
            longitude: true,
            description: true,
            requirements: true,
            preEventInstructions: true,
            privateComments: true,
          },
        },
        invitations: {
          select: {
            id: true,
            staffId: true,
            status: true,
            isConfirmed: true,
          },
        },
      },
    });

    return callTimes.map((ct) => ({
      ...ct,
      confirmedCount: ct.invitations.filter(
        (inv) => inv.status === 'ACCEPTED' && inv.isConfirmed
      ).length,
    }));
  }

  /**
   * Update call time
   */
  async update(
    id: string,
    data: Omit<UpdateCallTimeInput, 'id'>,
    userId: string,
    userRole?: string | null
  ) {
    await this.findOne(id, userId, userRole); // Verify ownership

    // Transform serviceId to Prisma relation syntax
    const { serviceId, ...restData } = data;
    const prismaData: any = { ...restData };

    // Handle service relation
    if (serviceId !== undefined) {
      prismaData.service = serviceId ? { connect: { id: serviceId } } : { disconnect: true };
    }

    const updated = await this.prisma.callTime.update({
      where: { id },
      data: prismaData,
      include: {
        service: true,
        event: { select: { id: true, eventId: true, title: true } },
        _count: { select: { invitations: true } },
      },
    });

    // Auto-sync estimate for this event based on current tasks (best-effort)
    try {
      await this.syncEstimateForEvent(updated.event.id, userId);
    } catch (err) {
      console.error('Failed to sync estimate after call time update:', err);
    }

    return updated;
  }

  /**
   * Delete call time
   */
  async remove(id: string, userId: string, userRole?: string | null) {
    const callTime = await this.findOne(id, userId, userRole); // Verify ownership

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

    const eventId = callTime.event.id;
    await this.prisma.callTime.delete({ where: { id } });

    // Update event status after removing a call time (may affect fully staffed state)
    await this.updateEventStatusBasedOnStaffing(eventId);

    // Auto-sync estimate for this event based on current tasks (best-effort)
    try {
      await this.syncEstimateForEvent(eventId, userId);
    } catch (err) {
      console.error('Failed to sync estimate after call time delete:', err);
    }

    return { success: true, message: 'Call time deleted successfully' };
  }

  async searchAvailableStaff(input: StaffSearchInput, userId: string, userRole?: string | null) {
    const callTimeIds = input.callTimeIds || [input.callTimeId!];
    const callTimes = await this.findManyByIds(callTimeIds, userId, userRole);

    if (callTimes.length === 0) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No assignments found',
      });
    }

    // Use the first call time for primary context (distance, location match)
    const primaryCallTime = callTimes[0]!;

    // When distance filter is active, we need to fetch more and post-filter
    const hasDistanceFilter =
      input.maxDistance &&
      primaryCallTime.event.latitude &&
      primaryCallTime.event.longitude;
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    const skip = hasDistanceFilter ? 0 : (page - 1) * limit;
    const take = hasDistanceFilter ? 1000 : limit; // Fetch more for post-query distance filtering

    // Build exclusion list: anybody invited to ANY of these call times
    let excludeStaffIds: string[] = [];
    if (!input.includeAlreadyInvited) {
      const allStaffIds = new Set<string>();
      callTimes.forEach((ct) => {
        ct.invitations.forEach((inv) => allStaffIds.add(inv.staffId));
      });
      excludeStaffIds = Array.from(allStaffIds);
    }

    // Skill level filter: use highest requirement among all selected
    let skillLevelFilter: SkillLevel[];
    if (input.skillLevels && input.skillLevels.length > 0) {
      skillLevelFilter = input.skillLevels;
    } else {
      const maxRequiredLevel = Math.max(
        ...callTimes.map((ct) => SKILL_LEVEL_ORDER[ct.skillLevel])
      );
      skillLevelFilter = (
        Object.entries(SKILL_LEVEL_ORDER) as [SkillLevel, number][]
      )
        .filter(([_, level]) => level >= maxRequiredLevel)
        .map(([name]) => name);
    }

    // Build staff query
    const where: Prisma.StaffWhereInput = {
      // Has at least one of the required services
      ...(callTimes.some((ct) => ct.serviceId) && {
        services: {
          some: {
            serviceId: {
              in: callTimes.map((ct) => ct.serviceId).filter(Boolean) as string[],
            },
          },
        },
      }),
      // Skill level filter
      skillLevel: { in: skillLevelFilter },
      // Active account
      accountStatus: 'ACTIVE',
      // Multi-select filters
      ...(input.ratings && input.ratings.length > 0 && { staffRating: { in: input.ratings } }),
      ...(input.availabilityStatuses &&
        input.availabilityStatuses.length > 0 && {
        availabilityStatus: { in: input.availabilityStatuses },
      }),
      // Availability filter (Time Off Check) - based on primary call time
      ...(primaryCallTime.startDate &&
        primaryCallTime.endDate &&
        !input.includeAlreadyInvited
        ? {
          NOT: {
            AND: [
              { availabilityStatus: 'TIME_OFF' },
              {
                OR: [
                  {
                    timeOffStart: { lte: primaryCallTime.endDate as Date },
                    timeOffEnd: { gte: primaryCallTime.startDate as Date },
                  },
                ],
              },
            ],
          },
        }
        : {}),
      // Exclude already invited (if requested)
      ...(excludeStaffIds.length > 0 && {
        id: { notIn: excludeStaffIds },
      }),
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
          staffRating: true,
          city: true,
          state: true,
          country: true,
          latitude: true,
          longitude: true,
          internalNotes: true,
          userId: true,
          hasLoginAccess: true,
          services: {
            include: { service: { select: { id: true, title: true } } },
          },
          // Fetch call time invitations for invitation status + conflict detection
          callTimeInvitations: {
            where: {
              OR: [
                // Any of these call times' invitations (for status display)
                { callTimeId: { in: callTimeIds } },
                // Overlapping confirmed assignments (for conflict detection)
                ...(primaryCallTime.startDate && primaryCallTime.endDate
                  ? [
                    {
                      isConfirmed: true,
                      status: 'ACCEPTED' as const,
                      callTime: {
                        startDate: { lte: primaryCallTime.endDate as Date },
                        endDate: { gte: primaryCallTime.startDate as Date },
                        id: { notIn: callTimeIds },
                      },
                    },
                  ]
                  : []),
              ],
            },
            select: {
              status: true,
              isConfirmed: true,
              callTimeId: true,
              callTime: {
                select: {
                  id: true,
                  event: { select: { title: true, city: true, state: true } },
                  startDate: true,
                  endDate: true,
                  startTime: true,
                  endTime: true,
                },
              },
            },
          },
        },
        orderBy: [
          { availabilityStatus: 'asc' },
          { skillLevel: 'desc' },
          { lastName: 'asc' },
        ],
        skip,
        take,
      }),
      this.prisma.staff.count({ where }),
    ]);

    // Convert km to miles helper
    const KM_TO_MILES = 0.621371;

    // Enrich with distance, location match, and invitation status
    const eventLat = primaryCallTime.event.latitude as number | null;
    const eventLng = primaryCallTime.event.longitude as number | null;

    let enrichedStaff = staff.map((s) => {
      // Calculate distance in miles if both event and staff have coordinates
      let distanceMiles: number | null = null;
      if (eventLat && eventLng && s.latitude && s.longitude) {
        const distanceKm = calculateDistance(eventLat, eventLng, s.latitude, s.longitude);
        distanceMiles = Math.round(distanceKm * KM_TO_MILES * 10) / 10; // 1 decimal
      }

      // Extract invitation status and conflicts from callTimeInvitations
      const allInvitations = (s as any).callTimeInvitations || [];

      // Invitation for ANY of these call times (pick the first one found for status display)
      const thisInvitation = allInvitations.find((inv: any) =>
        callTimeIds.includes(inv.callTimeId)
      ) || null;

      // Conflicts from OTHER overlapping call times (confirmed assignments, excluding current batch)
      const conflicts = allInvitations
        .filter(
          (inv: any) =>
            !callTimeIds.includes(inv.callTimeId) &&
            inv.isConfirmed &&
            inv.status === 'ACCEPTED'
        )
        .map((inv: any) => ({
          eventTitle: inv.callTime.event.title,
          startDate: inv.callTime.startDate,
          endDate: inv.callTime.endDate,
          startTime: (inv.callTime as any).startTime,
          endTime: (inv.callTime as any).endTime,
          city: (inv.callTime.event as any).city,
          state: (inv.callTime.event as any).state,
        }));

      return {
        ...s,
        distanceMiles,
        locationMatch: this.calculateLocationMatch(s, primaryCallTime.event),
        invitationStatus: thisInvitation?.status || null,
        invitationConfirmed: thisInvitation?.isConfirmed || false,
        hasConflict: conflicts.length > 0,
        conflicts,
      };
    });

    // Apply distance filter (post-query since it's calculated)
    if (hasDistanceFilter && input.maxDistance) {
      enrichedStaff = enrichedStaff.filter((s) => {
        if (s.distanceMiles === null) return true; // Keep staff without coords (show at bottom)
        return s.distanceMiles <= input.maxDistance!;
      });
    }

    // Sort: distance first if available, then location match
    enrichedStaff.sort((a, b) => {
      // Staff with distance come first, then without
      if (a.distanceMiles !== null && b.distanceMiles !== null) {
        return a.distanceMiles - b.distanceMiles;
      }
      if (a.distanceMiles !== null && b.distanceMiles === null) return -1;
      if (a.distanceMiles === null && b.distanceMiles !== null) return 1;
      // Fall back to location match
      return b.locationMatch - a.locationMatch;
    });

    // Apply pagination for distance-filtered results
    const paginatedTotal = hasDistanceFilter ? enrichedStaff.length : total;
    const paginatedData = hasDistanceFilter
      ? enrichedStaff.slice((page - 1) * limit, page * limit)
      : enrichedStaff;

    return {
      data: paginatedData,
      meta: { total: paginatedTotal, page, limit, totalPages: Math.ceil(paginatedTotal / limit) },
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

  async sendInvitations(input: SendInvitationsInput, userId: string, userRole?: string | null) {
    const callTimeIds = input.callTimeIds;
    const callTimes = await this.findManyByIds(callTimeIds, userId, userRole);

    if (callTimes.length === 0) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No assignments found',
      });
    }

    const invitations: any[] = [];

    // Loop through each assignment and each staff member
    for (const ct of callTimes) {
      // Get existing invitations for THIS assignment
      const existingInvitations = await this.prisma.callTimeInvitation.findMany({
        where: {
          callTimeId: ct.id,
          staffId: { in: input.staffIds },
        },
      });

      const existingStaffIds = existingInvitations.map((inv) => inv.staffId);
      const newStaffIds = input.staffIds.filter(
        (id) => !existingStaffIds.includes(id)
      );

      // Create new invitations for THIS assignment
      const newInvitations = await Promise.all(
        newStaffIds.map(async (staffId) => {
          return this.prisma.callTimeInvitation.create({
            data: {
              callTimeId: ct.id,
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
                      description: true,
                      requirements: true,
                      preEventInstructions: true,
                      privateComments: true,
                    },
                  },
                },
              },
            },
          });
        })
      );
      invitations.push(...newInvitations);
    }

    if (invitations.length === 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'All selected staff have already been invited to these assignments',
      });
    }

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

    return { invitations, sent: invitations.length };
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

      // Update event status if all positions are now filled
      if (hasAvailableSlot) {
        await this.updateEventStatusBasedOnStaffing(invitation.callTime.eventId);
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

  async resendInvitation(invitationId: string, userId: string, userRole?: string | null) {
    const isSuperAdmin = userRole === 'SUPER_ADMIN';
    const isAdmin = userRole === 'ADMIN';

    const invitation = await this.prisma.callTimeInvitation.findUnique({
      where: { id: invitationId },
      include: {
        callTime: {
          include: {
            service: true,
            event: {
              select: {
                id: true,
                title: true,
                createdBy: true,
                createdByUser: { select: { role: true } }
              }
            },
          },
        },
        staff: { select: { id: true, firstName: true, lastName: true, email: true, userId: true } },
      },
    });

    if (!invitation) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Invitation not found',
      });
    }

    const hasPermission = isSuperAdmin ||
      (isAdmin && (invitation.callTime.event as any).createdByUser?.role !== 'SUPER_ADMIN') ||
      invitation.callTime.event.createdBy === userId;

    if (!hasPermission) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to resend this invitation',
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

  async acceptInvitationOnBehalf(invitationId: string, userId: string, userRole?: string | null) {
    const isSuperAdmin = userRole === 'SUPER_ADMIN';
    const isAdmin = userRole === 'ADMIN';

    const invitation = await this.prisma.callTimeInvitation.findUnique({
      where: { id: invitationId },
      include: {
        callTime: { include: { event: { select: { id: true, createdBy: true, createdByUser: { select: { role: true } } } } } },
      },
    });

    if (!invitation) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Invitation not found',
      });
    }

    const hasPermission = isSuperAdmin ||
      (isAdmin && (invitation.callTime.event as any).createdByUser?.role !== 'SUPER_ADMIN') ||
      invitation.callTime.event.createdBy === userId;

    if (!hasPermission) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to perform this action',
      });
    }

    const updated = await this.prisma.callTimeInvitation.update({
      where: { id: invitationId },
      data: { status: 'ACCEPTED', isConfirmed: true, respondedAt: new Date() },
      include: {
        staff: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.updateEventStatusBasedOnStaffing(invitation.callTime.event.id);

    return updated;
  }

  async cancelInvitation(invitationId: string, userId: string, userRole?: string | null) {
    const isSuperAdmin = userRole === 'SUPER_ADMIN';
    const isAdmin = userRole === 'ADMIN';

    const invitation = await this.prisma.callTimeInvitation.findUnique({
      where: { id: invitationId },
      include: {
        callTime: { include: { event: { select: { id: true, createdBy: true, createdByUser: { select: { role: true } } } } } },
      },
    });

    if (!invitation) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Invitation not found',
      });
    }

    const hasPermission = isSuperAdmin ||
      (isAdmin && (invitation.callTime.event as any).createdByUser?.role !== 'SUPER_ADMIN') ||
      invitation.callTime.event.createdBy === userId;

    if (!hasPermission) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to cancel this invitation',
      });
    }

    const wasConfirmed = invitation.status === 'ACCEPTED' && invitation.isConfirmed;

    const updated = await this.prisma.callTimeInvitation.update({
      where: { id: invitationId },
      data: { status: 'CANCELLED', isConfirmed: false },
      include: {
        staff: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // If a confirmed staff was cancelled, check if event is still fully staffed
    if (wasConfirmed) {
      await this.updateEventStatusBasedOnStaffing(invitation.callTime.event.id);
    }

    return updated;
  }

  /**
   * Batch Respond to invitations (staff action)
   */
  async batchRespond(invitationIds: string[], accept: boolean, userId: string) {
    const results = [];
    for (const invitationId of invitationIds) {
      try {
        const result = await this.respondToInvitation({ invitationId, accept }, userId);
        results.push(result);
      } catch (error) {
        console.error(`Failed to respond to invitation ${invitationId}:`, error);
      }
    }
    return { count: results.length };
  }

  async batchAcceptInvitations(invitationIds: string[], userId: string, userRole?: string | null) {
    const isSuperAdmin = userRole === 'SUPER_ADMIN';
    const isAdmin = userRole === 'ADMIN';

    // Verify each invitation belongs to an event created by the user or an accessible event
    const invitations = await this.prisma.callTimeInvitation.findMany({
      where: {
        id: { in: invitationIds },
        callTime: {
          event: {
            ...(isSuperAdmin ? {} :
              isAdmin ? { createdByUser: { role: { not: 'SUPER_ADMIN' } } } :
                { createdBy: userId }),
          }
        }
      },
      select: { id: true, callTime: { select: { id: true, eventId: true } } }
    });

    if (invitations.length === 0) return { count: 0 };

    const validIds = invitations.map(i => i.id);
    const result = await this.prisma.callTimeInvitation.updateMany({
      where: { id: { in: validIds } },
      data: { status: 'ACCEPTED', isConfirmed: true, respondedAt: new Date() }
    });

    // Update event status for all affected events
    const eventIds = [...new Set(invitations.map(i => i.callTime.eventId))];
    for (const eventId of eventIds) {
      await this.updateEventStatusBasedOnStaffing(eventId);
    }

    return { count: result.count };
  }

  async batchCancelInvitations(invitationIds: string[], userId: string, userRole?: string | null) {
    const isSuperAdmin = userRole === 'SUPER_ADMIN';
    const isAdmin = userRole === 'ADMIN';

    const invitations = await this.prisma.callTimeInvitation.findMany({
      where: {
        id: { in: invitationIds },
        callTime: {
          event: {
            ...(isSuperAdmin ? {} :
              isAdmin ? { createdByUser: { role: { not: 'SUPER_ADMIN' } } } :
                { createdBy: userId }),
          }
        }
      },
      select: { id: true, callTime: { select: { id: true, eventId: true } }, status: true, isConfirmed: true }
    });

    if (invitations.length === 0) return { count: 0 };

    const validIds = invitations.map(i => i.id);
    const result = await this.prisma.callTimeInvitation.updateMany({
      where: { id: { in: validIds } },
      data: { status: 'CANCELLED', isConfirmed: false }
    });

    // Update event status for all affected events where confirmed staff were cancelled
    const eventIds = [...new Set(invitations.filter(i => i.status === 'ACCEPTED' && i.isConfirmed).map(i => i.callTime.eventId))];
    for (const eventId of eventIds) {
      await this.updateEventStatusBasedOnStaffing(eventId);
    }

    return { count: result.count };
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

  async getUpcoming(userId: string, limit: number = 50, userRole?: string | null) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const isSuperAdmin = userRole === 'SUPER_ADMIN';
    const isAdmin = userRole === 'ADMIN';

    const callTimes = await this.prisma.callTime.findMany({
      where: {
        // Only upcoming call times
        OR: [
          { startDate: { gte: startOfToday } },
          { endDate: { gte: startOfToday } },
        ],
        // Role-based visibility
        event: {
          ...(isSuperAdmin ? {} :
            isAdmin ? { createdByUser: { role: { not: 'SUPER_ADMIN' } } } :
              { createdBy: userId }),
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
      staffingStatus?: 'needsStaff' | 'fullyStaffed' | 'pending' | 'accepted' | 'all';
      eventStatuses?: EventStatus[];
    },
    userRole?: string | null
  ) {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortOrder = input.sortOrder ?? 'asc';

    const isSuperAdmin = userRole === 'SUPER_ADMIN';
    const isAdmin = userRole === 'ADMIN';

    // Build where clause
    const where: any = {
      event: {
        ...(isSuperAdmin ? {} :
          isAdmin ? { createdByUser: { role: { not: 'SUPER_ADMIN' } } } :
            { createdBy: userId }),
      },
    };

    if (input.eventId) {
      where.eventId = input.eventId;
    }

    if (input.serviceId) {
      where.serviceId = input.serviceId;
    }

    if (input.eventStatuses && input.eventStatuses.length > 0) {
      where.event.status = { in: input.eventStatuses };
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

    const fetchingAll = input.staffingStatus && input.staffingStatus !== 'all';
    const dbSkip = fetchingAll ? undefined : skip;
    const dbTake = fetchingAll ? undefined : limit;

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
              createdAt: true,
              staff: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
            },
          },
          _count: {
            select: { invitations: true },
          },
        },
        orderBy,
        skip: dbSkip,
        take: dbTake,
      }),
      fetchingAll ? Promise.resolve(0) : this.prisma.callTime.count({ where }),
    ]);

    // Calculate staffing status and filter if needed
    let filteredData = callTimes.map((ct) => {
      const confirmedCount = ct.invitations.filter(
        (inv) => inv.status === 'ACCEPTED' && inv.isConfirmed
      ).length;
      const needsStaff = confirmedCount < ct.numberOfStaffRequired;
      const hasPending = ct.invitations.some(inv => inv.status === 'PENDING');
      const hasAccepted = ct.invitations.some(inv => inv.status === 'ACCEPTED' && inv.isConfirmed);

      // Create a clean object for the frontend
      return {
        id: ct.id,
        callTimeId: ct.callTimeId,
        serviceId: ct.serviceId,
        numberOfStaffRequired: ct.numberOfStaffRequired,
        skillLevel: ct.skillLevel,
        startDate: ct.startDate,
        startTime: ct.startTime,
        endDate: ct.endDate,
        endTime: ct.endTime,
        payRate: ct.payRate,
        payRateType: ct.payRateType,
        billRate: ct.billRate,
        billRateType: ct.billRateType,
        notes: ct.notes,
        eventId: ct.eventId,
        confirmedCount,
        needsStaff,
        hasPending,
        hasAccepted,
        service: ct.service,
        event: ct.event,
        invitations: ct.invitations,
        _count: ct._count,
      };
    });

    // Filter by staffing status if specified
    if (input.staffingStatus === 'needsStaff') {
      filteredData = filteredData.filter((ct) => ct.needsStaff);
    } else if (input.staffingStatus === 'fullyStaffed') {
      filteredData = filteredData.filter((ct) => !ct.needsStaff);
    } else if (input.staffingStatus === 'pending') {
      filteredData = filteredData.filter((ct) => ct.hasPending);
    } else if (input.staffingStatus === 'accepted') {
      filteredData = filteredData.filter((ct) => ct.hasAccepted);
    }

    const finalTotal = fetchingAll ? filteredData.length : total;

    // Apply pagination if we fetched all
    if (fetchingAll) {
      filteredData = filteredData.slice(skip, skip + limit);
    }

    return {
      data: filteredData,
      meta: {
        total: finalTotal,
        page,
        limit,
        totalPages: Math.ceil(finalTotal / limit),
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

  async bulkSyncForEvent(input: BulkSyncForEventInput, userId: string, userRole?: string | null) {
    const isSuperAdmin = userRole === 'SUPER_ADMIN';
    const isAdmin = userRole === 'ADMIN';

    // Verify event exists and user owns it
    const event = await this.prisma.event.findFirst({
      where: {
        id: input.eventId,
        ...(isSuperAdmin ? {} :
          isAdmin ? { createdByUser: { role: { not: 'SUPER_ADMIN' } } } :
            { createdBy: userId }),
      },
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
    const createdCallTimes = await this.prisma.$transaction(async (tx) => {
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
          overtimeRate: assignment.overtimeRate ?? null,
          overtimeRateType: assignment.overtimeRateType ?? null,
          commission: assignment.commission,
          commissionAmount: assignment.commissionAmount ?? null,
          commissionAmountType: assignment.commissionAmountType ?? null,
          expenditure: assignment.expenditure ?? service.expenditure ?? false,
          expenditureCost: assignment.expenditureCost ?? (service.expenditureCost ? Number(service.expenditureCost) : null),
          expenditurePrice: assignment.expenditurePrice ?? (service.expenditurePrice ? Number(service.expenditurePrice) : null),
          expenditureAmount: assignment.expenditureAmount ?? (service.expenditureAmount ? Number(service.expenditureAmount) : null),
          expenditureAmountType: assignment.expenditureAmountType ?? (service.expenditureAmountType as any) ?? null,
          travelInMinimum: assignment.travelInMinimum ?? service.travelInMinimum ?? false,
          notes: assignment.notes,
          instructions: assignment.instructions,
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

    // Auto-sync estimate for this event based on current tasks (best-effort)
    try {
      await this.syncEstimateForEvent(input.eventId, userId);
    } catch (err) {
      console.error('Failed to sync estimate after bulk sync:', err);
    }

    return createdCallTimes;
  }

  private async syncEstimateForEvent(eventId: string, userId: string, userRole?: string | null): Promise<void> {
    const isSuperAdmin = userRole === 'SUPER_ADMIN';
    const isAdmin = userRole === 'ADMIN';

    // Load event with billing settings
    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
        ...(isSuperAdmin ? {} :
          isAdmin ? { createdByUser: { role: { not: 'SUPER_ADMIN' } } } :
            { createdBy: userId }),
      },
      select: {
        id: true,
        eventId: true,
        title: true,
        clientId: true,
        estimate: true,
        startDate: true,
      },
    });

    // Only proceed when:
    // - event exists and belongs to the user
    // - event has a client
    // - estimate flag is enabled
    if (!event || !event.clientId || !event.estimate) {
      return;
    }

    // Fetch all call times for this event with service & price info
    const callTimes = await this.prisma.callTime.findMany({
      where: { eventId },
      include: {
        service: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (callTimes.length === 0) {
      // No tasks – for now, do not delete any existing estimate automatically
      return;
    }

    const estimateNo = event.eventId || event.id;
    const today = new Date();

    // Build items from call times (based on Price = billRate)
    const items = callTimes.map((ct) => {
      const quantity = ct.numberOfStaffRequired || 0;
      const price = Number(ct.billRate ?? 0);
      const amount = quantity * price;

      return {
        description: ct.service?.title
          ? `${ct.service.title} - ${event.title}`
          : event.title,
        quantity,
        price,
        amount,
        productId: null,
        serviceId: ct.serviceId,
        date: ct.startDate ?? event.startDate ?? today,
      };
    });

    // Upsert estimate using a transaction to keep header + items in sync
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.estimate.findFirst({
        where: {
          estimateNo,
          clientId: event.clientId!,
        },
        select: { id: true, estimateDate: true, status: true },
      });

      if (!existing) {
        await tx.estimate.create({
          data: {
            estimateNo,
            clientId: event.clientId!,
            estimateDate: today,
            status: 'DRAFT' as any,
            createdBy: userId,
            notes: null,
            items: {
              create: items,
            },
          },
        });
      } else {
        // Update header (keep existing status/date) and fully replace items
        await tx.estimate.update({
          where: { id: existing.id },
          data: {
            clientId: event.clientId!,
          },
        });

        await tx.estimateItem.deleteMany({
          where: { estimateId: existing.id },
        });

        if (items.length > 0) {
          await tx.estimateItem.createMany({
            data: items.map((item) => ({
              estimateId: existing.id,
              ...item,
            })),
          });
        }
      }
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

  async getByEventForBilling(eventId: string, userId: string, userRole?: string | null) {
    const isSuperAdmin = userRole === 'SUPER_ADMIN';
    const isAdmin = userRole === 'ADMIN';

    // Verify event exists and user owns it
    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
        ...(isSuperAdmin ? {} :
          isAdmin ? { createdByUser: { role: { not: 'SUPER_ADMIN' } } } :
            { createdBy: userId }),
      },
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

  /**
   * Check if all call times for an event are fully staffed
   * Returns true if every call time has confirmedCount >= numberOfStaffRequired
   */
  async isEventFullyStaffed(eventId: string): Promise<boolean> {
    const callTimes = await this.prisma.callTime.findMany({
      where: { eventId },
      select: {
        id: true,
        numberOfStaffRequired: true,
        invitations: {
          where: {
            status: 'ACCEPTED',
            isConfirmed: true,
          },
          select: { id: true },
        },
      },
    });

    // If no call times exist, event is not fully staffed
    if (callTimes.length === 0) {
      return false;
    }

    // Check if all call times have required staff filled
    return callTimes.every(
      (ct) => ct.invitations.length >= ct.numberOfStaffRequired
    );
  }

  /**
   * Update event status based on staffing:
   * - ASSIGNED: All positions filled
   * - DRAFT: Not all positions filled (revert if needed)
   * Also triggers appropriate notifications
   */
  async updateEventStatusBasedOnStaffing(eventId: string): Promise<void> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        status: true,
        title: true,
        createdBy: true,
      },
    });

    if (!event) return;

    // Don't change status if event is IN_PROGRESS, COMPLETED, or CANCELLED
    if (
      event.status === EventStatus.IN_PROGRESS ||
      event.status === EventStatus.COMPLETED ||
      event.status === EventStatus.CANCELLED
    ) {
      return;
    }

    const isFullyStaffed = await this.isEventFullyStaffed(eventId);
    const triggerService = getNotificationTriggerService(this.prisma);

    if (isFullyStaffed && event.status === EventStatus.DRAFT) {
      // Update status to ASSIGNED
      await this.prisma.event.update({
        where: { id: eventId },
        data: { status: EventStatus.ASSIGNED },
      });

      // Notify event creator that event is fully staffed
      await triggerService.onEventFullyStaffed(eventId, {
        eventTitle: event.title,
        createdBy: event.createdBy,
      });
    } else if (!isFullyStaffed && event.status === EventStatus.ASSIGNED) {
      // Update status back to DRAFT
      await this.prisma.event.update({
        where: { id: eventId },
        data: { status: EventStatus.DRAFT },
      });

      // Notify event creator that event needs staff
      await triggerService.onEventUnderstaffed(eventId, {
        eventTitle: event.title,
        createdBy: event.createdBy,
      });
    }
  }

  /**
   * Submit or update internal review for a call time invitation
   * Reviews can be edited after submission
   */
  async submitReview(input: SubmitReviewInput, userId: string, userRole?: string | null) {
    const isSuperAdmin = userRole === 'SUPER_ADMIN';
    const isAdmin = userRole === 'ADMIN';

    // Get the invitation with call time and event details
    const invitation = await this.prisma.callTimeInvitation.findUnique({
      where: { id: input.invitationId },
      include: {
        callTime: {
          include: {
            event: {
              select: { createdBy: true, createdByUser: { select: { role: true } } },
            },
          },
        },
      },
    });

    if (!invitation) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Invitation not found',
      });
    }

    // Verify ownership
    const hasPermission = isSuperAdmin ||
      (isAdmin && (invitation.callTime.event as any).createdByUser?.role !== 'SUPER_ADMIN') ||
      invitation.callTime.event.createdBy === userId;

    if (!hasPermission) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to review this assignment',
      });
    }

    // Submit or update the review
    const updated = await this.prisma.callTimeInvitation.update({
      where: { id: input.invitationId },
      data: {
        internalReviewRating: input.rating,
        internalReviewNotes: input.notes?.trim() || null,
        reviewedBy: userId,
        reviewedAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * Get assignment history for a staff member
   * Returns past, current, and upcoming assignments grouped
   */
  async getStaffAssignmentHistory(input: GetStaffAssignmentHistoryInput, userId: string) {
    // Verify staff exists
    const staff = await this.prisma.staff.findUnique({
      where: { id: input.staffId },
      select: { id: true, createdBy: true },
    });

    if (!staff) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Staff member not found',
      });
    }

    // Get all invitations for this staff member
    const invitations = await this.prisma.callTimeInvitation.findMany({
      where: {
        staffId: input.staffId,
        // Only include accepted/confirmed or completed
        OR: [
          { status: 'ACCEPTED', isConfirmed: true },
          { status: 'PENDING' },
        ],
      },
      include: {
        callTime: {
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
                status: true,
              },
            },
          },
        },
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { callTime: { startDate: 'desc' } },
    });

    const now = new Date();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Categorize assignments
    const past: typeof invitations = [];
    const current: typeof invitations = [];
    const upcoming: typeof invitations = [];

    for (const inv of invitations) {
      const startDate = inv.callTime.startDate ? new Date(inv.callTime.startDate) : null;
      const endDate = inv.callTime.endDate ? new Date(inv.callTime.endDate) : null;

      if (!startDate) {
        // No date set - treat as upcoming
        upcoming.push(inv);
      } else if (endDate && endDate < startOfToday) {
        // End date is in the past
        past.push(inv);
      } else if (startDate > now) {
        // Start date is in the future
        upcoming.push(inv);
      } else {
        // Currently active (between start and end)
        current.push(inv);
      }
    }

    return { past, current, upcoming };
  }
}
