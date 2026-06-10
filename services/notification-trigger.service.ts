import { PrismaClient, NotificationType, NotificationPriority, CallTimeInvitationStatus } from "@prisma/client";
import { NotificationService } from "./notification.service";
import { emailService } from "./email.service";

/**
 * Recipient shape used by the email path. We fetch email/firstName off Staff
 * and the user's notification preferences so opt-outs are honored before
 * spending an outbound send.
 */
interface EmailRecipient {
    userId: string | null;
    email: string;
    firstName: string;
}

/**
 * Preference flag that gates an outbound email. Mirrors the columns on
 * NotificationPreference so callers pick the right one for the trigger.
 */
type EmailPreferenceFlag =
    | "emailCallTimeInvitations"
    | "emailEventUpdates"
    | "emailShiftReminders";

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

        // 3. Email assigned staff (best-effort, independent of in-app notif)
        try {
            const [recipients, ctx] = await Promise.all([
                this.getEventEmailRecipients(eventId, "emailEventUpdates"),
                this.getEventEmailContext(eventId),
            ]);

            if (recipients.length > 0 && ctx) {
                const location = this.formatEventLocation(ctx);
                await Promise.allSettled(
                    recipients.map((r) =>
                        emailService.sendEventUpdate(r.email, r.firstName, {
                            eventTitle,
                            eventVenue: ctx.venueName,
                            eventLocation: location,
                            startDate: ctx.startDate,
                            startTime: ctx.startTime,
                            endDate: ctx.endDate,
                            endTime: ctx.endTime,
                            changes,
                        })
                    )
                );
            }
        } catch (err) {
            console.error("Failed to send event update emails:", err);
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

        if (assignedStaff.length > 0) {
            await this.notificationService.createBulk(assignedStaff, {
                type: NotificationType.EVENT_CANCELLED,
                priority: NotificationPriority.URGENT,
                title: "Event Cancelled",
                message: `The event "${eventTitle}" has been cancelled`,
                relatedEntityType: "event",
                relatedEntityId: eventId,
            });
        }

        // Email assigned staff (best-effort, independent of in-app notif)
        try {
            const [recipients, ctx] = await Promise.all([
                this.getEventEmailRecipients(eventId, "emailEventUpdates"),
                this.getEventEmailContext(eventId),
            ]);

            if (recipients.length > 0 && ctx) {
                const location = this.formatEventLocation(ctx);
                await Promise.allSettled(
                    recipients.map((r) =>
                        emailService.sendEventCancelled(r.email, r.firstName, {
                            eventTitle,
                            eventVenue: ctx.venueName,
                            eventLocation: location,
                            startDate: ctx.startDate,
                            endDate: ctx.endDate,
                        })
                    )
                );
            }
        } catch (err) {
            console.error("Failed to send event cancelled emails:", err);
        }
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
     * Trigger: Call time / task details updated.
     * Notifies every staff member with a PENDING or ACCEPTED invitation
     * for this call time so they know to review the changes.
     */
    async onCallTimeUpdated(
        callTimeId: string,
        callTimeDetails: {
            positionName: string;
            eventTitle: string;
            eventId: string;
            changes: string[];
        }
    ) {
        const recipientUserIds = await this.getInvitedStaffForCallTime(
            callTimeId,
            [CallTimeInvitationStatus.PENDING, CallTimeInvitationStatus.ACCEPTED]
        );

        if (recipientUserIds.length === 0) return;

        const message = callTimeDetails.changes.length > 0
            ? `Your ${callTimeDetails.positionName} assignment for "${callTimeDetails.eventTitle}" was updated. Changes: ${callTimeDetails.changes.join(", ")}`
            : `Your ${callTimeDetails.positionName} assignment for "${callTimeDetails.eventTitle}" has been updated.`;

        await this.notificationService.createBulk(recipientUserIds, {
            type: NotificationType.EVENT_UPDATE,
            priority: NotificationPriority.NORMAL,
            title: "Shift Details Updated",
            message,
            actionUrl: `/my-schedule`,
            actionLabel: "View Details",
            relatedEntityType: "callTime",
            relatedEntityId: callTimeId,
            batchKey: `call_time_update_${callTimeId}`,
        });

        // Email staff with pending/accepted invitations (best-effort)
        try {
            const [recipients, ctx] = await Promise.all([
                this.getCallTimeEmailRecipients(
                    callTimeId,
                    [
                        CallTimeInvitationStatus.PENDING,
                        CallTimeInvitationStatus.ACCEPTED,
                    ],
                    "emailEventUpdates"
                ),
                this.getCallTimeEmailContext(callTimeId),
            ]);

            if (recipients.length > 0 && ctx) {
                const location = this.formatEventLocation(ctx.event);
                const payRateNumber = typeof ctx.payRate === "object"
                    ? Number((ctx.payRate as { toString: () => string }).toString())
                    : Number(ctx.payRate);

                await Promise.allSettled(
                    recipients.map((r) =>
                        emailService.sendCallTimeUpdate(r.email, r.firstName, {
                            positionName: callTimeDetails.positionName,
                            eventTitle: callTimeDetails.eventTitle,
                            eventVenue: ctx.event.venueName,
                            eventLocation: location,
                            startDate: ctx.startDate,
                            startTime: ctx.startTime,
                            endDate: ctx.endDate,
                            endTime: ctx.endTime,
                            payRate: Number.isFinite(payRateNumber) ? payRateNumber : 0,
                            payRateType: ctx.payRateType,
                            assignmentInstructions: ctx.instructions,
                            changes: callTimeDetails.changes,
                        })
                    )
                );
            }
        } catch (err) {
            console.error("Failed to send call time update emails:", err);
        }
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
            startDate: Date | null;
        }
    ) {
        const assignedStaff = await this.getAssignedStaffForCallTime(callTimeId);

        const sd = callTimeDetails.startDate;
        const formattedDate = (!sd || sd.getFullYear() === 1970)
            ? 'TBD'
            : new Date(sd).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
            });

        if (assignedStaff.length > 0) {
            await this.notificationService.createBulk(assignedStaff, {
                type: NotificationType.EVENT_CANCELLED, // Reuse existing type
                priority: NotificationPriority.URGENT,
                title: "Assignment Cancelled",
                message: `Your assignment as ${callTimeDetails.positionName} for "${callTimeDetails.eventTitle}" on ${formattedDate} has been cancelled`,
                relatedEntityType: "event",
                relatedEntityId: callTimeDetails.eventId,
            });
        }

        // Email accepted staff (best-effort). Call site invokes this BEFORE
        // the actual delete, so the call-time context is still in the DB.
        try {
            const [recipients, ctx] = await Promise.all([
                this.getCallTimeEmailRecipients(
                    callTimeId,
                    [CallTimeInvitationStatus.ACCEPTED],
                    "emailEventUpdates"
                ),
                this.getCallTimeEmailContext(callTimeId),
            ]);

            if (recipients.length > 0 && ctx) {
                const location = this.formatEventLocation(ctx.event);
                await Promise.allSettled(
                    recipients.map((r) =>
                        emailService.sendCallTimeCancelled(r.email, r.firstName, {
                            positionName: callTimeDetails.positionName,
                            eventTitle: callTimeDetails.eventTitle,
                            eventVenue: ctx.event.venueName,
                            eventLocation: location,
                            startDate: ctx.startDate,
                            startTime: ctx.startTime,
                            endDate: ctx.endDate,
                            endTime: ctx.endTime,
                        })
                    )
                );
            }
        } catch (err) {
            console.error("Failed to send call time cancelled emails:", err);
        }
    }

    // ==========================================
    // Event Status Change Notifications
    // ==========================================

    /**
     * Trigger: Event becomes fully staffed (DRAFT → ASSIGNED)
     * Notifies: Event creator
     */
    async onEventFullyStaffed(
        eventId: string,
        eventDetails: {
            eventTitle: string;
            createdBy: string;
        }
    ) {
        await this.notificationService.create({
            userId: eventDetails.createdBy,
            type: NotificationType.EVENT_FULLY_STAFFED,
            priority: NotificationPriority.NORMAL,
            title: "Event Fully Staffed",
            message: `All positions for "${eventDetails.eventTitle}" have been filled`,
            actionUrl: `/events?id=${eventId}`,
            actionLabel: "View Event",
            relatedEntityType: "event",
            relatedEntityId: eventId,
        });
    }

    /**
     * Trigger: Event starts (ASSIGNED → IN_PROGRESS)
     * Notifies: Event creator + all assigned staff
     */
    async onEventStarted(
        eventId: string,
        eventDetails: {
            eventTitle: string;
            createdBy: string;
        }
    ) {
        // Notify event creator
        await this.notificationService.create({
            userId: eventDetails.createdBy,
            type: NotificationType.EVENT_STARTED,
            priority: NotificationPriority.NORMAL,
            title: "Event Started",
            message: `"${eventDetails.eventTitle}" is now in progress`,
            actionUrl: `/events?id=${eventId}`,
            actionLabel: "View Event",
            relatedEntityType: "event",
            relatedEntityId: eventId,
        });

        // Notify assigned staff
        const assignedStaff = await this.getAssignedStaffUserIds(eventId);

        if (assignedStaff.length > 0) {
            await this.notificationService.createBulk(assignedStaff, {
                type: NotificationType.EVENT_STARTED,
                priority: NotificationPriority.NORMAL,
                title: "Event Started",
                message: `"${eventDetails.eventTitle}" is now in progress`,
                actionUrl: `/my-schedule`,
                actionLabel: "View Schedule",
                relatedEntityType: "event",
                relatedEntityId: eventId,
            });
        }
    }

    /**
     * Trigger: Event completes (IN_PROGRESS → COMPLETED)
     * Notifies: Event creator
     */
    async onEventCompleted(
        eventId: string,
        eventDetails: {
            eventTitle: string;
            createdBy: string;
        }
    ) {
        await this.notificationService.create({
            userId: eventDetails.createdBy,
            type: NotificationType.EVENT_COMPLETED,
            priority: NotificationPriority.LOW,
            title: "Event Completed",
            message: `"${eventDetails.eventTitle}" has been completed`,
            actionUrl: `/events?id=${eventId}`,
            actionLabel: "View Event",
            relatedEntityType: "event",
            relatedEntityId: eventId,
        });
    }

    /**
     * Trigger: Event no longer fully staffed (ASSIGNED → DRAFT)
     * Notifies: Event creator
     */
    async onEventUnderstaffed(
        eventId: string,
        eventDetails: {
            eventTitle: string;
            createdBy: string;
        }
    ) {
        await this.notificationService.create({
            userId: eventDetails.createdBy,
            type: NotificationType.EVENT_UPDATE,
            priority: NotificationPriority.HIGH,
            title: "Staff Needed",
            message: `"${eventDetails.eventTitle}" is no longer fully staffed and requires attention`,
            actionUrl: `/events?id=${eventId}`,
            actionLabel: "View Event",
            relatedEntityType: "event",
            relatedEntityId: eventId,
        });
    }

    // ==========================================
    // Talent Document Notifications
    // ==========================================

    /**
     * Trigger: Talent uploaded a document update — notifies all admins.
     */
    async onTalentDocumentRequestSubmitted(
        details: {
            staffId: string;
            staffName: string;
            requirementTitle: string;
            documentId: string;
        }
    ) {
        const adminUserIds = await this.getAdminUserIds();
        if (adminUserIds.length === 0) return;

        await this.notificationService.createBulk(adminUserIds, {
            type: NotificationType.TALENT_DOCUMENT_REQUEST,
            priority: NotificationPriority.NORMAL,
            title: "New Document Update Request",
            message: `${details.staffName} submitted an updated ${details.requirementTitle} for review`,
            actionUrl: `/staff`,
            actionLabel: "Review",
            relatedEntityType: "staffDocument",
            relatedEntityId: details.documentId,
        });
    }

    /**
     * Trigger: Admin approved a talent's document update.
     */
    async onTalentDocumentApproved(
        staffUserId: string,
        details: {
            requirementTitle: string;
            documentId: string;
        }
    ) {
        await this.notificationService.create({
            userId: staffUserId,
            type: NotificationType.TALENT_DOCUMENT_APPROVED,
            priority: NotificationPriority.NORMAL,
            title: "Document Approved",
            message: `Your updated ${details.requirementTitle} has been approved.`,
            actionUrl: `/profile`,
            actionLabel: "View",
            relatedEntityType: "staffDocument",
            relatedEntityId: details.documentId,
        });
    }

    /**
     * Trigger: Admin rejected a talent's document update.
     */
    async onTalentDocumentRejected(
        staffUserId: string,
        details: {
            requirementTitle: string;
            documentId: string;
            reason?: string;
        }
    ) {
        const reasonSuffix = details.reason ? ` Reason: ${details.reason}` : "";
        await this.notificationService.create({
            userId: staffUserId,
            type: NotificationType.TALENT_DOCUMENT_REJECTED,
            priority: NotificationPriority.HIGH,
            title: "Document Rejected",
            message: `Your updated ${details.requirementTitle} was rejected.${reasonSuffix}`,
            actionUrl: `/profile`,
            actionLabel: "Re-upload",
            relatedEntityType: "staffDocument",
            relatedEntityId: details.documentId,
        });
    }

    /**
     * Trigger: One of the talent's documents is expiring within the warning window.
     * Caller is responsible for stamping `expiryNotifiedAt` so this fires only once.
     */
    async onTalentDocumentExpiring(
        staffUserId: string,
        details: {
            requirementTitle: string;
            documentId: string;
            expiresAt: Date;
            daysRemaining: number;
        }
    ) {
        const dateLabel = details.expiresAt.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
        await this.notificationService.create({
            userId: staffUserId,
            type: NotificationType.TALENT_DOCUMENT_EXPIRING,
            priority: NotificationPriority.HIGH,
            title: "Document Expiring Soon",
            message: `Your ${details.requirementTitle} expires on ${dateLabel} (${details.daysRemaining} day${details.daysRemaining === 1 ? "" : "s"}). Please upload an updated copy.`,
            actionUrl: `/profile`,
            actionLabel: "Upload Update",
            relatedEntityType: "staffDocument",
            relatedEntityId: details.documentId,
        });
    }

    // ==========================================
    // Helper Methods
    // ==========================================

    /**
     * Helper: Get user IDs of all active SUPER_ADMIN/ADMIN users.
     */
    private async getAdminUserIds(): Promise<string[]> {
        const admins = await this.prisma.user.findMany({
            where: {
                isActive: true,
                role: { in: ["SUPER_ADMIN", "ADMIN"] },
            },
            select: { id: true },
        });
        return admins.map((u) => u.id);
    }

    /**
     * Helper: Get user IDs of staff invited to a call time, filtered by invitation status.
     */
    private async getInvitedStaffForCallTime(
        callTimeId: string,
        statuses: CallTimeInvitationStatus[]
    ): Promise<string[]> {
        const invitations = await this.prisma.callTimeInvitation.findMany({
            where: {
                callTimeId,
                status: { in: statuses },
            },
            include: {
                staff: { select: { userId: true } },
            },
        });

        const userIds = invitations
            .map((inv) => inv.staff.userId)
            .filter((userId): userId is string => userId !== null);

        return [...new Set(userIds)];
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

    // ==========================================
    // Email recipient helpers
    // ==========================================

    /**
     * Helper: Collect email recipients (staff with ACCEPTED+confirmed
     * invitations) for an event, filtered by their notification preferences.
     * Staff without a user account are still returned — we can still email
     * them via staff.email; only the in-app channel needs a userId.
     */
    private async getEventEmailRecipients(
        eventId: string,
        preferenceFlag: EmailPreferenceFlag
    ): Promise<EmailRecipient[]> {
        const invitations = await this.prisma.callTimeInvitation.findMany({
            where: {
                callTime: { eventId },
                status: "ACCEPTED",
                isConfirmed: true,
            },
            include: {
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
                                        emailCallTimeInvitations: true,
                                        emailEventUpdates: true,
                                        emailShiftReminders: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        return this.filterEmailRecipients(
            invitations.map((inv) => inv.staff),
            preferenceFlag
        );
    }

    /**
     * Helper: Collect email recipients for a specific call time, filtered by
     * invitation status and the user's notification preferences.
     */
    private async getCallTimeEmailRecipients(
        callTimeId: string,
        statuses: CallTimeInvitationStatus[],
        preferenceFlag: EmailPreferenceFlag
    ): Promise<EmailRecipient[]> {
        const invitations = await this.prisma.callTimeInvitation.findMany({
            where: {
                callTimeId,
                status: { in: statuses },
            },
            include: {
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
                                        emailCallTimeInvitations: true,
                                        emailEventUpdates: true,
                                        emailShiftReminders: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        return this.filterEmailRecipients(
            invitations.map((inv) => inv.staff),
            preferenceFlag
        );
    }

    /**
     * Helper: Dedupe by email, drop staff without email, and honor each
     * recipient's notification preferences. Default is opt-in (matches the
     * @default(true) on the model) — only opt them out if the row exists
     * AND has the relevant flag explicitly false.
     */
    private filterEmailRecipients(
        staffRows: Array<{
            email: string | null;
            firstName: string | null;
            userId: string | null;
            users_staff_userIdTousers: {
                notification_preferences: {
                    emailEnabled: boolean;
                    emailCallTimeInvitations: boolean;
                    emailEventUpdates: boolean;
                    emailShiftReminders: boolean;
                } | null;
            } | null;
        }>,
        preferenceFlag: EmailPreferenceFlag
    ): EmailRecipient[] {
        const seen = new Set<string>();
        const recipients: EmailRecipient[] = [];

        for (const staff of staffRows) {
            if (!staff.email) continue;
            const emailKey = staff.email.toLowerCase();
            if (seen.has(emailKey)) continue;

            const pref = staff.users_staff_userIdTousers?.notification_preferences;
            if (pref && (!pref.emailEnabled || !pref[preferenceFlag])) continue;

            seen.add(emailKey);
            recipients.push({
                userId: staff.userId,
                email: staff.email,
                firstName: staff.firstName ?? "",
            });
        }

        return recipients;
    }

    /**
     * Helper: Fetch the event fields the email templates need (venue,
     * location, dates/times). Returns null if the event is gone.
     */
    private async getEventEmailContext(eventId: string) {
        return await this.prisma.event.findUnique({
            where: { id: eventId },
            select: {
                title: true,
                venueName: true,
                address: true,
                city: true,
                state: true,
                startDate: true,
                endDate: true,
                startTime: true,
                endTime: true,
            },
        });
    }

    /**
     * Helper: Fetch the call time + parent event fields the email templates
     * need. Returns null if the call time is gone (deleted).
     */
    private async getCallTimeEmailContext(callTimeId: string) {
        return await this.prisma.callTime.findUnique({
            where: { id: callTimeId },
            select: {
                startDate: true,
                startTime: true,
                endDate: true,
                endTime: true,
                payRate: true,
                payRateType: true,
                instructions: true,
                service: { select: { title: true } },
                event: {
                    select: {
                        id: true,
                        title: true,
                        venueName: true,
                        address: true,
                        city: true,
                        state: true,
                    },
                },
            },
        });
    }

    /**
     * Helper: Compose a single human-readable location string from the
     * event's address/city/state, used in email templates.
     */
    private formatEventLocation(event: {
        address: string | null;
        city: string | null;
        state: string | null;
    }): string {
        return [event.address, event.city, event.state]
            .filter((part): part is string => !!part && part.trim().length > 0)
            .join(", ");
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
