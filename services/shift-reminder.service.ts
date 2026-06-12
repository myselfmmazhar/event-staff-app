import {
    PrismaClient,
    CallTimeInvitationStatus,
    NotificationType,
    NotificationPriority,
} from "@prisma/client";
import { emailService } from "./email.service";
import { NotificationService } from "./notification.service";

/**
 * Shift Reminder Service
 *
 * Sends two time-based reminders (email + in-app) to contractors with an
 * ACCEPTED invitation for an upcoming call time:
 *   - SHIFT_REMINDER_48H — sent once the call time is within 48 hours
 *   - SHIFT_REMINDER_2H  — final check, sent once the call time is within 2 hours
 *
 * Delivery is driven from two directions:
 *   1. A daily cron sweep (`runDailySweep`) that checks BOTH reminders.
 *   2. Lazy on-view checks (`checkTwoHourDueForEvent` / `checkTwoHourDueForStaff`)
 *      fired when an admin/manager/client/talent views the event or their
 *      schedule, which check the 2-hour reminder.
 *
 * Idempotency: each invitation carries `reminder48hSentAt` / `reminder2hSentAt`
 * stamps. A reminder is "claimed" with an atomic conditional updateMany before
 * sending, so concurrent cron runs and page views can never double-send.
 */

const MS_PER_HOUR = 60 * 60 * 1000;
const REMINDER_48H_WINDOW_MS = 48 * MS_PER_HOUR;
const REMINDER_2H_WINDOW_MS = 2 * MS_PER_HOUR;
const MS_PER_DAY = 24 * MS_PER_HOUR;

type ReminderKind = "48h" | "2h";

interface CandidateInvitation {
    id: string;
    reminder48hSentAt: Date | null;
    reminder2hSentAt: Date | null;
    staff: {
        email: string | null;
        firstName: string | null;
        userId: string | null;
        users_staff_userIdTousers: {
            notification_preferences: {
                emailEnabled: boolean;
                emailShiftReminders: boolean;
            } | null;
        } | null;
    };
    callTime: {
        id: string;
        startDate: Date | null;
        startTime: string | null;
        service: { title: string } | null;
        event: {
            id: string;
            title: string;
            venueName: string;
            address: string;
            city: string;
            state: string;
            timezone: string;
            meetingPoint: string | null;
            onsitePocName: string | null;
            onsitePocPhone: string | null;
        };
    };
}

export class ShiftReminderService {
    private notificationService: NotificationService;

    constructor(private prisma: PrismaClient) {
        this.notificationService = new NotificationService(prisma);
    }

    /**
     * Daily cron entry point — processes BOTH the 48h and 2h reminders for
     * every upcoming call time. Returns counts for the cron response/logs.
     */
    async runDailySweep(): Promise<{ sent48h: number; sent2h: number; checked: number }> {
        const candidates = await this.findCandidates({});
        return await this.processCandidates(candidates, ["48h", "2h"]);
    }

    /**
     * On-view entry point — admin/manager event page or client portal event
     * detail. Checks the 2-hour final reminder for that event's call times.
     */
    async checkTwoHourDueForEvent(eventId: string): Promise<void> {
        const candidates = await this.findCandidates({ eventId, kinds: ["2h"] });
        await this.processCandidates(candidates, ["2h"]);
    }

    /**
     * On-view entry point — client portal events list. Checks the 2-hour
     * reminder across all of this client's upcoming events.
     */
    async checkTwoHourDueForClient(clientId: string): Promise<void> {
        const candidates = await this.findCandidates({ clientId, kinds: ["2h"] });
        await this.processCandidates(candidates, ["2h"]);
    }

    /**
     * On-view entry point — talent dashboard / my-schedule. Checks the 2-hour
     * reminder for every call time this user is booked on. Sends to ALL due
     * contractors on those call times, not just the viewer.
     */
    async checkTwoHourDueForStaff(userId: string): Promise<void> {
        const staff = await this.prisma.staff.findFirst({
            where: { userId },
            select: { id: true },
        });
        if (!staff) return;

        // Find the call times this talent is booked on, then process every
        // accepted invitation on those call times (whole crew flushes at once).
        const ownInvitations = await this.prisma.callTimeInvitation.findMany({
            where: {
                staffId: staff.id,
                status: CallTimeInvitationStatus.ACCEPTED,
                reminder2hSentAt: null,
                callTime: this.upcomingCallTimeFilter(),
            },
            select: { callTimeId: true },
        });
        if (ownInvitations.length === 0) return;

        const callTimeIds = [...new Set(ownInvitations.map((i) => i.callTimeId))];
        const candidates = await this.findCandidates({ callTimeIds, kinds: ["2h"] });
        await this.processCandidates(candidates, ["2h"]);
    }

    // ==========================================
    // Core engine
    // ==========================================

