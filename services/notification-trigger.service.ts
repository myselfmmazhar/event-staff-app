import { PrismaClient, NotificationType, NotificationPriority } from "@prisma/client";
import { NotificationService } from "./notification.service";

/**
 * Notification Trigger Service
 * Handles creating notifications in response to system events
 * Real-time delivery is handled automatically by Supabase Realtime
 */
export class NotificationTriggerService {
    private notificationService: NotificationService;

    constructor(private prisma: PrismaClient) {
        this.notificationService = new NotificationService(prisma);
    }

    /**
     * Trigger: Staff invited to a call time
     */
    async onCallTimeInvitationSent(
        staffUserId: string,
        callTimeDetails: {
            positionName: string;
            eventTitle: string;
            eventId: string;
            callTimeId: string;
        }
    ) {
        await this.notificationService.create({
            userId: staffUserId,
            type: NotificationType.CALL_TIME_INVITATION,
            priority: NotificationPriority.HIGH,
            title: "New Shift Invitation",
            message: `You've been invited to work as ${callTimeDetails.positionName} for "${callTimeDetails.eventTitle}"`,
            actionUrl: `/my-schedule`,
            actionLabel: "View Invitation",
            relatedEntityType: "callTime",
            relatedEntityId: callTimeDetails.callTimeId,
        });
    }

    /**
     * Trigger: Staff responds to invitation (for event creator)
     */
    async onInvitationResponse(
        eventCreatorUserId: string,
        response: {
            staffName: string;
            positionName: string;
            eventTitle: string;
            eventId: string;
            status: "ACCEPTED" | "DECLINED";
        }
    ) {
        const isAccepted = response.status === "ACCEPTED";

        await this.notificationService.create({
            userId: eventCreatorUserId,
            type: NotificationType.INVITATION_RESPONSE,
            priority: NotificationPriority.NORMAL,
            title: isAccepted ? "Invitation Accepted" : "Invitation Declined",
            message: `${response.staffName} has ${isAccepted ? "accepted" : "declined"} the ${response.positionName} position for "${response.eventTitle}"`,
            actionUrl: `/events/${response.eventId}/call-times`,
            actionLabel: "View Event",
            relatedEntityType: "event",
            relatedEntityId: response.eventId,
        });
    }

    /**
     * Trigger: Staff confirmed for a shift
     */
    async onInvitationConfirmed(
        staffUserId: string,
        details: {
            positionName: string;
            eventTitle: string;
            eventId: string;
            callTimeId: string;
        }
    ) {
        await this.notificationService.create({
            userId: staffUserId,
            type: NotificationType.INVITATION_CONFIRMED,
            priority: NotificationPriority.HIGH,
            title: "You're Confirmed!",
            message: `You've been confirmed as ${details.positionName} for "${details.eventTitle}"`,
            actionUrl: `/my-schedule`,
            actionLabel: "View Schedule",
            relatedEntityType: "callTime",
            relatedEntityId: details.callTimeId,
        });
    }

    /**
     * Trigger: Staff moved from waitlist to confirmed
     */
    async onWaitlistUpdate(
        staffUserId: string,
        details: {
            positionName: string;
            eventTitle: string;
            eventId: string;
            callTimeId: string;
        }
    ) {
        await this.notificationService.create({
            userId: staffUserId,
            type: NotificationType.WAITLIST_UPDATE,
            priority: NotificationPriority.HIGH,
            title: "Waitlist Update - You're In!",
            message: `Great news! You've been moved from the waitlist and are now confirmed as ${details.positionName} for "${details.eventTitle}"`,
            actionUrl: `/my-schedule`,
            actionLabel: "View Schedule",
            relatedEntityType: "callTime",
            relatedEntityId: details.callTimeId,
        });
    }

    /**
     * Trigger: Event updated (notifies all assigned staff)
     * Uses batching to group multiple updates
     */
    async onEventUpdated(
        eventId: string,
        eventTitle: string,
        changes: string[]
    ) {
        // 1. Notify Assigned Staff
        const assignedStaff = await this.getAssignedStaffUserIds(eventId);

        const message = changes.length > 0
            ? `Changes: ${changes.join(", ")}`
            : "Event details have been updated";

        // Group staff notification by batch key
        const batchKey = `event_update_${eventId}`;

        if (assignedStaff.length > 0) {
            await this.notificationService.createBulk(assignedStaff, {
                type: NotificationType.EVENT_UPDATE,
                priority: NotificationPriority.NORMAL,
                title: `Event Updated: "${eventTitle}"`,
                message,
                actionUrl: `/my-schedule`,
                actionLabel: "View Details",
                relatedEntityType: "event",
                relatedEntityId: eventId,
                batchKey,
            });
        }

        // 2. Notify Client (if attached)
        const event = await this.prisma.event.findUnique({
            where: { id: eventId },
            select: {
                clientId: true,
                client: {
                    select: {
                        userId: true,
                    },
                },
            },
        });

        if (event?.client?.userId) {
            await this.notificationService.create({
                userId: event.client.userId,
                type: NotificationType.EVENT_UPDATE,
                priority: NotificationPriority.NORMAL,
                title: `Event Updated: "${eventTitle}"`,
                message,
                actionUrl: `/client-portal/my-events/${eventId}`,
                actionLabel: "View Details",
                relatedEntityType: "event",
                relatedEntityId: eventId,
                batchKey, // Use same batch key logic for client
            });
        }
    }

