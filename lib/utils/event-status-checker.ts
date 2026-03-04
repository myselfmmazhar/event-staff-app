import { PrismaClient, EventStatus } from "@prisma/client";
import { getNotificationTriggerService } from "@/services/notification-trigger.service";

/**
 * Build a Date object from date, time, and timezone strings
 * Returns a UTC Date that represents the correct moment in time for the given timezone
 */
function buildDateTime(
  date: Date | null,
  time: string | null,
  timezone?: string | null
): Date | null {
  if (!date) return null;

  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  let hours = 0;
  let minutes = 0;
  if (time) {
    const [h, m] = time.split(':').map(Number);
    hours = h || 0;
    minutes = m || 0;
  }

  // If timezone is provided, calculate the UTC time
  if (timezone) {
    try {
      const localDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      const targetDate = new Date(localDateStr);
      const parts = formatter.formatToParts(targetDate);
      const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '0';

      const tzYear = parseInt(getPart('year'), 10);
      const tzMonth = parseInt(getPart('month'), 10) - 1;
      const tzDay = parseInt(getPart('day'), 10);
      const tzHour = parseInt(getPart('hour'), 10);
      const tzMinute = parseInt(getPart('minute'), 10);

      const offset =
        targetDate.getTime() -
        new Date(tzYear, tzMonth, tzDay, tzHour, tzMinute, 0).getTime();

      return new Date(targetDate.getTime() + offset);
    } catch {
      // Fall back to local time if timezone parsing fails
    }
  }

  return new Date(year, month, day, hours, minutes, 0);
}

export interface StatusCheckResult {
  updated: boolean;
  previousStatus?: EventStatus;
  newStatus?: EventStatus;
}

/**
 * Check and update event status based on current time (trigger-based approach)
 * Called when an event is accessed to ensure status is up-to-date
 *
 * Transitions:
 * - ASSIGNED → IN_PROGRESS: when start datetime is reached
 * - IN_PROGRESS → COMPLETED: when end datetime has passed
 */
export async function checkAndUpdateEventStatus(
  prisma: PrismaClient,
  eventId: string
): Promise<StatusCheckResult> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      status: true,
      createdBy: true,
      startDate: true,
      startTime: true,
      endDate: true,
      endTime: true,
      timezone: true,
    },
  });

  if (!event) return { updated: false };

  const now = new Date();
  const startDateTime = buildDateTime(event.startDate, event.startTime, event.timezone);
  const endDateTime = buildDateTime(event.endDate, event.endTime, event.timezone);

  let newStatus: EventStatus | null = null;

  // Check ASSIGNED → IN_PROGRESS
  if (event.status === EventStatus.ASSIGNED && startDateTime && now >= startDateTime) {
    newStatus = EventStatus.IN_PROGRESS;
  }

  // Check IN_PROGRESS → COMPLETED
  if (event.status === EventStatus.IN_PROGRESS && endDateTime && now > endDateTime) {
    newStatus = EventStatus.COMPLETED;
  }

  if (newStatus && newStatus !== event.status) {
    await prisma.event.update({
      where: { id: eventId },
      data: { status: newStatus, updatedAt: now },
    });

    // Send notifications
    const triggerService = getNotificationTriggerService(prisma);
    if (newStatus === EventStatus.IN_PROGRESS) {
      await triggerService.onEventStarted(eventId, {
        eventTitle: event.title,
        createdBy: event.createdBy,
      });
    } else if (newStatus === EventStatus.COMPLETED) {
      await triggerService.onEventCompleted(eventId, {
        eventTitle: event.title,
        createdBy: event.createdBy,
      });
    }

    return {
      updated: true,
      previousStatus: event.status,
      newStatus,
    };
  }

  return { updated: false };
}

/**
 * Check and update statuses for multiple events
 * Returns a map of eventId -> newStatus for any that were updated
 */
export async function checkAndUpdateMultipleEventStatuses(
  prisma: PrismaClient,
  eventIds: string[]
): Promise<Map<string, EventStatus>> {
  const updatedStatuses = new Map<string, EventStatus>();

  for (const eventId of eventIds) {
    const result = await checkAndUpdateEventStatus(prisma, eventId);
    if (result.updated && result.newStatus) {
      updatedStatuses.set(eventId, result.newStatus);
    }
  }

  return updatedStatuses;
}