    /**
     * Date-window filter for upcoming call times. `startDate` is @db.Date
     * (midnight UTC); the exact instant depends on startTime + the event
     * timezone, so the window is padded a day on each side and the precise
     * due check happens in code.
     */
    private upcomingCallTimeFilter(extra?: { eventId?: string; ids?: string[]; clientId?: string }) {
        const todayUtc = new Date(new Date().toISOString().slice(0, 10));
        return {
            ...(extra?.eventId ? { eventId: extra.eventId } : {}),
            ...(extra?.ids ? { id: { in: extra.ids } } : {}),
            startDate: {
                gte: new Date(todayUtc.getTime() - MS_PER_DAY),
                lte: new Date(todayUtc.getTime() + 3 * MS_PER_DAY),
            },
            event: {
                isArchived: false,
                status: { notIn: ["CANCELLED" as const, "COMPLETED" as const] },
                ...(extra?.clientId ? { clientId: extra.clientId } : {}),
            },
        };
    }

    private async findCandidates(scope: {
        eventId?: string;
        callTimeIds?: string[];
        clientId?: string;
        kinds?: ReminderKind[];
    }): Promise<CandidateInvitation[]> {
        const kinds = scope.kinds ?? ["48h", "2h"];
        const stampFilter =
            kinds.length === 2
                ? { OR: [{ reminder48hSentAt: null }, { reminder2hSentAt: null }] }
                : kinds[0] === "48h"
                    ? { reminder48hSentAt: null }
                    : { reminder2hSentAt: null };

        return await this.prisma.callTimeInvitation.findMany({
            where: {
                status: CallTimeInvitationStatus.ACCEPTED,
                ...stampFilter,
                callTime: this.upcomingCallTimeFilter({
                    eventId: scope.eventId,
                    ids: scope.callTimeIds,
                }),
            },
            select: {
                id: true,
                reminder48hSentAt: true,
                reminder2hSentAt: true,
                staff: {
                    select: {
                        email: true,
                        firstName: true,
                        userId: true,
                        users_staff_userIdTousers: {
                            select: {
                                notification_preferences: {
                                    select: {
                                        emailEnabled: true,
                                        emailShiftReminders: true,
                                    },
                                },
                            },
                        },
                    },
                },
                callTime: {
                    select: {
                        id: true,
                        startDate: true,
                        startTime: true,
                        service: { select: { title: true } },
                        event: {
                            select: {
                                id: true,
                                title: true,
                                venueName: true,
                                address: true,
                                city: true,
                                state: true,
                                timezone: true,
                                meetingPoint: true,
                                onsitePocName: true,
                                onsitePocPhone: true,
                            },
                        },
                    },
                },
            },
        });
    }

    private async processCandidates(
        candidates: CandidateInvitation[],
        kinds: ReminderKind[]
    ): Promise<{ sent48h: number; sent2h: number; checked: number }> {
        const now = Date.now();
        let sent48h = 0;
        let sent2h = 0;

        for (const invitation of candidates) {
            const { callTime } = invitation;
            const instant = computeCallTimeInstant(
                callTime.startDate,
                callTime.startTime,
                callTime.event.timezone
            );
            // No usable date/time, or the shift already started — nothing to send.
            if (!instant || instant.getTime() <= now) continue;

            const msUntil = instant.getTime() - now;

            for (const kind of kinds) {
                const windowMs = kind === "48h" ? REMINDER_48H_WINDOW_MS : REMINDER_2H_WINDOW_MS;
                const alreadySent = kind === "48h"
                    ? invitation.reminder48hSentAt
                    : invitation.reminder2hSentAt;
                if (alreadySent || msUntil > windowMs) continue;

                // Skip the 48h reminder when the 2h one is also due — by then the
                // final check is the message that matters; sending both at once
                // would double-email the contractor.
                if (kind === "48h" && msUntil <= REMINDER_2H_WINDOW_MS) {
                    await this.claim(invitation.id, "48h");
                    continue;
                }

                const claimed = await this.claim(invitation.id, kind);
                if (!claimed) continue; // another run/view got here first

                await this.deliver(invitation, kind, instant);
                if (kind === "48h") sent48h++;
                else sent2h++;
            }
        }

        return { sent48h, sent2h, checked: candidates.length };
    }

    /**
     * Atomically claim a reminder. Returns true only for the caller that
     * actually flipped the stamp from NULL — everyone else no-ops.
     */
    private async claim(invitationId: string, kind: ReminderKind): Promise<boolean> {
        const result = await this.prisma.callTimeInvitation.updateMany({
            where: {
                id: invitationId,
                ...(kind === "48h"
                    ? { reminder48hSentAt: null }
                    : { reminder2hSentAt: null }),
            },
            data:
                kind === "48h"
                    ? { reminder48hSentAt: new Date() }
                    : { reminder2hSentAt: new Date() },
        });
        return result.count === 1;
    }

