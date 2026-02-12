import type { RateType } from '@prisma/client';
import type { AssignmentData } from '@/components/assignments/assignment-table';

export interface GroupedAssignment {
  groupKey: string;
  callTimeIds: string[];
  primaryCallTimeId: string;
  callTimeId: string; // For compatibility with existing code
  serviceName: string;
  serviceId: string | null;
  startDate: Date | string | null;
  startTime: string | null;
  endDate: Date | string | null;
  endTime: string | null;
  event: {
    id: string;
    eventId: string;
    title: string;
    venueName: string | null;
    city: string | null;
    state: string | null;
  };
  numberOfStaffRequired: number;
  confirmedCount: number;
  needsStaff: boolean;
  payRate: number;
  payRateType: RateType;
  invitations: Array<{
    id: string;
    status: string;
    isConfirmed: boolean;
    staff: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>;
}

function getPayRateValue(payRate: AssignmentData['payRate']): number {
  if (typeof payRate === 'number') return payRate;
  if (typeof payRate === 'string') return parseFloat(payRate);
  if (payRate && typeof payRate === 'object' && 'toNumber' in payRate && payRate.toNumber) {
    return payRate.toNumber();
  }
  return 0;
}

/**
 * Groups assignments by Event + Position (Service) + Start Time
 *
 * Rules:
 * - Same position with same call time within same event = ONE row
 * - Different call times = SEPARATE rows
 * - Different positions = SEPARATE rows
 * - Different events = SEPARATE rows
 */
export function groupAssignmentsByPositionAndTime(
  assignments: AssignmentData[]
): GroupedAssignment[] {
  const groups = new Map<string, GroupedAssignment>();

  for (const assignment of assignments) {
    // Create group key: eventId + serviceId + startTime
    const eventId = assignment.event.id;
    const serviceId = assignment.service?.id ?? 'no-service';
    const startTime = assignment.startTime ?? 'no-time';
    const groupKey = `${eventId}_${serviceId}_${startTime}`;

    const existing = groups.get(groupKey);

    if (existing) {
      // Merge into existing group
      existing.callTimeIds.push(assignment.id);
      existing.numberOfStaffRequired += assignment.numberOfStaffRequired;
      existing.confirmedCount += assignment.confirmedCount;
      existing.needsStaff = existing.confirmedCount < existing.numberOfStaffRequired;
      existing.invitations.push(...assignment.invitations);
    } else {
      // Create new group
      groups.set(groupKey, {
        groupKey,
        callTimeIds: [assignment.id],
        primaryCallTimeId: assignment.id,
        callTimeId: assignment.callTimeId,
        serviceName: assignment.service?.title ?? 'No Position',
        serviceId: assignment.service?.id ?? null,
        startDate: assignment.startDate,
        startTime: assignment.startTime,
        endDate: assignment.endDate,
        endTime: assignment.endTime,
        event: assignment.event,
        numberOfStaffRequired: assignment.numberOfStaffRequired,
        confirmedCount: assignment.confirmedCount,
        needsStaff: assignment.needsStaff,
        payRate: getPayRateValue(assignment.payRate),
        payRateType: assignment.payRateType,
        invitations: [...assignment.invitations],
      });
    }
  }

  // Sort by date (ascending), then by position name (alphabetical)
  return Array.from(groups.values()).sort((a, b) => {
    const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
    const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
    if (dateA !== dateB) return dateA - dateB;

    // Then by start time
    const timeA = a.startTime ?? '';
    const timeB = b.startTime ?? '';
    if (timeA !== timeB) return timeA.localeCompare(timeB);

    // Then by position name
    return a.serviceName.localeCompare(b.serviceName);
  });
}