    /**
     * Trigger: Event cancelled (notifies all assigned staff)
     */
    async onEventCancelled(
        eventId: string,
        eventTitle: string
    ) {
        const assignedStaff = await this.getAssignedStaffUserIds(eventId);

        if (assignedStaff.length === 0) return;

        await this.notificationService.createBulk(assignedStaff, {
            type: NotificationType.EVENT_CANCELLED,
            priority: NotificationPriority.URGENT,
            title: "Event Cancelled",
            message: `The event "${eventTitle}" has been cancelled`,
            relatedEntityType: "event",
            relatedEntityId: eventId,
        });
    }

    /**
     * Trigger: Staff invited to platform
     */
    async onStaffInvited(
        staffUserId: string,
        inviterName: string
    ) {
        await this.notificationService.create({
            userId: staffUserId,
            type: NotificationType.STAFF_INVITATION,
            priority: NotificationPriority.NORMAL,
            title: "Welcome!",
            message: `${inviterName} has invited you to join the team. Complete your profile to get started.`,
            actionUrl: `/profile`,
            actionLabel: "Complete Profile",
        });
    }

    /**
     * Trigger: Assignment/Call Time cancelled (notifies all assigned staff)
     */
    async onCallTimeCancelled(
        callTimeId: string,
        callTimeDetails: {
            positionName: string;
            eventTitle: string;
            eventId: string;
            startDate: Date;
        }
    ) {
        const assignedStaff = await this.getAssignedStaffForCallTime(callTimeId);

        if (assignedStaff.length === 0) return;

        const formattedDate = new Date(callTimeDetails.startDate).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });

        await this.notificationService.createBulk(assignedStaff, {
            type: NotificationType.EVENT_CANCELLED, // Reuse existing type
            priority: NotificationPriority.URGENT,
            title: "Assignment Cancelled",
            message: `Your assignment as ${callTimeDetails.positionName} for "${callTimeDetails.eventTitle}" on ${formattedDate} has been cancelled`,
            relatedEntityType: "event",
            relatedEntityId: callTimeDetails.eventId,
        });
    }

    /**
     * Helper: Get user IDs of all staff assigned to a specific call time
     */
    private async getAssignedStaffForCallTime(callTimeId: string): Promise<string[]> {
        const invitations = await this.prisma.callTimeInvitation.findMany({
            where: {
                callTimeId,
                status: "ACCEPTED",
            },
            include: {
                staff: {
                    select: {
                        userId: true,
                    },
                },
            },
        });

        // Filter out staff without user accounts and get unique user IDs
        const userIds = invitations
            .map((inv) => inv.staff.userId)
            .filter((userId): userId is string => userId !== null);

        return [...new Set(userIds)]; // Remove duplicates
    }

    /**
     * Helper: Get user IDs of all staff assigned to an event
     */
    private async getAssignedStaffUserIds(eventId: string): Promise<string[]> {
        const invitations = await this.prisma.callTimeInvitation.findMany({
            where: {
                callTime: {
                    eventId,
                },
                status: "ACCEPTED",
                isConfirmed: true,
            },
            include: {
                staff: {
                    select: {
                        userId: true,
                    },
                },
            },
        });

        // Filter out staff without user accounts and get unique user IDs
        const userIds = invitations
            .map((inv) => inv.staff.userId)
            .filter((userId): userId is string => userId !== null);

        return [...new Set(userIds)]; // Remove duplicates
    }
}

// Singleton instance
let triggerServiceInstance: NotificationTriggerService | null = null;

export function getNotificationTriggerService(prisma: PrismaClient): NotificationTriggerService {
    if (!triggerServiceInstance) {
        triggerServiceInstance = new NotificationTriggerService(prisma);
    }
    return triggerServiceInstance;
}