    /**
     * Send the email (preference-gated) and the in-app notification for one
     * claimed reminder. Failures are logged, never thrown — a bad address must
     * not abort the rest of the sweep.
     */
    private async deliver(
        invitation: CandidateInvitation,
        kind: ReminderKind,
        instant: Date
    ): Promise<void> {
        const { staff, callTime } = invitation;
        const event = callTime.event;
        const positionName = callTime.service?.title || "Staff";
        const eventLocation = [event.address, event.city, event.state]
            .filter((part) => !!part && part.trim().length > 0)
            .join(", ");

        // Email — honor the user's emailShiftReminders preference (opt-in by default)
        const pref = staff.users_staff_userIdTousers?.notification_preferences;
        const emailAllowed = !pref || (pref.emailEnabled && pref.emailShiftReminders);

        if (staff.email && emailAllowed) {
            try {
                await emailService.sendShiftReminder(
                    kind === "48h" ? "SHIFT_REMINDER_48H" : "SHIFT_REMINDER_2H",
                    staff.email,
                    staff.firstName ?? "",
                    {
                        positionName,
                        eventTitle: event.title,
                        eventVenue: event.venueName,
                        eventLocation,
                        startDate: callTime.startDate,
                        startTime: callTime.startTime,
                        meetingPoint: event.meetingPoint,
                        pocName: event.onsitePocName,
                        pocPhone: event.onsitePocPhone,
                    }
                );
            } catch (err) {
                console.error(`Failed to send ${kind} shift reminder email to ${staff.email}:`, err);
            }
        }

        // In-app notification (needs a linked user account)
        if (staff.userId) {
            const timeLabel = instant.toLocaleString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                timeZone: event.timezone || "UTC",
            });
            const message =
                kind === "48h"
                    ? `Reminder: ${positionName} at "${event.title}" — call time ${timeLabel}. Check in with the POC at the meeting point at least 10 minutes early.`
                    : `Final check: ${positionName} at "${event.title}" — call time ${timeLabel}. Report to the POC${event.onsitePocName ? ` (${event.onsitePocName}${event.onsitePocPhone ? `, ${event.onsitePocPhone}` : ""})` : ""} at the sign-in location at least 10 minutes before the shift starts.`;

            try {
                await this.notificationService.create({
                    userId: staff.userId,
                    type: NotificationType.SHIFT_REMINDER,
                    priority: kind === "2h" ? NotificationPriority.URGENT : NotificationPriority.HIGH,
                    title: kind === "48h" ? "Upcoming Shift Reminder" : "Final Check: Shift Starting Soon",
                    message,
                    actionUrl: "/my-schedule",
                    actionLabel: "View Schedule",
                    relatedEntityType: "callTime",
                    relatedEntityId: callTime.id,
                });
            } catch (err) {
                console.error(`Failed to create ${kind} shift reminder notification:`, err);
            }
        }
    }
}

// ==========================================
// Timezone helpers
// ==========================================

/**
 * Combine a @db.Date start date (midnight UTC), an "HH:mm" start time, and an
 * IANA timezone into the real UTC instant of the call time. Returns null when
 * the date or time is missing/unparsable.
 */
export function computeCallTimeInstant(
    startDate: Date | null,
    startTime: string | null,
    timezone: string
): Date | null {
    if (!startDate || startDate.getUTCFullYear() === 1970) return null;
    if (!startTime) return null;

    const [hoursStr, minutesStr] = startTime.split(":");
    const hours = Number.parseInt(hoursStr ?? "", 10);
    const minutes = Number.parseInt(minutesStr ?? "", 10);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

    const year = startDate.getUTCFullYear();
    const month = startDate.getUTCMonth();
    const day = startDate.getUTCDate();

    // Two-pass correction: guess the instant as if the wall-clock time were
    // UTC, then shift by the zone's offset at that instant (handles DST).
    const utcGuess = Date.UTC(year, month, day, hours, minutes);
    try {
        const offset1 = timezoneOffsetMs(utcGuess, timezone);
        let ts = utcGuess - offset1;
        const offset2 = timezoneOffsetMs(ts, timezone);
        if (offset2 !== offset1) ts = utcGuess - offset2;
        return new Date(ts);
    } catch {
        // Unknown/invalid timezone string — treat the wall time as UTC.
        return new Date(utcGuess);
    }
}

/**
 * Offset of `timeZone` from UTC (in ms) at the given timestamp.
 * Positive for zones ahead of UTC.
 */
function timezoneOffsetMs(timestamp: number, timeZone: string): number {
    const dtf = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });
    const parts: Record<string, number> = {};
    for (const { type, value } of dtf.formatToParts(new Date(timestamp))) {
        if (type !== "literal") parts[type] = Number.parseInt(value, 10);
    }
    const hour = parts.hour ?? 0;
    const asUtc = Date.UTC(
        parts.year ?? 1970,
        (parts.month ?? 1) - 1,
        parts.day ?? 1,
        hour === 24 ? 0 : hour,
        parts.minute ?? 0,
        parts.second ?? 0
    );
    return asUtc - timestamp;
}

// Singleton accessor, mirroring notification-trigger.service.ts
let shiftReminderServiceInstance: ShiftReminderService | null = null;

export function getShiftReminderService(prisma: PrismaClient): ShiftReminderService {
    if (!shiftReminderServiceInstance) {
        shiftReminderServiceInstance = new ShiftReminderService(prisma);
    }
    return shiftReminderServiceInstance;
}
