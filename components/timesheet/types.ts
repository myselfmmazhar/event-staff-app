/* ──────────────────────────── Timesheet Types ──────────────────────────── */

export type CallTimeRow = {
    id: string;
    callTimeId: string;
    startDate: Date | string | null;
    startTime: string | null;
    endDate: Date | string | null;
    endTime: string | null;
    numberOfStaffRequired: number;
    skillLevel: string;
    payRate: number | { toNumber?: () => number } | string;
    payRateType: string;
    billRate: number | { toNumber?: () => number } | string;
    billRateType: string;
    approveOvertime?: boolean;
    overtimeRate?: number | { toNumber?: () => number } | string | null;
    overtimeRateType?: string | null;
    commission?: boolean;
    commissionAmount?: number | { toNumber?: () => number } | string | null;
    commissionAmountType?: string | null;
    minimum?: number | { toNumber?: () => number } | string | null;
    applyMinimum?: boolean;
    expenditure?: boolean;
    expenditureAmount?: number | { toNumber?: () => number } | string | null;
    expenditureAmountType?: string | null;
    expenditureCost?: number | { toNumber?: () => number } | string | null;
    expenditurePrice?: number | { toNumber?: () => number } | string | null;
    travelInMinimum?: boolean;
    notes: string | null;
    confirmedCount: number;
    needsStaff: boolean;
    service: { id: string; title: string } | null;
    event: {
        id: string;
        eventId: string;
        title: string;
        venueName: string | null;
        address: string | null;
        city: string | null;
        state: string | null;
        zipCode: string | null;
        poNumber: string | null;
        startDate: Date | string | null;
        startTime: string | null;
        endDate: Date | string | null;
        endTime: string | null;
        status: string;
        client: { id: string; businessName: string } | null;
    };
    invitations: Array<{
        id: string;
        status: string;
        isConfirmed: boolean;
        internalReviewRating?: string | null;
        staff: { id: string; firstName: string; lastName: string; payrollId?: string; hrSystemId?: string };
    }>;
    // New fields for Time Manager
    staff?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        accountStatus: string;
        staffRating: string;
        skillLevel: string;
        streetAddress: string;
        city: string;
        state: string;
        zipCode: string;
        payrollId: string | null;
        hrSystemId: string | null;
    };
    invitedAsTeam?: boolean;
    teamUnit?: {
        id: string;
        unitId: string;
        unitName: string;
        primaryContact: string | null;
        capacityNotes: string | null;
        staff?: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
            phone: string;
            accountStatus: string;
            staffRating: string;
            skillLevel: string;
            streetAddress: string;
            city: string;
            state: string;
            zipCode: string;
        } | null;
    } | null;
    timeEntry?: {
        id: string;
        clockIn: Date | string | null;
        clockOut: Date | string | null;
        breakMinutes: number;
        overtimeCost?: number | string | null;
        overtimePrice?: number | string | null;
        shiftCost?: number | string | null;
        shiftPrice?: number | string | null;
        travelCost?: number | string | null;
        travelPrice?: number | string | null;
        notes?: string | null;
        revisions?: Array<{
            id: string;
            clockIn: Date | string | null;
            clockOut: Date | string | null;
            breakMinutes: number;
            overtimeCost: number | string | null;
            overtimePrice: number | string | null;
            shiftCost?: number | string | null;
            shiftPrice?: number | string | null;
            travelCost?: number | string | null;
            travelPrice?: number | string | null;
            notes: string | null;
            editedBy: string;
            editedAt: Date | string;
        }>;
    } | null;
    mergedRows?: CallTimeRow[];
};

export interface EventGroup {
    eventId: string;
    eventTitle: string;
    eventDisplayId: string;
    clientName?: string | null;
    venueName?: string | null;
    city?: string | null;
    state?: string | null;
    staffId?: string;
    callTimes: CallTimeRow[];
}

export interface ClientGroup {
    clientId: string;
    clientName: string;
    callTimes: CallTimeRow[];
}

export interface TalentGroup {
    staffId: string;
    staffName: string;
    callTimes: CallTimeRow[];
}

export type TimesheetTab = 'task' | 'client' | 'talent';

export type SortField = 'startDate' | 'event' | 'client' | 'location' | 'assignments' | 'invoice' | 'bill' | 'netIncome' | 'status' | 'staffName' | 'service' | 'scheduledShift' | 'actualShift' | 'variance' | 'rateType' | 'cost' | 'price' | 'commission' | 'minimum' | 'notes';
export type SortOrder = 'asc' | 'desc';
export type StaffingFilter = 'all' | 'needsStaff' | 'fullyStaffed';
