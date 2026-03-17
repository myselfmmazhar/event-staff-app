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
    notes: string | null;
    confirmedCount: number;
    needsStaff: boolean;
    service: { id: string; title: string } | null;
    event: {
        id: string;
        eventId: string;
        title: string;
        venueName: string | null;
        city: string | null;
        state: string | null;
        poNumber: string | null;
        startDate: Date | string | null;
        startTime: string | null;
        endDate: Date | string | null;
        endTime: string | null;
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
    timeEntry?: {
        id: string;
        clockIn: Date | string | null;
        clockOut: Date | string | null;
        breakMinutes: number;
        overtimeCost?: number | string | null;
        overtimePrice?: number | string | null;
        notes?: string | null;
        revisions?: Array<{
            id: string;
            clockIn: Date | string | null;
            clockOut: Date | string | null;
            breakMinutes: number;
            overtimeCost: number | string | null;
            overtimePrice: number | string | null;
            notes: string | null;
            editedBy: string;
            editedAt: Date | string;
        }>;
    } | null;
};

export interface EventGroup {
    eventId: string;
    eventTitle: string;
    eventDisplayId: string;
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

export type SortField = 'startDate' | 'position' | 'event' | 'staffName';
export type SortOrder = 'asc' | 'desc';
export type StaffingFilter = 'all' | 'needsStaff' | 'fullyStaffed';
