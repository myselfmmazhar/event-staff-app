import { PrismaClient, StaffDocumentStatus, Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import {
    REQ_TEMPLATE_CARDS,
    type ReqTemplateId,
    isReqTemplateId,
} from "@/lib/requirement-templates";
import type {
    UploadUpdateInput,
    ApproveInput,
    UpdateExpiryInput,
    RejectInput,
    CategorizeLegacyInput,
} from "@/lib/schemas/staff-document.schema";
import { getNotificationTriggerService } from "./notification-trigger.service";
import { emailService } from "./email.service";

/**
 * Buckets used for talent document expiry notifications.
 * On each lazy check, the doc's current bucket is the smallest threshold N such
 * that `daysRemaining <= N`. Each bucket fires at most once per document; once
 * fired it's recorded in `StaffDocument.notifiedThresholds`. Stale buckets the
 * talent has already passed are skipped entirely.
 */
export const EXPIRY_THRESHOLDS = [30, 15, 7, 5, 2] as const;

/** Banner / `getExpiringForTalent` lookback window — matches the largest bucket. */
export const DOCUMENT_EXPIRY_BANNER_DAYS = EXPIRY_THRESHOLDS[0];

/**
 * Returns the current expiry bucket for a given `daysRemaining`, or `null` if
 * the doc is outside the warning window (too early or already expired).
 */
function getCurrentExpiryBucket(daysRemaining: number): number | null {
    if (daysRemaining <= 0) return null;
    // Smallest threshold N such that daysRemaining <= N
    for (const n of [...EXPIRY_THRESHOLDS].sort((a, b) => a - b)) {
        if (daysRemaining <= n) return n;
    }
    return null;
}

export type StaffDocumentRow = {
    id: string;
    staffId: string;
    requirementTemplateId: string;
    name: string;
    url: string;
    type: string | null;
    size: number | null;
    status: StaffDocumentStatus;
    version: number;
    isCurrent: boolean;
    replacesId: string | null;
    rejectionReason: string | null;
    reviewedAt: Date | null;
    reviewedBy: string | null;
    expiresAt: Date | null;
    expiryNotifiedAt: Date | null;
    notifiedThresholds: number[];
    createdAt: Date;
    updatedAt: Date;
    reviewer?: { firstName: string; lastName: string; email: string } | null;
};

export function getRequirementTitle(id: string): string {
    return REQ_TEMPLATE_CARDS.find((c) => c.id === id)?.title ?? id;
}

export class StaffDocumentService {
    constructor(private prisma: PrismaClient) {}

    /**
     * Create approved+current rows for a staff during onboarding.
     * Caller passes one entry per active requirement card.
     */
    async createOnboardingDocuments(
        staffId: string,
        documents: ReadonlyArray<{
            requirementTemplateId: ReqTemplateId;
            name: string;
            url: string;
            type?: string | null;
            size?: number | null;
            expiresAt?: Date | null;
        }>,
        tx?: Prisma.TransactionClient
    ) {
        const db = tx ?? this.prisma;
        if (documents.length === 0) return;

        await db.staffDocument.createMany({
            data: documents.map((doc) => ({
                staffId,
                requirementTemplateId: doc.requirementTemplateId,
                name: doc.name,
                url: doc.url,
                type: doc.type ?? null,
                size: doc.size ?? null,
                status: StaffDocumentStatus.APPROVED,
                version: 1,
                isCurrent: true,
                expiresAt: doc.expiresAt ?? null,
            })),
        });
    }

    /**
     * Talent uploads an update for one requirement slot.
     * If an existing PENDING request exists for that slot, mark it SUPERSEDED.
     */
    async uploadUpdate(userId: string, input: UploadUpdateInput): Promise<StaffDocumentRow> {
        const staff = await this.prisma.staff.findFirst({
            where: { userId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
            },
        });
        if (!staff) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Staff record not found" });
        }

        // Default expiry is one week from upload; admin can adjust later from the talent profile.
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        // Find the most recent version for this slot to compute next version
        const latest = await this.prisma.staffDocument.findFirst({
            where: {
                staffId: staff.id,
                requirementTemplateId: input.requirementTemplateId,
            },
            orderBy: { version: "desc" },
            select: { id: true, version: true },
        });

        const newVersion = (latest?.version ?? 0) + 1;

        const created = await this.prisma.$transaction(async (tx) => {
            // Mark any existing PENDING for this slot as SUPERSEDED
            await tx.staffDocument.updateMany({
                where: {
                    staffId: staff.id,
                    requirementTemplateId: input.requirementTemplateId,
                    status: StaffDocumentStatus.PENDING,
                },
                data: { status: StaffDocumentStatus.SUPERSEDED },
            });

            return tx.staffDocument.create({
                data: {
                    staffId: staff.id,
                    requirementTemplateId: input.requirementTemplateId,
                    name: input.name,
                    url: input.url,
                    type: input.type ?? null,
                    size: input.size ?? null,
                    status: StaffDocumentStatus.PENDING,
                    version: newVersion,
                    isCurrent: false,
                    expiresAt,
                    replacesId: latest?.id ?? null,
                },
            });
        });

        await getNotificationTriggerService(this.prisma).onTalentDocumentRequestSubmitted({
            staffId: staff.id,
            staffName: `${staff.firstName} ${staff.lastName}`,
            requirementTitle: getRequirementTitle(input.requirementTemplateId),
            documentId: created.id,
        });

        return created;
    }

    /**
     * Returns slots grouped per requirement template the talent has anything for.
     * Each slot includes the current APPROVED doc, the pending update (if any),
     * and the most recent REJECTED entry that is newer than the current approved.
     */
    async getTalentSlots(userId: string) {
        const staff = await this.prisma.staff.findFirst({
            where: { userId },
            select: { id: true },
        });
        if (!staff) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Staff record not found" });
        }

        const docs = await this.prisma.staffDocument.findMany({
            where: { staffId: staff.id },
            orderBy: [{ requirementTemplateId: "asc" }, { version: "desc" }],
        });

        const slots = new Map<
            string,
            {
                requirementTemplateId: string;
                current: StaffDocumentRow | null;
                pending: StaffDocumentRow | null;
                lastRejected: StaffDocumentRow | null;
            }
        >();

        for (const doc of docs) {
            const slot = slots.get(doc.requirementTemplateId) ?? {
                requirementTemplateId: doc.requirementTemplateId,
                current: null,
                pending: null,
                lastRejected: null,
            };
            if (doc.isCurrent && doc.status === StaffDocumentStatus.APPROVED) {
                slot.current = doc;
            } else if (doc.status === StaffDocumentStatus.PENDING) {
                if (!slot.pending) slot.pending = doc;
            } else if (doc.status === StaffDocumentStatus.REJECTED) {
                if (!slot.lastRejected) slot.lastRejected = doc;
            }
            slots.set(doc.requirementTemplateId, slot);
        }

        // Only show a "last rejected" banner if the rejection happened AFTER the current approved version.
        for (const slot of slots.values()) {
            if (slot.lastRejected && slot.current) {
                if (slot.lastRejected.version <= slot.current.version) {
                    slot.lastRejected = null;
                }
            }
            // Hide rejection while a fresh pending exists
            if (slot.pending) {
                slot.lastRejected = null;
            }
        }

        return Array.from(slots.values());
    }

    /**
     * Admin: full history for a staff, grouped by requirement.
     */
    async getHistoryForStaff(staffId: string): Promise<StaffDocumentRow[]> {
        return this.prisma.staffDocument.findMany({
            where: { staffId },
            orderBy: [{ requirementTemplateId: "asc" }, { version: "desc" }],
            include: {
                reviewer: { select: { firstName: true, lastName: true, email: true } },
            },
        });
    }

    /**
     * Admin: pending update requests for a single staff.
     */
    async getPendingForStaff(staffId: string): Promise<StaffDocumentRow[]> {
        return this.prisma.staffDocument.findMany({
            where: { staffId, status: StaffDocumentStatus.PENDING },
            orderBy: { createdAt: "desc" },
        });
    }

    /**
     * Admin: approve a pending document → becomes the new current, previous current archived.
     */
    async approve(reviewerUserId: string, input: ApproveInput): Promise<StaffDocumentRow> {
        const doc = await this.prisma.staffDocument.findUnique({
            where: { id: input.documentId },
            include: {
                staff: { select: { id: true, userId: true } },
            },
        });
        if (!doc) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
        }
        if (doc.status !== StaffDocumentStatus.PENDING) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Only pending requests can be approved",
            });
        }

        const approved = await this.prisma.$transaction(async (tx) => {
            // Demote any previously current row for this slot
            await tx.staffDocument.updateMany({
                where: {
                    staffId: doc.staffId,
                    requirementTemplateId: doc.requirementTemplateId,
                    isCurrent: true,
                },
                data: { isCurrent: false },
            });

            return tx.staffDocument.update({
                where: { id: doc.id },
                data: {
                    status: StaffDocumentStatus.APPROVED,
                    isCurrent: true,
                    reviewedAt: new Date(),
                    reviewedBy: reviewerUserId,
                    rejectionReason: null,
                    // Admin picks the expiry on approve. If they didn't change
                    // the pre-filled value the same date is written back —
                    // when they cleared it we explicitly set NULL.
                    expiresAt:
                        input.expiresAt === undefined
                            ? undefined
                            : input.expiresAt === null
                                ? null
                                : new Date(input.expiresAt),
                    // Reset the notification stamps so the talent gets a fresh
                    // round of bucket warnings as the new expiry approaches.
                    expiryNotifiedAt: null,
                    notifiedThresholds: [],
                },
            });
        });

        if (doc.staff.userId) {
            await getNotificationTriggerService(this.prisma).onTalentDocumentApproved(
                doc.staff.userId,
                {
                    requirementTitle: getRequirementTitle(doc.requirementTemplateId),
                    documentId: approved.id,
                }
            );
        }

        return approved;
    }

    /**
     * Admin: change the expiry date on an existing document row.
     */
    async updateExpiry(_reviewerUserId: string, input: UpdateExpiryInput): Promise<StaffDocumentRow> {
        const doc = await this.prisma.staffDocument.findUnique({
            where: { id: input.documentId },
            select: { id: true },
        });
        if (!doc) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
        }

        return this.prisma.staffDocument.update({
            where: { id: input.documentId },
            data: {
                expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
                // Reset the notification stamps so the talent gets a fresh round
                // of bucket warnings as the new expiry approaches.
                expiryNotifiedAt: null,
                notifiedThresholds: [],
            },
        });
    }

    /**
     * Admin: reject a pending document.
     */
    async reject(reviewerUserId: string, input: RejectInput): Promise<StaffDocumentRow> {
        const doc = await this.prisma.staffDocument.findUnique({
            where: { id: input.documentId },
            include: { staff: { select: { userId: true } } },
        });
        if (!doc) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
        }
        if (doc.status !== StaffDocumentStatus.PENDING) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Only pending requests can be rejected",
            });
        }

        const rejected = await this.prisma.staffDocument.update({
            where: { id: doc.id },
            data: {
                status: StaffDocumentStatus.REJECTED,
                reviewedAt: new Date(),
                reviewedBy: reviewerUserId,
                rejectionReason: input.reason,
            },
        });

        if (doc.staff.userId) {
            await getNotificationTriggerService(this.prisma).onTalentDocumentRejected(
                doc.staff.userId,
                {
                    requirementTitle: getRequirementTitle(doc.requirementTemplateId),
                    documentId: rejected.id,
                    reason: input.reason,
                }
            );
        }

        return rejected;
    }

    /**
     * Admin: take an entry from legacy `staff.documents` JSON and promote it
     * to a categorized `StaffDocument` row with status APPROVED + isCurrent=true.
     * Removes the entry from the legacy JSON.
     */
    async categorizeLegacy(input: CategorizeLegacyInput): Promise<StaffDocumentRow> {
        if (!isReqTemplateId(input.requirementTemplateId)) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid requirement template" });
        }

        const staff = await this.prisma.staff.findUnique({
            where: { id: input.staffId },
            select: { id: true, documents: true },
        });
        if (!staff) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Staff not found" });
        }

        const legacyList = Array.isArray(staff.documents)
            ? (staff.documents as Array<{
                  name: string;
                  url: string;
                  type?: string;
                  size?: number;
              }>)
            : [];

        const entry = legacyList[input.legacyIndex];
        if (!entry) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Legacy document entry not found" });
        }

        const latest = await this.prisma.staffDocument.findFirst({
            where: {
                staffId: input.staffId,
                requirementTemplateId: input.requirementTemplateId,
            },
            orderBy: { version: "desc" },
            select: { version: true },
        });

        const newVersion = (latest?.version ?? 0) + 1;

        const created = await this.prisma.$transaction(async (tx) => {
            await tx.staffDocument.updateMany({
                where: {
                    staffId: input.staffId,
                    requirementTemplateId: input.requirementTemplateId,
                    isCurrent: true,
                },
                data: { isCurrent: false },
            });

            const newDoc = await tx.staffDocument.create({
                data: {
                    staffId: input.staffId,
                    requirementTemplateId: input.requirementTemplateId,
                    name: entry.name,
                    url: entry.url,
                    type: entry.type ?? null,
                    size: entry.size ?? null,
                    status: StaffDocumentStatus.APPROVED,
                    version: newVersion,
                    isCurrent: true,
                    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
                },
            });

            // Remove the categorized entry from the legacy JSON list
            const remaining = legacyList.filter((_, i) => i !== input.legacyIndex);
            await tx.staff.update({
                where: { id: input.staffId },
                data: {
                    documents:
                        remaining.length > 0
                            ? (remaining as unknown as Prisma.InputJsonValue)
                            : Prisma.JsonNull,
                },
            });

            return newDoc;
        });

        return created;
    }

    /**
     * Lazy expiry check for a talent: returns all of their APPROVED+isCurrent docs
     * expiring within the warning window. For each doc, determines the current
     * expiry "bucket" (30/15/7/5/2) and, if that bucket hasn't fired yet, sends
     * a one-time in-app notification + email and records the bucket as notified.
     * Stale buckets the talent has already passed are skipped.
     *
     * Side-effect work (notification + email) is fire-and-forget so it doesn't
     * block the dashboard query response.
     */
    async getExpiringForTalent(userId: string) {
        const staff = await this.prisma.staff.findFirst({
            where: { userId },
            select: {
                id: true,
                userId: true,
                firstName: true,
                email: true,
            },
        });
        if (!staff) return [];

        const now = new Date();
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() + DOCUMENT_EXPIRY_BANNER_DAYS);

        const expiring = await this.prisma.staffDocument.findMany({
            where: {
                staffId: staff.id,
                status: StaffDocumentStatus.APPROVED,
                isCurrent: true,
                expiresAt: {
                    not: null,
                    lte: cutoff,
                    gte: now,
                },
            },
            orderBy: { expiresAt: "asc" },
        });

        for (const doc of expiring) {
            if (!doc.expiresAt || !staff.userId) continue;

            const daysRemaining = Math.max(
                0,
                Math.ceil((doc.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            );

            const bucket = getCurrentExpiryBucket(daysRemaining);
            if (bucket === null) continue;

            const alreadyNotified = (doc.notifiedThresholds ?? []).includes(bucket);
            if (alreadyNotified) continue;

            // Fire-and-forget: don't block the dashboard response on notification/email work.
            void this.notifyExpiry({
                docId: doc.id,
                bucket,
                daysRemaining,
                expiresAt: doc.expiresAt,
                requirementTitle: getRequirementTitle(doc.requirementTemplateId),
                staffUserId: staff.userId,
                staffEmail: staff.email,
                staffFirstName: staff.firstName,
            });
        }

        return expiring;
    }

    /**
     * Internal: send the in-app notification + email for a single doc bucket and
     * stamp the bucket onto `notifiedThresholds`. Errors are logged, never thrown.
     */
    private async notifyExpiry(args: {
        docId: string;
        bucket: number;
        daysRemaining: number;
        expiresAt: Date;
        requirementTitle: string;
        staffUserId: string;
        staffEmail: string | null;
        staffFirstName: string;
    }) {
        try {
            // Record the bucket up-front so concurrent loads don't re-fire.
            await this.prisma.staffDocument.update({
                where: { id: args.docId },
                data: { notifiedThresholds: { push: args.bucket } },
            });

            const triggers = getNotificationTriggerService(this.prisma);
            await triggers.onTalentDocumentExpiring(args.staffUserId, {
                requirementTitle: args.requirementTitle,
                documentId: args.docId,
                expiresAt: args.expiresAt,
                daysRemaining: args.daysRemaining,
            });

            if (args.staffEmail) {
                await emailService.sendDocumentExpiring(
                    args.staffEmail,
                    args.staffFirstName,
                    {
                        requirementTitle: args.requirementTitle,
                        expiresAt: args.expiresAt,
                        daysRemaining: args.daysRemaining,
                    }
                );
            }
        } catch (err) {
            console.error("Error sending document expiry notification:", err);
        }
    }
}
