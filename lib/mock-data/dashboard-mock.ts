/**
 * Mock Data for Dashboard Phase 2
 *
 * This file contains realistic mock data to demonstrate the future vision
 * for call times, work shifts, and availability requests.
 * These will be replaced with real tRPC queries once the backend is implemented.
 */

export interface MockCallTime {
  id: string;
  eventId: string;
  positionName: string;
  startTime: string;
  endTime: string;
  date: string;
  staffNeeded: number;
  staffAssigned: number;
  status: 'full' | 'partial' | 'empty';
}

export interface MockWorkShifts {
  sent: number;
  confirmed: number;
  queuedToSend: number;
}

export interface MockAvailabilityRequests {
  available: number;
  answered: number;
  created: number;
  sent: number;
}

/**
 * Generate mock call times for a given event
 */
export function getMockCallTimesForEvent(eventId: string): MockCallTime[] {
  const callTimes: MockCallTime[] = [
    {
      id: `${eventId}-ct-1`,
      eventId,
      positionName: "Weight Rail (Any)",
      startTime: "1:00pm",
      endTime: "6:00pm",
      date: "Nov 30",
      staffNeeded: 1,
      staffAssigned: 1,
      status: 'full',
    },
    {
      id: `${eventId}-ct-2`,
      eventId,
      positionName: "Lighting Technician",
      startTime: "12:00pm",
      endTime: "7:00pm",
      date: "Nov 30",
      staffNeeded: 2,
      staffAssigned: 1,
      status: 'partial',
    },
    {
      id: `${eventId}-ct-3`,
      eventId,
      positionName: "Audio Engineer",
      startTime: "2:00pm",
      endTime: "8:00pm",
      date: "Nov 30",
      staffNeeded: 1,
      staffAssigned: 0,
      status: 'empty',
    },
  ];

  return callTimes;
}

/**
 * Generate mock work shifts for a given event
 */
export function getMockWorkShiftsForEvent(eventId: string): MockWorkShifts {
  return {
    sent: 8,
    confirmed: 8,
    queuedToSend: 0,
  };
}

/**
 * Generate mock availability requests for a given event
 */
export function getMockAvailabilityForEvent(eventId: string): MockAvailabilityRequests {
  return {
    available: 0,
    answered: 8,
    created: 8,
    sent: 8,
  };
}

/**
 * Get call time badge color based on staffing status
 */
export function getCallTimeBadgeColor(status: 'full' | 'partial' | 'empty'): string {
  switch (status) {
    case 'full':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'partial':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'empty':
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

/**
 * Format call time display text
 */
export function formatCallTimeDisplay(callTime: MockCallTime): string {
  return `${callTime.staffAssigned} of ${callTime.staffNeeded} ${callTime.positionName}`;
}

/**
 * Check if work shifts are fully confirmed
 */
export function areWorkShiftsComplete(workShifts: MockWorkShifts): boolean {
  return workShifts.sent === workShifts.confirmed && workShifts.queuedToSend === 0;
}

/**
 * Get work shift status variant for badges
 */
export function getWorkShiftStatusVariant(sent: number, confirmed: number): 'success' | 'warning' | 'default' {
  if (sent === confirmed && sent > 0) return 'success';
  if (confirmed > 0 && confirmed < sent) return 'warning';
  return 'default';
}
