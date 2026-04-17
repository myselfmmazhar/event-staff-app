export type TimesheetDrilldownSubTab = 'all' | 'invoice' | 'bill' | 'commission';

/**
 * Default pixel widths for `useTableResize('timesheet-drilldown', DRILLDOWN_TABLE_RESIZE_DEFAULTS)`.
 * Keys must match `--col-*` / `onMouseDown` keys in `TimesheetDrilldownTheadRow` and body cells in `TimesheetTableRow`.
 */
export const DRILLDOWN_TABLE_RESIZE_DEFAULTS: Record<string, number> = {
    // All tab (aligns with summary / event-group keys)
    action: 56,
    talent: 160,
    service: 128,
    date: 120,
    scheduled: 200,
    actual: 200,
    variance: 88,
    rateType: 104,
    invoice: 120,
    bill: 120,
    netIncome: 112,
    commission: 104,
    minimum: 96,
    status: 104,
    notes: 260,
    // Invoice sub-tab
    startDate: 120,
    description: 420,
    qty: 64,
    // Bill sub-tab
    category: 100,
    // Commission sub-tab (prefixed so widths do not clash with All)
    cmAction: 56,
    cmStaff: 200,
    cmDesc: 360,
    cmPrice: 132,
    cmStatus: 108,
};

export const TIMESHEET_SUMMARY_TABLE_RESIZE_DEFAULTS: Record<string, number> = {
    date: 190,
    task: 180,
    client: 150,
    location: 170,
    assignments: 130,
    status: 120,
    totalInvoice: 140,
    totalBill: 140,
    netIncome: 140,
};

export const TIMESHEET_CLIENT_TABLE_RESIZE_DEFAULTS: Record<string, number> = {
    startDate: 180,
    client: 180,
    assignments: 120,
    status: 120,
    invoice: 140,
    bill: 140,
    netIncome: 140,
};

export const TIMESHEET_TALENT_TABLE_RESIZE_DEFAULTS: Record<string, number> = {
    startDate: 190,
    staffName: 180,
    assignments: 100,
    status: 120,
};

/** Fixed column order for Time Manager drilldown tables (must match `TimesheetDrilldownTheadRow` and `TimesheetTableRow`). */
export const DRILLDOWN_COLUMN_IDS: Record<TimesheetDrilldownSubTab, readonly string[]> = {
    all: [
        'action',
        'talent',
        'service',
        'startDate',
        'scheduledShift',
        'actualShift',
        'variance',
        'rateType',
        'invoice',
        'bill',
        'netIncome',
        'commission',
        'minimum',
        'status',
        'notes',
    ],
    invoice: ['startDate', 'service', 'description', 'qty', 'invoice', 'netIncome'],
    bill: ['category', 'description', 'bill', 'netIncome', 'status'],
    commission: ['action', 'staffName', 'description', 'price', 'status'],
};
