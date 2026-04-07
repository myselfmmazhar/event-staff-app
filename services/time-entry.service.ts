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
                                venueName: true,
                                address: true,
                                city: true,
                                state: true,
                                zipCode: true,
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
        const callTimeWhere: any = {
            event: {
                status: { in: ['IN_PROGRESS', 'COMPLETED'] },
            },
        };
        if (filters?.eventId) {
            callTimeWhere.eventId = filters.eventId;
        }
        if (filters?.dateFrom || filters?.dateTo) {
            callTimeWhere.startDate = {
                ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
                ...(filters.dateTo ? { lte: filters.dateTo } : {}),
            };
        }

        const invitationWhere: any = {
            status: 'ACCEPTED',
        };
        if (filters?.staffId) {
            invitationWhere.staffId = filters.staffId;
        }

        const callTimes = await (this.prisma as any).callTime.findMany({
            where: callTimeWhere,
            include: {
                service: { select: { id: true, title: true } },
                event: {
                    select: {
                        id: true,
                        eventId: true,
                        title: true,
                        venueName: true,
                        address: true,
                        city: true,
                        state: true,
                        zipCode: true,
                        poNumber: true,
                        status: true,
                        startDate: true,
                        startTime: true,
                        endDate: true,
                        endTime: true,
                        isArchived: true,
                        client: { select: { id: true, businessName: true } },
                    },
                },
                invitations: {
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
                        timeEntry: true,
                    },
                },
            },
            orderBy: { startDate: 'asc' },
        });

        // Flatten callTimes into rows (CallTimeInvitation-like objects)
        let rows: any[] = [];
        for (const ct of callTimes) {
            const numRequired = ct.numberOfStaffRequired || 1;
            const acceptedInvs = ct.invitations || [];

            // 1. Add rows for accepted staff
            const invitationRows = acceptedInvs.map((inv: any) => ({
                ...inv,
                commission: ct.commission,
                commissionAmount: ct.commissionAmount,
                commissionAmountType: ct.commissionAmountType,
                overtimeRate: ct.overtimeRate,
                overtimeRateType: ct.overtimeRateType,
                payRate: ct.payRate,
                payRateType: ct.payRateType,
                billRate: ct.billRate,
                billRateType: ct.billRateType,
                expenditure: ct.expenditure,
                expenditureAmount: ct.expenditureAmount,
                expenditureCost: ct.expenditureCost,
                expenditurePrice: ct.expenditurePrice,
                minimum: ct.minimum,
                callTime: {
                    ...ct,
                    invitations: undefined // Avoid circular/excessive data
                }
            }));
            rows.push(...invitationRows);

            // 2. Add unassigned rows for the remaining spots (only if not filtering by specific staff)
            const remainingSpots = numRequired - acceptedInvs.length;
            if (remainingSpots > 0 && !filters?.staffId && (ct.event.status === 'COMPLETED' || ct.event.status === 'IN_PROGRESS')) {
                for (let i = 0; i < remainingSpots; i++) {
                    rows.push({
                        id: `unassigned-${ct.id}-${i}`,
                        status: 'PENDING',
                        isConfirmed: false,
                        staffId: null,
                        staff: null,
                        timeEntry: null,
                        callTimeId: ct.id,
                        commission: ct.commission,
                        commissionAmount: ct.commissionAmount,
                        commissionAmountType: ct.commissionAmountType,
                        overtimeRate: ct.overtimeRate,
                        overtimeRateType: ct.overtimeRateType,
                        payRate: ct.payRate,
                        payRateType: ct.payRateType,
                        billRate: ct.billRate,
                        billRateType: ct.billRateType,
                        expenditure: ct.expenditure,
                        expenditureAmount: ct.expenditureAmount,
                        expenditureCost: ct.expenditureCost,
                        expenditurePrice: ct.expenditurePrice,
                        minimum: ct.minimum,
                        callTime: {
                            ...ct,
                            invitations: undefined
                        }
                    });
                }
            }
        }

        // Apply search client-side (name, event title, position)
        if (filters?.search) {
            const q = filters.search.toLowerCase();
            rows = rows.filter((row: any) => {
                const name = row.staff ? `${row.staff.firstName} ${row.staff.lastName}`.toLowerCase() : 'unassigned';
                const eventTitle = row.callTime.event.title.toLowerCase();
                const position = row.callTime.service?.title?.toLowerCase() ?? '';
                return name.includes(q) || eventTitle.includes(q) || position.includes(q);
            });
        }

        // Final sort: Date, then Staff Name
        return rows.sort((a, b) => {
            const dateA = new Date(a.callTime.startDate || 0).getTime();
            const dateB = new Date(b.callTime.startDate || 0).getTime();
            if (dateA !== dateB) return dateA - dateB;

            const nameA = a.staff ? `${a.staff.firstName} ${a.staff.lastName}` : 'zzz';
            const nameB = b.staff ? `${b.staff.firstName} ${b.staff.lastName}` : 'zzz';
            return nameA.localeCompare(nameB);
        });
    }

    /**
     * Upsert a time entry for a given invitation.
     */
    async upsertTimeEntry(data: {
        invitationId?: string | null;
        staffId?: string | null;
        callTimeId: string;
        clockIn?: Date | null;
        clockOut?: Date | null;
        breakMinutes?: number;
        overtimeCost?: number | null;
        overtimePrice?: number | null;
        shiftCost?: number | null;
        shiftPrice?: number | null;
        travelCost?: number | null;
        travelPrice?: number | null;
        notes?: string;
        commission?: boolean;
        createdBy: string;
    }) {
        const breakMinutes = data.breakMinutes ?? 0;

        return await (this.prisma as any).$transaction(async (tx: any) => {
            if (data.commission !== undefined) {
                await tx.callTime.update({
                    where: { id: data.callTimeId },
                    data: { commission: data.commission },
                });
            }

            // Exit early if this is an unassigned position (no staff to update)
            if (!data.invitationId || !data.staffId) {
                return null;
            }

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
                    (existing.shiftCost?.toString?.() ?? existing.shiftCost) !== (data.shiftCost?.toString?.() ?? data.shiftCost) ||
                    (existing.shiftPrice?.toString?.() ?? existing.shiftPrice) !== (data.shiftPrice?.toString?.() ?? data.shiftPrice) ||
                    (existing.travelCost?.toString?.() ?? existing.travelCost) !== (data.travelCost?.toString?.() ?? data.travelCost) ||
                    (existing.travelPrice?.toString?.() ?? existing.travelPrice) !== (data.travelPrice?.toString?.() ?? data.travelPrice) ||
                    (existing.notes ?? '') !== (data.notes ?? '');

                const updated = await tx.timeEntry.update({
                    where: { id: existing.id },
                    data: {
                        clockIn: data.clockIn,
                        clockOut: data.clockOut,
                        breakMinutes,
                        overtimeCost: data.overtimeCost,
                        overtimePrice: data.overtimePrice,
                        shiftCost: data.shiftCost,
                        shiftPrice: data.shiftPrice,
                        travelCost: data.travelCost,
                        travelPrice: data.travelPrice,
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
                            shiftCost: updated.shiftCost,
                            shiftPrice: updated.shiftPrice,
                            travelCost: updated.travelCost,
                            travelPrice: updated.travelPrice,
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
                    shiftCost: data.shiftCost,
                    shiftPrice: data.shiftPrice,
                    travelCost: data.travelCost,
                    travelPrice: data.travelPrice,
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
                callTime: {
                    event: { status: { in: ['IN_PROGRESS', 'COMPLETED'] } },
                },
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

                const baseQuantity = isPerHour ? hours : 1;
                const otHours = Math.max(0, actualHours - hours);

                const itemsList = [];

                // Add Base Item
                itemsList.push({
                    description: `${inv.callTime.service?.title || 'Staff'} - ${inv.staff.firstName} ${inv.staff.lastName}`,
                    quantity: baseQuantity,
                    price: rate,
                    amount: baseQuantity * rate,
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
                });

                // Add Overtime Item if applicable
                if (otHours > 0) {
                    itemsList.push({
                        description: `Overtime - ${inv.callTime.service?.title || 'Staff'} - ${inv.staff.firstName} ${inv.staff.lastName}`,
                        quantity: otHours,
                        price: rate,
                        amount: otHours * rate,
                        serviceId: inv.callTime.serviceId,
                        date: inv.callTime.startDate,
                        scheduledStart,
                        scheduledEnd,
                        scheduledHours: hours,
                        actualStart: inv.timeEntry?.clockIn,
                        actualEnd: inv.timeEntry?.clockOut,
                        actualHours,
                        scheduleShiftDetail,
                        actualShiftDetails: `Overtime: ${otHours.toFixed(2)} hours`,
                        internalNotes: `Overtime worked beyond scheduled ${hours} hours`
                    });
                }

                return itemsList;
            }).flat();

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
        decision: 'APPROVE' | 'REJECT' | 'REVIEW' | 'PENDING';
        reviewerId: string;
    }) {
        const internalReviewRating =
            data.decision === 'APPROVE' ? 'MET_EXPECTATIONS' :
                data.decision === 'REJECT' ? 'DID_NOT_MEET' : 
                data.decision === 'REVIEW' ? 'NEEDS_IMPROVEMENT' : null;

        return await (this.prisma as any).callTimeInvitation.updateMany({
            where: { id: { in: data.invitationIds } },
            data: {
                internalReviewRating,
                reviewedBy: data.decision === 'PENDING' ? null : data.reviewerId,
                reviewedAt: data.decision === 'PENDING' ? null : new Date(),
            },
        });
    }
}
