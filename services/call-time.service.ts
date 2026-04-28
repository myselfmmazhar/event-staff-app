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
  AssignInvitationsInput,
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

    const ratingRequired =
      !data.ratingRequired || data.ratingRequired === 'ANY'
        ? null
        : (data.ratingRequired as StaffRating);

    const applyMinimum = data.applyMinimum ?? false;
    const minimumAmount = applyMinimum ? data.minimum ?? null : null;

    const result = await this.prisma.callTime.create({
      data: {
        callTimeId,
        serviceId: data.serviceId,
        numberOfStaffRequired: data.numberOfStaffRequired,
        skillLevel: data.skillLevel,
        ratingRequired,
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
        applyMinimum,
        minimum: minimumAmount,
        travelInMinimum: data.travelInMinimum ?? false,
        expenditure: data.expenditure ?? false,
        expenditurePrice: data.expenditurePrice ?? null,
        expenditureCost: data.expenditureCost ?? null,
        expenditureAmount: data.expenditureAmount ?? null,
        expenditureAmountType: data.expenditureAmountType ?? null,
        notes: data.notes,
        instructions: (data as any).instructions,
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

    if (prismaData.ratingRequired === 'ANY') {
      prismaData.ratingRequired = null;
    }

    if (restData.minimum === undefined && (restData as any).minimumAmount !== undefined) {
      prismaData.minimum = (restData as any).minimumAmount;
    }

    if (prismaData.applyMinimum === false) {
      prismaData.minimum = null;
    }

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

    const primaryCallTime = callTimes[0]!;
    const wantIndividuals = input.userType !== 'TEAM';
    const wantTeams = input.userType !== 'INDIVIDUAL';
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    const KM_TO_MILES = 0.621371;
    const eventLat = primaryCallTime.event.latitude as number | null;
    const eventLng = primaryCallTime.event.longitude as number | null;

    // Skill level filter: highest requirement among selected call times
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

    const computeDistance = (lat: number | null, lng: number | null): number | null => {
      if (eventLat && eventLng && lat && lng) {
        const km = calculateDistance(eventLat, eventLng, lat, lng);
        return Math.round(km * KM_TO_MILES * 10) / 10;
      }
      return null;
    };

    // ── INDIVIDUAL ROWS ────────────────────────────────────────────────
    let individualRows: any[] = [];
    if (wantIndividuals) {
      // Build exclusion list: individuals already invited to ANY of these call times
      let excludeStaffIds: string[] = [];
      if (!input.includeAlreadyInvited) {
        const allStaffIds = new Set<string>();
        callTimes.forEach((ct) => {
          ct.invitations.forEach((inv) => allStaffIds.add(inv.staffId));
        });
        excludeStaffIds = Array.from(allStaffIds);
      }

      const where: Prisma.StaffWhereInput = {
        staffRole: 'INDIVIDUAL',
        ...(callTimes.some((ct) => ct.serviceId) && {
          services: {
            some: {
              serviceId: {
                in: callTimes.map((ct) => ct.serviceId).filter(Boolean) as string[],
              },
            },
          },
        }),
        skillLevel: { in: skillLevelFilter },
        accountStatus: 'ACTIVE',
        ...(input.ratings && input.ratings.length > 0 && { staffRating: { in: input.ratings } }),
        ...(input.availabilityStatuses &&
          input.availabilityStatuses.length > 0 && {
          availabilityStatus: { in: input.availabilityStatuses },
        }),
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
        ...(excludeStaffIds.length > 0 && { id: { notIn: excludeStaffIds } }),
      };

      const staff = await this.prisma.staff.findMany({
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
          callTimeInvitations: {
            where: {
              OR: [
                { callTimeId: { in: callTimeIds } },
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
      });

      individualRows = staff.map((s) => {
        const distanceMiles = computeDistance(s.latitude, s.longitude);
        const allInvitations = (s as any).callTimeInvitations || [];
        const thisInvitation = allInvitations.find((inv: any) =>
          callTimeIds.includes(inv.callTimeId)
        ) || null;
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
          kind: 'INDIVIDUAL' as const,
          rowId: `INDIVIDUAL:${s.id}`,
          serviceId: null,
          managerStaffId: null,
          totalUnits: 1,
          availableUnits: 1,
          distanceMiles,
          locationMatch: this.calculateLocationMatch(s, primaryCallTime.event),
          invitationStatus: thisInvitation?.status || null,
          invitationConfirmed: thisInvitation?.isConfirmed || false,
          hasConflict: conflicts.length > 0,
          conflicts,
        };
      });
    }

    // ── TEAM MANAGER ROWS ─────────────────────────────────────────────
    let teamRows: any[] = [];
    if (wantTeams) {
      const taskServiceIds = callTimes
        .map((ct) => ct.serviceId)
        .filter(Boolean) as string[];

      if (taskServiceIds.length > 0) {
        const units = await this.prisma.teamUnit.findMany({
          where: {
            status: 'ACTIVE',
            serviceId: { in: taskServiceIds },
            staff: { accountStatus: 'ACTIVE', staffRole: 'TEAM' },
          },
          select: {
            id: true,
            unitId: true,
            unitName: true,
            serviceId: true,
            staffId: true,
            service: { select: { id: true, title: true } },
            staff: {
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
              },
            },
          },
        });

        // Group by (managerStaffId, serviceId)
        type Group = {
          managerStaff: typeof units[number]['staff'];
          service: typeof units[number]['service'];
          unitIds: string[];
        };
        const groups = new Map<string, Group>();
        for (const u of units) {
          if (!u.serviceId) continue;
          const key = `${u.staffId}:${u.serviceId}`;
          let g = groups.get(key);
          if (!g) {
            g = { managerStaff: u.staff, service: u.service, unitIds: [] };
            groups.set(key, g);
          }
          g.unitIds.push(u.id);
        }

        // Fetch all live invitations for these managers, scoped to relevant services
        const managerIds = Array.from(
          new Set(Array.from(groups.values()).map((g) => g.managerStaff.id))
        );
        const liveInvitations = managerIds.length > 0
          ? await this.prisma.callTimeInvitation.findMany({
            where: {
              staffId: { in: managerIds },
              invitedAsTeam: true,
              status: { notIn: ['CANCELLED', 'DECLINED'] },
              callTime: { serviceId: { in: taskServiceIds } },
            },
            select: {
              id: true,
              staffId: true,
              teamUnitId: true,
              callTimeId: true,
              status: true,
              callTime: {
                select: {
                  id: true,
                  serviceId: true,
                  endDate: true,
                  endTime: true,
                  event: { select: { title: true, city: true, state: true } },
                  startDate: true,
                  startTime: true,
                },
              },
              timeEntry: { select: { clockOut: true } },
            },
          })
          : [];

        const now = new Date();
        const isInvitationActive = (inv: typeof liveInvitations[number]): boolean => {
          // Cancelled/declined already filtered. If clocked out, the work is done.
          if (inv.timeEntry?.clockOut) return false;
          const ct = inv.callTime;
          if (!ct.endDate) return true; // UBD — still active
          const end = new Date(ct.endDate);
          if (ct.endTime) {
            const [hh, mm] = ct.endTime.split(':').map(Number);
            end.setHours(hh ?? 23, mm ?? 59, 59, 999);
          } else {
            end.setHours(23, 59, 59, 999);
          }
          return end.getTime() > now.getTime();
        };

        teamRows = Array.from(groups.entries()).map(([_, g]) => {
          const m = g.managerStaff;
          const totalUnits = g.unitIds.length;

          // Live invitations for this manager+service
          const live = liveInvitations.filter(
            (inv) =>
              inv.staffId === m.id &&
              inv.callTime.serviceId === g.service?.id &&
              isInvitationActive(inv)
          );

          // Bound units: invitation has teamUnitId set
          const boundUnitIds = new Set(
            live
              .filter((inv) => inv.teamUnitId && g.unitIds.includes(inv.teamUnitId))
              .map((inv) => inv.teamUnitId as string)
          );
          // Pending reservations (invitation sent, manager hasn't picked a unit)
          const reservationCount = live.filter((inv) => !inv.teamUnitId).length;

          const tied = boundUnitIds.size + reservationCount;
          const availableUnits = Math.max(0, totalUnits - tied);

          // Invitation status for THIS task (any of the manager's invitations for any of these callTimeIds)
          const thisInv = liveInvitations.find(
            (inv) => inv.staffId === m.id && callTimeIds.includes(inv.callTimeId)
          );
          // hasConflict for team rows: count of bound-unit-tied invitations (just informational; doesn't block selection)
          const conflicts = live
            .filter((inv) => !callTimeIds.includes(inv.callTimeId))
            .map((inv) => ({
              eventTitle: inv.callTime.event.title,
              startDate: inv.callTime.startDate,
              endDate: inv.callTime.endDate,
              startTime: (inv.callTime as any).startTime,
              endTime: (inv.callTime as any).endTime,
              city: (inv.callTime.event as any).city,
              state: (inv.callTime.event as any).state,
            }));

          return {
            id: m.id,
            staffId: m.staffId,
            firstName: m.firstName,
            lastName: m.lastName,
            email: m.email,
            phone: m.phone,
            skillLevel: m.skillLevel,
            availabilityStatus: m.availabilityStatus,
            staffRating: m.staffRating,
            city: m.city,
            state: m.state,
            country: m.country,
            internalNotes: m.internalNotes,
            userId: m.userId,
            hasLoginAccess: m.hasLoginAccess,
            services: g.service ? [{ service: g.service }] : [],
            kind: 'TEAM' as const,
            rowId: `TEAM:${m.id}:${g.service?.id ?? ''}`,
            serviceId: g.service?.id ?? null,
            serviceTitle: g.service?.title ?? null,
            managerStaffId: m.id,
            totalUnits,
            availableUnits,
            distanceMiles: computeDistance(m.latitude, m.longitude),
            locationMatch: this.calculateLocationMatch(m, primaryCallTime.event),
            invitationStatus: thisInv?.status || null,
            invitationConfirmed: false,
            hasConflict: conflicts.length > 0,
            conflicts,
          };
        });

        // Apply rating filter on team-manager rows (manager's own rating)
        if (input.ratings && input.ratings.length > 0) {
          teamRows = teamRows.filter((r) =>
            input.ratings!.includes(r.staffRating)
          );
        }

        // Hide team rows where ALL units are tied unless includeAlreadyInvited
        if (!input.includeAlreadyInvited) {
          teamRows = teamRows.filter((r) => r.availableUnits > 0);
        }
      }
    }

    // ── COMBINE + FILTER + SORT + PAGINATE ─────────────────────────────
    let combined = [...individualRows, ...teamRows];

    // Available Units exact-count filter (applies to both kinds)
    if (input.availableUnits !== undefined) {
      combined = combined.filter((r) => r.availableUnits === input.availableUnits);
    }

    // Distance filter (post-query since it's calculated)
    if (input.maxDistance && eventLat && eventLng) {
      combined = combined.filter((r) => {
        if (r.distanceMiles === null) return true;
        return r.distanceMiles <= input.maxDistance!;
      });
    }

    // Sort: distance asc; then locationMatch desc; INDIVIDUAL before TEAM as tiebreaker
    combined.sort((a, b) => {
      if (a.distanceMiles !== null && b.distanceMiles !== null) {
        return a.distanceMiles - b.distanceMiles;
      }
      if (a.distanceMiles !== null && b.distanceMiles === null) return -1;
      if (a.distanceMiles === null && b.distanceMiles !== null) return 1;
      if (b.locationMatch !== a.locationMatch) return b.locationMatch - a.locationMatch;
      return a.kind === b.kind ? 0 : a.kind === 'INDIVIDUAL' ? -1 : 1;
    });

    const total = combined.length;
    const paginated = combined.slice((page - 1) * limit, page * limit);

    return {
      data: paginated,
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
    const resendExisting = input.resendExisting ?? false;
    const staffIds = input.staffIds ?? [];
    const teamSelections = input.teamSelections ?? [];

    const invitationInclude = {
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
    } as const;

    const newToken = () =>
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    // ── INDIVIDUAL invitations (existing flow) ─────────────────────────
    for (const ct of staffIds.length > 0 ? callTimes : []) {
      // Get existing invitations for THIS assignment
      const existingInvitations = await this.prisma.callTimeInvitation.findMany({
        where: {
          callTimeId: ct.id,
          staffId: { in: staffIds },
          invitedAsTeam: false,
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

      const existingStaffIds = existingInvitations.map((inv) => inv.staffId);
      const newStaffIds = staffIds.filter(
        (id) => !existingStaffIds.includes(id)
      );

      // Handle existing invitations if re-sending requested
      if (resendExisting) {
        for (const invitation of existingInvitations) {
          if (invitation.status === 'ACCEPTED' && invitation.isConfirmed) continue;
          const updated = await this.prisma.callTimeInvitation.update({
            where: { id: invitation.id },
            data: {
              status: 'PENDING',
              respondedAt: null,
              declineReason: null,
              isConfirmed: false,
              confirmedAt: null,
              createdAt: new Date(),
              responseToken: newToken(),
            },
            include: invitationInclude,
          });
          invitations.push(updated);
        }
      }

      // Create new invitations for THIS assignment
      const newInvitations = await Promise.all(
        newStaffIds.map((sid) =>
          this.prisma.callTimeInvitation.create({
            data: {
              callTimeId: ct.id,
              staffId: sid,
              status: 'PENDING',
              responseToken: newToken(),
            },
            include: invitationInclude,
          })
        )
      );
      invitations.push(...newInvitations);
    }

    // ── TEAM-MANAGER invitations ───────────────────────────────────────
    if (teamSelections.length > 0) {
      for (const ct of callTimes) {
        const sels = teamSelections.filter((ts) => ts.serviceId === ct.serviceId);
        if (sels.length === 0) continue;

        // Slots already taken on this CallTime by ANY non-cancelled/declined invitation
        const usedSlots = await this.prisma.callTimeInvitation.count({
          where: {
            callTimeId: ct.id,
            status: { notIn: ['CANCELLED', 'DECLINED'] },
          },
        });
        let remainingSlots = Math.max(0, ct.numberOfStaffRequired - usedSlots);

        for (const sel of sels) {
          if (remainingSlots <= 0) break;

          const totalUnits = await this.prisma.teamUnit.count({
            where: {
              status: 'ACTIVE',
              serviceId: sel.serviceId,
              staffId: sel.managerStaffId,
            },
          });

          const liveInvs = await this.prisma.callTimeInvitation.findMany({
            where: {
              staffId: sel.managerStaffId,
              invitedAsTeam: true,
              status: { notIn: ['CANCELLED', 'DECLINED'] },
              callTime: { serviceId: sel.serviceId },
            },
            select: {
              id: true,
              teamUnitId: true,
              callTime: { select: { endDate: true, endTime: true } },
              timeEntry: { select: { clockOut: true } },
            },
          });

          const now = new Date();
          const isLive = (inv: typeof liveInvs[number]) => {
            if (inv.timeEntry?.clockOut) return false;
            if (!inv.callTime.endDate) return true;
            const end = new Date(inv.callTime.endDate);
            if (inv.callTime.endTime) {
              const [hh, mm] = inv.callTime.endTime.split(':').map(Number);
              end.setHours(hh ?? 23, mm ?? 59, 59, 999);
            } else {
              end.setHours(23, 59, 59, 999);
            }
            return end.getTime() > now.getTime();
          };
          const live = liveInvs.filter(isLive);
          const boundUnits = new Set(
            live.filter((i) => i.teamUnitId).map((i) => i.teamUnitId as string)
          );
          const reservations = live.filter((i) => !i.teamUnitId).length;
          const tied = boundUnits.size + reservations;
          const availableUnits = Math.max(0, totalUnits - tied);

          const n = Math.min(remainingSlots, availableUnits);
          if (n <= 0) continue;

          for (let i = 0; i < n; i++) {
            const created = await this.prisma.callTimeInvitation.create({
              data: {
                callTimeId: ct.id,
                staffId: sel.managerStaffId,
                invitedAsTeam: true,
                teamUnitId: null,
                status: 'PENDING',
                responseToken: newToken(),
              },
              include: invitationInclude,
            });
            invitations.push(created);
          }
          remainingSlots -= n;
        }
      }
    }

    if (invitations.length === 0) {
      if (!resendExisting && staffIds.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'All selected staff have already been invited to these assignments',
        });
      }
      if (teamSelections.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No team-unit slots available for the selected manager(s)',
        });
      }
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No staff available for re-invitation (already confirmed)',
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
   * Accept a pending or waitlisted invitation with slot checking.
   * Used by staff respond flow and organizer assign-on-behalf (no invitation email).
   */
  private async runAcceptWithSlotLogicFromInvitation(invitation: {
    id: string;
    callTimeId: string;
    status: CallTimeInvitationStatus;
    callTime: {
      id: string;
      eventId: string;
      numberOfStaffRequired: number;
      service: { title: string | null } | null;
      event: { id: string; title: string; createdBy: string };
    };
    staff: {
      firstName: string;
      lastName: string;
      userId: string | null;
    };
  }) {
    if (invitation.status !== 'PENDING' && invitation.status !== 'WAITLISTED') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Cannot accept invitation in status ${invitation.status}`,
      });
    }

    const triggerService = getNotificationTriggerService(this.prisma);
    const staffName = `${invitation.staff.firstName} ${invitation.staff.lastName}`;

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

    if (hasAvailableSlot) {
      await this.updateEventStatusBasedOnStaffing(invitation.callTime.eventId);
    }

    return { updated, hasAvailableSlot };
  }

  /**
   * Organizer assigns staff immediately: invitation accepted on their behalf, confirmation (or waitlist) email only.
   */
  async assignInvitationsOnBehalf(
    input: AssignInvitationsInput,
    userId: string,
    userRole?: string | null
  ) {
    const callTimes = await this.findManyByIds(input.callTimeIds, userId, userRole);

    if (callTimes.length === 0) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No assignments found',
      });
    }

    const invitationInclude = {
      callTime: {
        include: {
          service: true,
          event: {
            select: {
              id: true,
              title: true,
              createdBy: true,
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
      staff: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          userId: true,
        },
      },
    } satisfies Prisma.CallTimeInvitationInclude;

    const results: Array<{
      outcome: 'confirmed' | 'waitlisted' | 'already_assigned';
      invitation: {
        staff: { email: string; firstName: string; lastName: string; userId: string | null };
        callTime: {
          startDate: Date | null;
          startTime: string | null;
          instructions: string | null;
          service: { title: string | null } | null;
          event: {
            title: string;
            venueName: string | null;
            city: string | null;
            state: string | null;
            description: string | null;
            requirements: string | null;
            preEventInstructions: string | null;
            privateComments: string | null;
          };
        };
      };
    }> = [];

    for (const ct of callTimes) {
      for (const staffId of input.staffIds) {
        // assign-on-behalf is individual-only; match invitations not tied to any TeamUnit.
        let inv = await this.prisma.callTimeInvitation.findFirst({
          where: { callTimeId: ct.id, staffId, teamUnitId: null },
          include: invitationInclude,
        });

        if (!inv) {
          inv = await this.prisma.callTimeInvitation.create({
            data: {
              callTimeId: ct.id,
              staffId,
              status: 'PENDING',
            },
            include: invitationInclude,
          });
        } else if (inv.status === 'ACCEPTED' && inv.isConfirmed) {
          results.push({ outcome: 'already_assigned', invitation: inv });
          continue;
        } else if (inv.status === 'DECLINED' || inv.status === 'CANCELLED') {
          inv = await this.prisma.callTimeInvitation.update({
            where: { id: inv.id },
            data: {
              status: 'PENDING',
              respondedAt: null,
              declineReason: null,
              isConfirmed: false,
              confirmedAt: null,
            },
            include: invitationInclude,
          });
        } else if (inv.status !== 'PENDING' && inv.status !== 'WAITLISTED') {
          inv = await this.prisma.callTimeInvitation.update({
            where: { id: inv.id },
            data: {
              status: 'PENDING',
              respondedAt: null,
              declineReason: null,
              isConfirmed: false,
              confirmedAt: null,
            },
            include: invitationInclude,
          });
        }

        const { updated, hasAvailableSlot } = await this.runAcceptWithSlotLogicFromInvitation({
          id: inv.id,
          callTimeId: inv.callTimeId,
          status: inv.status,
          callTime: {
            id: inv.callTime.id,
            eventId: inv.callTime.eventId,
            numberOfStaffRequired: inv.callTime.numberOfStaffRequired,
            service: inv.callTime.service,
            event: inv.callTime.event,
          },
          staff: inv.staff,
        });

        results.push({
          outcome: hasAvailableSlot ? 'confirmed' : 'waitlisted',
          invitation: updated,
        });
      }
    }

    const processed = results.filter((r) => r.outcome !== 'already_assigned').length;
    return { results, processed };
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

    if (input.accept) {
      const { updated } = await this.runAcceptWithSlotLogicFromInvitation({
        id: invitation.id,
        callTimeId: invitation.callTimeId,
        status: invitation.status,
        callTime: {
          id: invitation.callTime.id,
          eventId: invitation.callTime.eventId,
          numberOfStaffRequired: invitation.callTime.numberOfStaffRequired,
          service: invitation.callTime.service,
          event: invitation.callTime.event,
        },
        staff: invitation.staff,
      });
      return updated;
    } else {
      const triggerService = getNotificationTriggerService(this.prisma);
      const staffName = `${invitation.staff.firstName} ${invitation.staff.lastName}`;
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
        responseToken: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
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
            invitations: {
              where: {
                status: 'ACCEPTED',
                isConfirmed: true,
              },
              select: { id: true },
            },
          },
        },
      },
      orderBy: { callTime: { startDate: 'asc' } },
    });

    // Enrich invitations with confirmedCount
    const enrichedInvitations = invitations.map(inv => ({
      ...inv,
      callTime: {
        ...inv.callTime,
        confirmedCount: inv.callTime.invitations.length
      }
    }));

    // Use start of today for date comparison to include today's events
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Categorize invitations
    // Show all pending invitations regardless of date (to avoid timezone issues hiding today's events)
    const pending = enrichedInvitations.filter((inv) => inv.status === 'PENDING');
    const accepted = enrichedInvitations.filter(
      (inv) =>
        inv.status === 'ACCEPTED' &&
        inv.isConfirmed &&
        (!inv.callTime.startDate || new Date(inv.callTime.startDate) >= startOfToday)
    );
    const past = enrichedInvitations.filter(
      (inv) =>
        inv.status === 'ACCEPTED' &&
        inv.isConfirmed &&
        !!inv.callTime.endDate &&
        new Date(inv.callTime.endDate) < startOfToday
    );
    const declined = enrichedInvitations.filter((inv) => inv.status === 'DECLINED');

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
          minimum: assignment.minimum ?? (service.minimum ? Number(service.minimum) : null),
          expenditure: assignment.expenditure ?? service.expenditure ?? false,
          expenditureCost: assignment.expenditureCost ?? (service.expenditureCost ? Number(service.expenditureCost) : null),
          expenditurePrice: assignment.expenditurePrice ?? (service.expenditurePrice ? Number(service.expenditurePrice) : null),
          expenditureAmount: assignment.expenditureAmount ?? (service.expenditureAmount ? Number(service.expenditureAmount) : null),
          expenditureAmountType: assignment.expenditureAmountType ?? (service.expenditureAmountType as any) ?? null,
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

  /**
   * Respond to call time invitation via token (direct email action)
   */
  async respondToInvitationByToken(token: string, action: 'accept' | 'reject') {
    const invitation = await this.prisma.callTimeInvitation.findUnique({
      where: { responseToken: token },
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
      throw new Error('Invalid or expired invitation token');
    }

    if (invitation.status !== 'PENDING') {
      return {
        status: invitation.status,
        alreadyResponded: true,
        eventTitle: invitation.callTime.event.title,
        positionName: invitation.callTime.service?.title || 'Staff',
        isTeamInvitation: invitation.invitedAsTeam,
        needsUnitSelection: false,
      };
    }

    // Team-manager invitation: accept requires picking a TeamUnit, so signal back to caller.
    if (action === 'accept' && invitation.invitedAsTeam && !invitation.teamUnitId) {
      return {
        status: invitation.status,
        eventTitle: invitation.callTime.event.title,
        positionName: invitation.callTime.service?.title || 'Staff',
        isTeamInvitation: true,
        needsUnitSelection: true,
      };
    }

    if (action === 'accept') {
      const { updated, hasAvailableSlot } = await this.runAcceptWithSlotLogicFromInvitation({
        id: invitation.id,
        callTimeId: invitation.callTimeId,
        status: invitation.status,
        callTime: {
          id: invitation.callTime.id,
          eventId: invitation.callTime.eventId,
          numberOfStaffRequired: invitation.callTime.numberOfStaffRequired,
          service: invitation.callTime.service,
          event: invitation.callTime.event,
        },
        staff: invitation.staff,
      });
      return {
        status: updated.status,
        isConfirmed: updated.isConfirmed,
        eventTitle: updated.callTime.event.title,
        positionName: updated.callTime.service?.title || 'Staff',
        isTeamInvitation: invitation.invitedAsTeam,
        needsUnitSelection: false,
      };
    } else {
      const triggerService = getNotificationTriggerService(this.prisma);
      const staffName = `${invitation.staff.firstName} ${invitation.staff.lastName}`;
      
      const updated = await this.prisma.callTimeInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'DECLINED',
          respondedAt: new Date(),
        },
        include: {
          callTime: { include: { service: true, event: true } },
        },
      });

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

      return {
        status: 'DECLINED',
        eventTitle: updated.callTime.event.title,
        positionName: updated.callTime.service?.title || 'Staff'
      };
    }
  }

  /**
   * Look up a team-manager invitation by token and list the manager's
   * eligible TeamUnits (active, matching the call-time's service, currently
   * available — i.e. not already tied to another live invitation).
   * Used by the public team-acceptance page (Phase 6).
   */
  async getTeamInvitationByToken(token: string) {
    const invitation = await this.prisma.callTimeInvitation.findUnique({
      where: { responseToken: token },
      include: {
        callTime: {
          include: {
            service: true,
            event: { select: { id: true, title: true, venueName: true, city: true, state: true } },
          },
        },
        staff: { select: { id: true, firstName: true, lastName: true, staffRole: true } },
      },
    });

    if (!invitation) throw new TRPCError({ code: 'NOT_FOUND', message: 'Invalid invitation token' });
    if (!invitation.invitedAsTeam) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Not a team invitation' });
    }

    const ct = invitation.callTime;
    const serviceId = ct.serviceId;

    const allUnits = serviceId
      ? await this.prisma.teamUnit.findMany({
        where: {
          status: 'ACTIVE',
          serviceId,
          staffId: invitation.staffId,
        },
        select: {
          id: true,
          unitId: true,
          unitName: true,
          primaryContact: true,
          capacityNotes: true,
        },
      })
      : [];

    // Compute live invitations to identify which units are currently tied
    const liveInvs = serviceId
      ? await this.prisma.callTimeInvitation.findMany({
        where: {
          staffId: invitation.staffId,
          invitedAsTeam: true,
          status: { notIn: ['CANCELLED', 'DECLINED'] },
          callTime: { serviceId },
          // Ignore the current invitation when computing what's tied
          NOT: { id: invitation.id },
        },
        select: {
          id: true,
          teamUnitId: true,
          callTime: { select: { endDate: true, endTime: true } },
          timeEntry: { select: { clockOut: true } },
        },
      })
      : [];

    const now = new Date();
    const isLive = (inv: typeof liveInvs[number]) => {
      if (inv.timeEntry?.clockOut) return false;
      if (!inv.callTime.endDate) return true;
      const end = new Date(inv.callTime.endDate);
      if (inv.callTime.endTime) {
        const [hh, mm] = inv.callTime.endTime.split(':').map(Number);
        end.setHours(hh ?? 23, mm ?? 59, 59, 999);
      } else {
        end.setHours(23, 59, 59, 999);
      }
      return end.getTime() > now.getTime();
    };
    const liveBoundUnitIds = new Set(
      liveInvs.filter(isLive).filter((i) => i.teamUnitId).map((i) => i.teamUnitId as string)
    );

    const units = allUnits.map((u) => ({
      ...u,
      available: !liveBoundUnitIds.has(u.id),
    }));

    return {
      invitation: {
        id: invitation.id,
        status: invitation.status,
        isConfirmed: invitation.isConfirmed,
        teamUnitId: invitation.teamUnitId,
      },
      manager: invitation.staff,
      callTime: {
        id: ct.id,
        startDate: ct.startDate,
        startTime: ct.startTime,
        endDate: ct.endDate,
        endTime: ct.endTime,
        numberOfStaffRequired: ct.numberOfStaffRequired,
        service: ct.service,
        event: ct.event,
      },
      units,
    };
  }

  /**
   * Manager accepts a team invitation and binds it to a specific TeamUnit.
   * Validates that the unit belongs to them, matches the service, is ACTIVE,
   * and is not already tied to another live invitation.
   */
  async acceptTeamInvitationByToken(token: string, teamUnitId: string) {
    const invitation = await this.prisma.callTimeInvitation.findUnique({
      where: { responseToken: token },
      include: {
        callTime: {
          include: {
            service: true,
            event: { select: { id: true, title: true, createdBy: true } },
          },
        },
        staff: { select: { id: true, firstName: true, lastName: true, userId: true } },
      },
    });

    if (!invitation) throw new TRPCError({ code: 'NOT_FOUND', message: 'Invalid invitation token' });
    if (!invitation.invitedAsTeam) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Not a team invitation' });
    }
    if (invitation.status !== 'PENDING') {
      return {
        status: invitation.status,
        alreadyResponded: true,
        eventTitle: invitation.callTime.event.title,
        positionName: invitation.callTime.service?.title || 'Staff',
      };
    }

    // Validate the chosen unit
    const unit = await this.prisma.teamUnit.findFirst({
      where: {
        id: teamUnitId,
        status: 'ACTIVE',
        staffId: invitation.staffId,
        serviceId: invitation.callTime.serviceId,
      },
    });
    if (!unit) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Selected team unit is not eligible for this assignment',
      });
    }

    // Make sure the unit is not already tied to another live invitation
    const conflict = await this.prisma.callTimeInvitation.findFirst({
      where: {
        teamUnitId: unit.id,
        status: { notIn: ['CANCELLED', 'DECLINED'] },
        NOT: { id: invitation.id },
      },
      select: {
        id: true,
        callTime: { select: { endDate: true, endTime: true } },
        timeEntry: { select: { clockOut: true } },
      },
    });
    if (conflict) {
      const now = new Date();
      const end = conflict.callTime.endDate ? new Date(conflict.callTime.endDate) : null;
      if (end) {
        if (conflict.callTime.endTime) {
          const [hh, mm] = conflict.callTime.endTime.split(':').map(Number);
          end.setHours(hh ?? 23, mm ?? 59, 59, 999);
        } else {
          end.setHours(23, 59, 59, 999);
        }
      }
      const stillLive = !conflict.timeEntry?.clockOut && (!end || end.getTime() > now.getTime());
      if (stillLive) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This team unit is already assigned to another active task',
        });
      }
    }

    // Bind the unit, then run the standard accept-with-slot logic
    await this.prisma.callTimeInvitation.update({
      where: { id: invitation.id },
      data: { teamUnitId: unit.id },
    });

    const { updated } = await this.runAcceptWithSlotLogicFromInvitation({
      id: invitation.id,
      callTimeId: invitation.callTimeId,
      status: invitation.status,
      callTime: {
        id: invitation.callTime.id,
        eventId: invitation.callTime.eventId,
        numberOfStaffRequired: invitation.callTime.numberOfStaffRequired,
        service: invitation.callTime.service,
        event: invitation.callTime.event,
      },
      staff: invitation.staff,
    });

    return {
      status: updated.status,
      isConfirmed: updated.isConfirmed,
      eventTitle: updated.callTime.event.title,
      positionName: updated.callTime.service?.title || 'Staff',
      teamUnitName: unit.unitName,
    };
  }
}
