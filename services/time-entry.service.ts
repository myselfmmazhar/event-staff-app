import { PrismaClient } from '@prisma/client';

export class TimeEntryService {
    constructor(private prisma: PrismaClient) { }

    /**
     * Fetch all time entries enriched with staff, callTime, event, service data.
     * Filters: dateFrom, dateTo, eventId, staffId
     */
    async getAll(filters?: {
        dateFrom?: Date;
        dateTo?: Date;
        eventId?: string;
        staffId?: string;
        search?: string;
    }) {
        const where: any = {};

        if (filters?.eventId) {
            where.callTime = { eventId: filters.eventId };
        }

        if (filters?.staffId) {
            where.staffId = filters.staffId;
        }

        if (filters?.dateFrom || filters?.dateTo) {
            where.callTime = {
                ...where.callTime,
                startDate: {
                    ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
                    ...(filters.dateTo ? { lte: filters.dateTo } : {}),
                },
            };
        }

        return await (this.prisma as any).timeEntry.findMany({
            where,
            include: {
                staff: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        // payrollId: true,
                        // hrSystemId: true,
                        email: true,
                        phone: true,
                    },
                },
                callTime: {
                    include: {
                        service: { select: { id: true, title: true } },
                        event: {
                            select: {
                                id: true,
                                eventId: true,
                                title: true,
                                poNumber: true,
                                client: { select: { id: true, businessName: true } },
                            },
                        },
                    },
                },
            },
            orderBy: [
                { callTime: { startDate: 'asc' } },
                { staff: { firstName: 'asc' } },
            ],
        });
    }

    /**
     * Fetch all accepted invitations (with or without a time entry) for the Time Manager.
     * This is the canonical source — one row per accepted staff per call time.
     */
    async getTimeManagerRows(filters?: {
        dateFrom?: Date;
        dateTo?: Date;
        eventId?: string;
        staffId?: string;
        search?: string;
    }) {
        const invitationWhere: any = {
            status: 'ACCEPTED',
            isConfirmed: true,
        };

        if (filters?.staffId) {
            invitationWhere.staffId = filters.staffId;
        }

        const callTimeWhere: any = {};
        if (filters?.eventId) {
            callTimeWhere.eventId = filters.eventId;
        }
        if (filters?.dateFrom || filters?.dateTo) {
            callTimeWhere.startDate = {
                ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
                ...(filters.dateTo ? { lte: filters.dateTo } : {}),
            };
        }

        if (Object.keys(callTimeWhere).length > 0) {
            invitationWhere.callTime = callTimeWhere;
        }

        const invitations = await (this.prisma as any).callTimeInvitation.findMany({
            where: invitationWhere,
            include: {
                staff: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        accountStatus: true,
                        staffRating: true,
                        skillLevel: true,
                        streetAddress: true,
                        city: true,
                        state: true,
                        zipCode: true,
                        email: true,
                        phone: true,
                    },
                },
                callTime: {
                    include: {
                        service: { select: { id: true, title: true } },
                        event: {
                            select: {
                                id: true,
                                eventId: true,
                                title: true,
                                poNumber: true,
                                client: { select: { id: true, businessName: true } },
                            },
                        },
                    },
                },
                timeEntry: true,
            },
            orderBy: [
                { callTime: { startDate: 'asc' } },
                { staff: { firstName: 'asc' } },
            ],
        });

        // Apply search client-side (name, event title, position)
        if (filters?.search) {
            const q = filters.search.toLowerCase();
            return invitations.filter((inv: any) => {
                const name = `${inv.staff.firstName} ${inv.staff.lastName}`.toLowerCase();
                const eventTitle = inv.callTime.event.title.toLowerCase();
                const position = inv.callTime.service?.title?.toLowerCase() ?? '';
                return name.includes(q) || eventTitle.includes(q) || position.includes(q);
            });
        }

        return invitations;
    }

    /**
     * Upsert a time entry for a given invitation.
     */
    async upsertTimeEntry(data: {
        invitationId: string;
        staffId: string;
        callTimeId: string;
        clockIn?: Date | null;
        clockOut?: Date | null;
        breakMinutes?: number;
        overtimeCost?: number | null;
        overtimePrice?: number | null;
        notes?: string;
        createdBy: string;
    }) {
        const breakMinutes = data.breakMinutes ?? 0;

        return await (this.prisma as any).$transaction(async (tx: any) => {
            const existing = await tx.timeEntry.findUnique({
                where: { invitationId: data.invitationId },
                include: { staff: true },
            });

            if (existing) {
                const hasChanged =
                    (existing.clockIn?.toISOString?.() ?? existing.clockIn) !== (data.clockIn?.toISOString?.() ?? data.clockIn) ||
                    (existing.clockOut?.toISOString?.() ?? existing.clockOut) !== (data.clockOut?.toISOString?.() ?? data.clockOut) ||
                    (existing.breakMinutes ?? 0) !== breakMinutes ||
                    (existing.overtimeCost?.toString?.() ?? existing.overtimeCost) !== (data.overtimeCost?.toString?.() ?? data.overtimeCost) ||
                    (existing.overtimePrice?.toString?.() ?? existing.overtimePrice) !== (data.overtimePrice?.toString?.() ?? data.overtimePrice) ||
                    (existing.notes ?? '') !== (data.notes ?? '');

                const updated = await tx.timeEntry.update({
                    where: { id: existing.id },
                    data: {
                        clockIn: data.clockIn,
                        clockOut: data.clockOut,
                        breakMinutes,
                        overtimeCost: data.overtimeCost,
                        overtimePrice: data.overtimePrice,
                        notes: data.notes,
                    },
                    include: { staff: true },
                });

                if (hasChanged) {
                    await tx.timeEntryRevision.create({
                        data: {
                            timeEntryId: updated.id,
                            clockIn: updated.clockIn,
                            clockOut: updated.clockOut,
                            breakMinutes: updated.breakMinutes,
                            overtimeCost: updated.overtimeCost,
                            overtimePrice: updated.overtimePrice,
                            notes: updated.notes,
                            editedBy: data.createdBy,
                        },
                    });
                }

                return await tx.timeEntry.findUnique({
                    where: { id: existing.id },
                    include: { staff: true },
                });
            }

            return await tx.timeEntry.create({
                data: {
                    invitationId: data.invitationId,
                    staffId: data.staffId,
                    callTimeId: data.callTimeId,
                    clockIn: data.clockIn,
                    clockOut: data.clockOut,
                    breakMinutes,
                    overtimeCost: data.overtimeCost,
                    overtimePrice: data.overtimePrice,
                    notes: data.notes,
                    createdBy: data.createdBy,
                },
                include: { staff: true },
            });
        });
    }

    /**
     * Delete a time entry
     */
    async deleteTimeEntry(invitationId: string) {
        return await (this.prisma as any).timeEntry.delete({
            where: { invitationId },
        });
    }

    /**
     * Generate Invoices from selected invitations.
     * Groups by Event and creates one Draft Invoice per Event.
     */
    async generateInvoices(invitationIds: string[], userId: string) {
        const invitations = await (this.prisma as any).callTimeInvitation.findMany({
            where: {
                id: { in: invitationIds },
                status: 'ACCEPTED',
                isConfirmed: true,
                // Rejects should not be counted/invoiced
                OR: [
                    { internalReviewRating: null },
                    { internalReviewRating: 'MET_EXPECTATIONS' },
                    { internalReviewRating: 'NEEDS_IMPROVEMENT' },
                ],
            },
            include: {
                staff: { select: { firstName: true, lastName: true } },
                callTime: {
                    include: {
                        service: { select: { title: true } },
                        event: { select: { id: true, title: true, clientId: true } },
                    },
                },
                timeEntry: true,
            },
        });

        if (invitations.length === 0) return { count: 0 };

        // Group by event
        const byEvent = new Map<string, any[]>();
        invitations.forEach((inv: any) => {
            const eid = inv.callTime.event.id;
            if (!byEvent.has(eid)) byEvent.set(eid, []);
            byEvent.get(eid)!.push(inv);
        });

        let invoiceCount = 0;
        for (const [eventId, group] of byEvent.entries()) {
            const first = group[0];
            const clientId = first.callTime.event.clientId;
            if (!clientId) continue;

            const invoiceNo = `INV-${Math.floor(Date.now() / 1000)}-${Math.floor(Math.random() * 1000)}`;

            const items = group.map((inv: any) => {
                // Calculate hours scheduled (replicate logic from helpers for service-side use)
                let hours = 1;
                if (inv.callTime.startDate && inv.callTime.startTime && inv.callTime.endTime) {
                    const start = new Date(inv.callTime.startDate);
                    const [sh, sm] = inv.callTime.startTime.split(':').map(Number);
                    start.setHours(sh ?? 0, sm ?? 0, 0, 0);

                    const end = new Date(inv.callTime.endDate || inv.callTime.startDate);
                    const [eh, em] = inv.callTime.endTime.split(':').map(Number);
                    end.setHours(eh ?? 0, em ?? 0, 0, 0);

                    if (end > start) {
                        const diffMs = end.getTime() - start.getTime();
                        hours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
                    }
                }

                const rate = Number(inv.callTime.billRate) || 0;
                const isPerHour = inv.callTime.billRateType === 'PER_HOUR';
                
                // Raw Scheduled Start/End
                let scheduledStart = null;
                let scheduledEnd = null;
                if (inv.callTime.startDate && inv.callTime.startTime) {
                    scheduledStart = new Date(inv.callTime.startDate);
                    const [sh, sm] = inv.callTime.startTime.split(':').map(Number);
                    scheduledStart.setHours(sh ?? 0, sm ?? 0, 0, 0);

                    scheduledEnd = new Date(inv.callTime.endDate || inv.callTime.startDate);
                    const [eh, em] = inv.callTime.endTime?.split(':').map(Number) || [0, 0];
                    scheduledEnd.setHours(eh ?? 0, em ?? 0, 0, 0);
                }

                // Actual Hours calculation (if time entry exists)
                let actualHours = 0;
                if (inv.timeEntry?.clockIn && inv.timeEntry?.clockOut) {
                    const diffMs = new Date(inv.timeEntry.clockOut).getTime() - new Date(inv.timeEntry.clockIn).getTime();
                    const breakMs = (inv.timeEntry.breakMinutes || 0) * 60 * 1000;
                    actualHours = Math.max(0, Math.round(((diffMs - breakMs) / (1000 * 60 * 60)) * 100) / 100);
                }

                const quantity = isPerHour ? (actualHours || hours) : 1;

                // Format Details (Keep for reference or title use)
                const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString();
                const fmtTime = (d: Date | string) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                const schedStartStr = scheduledStart ? `${fmtDate(scheduledStart)} ${fmtTime(scheduledStart)}` : '—';
                const schedEndStr = scheduledEnd ? `${fmtDate(scheduledEnd)} ${fmtTime(scheduledEnd)}` : '—';
                const scheduleShiftDetail = `Scheduled: ${schedStartStr} - ${schedEndStr} (${hours} hrs)`;

                let actualShiftDetails = 'Actual: Not clocked';
                if (inv.timeEntry?.clockIn) {
                    const clockInStr = `${fmtDate(inv.timeEntry.clockIn)} ${fmtTime(inv.timeEntry.clockIn)}`;
                    const clockOutStr = inv.timeEntry.clockOut 
                        ? `${fmtDate(inv.timeEntry.clockOut)} ${fmtTime(inv.timeEntry.clockOut)}` 
                        : 'No out';
                    actualShiftDetails = `Actual: ${clockInStr} - ${clockOutStr} (${actualHours} hrs)`;
                }

                return {
                    description: `${inv.callTime.service?.title || 'Staff'} - ${inv.staff.firstName} ${inv.staff.lastName}`,
                    quantity,
                    price: rate,
                    amount: quantity * rate,
                    serviceId: inv.callTime.serviceId,
                    date: inv.callTime.startDate,
                    scheduledStart,
                    scheduledEnd,
                    scheduledHours: hours,
                    actualStart: inv.timeEntry?.clockIn,
                    actualEnd: inv.timeEntry?.clockOut,
                    actualHours,
                    scheduleShiftDetail,
                    actualShiftDetails,
                    internalNotes: inv.timeEntry?.notes || ""
                };
            });

            await (this.prisma as any).invoice.create({
                data: {
                    invoiceNo,
                    clientId: clientId,
                    status: 'DRAFT',
                    invoiceDate: new Date(),
                    createdBy: userId,
                    items: {
                        create: items,
                    },
                },
            });
            invoiceCount++;
        }

        return { count: invoiceCount };
    }

    /**
     * Persist an approve/reject decision for a call time invitation.
     * APPROVE: invoice-eligible
     * REJECT: excluded from invoicing/counting
     */
    async reviewInvitation(data: {
        invitationIds: string[];
        decision: 'APPROVE' | 'REJECT' | 'REVIEW';
        reviewerId: string;
    }) {
        const internalReviewRating =
            data.decision === 'APPROVE' ? 'MET_EXPECTATIONS' :
                data.decision === 'REJECT' ? 'DID_NOT_MEET' : 'NEEDS_IMPROVEMENT';

        return await (this.prisma as any).callTimeInvitation.updateMany({
            where: { id: { in: data.invitationIds } },
            data: {
                internalReviewRating,
                reviewedBy: data.reviewerId,
                reviewedAt: new Date(),
            },
        });
    }
}
