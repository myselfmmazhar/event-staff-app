import { Fragment, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ClockIcon } from '@/components/ui/icons';
import {
    ChevronDownIcon,
    ChevronUpIcon,
    EditIcon,
    CheckIcon,
    CloseIcon,
    CheckCircleIcon,
} from '@/components/ui/icons';
import {
    fmtDateTime,
    formatDate,
    formatTime,
    calcScheduledHours,
    calcClockedHours,
    toNumber,
    calcScheduledCost,
    calcClockedCost,
    calcOvertimeCost,
    calcOvertimePrice,
    calcClockedPrice,
    calcBillAmount,
    calcTotalBill,
    calcTotalInvoice,
    calcGrossProfit,
    fmtCurrency,
    toInputDatetime,
    calcExpenditureCost,
    calcExpenditurePrice,
    getTimeOnly,
    combineDateTime,
} from './helpers';
import { ExpandedRowDetail } from './expanded-row-detail';
import type { CallTimeRow } from './types';
import { TalentContactPopover } from './talent-contact-popover';
import { ActionDropdown, type ActionItem } from '@/components/common/action-dropdown';
import { DRILLDOWN_COLUMN_IDS, type TimesheetDrilldownSubTab } from '@/lib/timesheet/drilldown-column-order';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function formatShiftInstant(d: Date | null): string {
    if (!d) return '—';
    return format(d, "MMM d, yyyy '•' h:mm a");
}

/** Invoice description: "03/02/2026 4:00 PM - 03/03/2026 12:44 AM" */
function formatInvoiceDateTimeRange(start: Date | null, end: Date | null) {
    if (!start) return '—';
    const left = format(start, 'MM/dd/yyyy h:mm a');
    if (!end) return `${left} - —`;
    return (
        <span className="whitespace-nowrap">
            {left} - {format(end, 'MM/dd/yyyy h:mm a')}
        </span>
    );
}

function invoiceScheduledRange(row: CallTimeRow) {
    const schedStart = combineDateTime(row.startDate, row.startTime);
    const schedEnd = combineDateTime(row.endDate ?? row.startDate, row.endTime);
    return formatInvoiceDateTimeRange(schedStart, schedEnd);
}

function invoiceActualRange(tev: CallTimeRow['timeEntry']) {
    if (!tev?.clockIn) return 'No clock';
    return formatInvoiceDateTimeRange(new Date(tev.clockIn), tev.clockOut ? new Date(tev.clockOut) : null);
}

function invoiceStaffHeadline(row: CallTimeRow, event: CallTimeRow['event'] | undefined): string {
    const loc = [event?.venueName, event?.address, event?.city, event?.state, event?.zipCode].filter(Boolean).join(', ');
    if (row.staff) {
        const name = `${row.staff.firstName} ${row.staff.lastName}`.trim();
        return loc ? `${name} (${loc})` : name;
    }
    return loc ? `Open shift (${loc})` : 'Open shift';
}

function ServiceBadge({ service }: { service: { title: string } | null | undefined }) {
    return (
        <Badge variant="primary" className="text-[10px] whitespace-nowrap bg-blue-100 text-blue-700 hover:bg-blue-200 border-none leading-tight py-1 font-bold">
            {service?.title || '—'}
        </Badge>
    );
}

export function TimesheetTableRow({
    ct,
    isExpanded,
    isSelected,
    onToggleExpand,
    onToggleSelect,
    onViewEvent,
    onSaveTimeEntry,
    showEventName = false,
    onApprove,
    onReject,
    onReview,
    onPending,
    onEditTask,
    subTab = 'all',
    rowVariant = 'default',
    includeSchedule = true,
    includeActual = true,
    includeName = true,
    includeNotes = true,
    onShiftModeChange,
}: {
    ct: CallTimeRow;
    isExpanded: boolean;
    isSelected: boolean;
    onToggleExpand: (id: string, e: React.MouseEvent) => void;
    onToggleSelect: (id: string, e: React.MouseEvent) => void;
    onViewEvent: (id: string) => void;
    onSaveTimeEntry?: (invitationId: string, clockIn: string | null, clockOut: string | null, breakMins: number, otCost?: number | null, otPrice?: number | null, notes?: string | null, shiftCost?: number | null, shiftPrice?: number | null, travelCost?: number | null, travelPrice?: number | null, commission?: boolean, applyMinimum?: boolean) => void;
    showEventName?: boolean;
    onApprove?: (id: string) => void;
    onReject?: (id: string) => void;
    onReview?: (id: string) => void;
    onPending?: (id: string) => void;
    onEditTask?: (ct: CallTimeRow) => void;
    subTab?: 'all' | 'bill' | 'invoice' | 'commission';
    /** Card-style row (separate borders, rounded) for event detail table */
    rowVariant?: 'default' | 'card';
    includeSchedule?: boolean;
    includeActual?: boolean;
    includeName?: boolean;
    includeNotes?: boolean;
    onShiftModeChange?: (invitationId: string, next: { includeSchedule: boolean; includeActual: boolean; includeName: boolean; includeNotes: boolean }) => void;
}) {
    const { toast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [isEditingNotes, setIsEditingNotes] = useState(false);


    const te = ct.timeEntry;
    const [clockIn, setClockIn] = useState(toInputDatetime(te?.clockIn ?? null));
    const [clockOut, setClockOut] = useState(toInputDatetime(te?.clockOut ?? null));
    const [breakMins, setBreakMins] = useState(te?.breakMinutes ?? 0);
    const [otCostManual, setOtCostManual] = useState<string>(te?.overtimeCost !== undefined && te?.overtimeCost !== null ? toNumber(te.overtimeCost).toString() : '');
    const [otPriceManual, setOtPriceManual] = useState<string>(te?.overtimePrice !== undefined && te?.overtimePrice !== null ? toNumber(te.overtimePrice).toString() : '');
    const [shiftCostManual, setShiftCostManual] = useState<string>(te?.shiftCost !== undefined && te?.shiftCost !== null ? toNumber(te.shiftCost).toString() : '');
    const [shiftPriceManual, setShiftPriceManual] = useState<string>(te?.shiftPrice !== undefined && te?.shiftPrice !== null ? toNumber(te.shiftPrice).toString() : '');
    const [travelCostManual, setTravelCostManual] = useState<string>(te?.travelCost !== undefined && te?.travelCost !== null ? toNumber(te.travelCost).toString() : '');
    const [travelPriceManual, setTravelPriceManual] = useState<string>(te?.travelPrice !== undefined && te?.travelPrice !== null ? toNumber(te.travelPrice).toString() : '');
    const [localNotes, setLocalNotes] = useState(te?.notes || ct.notes || '');
    const [isEditingOtCost, setIsEditingOtCost] = useState(false);
    const [isEditingOtPrice, setIsEditingOtPrice] = useState(false);
    const [isCommApp, setIsCommApp] = useState(!!ct.commission);
    const [isMinApp, setIsMinApp] = useState(!!ct.applyMinimum);
    const [billBasis, setBillBasis] = useState<'ACTUAL' | 'SCHEDULED'>('ACTUAL');
    const [invoiceBasis, setInvoiceBasis] = useState<'ACTUAL' | 'SCHEDULED'>('ACTUAL');

    useEffect(() => {
        setIsCommApp(!!ct.commission);
    }, [ct.commission]);

    useEffect(() => {
        setIsMinApp(!!ct.applyMinimum);
    }, [ct.applyMinimum]);

    const hoursScheduled = calcScheduledHours(ct);
    const hoursClocked = calcClockedHours(te);
    const hasActualShift = !!(te?.clockIn && te?.clockOut);
    const effectiveBillBasis: 'ACTUAL' | 'SCHEDULED' = hasActualShift ? billBasis : 'SCHEDULED';
    const effectiveInvoiceBasis: 'ACTUAL' | 'SCHEDULED' = hasActualShift ? invoiceBasis : 'SCHEDULED';
    const scheduledCost = calcScheduledCost(ct);
    const clockedCostVal = effectiveBillBasis === 'ACTUAL' ? calcClockedCost(te, ct) : scheduledCost;
    const otCost = calcOvertimeCost(te, ct);
    const otPrice = calcOvertimePrice(te, ct);
    const scheduledPrice = calcBillAmount(ct);
    const clockedPriceVal = effectiveInvoiceBasis === 'ACTUAL' ? calcClockedPrice(te, ct) : scheduledPrice;
    const expCost = calcExpenditureCost(ct, effectiveBillBasis);
    const expPrice = calcExpenditurePrice(ct, effectiveInvoiceBasis);
    const billAmount = calcBillAmount(ct);
    const totalBill = calcTotalBill(te, ct, isCommApp, effectiveBillBasis, isMinApp);
    const totalInvoice = calcTotalInvoice(te, ct, isCommApp, effectiveInvoiceBasis, isMinApp);
    const grossProfit = totalInvoice - totalBill;

    const commissionCost = isCommApp ? totalBill - calcTotalBill(te, ct, false, effectiveBillBasis, isMinApp) : 0;
    const commissionPrice = isCommApp ? totalInvoice - calcTotalInvoice(te, ct, false, effectiveInvoiceBasis, isMinApp) : 0;



    const reviewRating = useMemo(() => ct.invitations?.[0]?.internalReviewRating ?? null, [ct.invitations]);
    const isRejected = reviewRating === 'DID_NOT_MEET' || reviewRating === 'NO_CALL_NO_SHOW';

    const revisionCount = te?.revisions?.length ?? 0;
    const isEdited = revisionCount > 0;


    const handleSave = () => {
        if (onSaveTimeEntry) {
            const parsedOtCost = otCostManual !== '' ? parseFloat(otCostManual) : null;
            const parsedOtPrice = otPriceManual !== '' ? parseFloat(otPriceManual) : null;
            const parsedShiftCost = shiftCostManual !== '' ? parseFloat(shiftCostManual) : null;
            const parsedShiftPrice = shiftPriceManual !== '' ? parseFloat(shiftPriceManual) : null;
            const parsedTravelCost = travelCostManual !== '' ? parseFloat(travelCostManual) : null;
            const parsedTravelPrice = travelPriceManual !== '' ? parseFloat(travelPriceManual) : null;
            
            const finalClockIn = clockIn ? new Date(clockIn).toISOString() : null;
            const finalClockOut = clockOut ? new Date(clockOut).toISOString() : null;

            onSaveTimeEntry(
                ct.id,
                finalClockIn,
                finalClockOut,
                breakMins,
                parsedOtCost !== null && !isNaN(parsedOtCost) ? parsedOtCost : (otCostManual === '' ? null : undefined),
                parsedOtPrice !== null && !isNaN(parsedOtPrice) ? parsedOtPrice : (otPriceManual === '' ? null : undefined),
                localNotes,
                parsedShiftCost !== null && !isNaN(parsedShiftCost) ? parsedShiftCost : (shiftCostManual === '' ? null : undefined),
                parsedShiftPrice !== null && !isNaN(parsedShiftPrice) ? parsedShiftPrice : (shiftPriceManual === '' ? null : undefined),
                parsedTravelCost !== null && !isNaN(parsedTravelCost) ? parsedTravelCost : (travelCostManual === '' ? null : undefined),
                parsedTravelPrice !== null && !isNaN(parsedTravelPrice) ? parsedTravelPrice : (travelPriceManual === '' ? null : undefined),
                isCommApp,
                isMinApp
            );
            toast({
                title: 'Changes saved',
                description: 'The time entry has been updated.',
            });
        }
        setIsEditing(false);
        setIsEditingNotes(false);
        setIsEditingOtCost(false);
        setIsEditingOtPrice(false);
    };
    const handleToggleCommission = (val: boolean) => {
        setIsCommApp(val);
        if (onSaveTimeEntry) {
            const parsedOtCost = otCostManual !== '' ? parseFloat(otCostManual) : null;
            const parsedOtPrice = otPriceManual !== '' ? parseFloat(otPriceManual) : null;
            const parsedShiftCost = shiftCostManual !== '' ? parseFloat(shiftCostManual) : null;
            const parsedShiftPrice = shiftPriceManual !== '' ? parseFloat(shiftPriceManual) : null;
            const parsedTravelCost = travelCostManual !== '' ? parseFloat(travelCostManual) : null;
            const parsedTravelPrice = travelPriceManual !== '' ? parseFloat(travelPriceManual) : null;

            const finalClockIn = clockIn ? new Date(clockIn).toISOString() : null;
            const finalClockOut = clockOut ? new Date(clockOut).toISOString() : null;

            onSaveTimeEntry(
                ct.id,
                finalClockIn,
                finalClockOut,
                breakMins,
                parsedOtCost !== null && !isNaN(parsedOtCost) ? parsedOtCost : (otCostManual === '' ? null : undefined),
                parsedOtPrice !== null && !isNaN(parsedOtPrice) ? parsedOtPrice : (otPriceManual === '' ? null : undefined),
                localNotes,
                parsedShiftCost !== null && !isNaN(parsedShiftCost) ? parsedShiftCost : (shiftCostManual === '' ? null : undefined),
                parsedShiftPrice !== null && !isNaN(parsedShiftPrice) ? parsedShiftPrice : (shiftPriceManual === '' ? null : undefined),
                parsedTravelCost !== null && !isNaN(parsedTravelCost) ? parsedTravelCost : (travelCostManual === '' ? null : undefined),
                parsedTravelPrice !== null && !isNaN(parsedTravelPrice) ? parsedTravelPrice : (travelPriceManual === '' ? null : undefined),
                val,
                isMinApp
            );
        }
    };

    const handleToggleMinimum = (val: boolean) => {
        if (val) {
            const minVal = toNumber(ct.minimum);
            if (minVal <= 0) {
                toast({
                    title: 'Minimum price required',
                    description: 'You did not assign a minimum price for this task. Please set a minimum price first.',
                    variant: 'destructive',
                });
                return;
            }
        }
        setIsMinApp(val);
        if (onSaveTimeEntry) {
            const parsedOtCost = otCostManual !== '' ? parseFloat(otCostManual) : null;
            const parsedOtPrice = otPriceManual !== '' ? parseFloat(otPriceManual) : null;
            const parsedShiftCost = shiftCostManual !== '' ? parseFloat(shiftCostManual) : null;
            const parsedShiftPrice = shiftPriceManual !== '' ? parseFloat(shiftPriceManual) : null;
            const parsedTravelCost = travelCostManual !== '' ? parseFloat(travelCostManual) : null;
            const parsedTravelPrice = travelPriceManual !== '' ? parseFloat(travelPriceManual) : null;

            const finalClockIn = clockIn ? new Date(clockIn).toISOString() : null;
            const finalClockOut = clockOut ? new Date(clockOut).toISOString() : null;

            onSaveTimeEntry(
                ct.id,
                finalClockIn,
                finalClockOut,
                breakMins,
                parsedOtCost !== null && !isNaN(parsedOtCost) ? parsedOtCost : (otCostManual === '' ? null : undefined),
                parsedOtPrice !== null && !isNaN(parsedOtPrice) ? parsedOtPrice : (otPriceManual === '' ? null : undefined),
                localNotes,
                parsedShiftCost !== null && !isNaN(parsedShiftCost) ? parsedShiftCost : (shiftCostManual === '' ? null : undefined),
                parsedShiftPrice !== null && !isNaN(parsedShiftPrice) ? parsedShiftPrice : (shiftPriceManual === '' ? null : undefined),
                parsedTravelCost !== null && !isNaN(parsedTravelCost) ? parsedTravelCost : (travelCostManual === '' ? null : undefined),
                parsedTravelPrice !== null && !isNaN(parsedTravelPrice) ? parsedTravelPrice : (travelPriceManual === '' ? null : undefined),
                isCommApp,
                val
            );
        }
    };

    const actions: ActionItem[] = [
        {
            label: 'Edit',
            icon: <EditIcon className="h-3.5 w-3.5" />,
            onClick: () => onEditTask ? onEditTask(ct) : window.open(`/events/${ct.event.id}/call-times`, '_blank'),
        },
        {
            label: 'Approved',
            icon: <CheckIcon className="h-3.5 w-3.5 text-emerald-500" />,
            onClick: () => onApprove?.(ct.id),
            disabled: isRejected,
            variant: 'info',
        },
        {
            label: 'Review',
            icon: <CheckCircleIcon className="h-3.5 w-3.5 text-blue-500" />,
            onClick: () => onReview?.(ct.id),
        },
        {
            label: 'Rejected',
            icon: <CloseIcon className="h-3.5 w-3.5 text-red-500" />,
            onClick: () => onReject?.(ct.id),
            disabled: isRejected,
            variant: 'destructive',
        },
        {
            label: 'Pending',
            icon: <ClockIcon className="h-3.5 w-3.5 text-slate-500" />,
            onClick: () => onPending?.(ct.id),
        }
    ];

    const tabKey = (subTab ?? 'all') as TimesheetDrilldownSubTab;
    const colOrder = [...DRILLDOWN_COLUMN_IDS[tabKey]];

    return (
        <>
            <tr
                className={
                    rowVariant === 'card'
                        ? `cursor-default transition-colors bg-card border border-border shadow-sm hover:bg-muted/15 [&>td]:border-0 ${isExpanded ? 'rounded-t-lg rounded-b-none' : 'rounded-lg'} ${isSelected ? 'ring-1 ring-primary/20' : ''}`
                        : `border-b border-border last:border-b-0 hover:bg-muted/20 cursor-default transition-colors ${isExpanded ? 'bg-muted/10' : ''} ${isSelected ? 'bg-primary/5' : ''}`
                }
            >
                {/* Checkbox */}
                <td className={`w-8 px-2 text-center ${rowVariant === 'card' ? 'py-3.5 rounded-l-lg' : 'py-2.5'}`}>
                    <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isRejected}
                        onClick={(e) => onToggleSelect(ct.id, e)}
                        onChange={() => { }}
                        className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
                    />
                </td>
                {/* Expand toggle */}
                <td className={`w-8 px-2 text-center ${rowVariant === 'card' ? 'py-3.5' : 'py-2.5'}`}>
                    <button
                        onClick={(e) => onToggleExpand(ct.id, e)}
                        className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-muted transition-colors"
                    >
                        {isExpanded ? (
                            <ChevronUpIcon className="h-3 w-3 text-muted-foreground" />
                        ) : (
                            <ChevronDownIcon className="h-3 w-3 text-muted-foreground" />
                        )}
                    </button>
                </td>

                {subTab === 'invoice' ? (
                    <>
                        {colOrder.map((colId) => (
                            <Fragment key={colId}>
                                {colId === 'startDate' && (
                        <td className="px-3 py-2.5 whitespace-nowrap text-[11px] font-medium text-slate-600">
                            {formatDate(ct.startDate)}
                        </td>
                                )}
                                {colId === 'service' && (
                        <td className="px-3 py-2.5">
                            <ServiceBadge service={ct.service} />
                        </td>
                                )}
                                {colId === 'description' && (
                        <td className="px-3 py-4 text-[11px] leading-relaxed text-slate-600 min-w-[500px]">
                            <div className="flex flex-col gap-3">
                                {(() => {
                                    const invoiceRows =
                                        ct.mergedRows && ct.mergedRows.length > 0 ? ct.mergedRows : [ct];
                                    const isSoloInvoiceRow = invoiceRows.length === 1;

                                    return invoiceRows.map((row, idx) => {
                                        const rowTe = row.timeEntry;
                                        const rowSchedHrs = calcScheduledHours(row);
                                        const rowClockHrs = calcClockedHours(rowTe);

                                        const actualLine = (
                                            <div className="flex flex-col gap-0.5 leading-tight">
                                                <div className="text-slate-800 font-semibold">
                                                    {invoiceActualRange(rowTe)}
                                                </div>
                                                <div className="text-muted-foreground font-medium text-[10px]">
                                                    ({rowClockHrs.toFixed(2)} hrs)
                                                </div>
                                                {isSoloInvoiceRow && isEdited && (
                                                    <Badge variant="secondary" className="mt-1 text-[9px] h-4 px-1 py-0 leading-none font-medium w-fit">
                                                        Edited
                                                    </Badge>
                                                )}
                                            </div>
                                        );

                                        return (
                                            <div
                                                key={row.id ?? idx}
                                                className={`flex flex-col gap-2.5 ${idx > 0 ? 'pt-4 border-t border-border/60' : ''}`}
                                            >
                                                <div className="flex items-center gap-2 font-semibold text-slate-900 text-[11px] leading-snug">
                                                    {idx === 0 && (
                                                        <label className="inline-flex shrink-0 cursor-pointer items-center gap-0">
                                                            <input
                                                                type="checkbox"
                                                                checked={includeName}
                                                                onClick={(e) => e.stopPropagation()}
                                                                onChange={(e) =>
                                                                    onShiftModeChange?.(ct.id, {
                                                                        includeSchedule,
                                                                        includeActual,
                                                                        includeName: e.target.checked,
                                                                        includeNotes,
                                                                    })
                                                                }
                                                                className="h-3.5 w-3.5 rounded border-border accent-primary"
                                                                title="Include name in description"
                                                                aria-label="Include name"
                                                            />
                                                        </label>
                                                    )}
                                                    {invoiceStaffHeadline(row, row.event ?? ct.event)}
                                                </div>
                                                <div className="text-slate-800">{row.service?.title || ct.service?.title || '—'}</div>
                                                <div
                                                    className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {idx === 0 && (
                                                        <label className="inline-flex shrink-0 cursor-pointer items-center gap-0">
                                                            <input
                                                                type="checkbox"
                                                                checked={includeSchedule}
                                                                onClick={(e) => e.stopPropagation()}
                                                                onChange={(e) =>
                                                                    onShiftModeChange?.(ct.id, {
                                                                        includeSchedule: e.target.checked,
                                                                        includeActual,
                                                                        includeName,
                                                                        includeNotes,
                                                                    })
                                                                }
                                                                className="h-3.5 w-3.5 rounded border-border accent-primary"
                                                                title="Include scheduled shift in totals"
                                                                aria-label="Include scheduled shift"
                                                            />
                                                        </label>
                                                    )}
                                                    <span className="font-medium text-slate-600">Schedule:</span>
                                                    <span className="text-slate-800">
                                                        {invoiceScheduledRange(row)}
                                                        <span className="text-muted-foreground font-normal">
                                                            {' '}
                                                            ({rowSchedHrs.toFixed(2)} hrs)
                                                        </span>
                                                    </span>
                                                </div>
                                                <div className="flex min-w-0 flex-wrap items-start gap-x-2 gap-y-0.5">
                                                    {idx === 0 && (
                                                        <label className="inline-flex shrink-0 cursor-pointer items-start pt-0.5">
                                                            <input
                                                                type="checkbox"
                                                                checked={includeActual}
                                                                onClick={(e) => e.stopPropagation()}
                                                                onChange={(e) =>
                                                                    onShiftModeChange?.(ct.id, {
                                                                        includeSchedule,
                                                                        includeActual: e.target.checked,
                                                                        includeName,
                                                                        includeNotes,
                                                                    })
                                                                }
                                                                className="h-3.5 w-3.5 rounded border-border accent-primary"
                                                                title="Include actual shift in totals"
                                                                aria-label="Include actual shift"
                                                            />
                                                        </label>
                                                    )}
                                                    <span className="font-medium text-slate-600 shrink-0 pt-0.5">Actual:</span>
                                                    {isSoloInvoiceRow ? (
                                                                <div onClick={(e) => e.stopPropagation()} className="min-w-0">
                                                                    <Popover open={isEditing} onOpenChange={setIsEditing}>
                                                                        <PopoverTrigger asChild>
                                                                            <button
                                                                                type="button"
                                                                                disabled={!ct.staff}
                                                                                className={`text-left rounded px-0.5 -mx-0.5 ${ct.staff ? 'cursor-pointer hover:bg-slate-50' : 'opacity-60 cursor-not-allowed'}`}
                                                                                onClick={(e) => !ct.staff && e.stopPropagation()}
                                                                            >
                                                                                {actualLine}
                                                                            </button>
                                                                        </PopoverTrigger>
                                                                        {ct.staff && (
                                                                            <PopoverContent className="w-64 p-3" onClick={(e) => e.stopPropagation()}>
                                                                                <div className="space-y-3">
                                                                                    <Label className="text-xs font-bold uppercase tracking-tight text-foreground">Edit actual shift</Label>
                                                                                    <div className="space-y-2">
                                                                                        <div className="space-y-1">
                                                                                            <span className="text-[9px] font-bold text-slate-400 uppercase">Clock In</span>
                                                                                            <Input
                                                                                                type="datetime-local"
                                                                                                value={clockIn}
                                                                                                onChange={(e) => setClockIn(e.target.value)}
                                                                                                className="h-8 text-xs"
                                                                                            />
                                                                                        </div>
                                                                                        <div className="space-y-1">
                                                                                            <span className="text-[9px] font-bold text-slate-400 uppercase">Clock Out</span>
                                                                                            <Input
                                                                                                type="datetime-local"
                                                                                                value={clockOut}
                                                                                                onChange={(e) => setClockOut(e.target.value)}
                                                                                                className="h-8 text-xs"
                                                                                            />
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex justify-between items-center pt-2 border-t">
                                                                                        <div className="text-[10px] font-bold text-slate-500">
                                                                                            Net: {hoursClocked.toFixed(2)} hrs
                                                                                        </div>
                                                                                        <div className="flex gap-2">
                                                                                            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="h-7 text-[10px]">Cancel</Button>
                                                                                            <Button size="sm" onClick={handleSave} className="h-7 text-[10px]">Save</Button>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </PopoverContent>
                                                                        )}
                                                                    </Popover>
                                                                </div>
                                                            ) : (
                                                                actualLine
                                                            )}
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}

                                <div className="flex flex-col gap-1 pt-2 border-t border-border/60">
                                    <div className="flex items-center gap-2">
                                        <label className="inline-flex shrink-0 cursor-pointer items-center gap-0">
                                            <input
                                                type="checkbox"
                                                checked={includeNotes}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) =>
                                                    onShiftModeChange?.(ct.id, {
                                                        includeSchedule,
                                                        includeActual,
                                                        includeName,
                                                        includeNotes: e.target.checked,
                                                    })
                                                }
                                                className="h-3.5 w-3.5 rounded border-border accent-primary"
                                                title="Include notes in description"
                                                aria-label="Include notes"
                                            />
                                        </label>
                                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Notes</span>
                                    </div>
                                    {isEditingNotes ? (
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <textarea
                                                value={localNotes}
                                                onChange={(e) => setLocalNotes(e.target.value)}
                                                className="w-full text-[11px] border border-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none min-h-[50px] bg-white text-slate-700 font-medium"
                                                autoFocus
                                                onBlur={handleSave}
                                            />
                                            <div className="flex justify-end mt-1">
                                                <button
                                                    type="button"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSave();
                                                    }}
                                                    className="p-1 bg-emerald-500 text-white rounded hover:bg-emerald-600"
                                                >
                                                    <CheckIcon className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            className="group relative cursor-pointer hover:bg-slate-50 p-1.5 rounded transition-all font-medium text-slate-500 italic border border-transparent hover:border-slate-100"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsEditingNotes(true);
                                            }}
                                        >
                                            <p className="line-clamp-3 text-[11px] not-italic text-slate-700">{localNotes || 'Click to add notes...'}</p>
                                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <EditIcon className="h-3.5 w-3.5 text-slate-400" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </td>
                                )}
                                {colId === 'qty' && (
                        <td className="px-3 py-2.5 text-center font-bold text-slate-700 tabular-nums">
                            {ct.mergedRows?.length || (!ct.staff ? ct.numberOfStaffRequired : 1)}
                        </td>
                                )}
                                {colId === 'invoice' && (
                        <td className="px-3 py-2.5 text-right font-extrabold text-foreground tabular-nums text-[13px]">
                            <Popover open={isEditingOtPrice} onOpenChange={setIsEditingOtPrice}>
                                <PopoverTrigger asChild>
                                    <div className="cursor-pointer hover:bg-primary/5 transition-colors p-1 rounded" onClick={e => e.stopPropagation()}>
                                        {fmtCurrency(totalInvoice)}
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-64" onClick={e => e.stopPropagation()}>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase tracking-tight text-primary">Adjust Price/OT</Label>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-bold text-muted-foreground">$</span>
                                                <Input
                                                    type="number"
                                                    value={otPriceManual}
                                                    onChange={(e) => setOtPriceManual(e.target.value)}
                                                    className="h-8 text-sm"
                                                    placeholder="0.00"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" variant="outline" onClick={() => setIsEditingOtPrice(false)}>Cancel</Button>
                                            <Button size="sm" onClick={handleSave}>Save</Button>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </td>
                                )}
                                {colId === 'netIncome' && (
                        <td className="px-3 py-2.5 text-right font-bold text-emerald-600 tabular-nums text-[13px] pr-6">
                            {fmtCurrency(totalInvoice - totalBill)}
                        </td>
                                )}
                            </Fragment>
                        ))}
                    </>
                ) : subTab === 'bill' ? (
                    <>
                        {colOrder.map((colId) => (
                            <Fragment key={colId}>
                                {colId === 'category' && (
                        <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                            <select className="text-[10px] p-1 bg-muted/40 border-none rounded focus:ring-1 focus:ring-primary/20 font-medium text-slate-600 cursor-pointer">
                                <option>Labor</option>
                                <option>Travel</option>
                                <option>Bonus</option>
                            </select>
                        </td>
                                )}
                                {colId === 'description' && (
                        <td className="px-3 py-4 text-[11px] leading-relaxed min-w-[500px] text-slate-800">
                            <div className="flex flex-col gap-4">
                                {(() => {
                                    const billRows = ct.mergedRows && ct.mergedRows.length > 0 ? ct.mergedRows : [ct];

                                    return billRows.map((row, idx) => {
                                        const rowTe = row.timeEntry;
                                        const event = row.event ?? ct.event;
                                        const loc = [event?.venueName, event?.address, event?.city, event?.state, event?.zipCode].filter(Boolean).join(', ');
                                        const eventTitle = event?.title || '—';
                                        const staffMeta = loc;

                                        const actualLine = rowTe?.clockIn 
                                            ? invoiceActualRange(rowTe)
                                            : <span className="text-muted-foreground font-normal">Not clocked</span>;

                                        return (
                                            <div key={row.id || idx} className={`flex flex-col gap-0.5 ${idx > 0 ? 'pt-4 border-t border-border/60' : ''}`}>
                                                <div className="flex items-center gap-2 font-bold text-[12px]">
                                                    {idx === 0 && (
                                                        <label className="inline-flex shrink-0 cursor-pointer items-center gap-0">
                                                            <input
                                                                type="checkbox"
                                                                checked={includeName}
                                                                onClick={(e) => e.stopPropagation()}
                                                                onChange={(e) =>
                                                                    onShiftModeChange?.(ct.id, {
                                                                        includeSchedule,
                                                                        includeActual,
                                                                        includeName: e.target.checked,
                                                                        includeNotes,
                                                                    })
                                                                }
                                                                className="h-3.5 w-3.5 rounded border-border accent-primary"
                                                                title="Include group name in description"
                                                                aria-label="Include group name"
                                                            />
                                                        </label>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (event?.id) onViewEvent(event.id);
                                                        }}
                                                        className="text-blue-600 hover:text-blue-700 hover:underline transition-colors text-left"
                                                    >
                                                        {eventTitle}
                                                    </button>
                                                    {staffMeta && <span className="text-slate-700">| {staffMeta}</span>}
                                                </div>
                                                <div className="font-semibold text-primary/80">
                                                    {row.service?.title || '—'}
                                                </div>
                                                <div
                                                    className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {idx === 0 && (
                                                        <label className="inline-flex shrink-0 cursor-pointer items-center gap-0">
                                                            <input
                                                                type="checkbox"
                                                                checked={includeSchedule}
                                                                onClick={(e) => e.stopPropagation()}
                                                                onChange={(e) =>
                                                                    onShiftModeChange?.(ct.id, {
                                                                        includeSchedule: e.target.checked,
                                                                        includeActual,
                                                                        includeName,
                                                                        includeNotes,
                                                                    })
                                                                }
                                                                className="h-3.5 w-3.5 rounded border-border accent-primary"
                                                                title="Include scheduled shift in totals"
                                                                aria-label="Include scheduled shift"
                                                            />
                                                        </label>
                                                    )}
                                                    <span className="font-medium text-slate-500">Schedule:</span>
                                                    <span>{invoiceScheduledRange(row)}</span>
                                                </div>
                                                <div
                                                    className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {idx === 0 && (
                                                        <label className="inline-flex shrink-0 cursor-pointer items-center gap-0">
                                                            <input
                                                                type="checkbox"
                                                                checked={includeActual}
                                                                onClick={(e) => e.stopPropagation()}
                                                                onChange={(e) =>
                                                                    onShiftModeChange?.(ct.id, {
                                                                        includeSchedule,
                                                                        includeActual: e.target.checked,
                                                                        includeName,
                                                                        includeNotes,
                                                                    })
                                                                }
                                                                className="h-3.5 w-3.5 rounded border-border accent-primary"
                                                                title="Include actual shift in totals"
                                                                aria-label="Include actual shift"
                                                            />
                                                        </label>
                                                    )}
                                                    <span className="font-medium text-slate-500">Actual:</span>
                                                    <span>{actualLine}</span>
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}

                                {/* Notes Section */}
                                <div className="flex flex-col pt-2 border-t border-slate-100">
                                    <div className="flex items-center gap-2 mb-1">
                                        <label className="inline-flex shrink-0 cursor-pointer items-center gap-0">
                                            <input
                                                type="checkbox"
                                                checked={includeNotes}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) =>
                                                    onShiftModeChange?.(ct.id, {
                                                        includeSchedule,
                                                        includeActual,
                                                        includeName,
                                                        includeNotes: e.target.checked,
                                                    })
                                                }
                                                className="h-3.5 w-3.5 rounded border-border accent-primary"
                                                title="Include notes in description"
                                                aria-label="Include notes"
                                            />
                                        </label>
                                        <span className="font-bold text-[9px] text-slate-400 uppercase tracking-widest">Notes</span>
                                    </div>
                                    {isEditingNotes ? (
                                        <div onClick={e => e.stopPropagation()}>
                                            <textarea
                                                value={localNotes}
                                                onChange={e => setLocalNotes(e.target.value)}
                                                className="w-full text-[11px] border border-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none min-h-[50px] bg-white text-slate-700 font-medium"
                                                autoFocus
                                                onBlur={handleSave}
                                            />
                                            <div className="flex justify-end mt-1">
                                                <button
                                                    type="button"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSave();
                                                    }}
                                                    className="p-1 bg-emerald-500 text-white rounded hover:bg-emerald-600"
                                                >
                                                    <CheckIcon className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            className="group relative cursor-pointer hover:bg-slate-50 p-1.5 rounded transition-all font-medium text-slate-600 italic text-[11px]"
                                            onClick={(e) => { e.stopPropagation(); setIsEditingNotes(true); }}
                                        >
                                            <p className="line-clamp-3 not-italic">{localNotes || 'Click to add notes...'}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </td>
                                )}
                                {colId === 'bill' && (
                        <td className="px-3 py-2.5 text-right font-extrabold text-red-600 tabular-nums text-[13px]">
                            <Popover open={isEditingOtCost} onOpenChange={setIsEditingOtCost}>
                                <PopoverTrigger asChild>
                                    <div className="cursor-pointer hover:bg-red-50 transition-colors p-1 rounded" onClick={e => e.stopPropagation()}>
                                        {fmtCurrency(totalBill)}
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-64" onClick={e => e.stopPropagation()}>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase tracking-tight text-red-500">Adjust Cost/OT</Label>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-bold text-muted-foreground">$</span>
                                                <Input
                                                    type="number"
                                                    value={otCostManual}
                                                    onChange={(e) => setOtCostManual(e.target.value)}
                                                    className="h-8 text-sm"
                                                    placeholder="0.00"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" variant="outline" onClick={() => setIsEditingOtCost(false)}>Cancel</Button>
                                            <Button size="sm" className="bg-red-500 hover:bg-red-600" onClick={handleSave}>Save</Button>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </td>
                                )}
                                {colId === 'netIncome' && (
                        <td className="px-3 py-2.5 text-right font-bold text-emerald-600 tabular-nums text-[13px]">
                            {fmtCurrency(totalInvoice - totalBill)}
                        </td>
                                )}
                                {colId === 'status' && (
                        <td className="px-3 py-2.5 text-right pr-4">
                            <Badge
                                variant={isRejected ? 'destructive' : reviewRating ? 'info' : 'secondary'}
                                className="text-[9px] font-bold px-1.5 py-0.5 whitespace-nowrap"
                            >
                                {reviewRating === 'MET_EXPECTATIONS' ? 'APPROVED' :
                                    (reviewRating === 'DID_NOT_MEET' || reviewRating === 'NO_CALL_NO_SHOW') ? 'REJECTED' :
                                        reviewRating === 'NEEDS_IMPROVEMENT' ? 'REVIEW' : 'PENDING'}
                            </Badge>
                        </td>
                                )}
                            </Fragment>
                        ))}
                    </>
                ) : subTab === 'commission' ? (
                    <>
                        {colOrder.map((colId) => (
                            <Fragment key={colId}>
                                {colId === 'action' && (
                                    <td
                                        className="px-2 py-2.5 text-left pl-4 relative"
                                        style={{ width: `var(--col-cmAction)` }}
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <ActionDropdown actions={actions} align="start" />
                                    </td>
                                )}
                                {colId === 'staffName' && (
                                    <td className="truncate px-3 py-2.5" style={{ width: `var(--col-cmStaff)` }} onClick={e => e.stopPropagation()}>
                                        <select className="text-[10px] p-1 bg-muted/40 border-none rounded focus:ring-1 focus:ring-primary/20 font-medium text-slate-600 cursor-pointer">
                                            <option>Team A</option>
                                            <option>Team B</option>
                                            <option>Admin</option>
                                            <option>User 1</option>
                                        </select>
                                    </td>
                                )}
                                {colId === 'description' && (
                                    <td className="truncate px-3 py-4 text-[10px] leading-relaxed" style={{ width: `var(--col-cmDesc)` }}>
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-bold text-primary text-[12px] uppercase tracking-tight text-emerald-600">
                                                        {ct.staff ? `${ct.staff.firstName} ${ct.staff.lastName}` : (ct.event?.title || '—')}
                                                    </span>
                                                    {ct.mergedRows && ct.mergedRows.length > 0 ? (
                                                        <div className="flex flex-col gap-1 mt-1">
                                                            {ct.mergedRows.map((row, idx) => (
                                                                <div key={row.id || idx} className="flex items-center gap-2">
                                                                    <Badge variant="primary" className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[8px] px-1.5 py-0 font-bold uppercase">
                                                                        {row.service?.title || '—'}
                                                                    </Badge>
                                                                    <span className="text-slate-400 italic font-medium text-[9px]">
                                                                        {billBasis === 'ACTUAL' ? (
                                                                            row.timeEntry?.clockIn ? `${formatTime(getTimeOnly(row.timeEntry.clockIn))} - ${row.timeEntry.clockOut ? formatTime(getTimeOnly(row.timeEntry.clockOut)) : '??'}` : 'Not clocked'
                                                                        ) : (
                                                                            `${formatTime(row.startTime)} - ${formatTime(row.endTime)}`
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="primary" className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[9px] px-1.5 py-0 font-bold uppercase">
                                                                {ct.service?.title || '—'}
                                                            </Badge>
                                                            <span className="text-slate-400 italic font-medium">
                                                                {billBasis === 'ACTUAL' ? (
                                                                    te?.clockIn ? `${formatTime(getTimeOnly(te.clockIn))} - ${te.clockOut ? formatTime(getTimeOnly(te.clockOut)) : '??'}` : 'Actual shift not clocked'
                                                                ) : (
                                                                    `${formatTime(ct.startTime)} - ${formatTime(ct.endTime)}`
                                                                )}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex flex-col pt-1 border-t border-slate-50">
                                                <span className="font-bold text-[7px] text-slate-300 uppercase tracking-widest mb-0.5">Notes</span>
                                                {isEditingNotes ? (
                                                    <div onClick={e => e.stopPropagation()}>
                                                        <textarea
                                                            value={localNotes}
                                                            onChange={e => setLocalNotes(e.target.value)}
                                                            className="w-full text-[10px] border border-border rounded p-1 focus:ring-1 focus:ring-red-500 outline-none min-h-[40px] bg-white text-slate-700 font-medium"
                                                            autoFocus
                                                            onBlur={handleSave}
                                                        />
                                                        <div className="flex justify-end mt-1">
                                                            <button
                                                                type="button"
                                                                onMouseDown={(e) => e.preventDefault()}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleSave();
                                                                }}
                                                                className="p-1 bg-emerald-500 text-white rounded hover:bg-emerald-600"
                                                            >
                                                                <CheckIcon className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="group relative cursor-pointer hover:bg-slate-50 p-1 rounded transition-all font-medium text-slate-500 italic text-[10px]"
                                                        onClick={(e) => { e.stopPropagation(); setIsEditingNotes(true); }}
                                                    >
                                                        <p className="line-clamp-2">{localNotes || 'Click to add notes...'}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                )}
                                {colId === 'price' && (
                                    <td className="truncate px-3 py-2.5 text-right tabular-nums" style={{ width: `var(--col-cmPrice)` }}>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[13px] font-extrabold text-foreground">{fmtCurrency(commissionPrice)}</span>
                                            {ct.commissionAmountType === 'MULTIPLIER' && (
                                                <span className="text-[9px] text-muted-foreground font-medium">
                                                    {(toNumber(ct.commissionAmount) * 100).toFixed(2)}% of {fmtCurrency(totalInvoice - commissionPrice)}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                )}
                                {colId === 'status' && (
                                    <td className="truncate px-3 py-2.5 text-right pr-4" style={{ width: `var(--col-cmStatus)` }}>
                                        <Badge
                                            variant={isRejected ? 'destructive' : reviewRating ? 'info' : 'secondary'}
                                            className="text-[9px] font-bold px-1.5 py-0.5 whitespace-nowrap"
                                        >
                                            {reviewRating === 'MET_EXPECTATIONS' ? 'APPROVED' :
                                                (reviewRating === 'DID_NOT_MEET' || reviewRating === 'NO_CALL_NO_SHOW') ? 'REJECTED' :
                                                    reviewRating === 'NEEDS_IMPROVEMENT' ? 'REVIEW' : 'PENDING'}
                                        </Badge>
                                    </td>
                                )}
                            </Fragment>
                        ))}
                    </>
                ) : (
                    <>
                        {colOrder.map((colId) => (
                            <Fragment key={colId}>
                                {colId === 'action' && (
                        <td
                            className="px-2 py-2.5 text-left pl-4 relative"
                            style={{ width: `var(--col-action)` }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <ActionDropdown actions={actions} align="start" />
                        </td>
                                )}
                                {colId === 'talent' && (
                        <td className="px-3 py-2.5 truncate" style={{ width: `var(--col-talent)` }}>
                            <div className="flex flex-col gap-0.5">
                                {ct.staff ? (
                                    <TalentContactPopover
                                        talent={{
                                            firstName: ct.staff.firstName,
                                            lastName: ct.staff.lastName,
                                            email: ct.staff.email,
                                            phone: ct.staff.phone,
                                            city: ct.staff.city,
                                            state: ct.staff.state,
                                            accountStatus: ct.staff.accountStatus,
                                            staffRating: ct.staff.staffRating,
                                        }}
                                        trigger={(
                                            <button
                                                type="button"
                                                onClick={(e) => e.stopPropagation()}
                                                className="text-left text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer transition-colors"
                                            >
                                                {ct.staff.firstName} {ct.staff.lastName}
                                            </button>
                                        )}
                                    />
                                ) : (
                                    <span className="text-sm font-bold text-foreground">Open shift</span>
                                )}
                                <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
                                    {ct.staff?.email || 'No email provided'}
                                </span>
                            </div>
                        </td>
                                )}
                                {colId === 'service' && (
                        <td className="px-3 py-2.5 truncate" style={{ width: `var(--col-service)` }}>
                            <ServiceBadge service={ct.service} />
                        </td>
                                )}
                                {colId === 'startDate' && (
                        <td className="px-3 py-2.5 truncate" style={{ width: `var(--col-date)` }}>
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                                <span className="text-sm font-bold text-foreground tabular-nums leading-tight">
                                    {formatDate(ct.startDate)}
                                </span>
                            </div>
                        </td>
                                )}
                                {colId === 'scheduledShift' && (
                        <td className="px-3 py-2.5 truncate" style={{ width: `var(--col-scheduled)` }}>
                            {(() => {
                                const s = formatTime(ct.startTime);
                                const e = formatTime(ct.endTime);
                                const range =
                                    s && e
                                        ? `${s} \u2013 ${e}`
                                        : s
                                            ? `${s} \u2013 \u2014`
                                            : e
                                                ? `\u2014 \u2013 ${e}`
                                                : '\u2014';
                                return (
                                    <div className="flex flex-col gap-1 text-left">
                                        <div className="text-sm font-bold text-foreground tabular-nums leading-tight whitespace-nowrap">
                                            {s}{e ? ` - ${e}` : ''}
                                        </div>
                                        <p className="text-xs font-normal text-slate-500">
                                            {hoursScheduled.toFixed(2)} hrs
                                        </p>
                                    </div>
                                );
                            })()}
                        </td>
                                )}
                                {colId === 'actualShift' && (
                        <td className={cn("truncate", rowVariant === 'card' ? 'px-3 py-3.5' : 'px-3 py-2.5')} style={{ width: `var(--col-actual)` }} onClick={e => e.stopPropagation()}>
                            <Popover open={isEditing} onOpenChange={setIsEditing}>
                                <PopoverTrigger asChild>
                                    <div
                                        className={`flex flex-col gap-0.5 rounded transition-colors ${ct.staff ? 'cursor-pointer hover:bg-muted/40' : 'opacity-60 cursor-not-allowed'}`}
                                        onClick={e => !ct.staff && e.stopPropagation()}
                                    >
                                        {te?.clockIn ? (
                                            <div className="flex flex-col gap-1 text-left">
                                                <div className="text-sm font-bold text-foreground tabular-nums leading-tight">
                                                    {(() => {
                                                        const inT = formatTime(getTimeOnly(te.clockIn));
                                                        const outT = te.clockOut ? formatTime(getTimeOnly(te.clockOut)) : '';
                                                        if (inT && outT) return `${inT} - ${outT}`;
                                                        if (inT) return `${inT} - \u2014`;
                                                        return '\u2014';
                                                    })()}
                                                </div>
                                                <p className="text-xs font-normal text-slate-500 flex flex-wrap items-center gap-1">
                                                    <span>{hoursClocked.toFixed(2)} hrs </span>
                                                    {isEdited && (
                                                        <Badge variant="secondary" className="text-[9px] h-4 px-1 py-0 leading-none font-medium">
                                                            Edited
                                                        </Badge>
                                                    )}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-1 text-left">
                                                <span className="text-sm font-bold text-foreground">No clock</span>
                                                <span className="text-xs font-normal text-slate-500">0.00 hrs</span>
                                            </div>
                                        )}
                                    </div>
                                </PopoverTrigger>
                                {ct.staff && (
                                    <PopoverContent className="w-64 p-3" onClick={e => e.stopPropagation()}>
                                        <div className="space-y-3">
                                            <Label className="text-xs font-bold uppercase tracking-tight text-foreground">Edit actual shift</Label>
                                            <div className="space-y-2">
                                                <div className="space-y-1">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">Clock In</span>
                                                    <Input
                                                        type="datetime-local"
                                                        value={clockIn}
                                                        onChange={e => setClockIn(e.target.value)}
                                                        className="h-8 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">Clock Out</span>
                                                    <Input
                                                        type="datetime-local"
                                                        value={clockOut}
                                                        onChange={e => setClockOut(e.target.value)}
                                                        className="h-8 text-xs"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t">
                                                <div className="text-[10px] font-bold text-slate-500">
                                                    Net: {hoursClocked.toFixed(2)} hrs
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="h-7 text-[10px]">Cancel</Button>
                                                    <Button size="sm" onClick={handleSave} className="h-7 text-[10px]">Save</Button>
                                                </div>
                                            </div>
                                        </div>
                                    </PopoverContent>
                                )}
                            </Popover>
                        </td>
                                )}
                                {colId === 'variance' && (
                        <td className="truncate px-3 py-2.5 text-center" style={{ width: `var(--col-variance)` }}>
                            <div className="flex flex-col items-center gap-0.5">
                                {(() => {
                                    const diff = hoursScheduled - hoursClocked;
                                    if (Math.abs(diff) < 0.1) {
                                        return (
                                            <span className="text-[11px] font-bold text-foreground tabular-nums">0.00 hrs</span>
                                        );
                                    }
                                    const sign = diff > 0 ? '+' : '−';
                                    return (
                                        <span className="text-[11px] font-bold text-foreground tabular-nums">
                                            {sign}
                                            {Math.abs(diff).toFixed(2)} hrs
                                        </span>
                                    );
                                })()}
                                {/* <span className="text-[10px] text-muted-foreground">Difference</span> */}
                            </div>
                        </td>
                                )}
                                {colId === 'rateType' && (
                        <td className="truncate px-3 py-2.5 text-center" style={{ width: `var(--col-rateType)` }}>
                            <div className="flex flex-col items-center">
                                <span className="text-[11px] font-bold text-foreground whitespace-nowrap">
                                    {(ct.payRateType || '').replace('PER_', '')}
                                </span>
                                {/* <span className="text-[10px] text-muted-foreground">Billing model</span> */}
                            </div>
                        </td>
                                )}
                                {colId === 'invoice' && (
                        <td className="truncate px-3 py-2.5" style={{ width: `var(--col-invoice)` }}>
                            <Popover open={isEditingOtPrice} onOpenChange={setIsEditingOtPrice}>
                                <PopoverTrigger asChild>
                                    <div
                                        className="text-right tabular-nums cursor-pointer hover:bg-muted/40 transition-colors p-1 rounded-md"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <div className="space-y-0.5 text-[10px] leading-tight">
                                            <div className="flex items-center justify-end gap-1">
                                                <span className="font-bold text-slate-500 uppercase">Shift:</span>
                                                <span className="font-bold text-foreground">{fmtCurrency(clockedPriceVal)}</span>
                                            </div>
                                            <div className="flex items-center justify-end gap-1">
                                                <span className="font-bold text-slate-500 uppercase">OT:</span>
                                                <span className="font-bold text-amber-600">{fmtCurrency(otPrice)}</span>
                                            </div>
                                            <div className="flex items-center justify-end gap-1">
                                                <span className="font-bold text-slate-500 uppercase">Travel:</span>
                                                <span className="font-bold text-indigo-600">{fmtCurrency(expPrice)}</span>
                                            </div>
                                        </div>
                                        <div className="mt-1 border-t border-border pt-1 flex items-center justify-end gap-1.5">
                                            <span className="text-[11px] font-extrabold text-foreground uppercase">Price:</span>
                                            <span className="text-[11px] font-extrabold text-foreground">{fmtCurrency(totalInvoice)}</span>
                                        </div>
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-72" onClick={e => e.stopPropagation()}>
                                    <div className="space-y-4">
                                        <div className="space-y-3">
                                            <Label className="text-xs font-bold uppercase tracking-tight text-foreground">Adjust price detail</Label>
                                            <div className="grid gap-2">
                                                <div className="grid grid-cols-3 items-center gap-4">
                                                    <Label htmlFor="shift-price" className="text-[10px] font-bold text-muted-foreground">SHIFT</Label>
                                                    <div className="col-span-2 flex items-center gap-1.5">
                                                        <span className="text-xs font-bold text-muted-foreground">$</span>
                                                        <Input
                                                            id="shift-price"
                                                            type="number"
                                                            value={shiftPriceManual}
                                                            onChange={(e) => setShiftPriceManual(e.target.value)}
                                                            className="h-8 text-sm"
                                                            placeholder="Auto"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 items-center gap-4">
                                                    <Label htmlFor="ot-price" className="text-[10px] font-bold text-muted-foreground">OVERTIME</Label>
                                                    <div className="col-span-2 flex items-center gap-1.5">
                                                        <span className="text-xs font-bold text-muted-foreground">$</span>
                                                        <Input
                                                            id="ot-price"
                                                            type="number"
                                                            value={otPriceManual}
                                                            onChange={(e) => setOtPriceManual(e.target.value)}
                                                            className="h-8 text-sm"
                                                            placeholder="Auto"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 items-center gap-4">
                                                    <Label htmlFor="travel-price" className="text-[10px] font-bold text-muted-foreground">TRAVEL</Label>
                                                    <div className="col-span-2 flex items-center gap-1.5">
                                                        <span className="text-xs font-bold text-muted-foreground">$</span>
                                                        <Input
                                                            id="travel-price"
                                                            type="number"
                                                            value={travelPriceManual}
                                                            onChange={(e) => setTravelPriceManual(e.target.value)}
                                                            className="h-8 text-sm"
                                                            placeholder="Auto"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" variant="outline" onClick={() => setIsEditingOtPrice(false)}>Cancel</Button>
                                            <Button size="sm" onClick={handleSave}>Save</Button>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </td>
                                )}
                                {colId === 'bill' && (
                        <td className="truncate px-3 py-2.5" style={{ width: `var(--col-bill)` }}>
                            <Popover open={isEditingOtCost} onOpenChange={setIsEditingOtCost}>
                                <PopoverTrigger asChild>
                                    <div
                                        className="text-right tabular-nums cursor-pointer hover:bg-muted/40 transition-colors p-1 rounded-md"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <div className="space-y-0.5 text-[10px] leading-tight">
                                            <div className="flex items-center justify-end gap-1">
                                                <span className="font-bold text-slate-500 uppercase">Shift:</span>
                                                <span className="font-bold text-foreground">{fmtCurrency(clockedCostVal)}</span>
                                            </div>
                                            <div className="flex items-center justify-end gap-1">
                                                <span className="font-bold text-slate-500 uppercase">OT:</span>
                                                <span className="font-bold text-amber-600">{fmtCurrency(otCost)}</span>
                                            </div>
                                            <div className="flex items-center justify-end gap-1">
                                                <span className="font-bold text-slate-500 uppercase">Travel:</span>
                                                <span className="font-bold text-indigo-600">{fmtCurrency(expCost)}</span>
                                            </div>
                                        </div>
                                        <div className="mt-1 border-t border-border pt-1 flex items-center justify-end gap-1.5">
                                            <span className="text-[11px] font-extrabold text-foreground uppercase">Cost:</span>
                                            <span className="text-[11px] font-extrabold text-foreground">{fmtCurrency(totalBill)}</span>
                                        </div>
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-72" onClick={e => e.stopPropagation()}>
                                    <div className="space-y-4">
                                        <div className="space-y-3">
                                            <Label className="text-xs font-bold uppercase tracking-tight text-foreground">Adjust cost detail</Label>
                                            <div className="grid gap-2">
                                                <div className="grid grid-cols-3 items-center gap-4">
                                                    <Label htmlFor="shift-cost" className="text-[10px] font-bold text-muted-foreground">SHIFT</Label>
                                                    <div className="col-span-2 flex items-center gap-1.5">
                                                        <span className="text-xs font-bold text-muted-foreground">$</span>
                                                        <Input
                                                            id="shift-cost"
                                                            type="number"
                                                            value={shiftCostManual}
                                                            onChange={(e) => setShiftCostManual(e.target.value)}
                                                            className="h-8 text-sm"
                                                            placeholder="Auto"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 items-center gap-4">
                                                    <Label htmlFor="ot-cost" className="text-[10px] font-bold text-muted-foreground">OVERTIME</Label>
                                                    <div className="col-span-2 flex items-center gap-1.5">
                                                        <span className="text-xs font-bold text-muted-foreground">$</span>
                                                        <Input
                                                            id="ot-cost"
                                                            type="number"
                                                            value={otCostManual}
                                                            onChange={(e) => setOtCostManual(e.target.value)}
                                                            className="h-8 text-sm"
                                                            placeholder="Auto"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 items-center gap-4">
                                                    <Label htmlFor="travel-cost" className="text-[10px] font-bold text-muted-foreground">TRAVEL</Label>
                                                    <div className="col-span-2 flex items-center gap-1.5">
                                                        <span className="text-xs font-bold text-muted-foreground">$</span>
                                                        <Input
                                                            id="travel-cost"
                                                            type="number"
                                                            value={travelCostManual}
                                                            onChange={(e) => setTravelCostManual(e.target.value)}
                                                            className="h-8 text-sm"
                                                            placeholder="Auto"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" variant="outline" onClick={() => setIsEditingOtCost(false)}>Cancel</Button>
                                            <Button size="sm" onClick={handleSave}>Save</Button>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </td>
                                )}
                                {colId === 'netIncome' && (
                        <td className="px-3 py-2.5 text-right text-[11px] font-bold text-foreground tabular-nums truncate" style={{ width: `var(--col-netIncome)` }}>
                            {fmtCurrency(totalInvoice - totalBill)}
                        </td>
                                )}
                                {colId === 'commission' && (
                        <td className="truncate px-3 py-2.5 text-center" style={{ width: `var(--col-commission)` }}>
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider min-w-[24px]">
                                    {isCommApp ? 'Yes' : 'No'}
                                </span>
                                <button
                                    role="switch"
                                    aria-checked={isCommApp}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleCommission(!isCommApp);
                                    }}
                                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 ${isCommApp ? 'bg-primary' : 'bg-muted'}`}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${isCommApp ? 'translate-x-4' : 'translate-x-0'}`}
                                    />
                                </button>
                            </div>
                        </td>
                                )}
                                {colId === 'minimum' && (
                        <td className="px-3 py-2.5 text-center truncate" style={{ width: `var(--col-minimum)` }} onClick={e => e.stopPropagation()}>
                            <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center justify-center gap-2">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider min-w-[24px]">
                                        {isMinApp ? 'On' : 'Off'}
                                    </span>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={isMinApp}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleMinimum(!isMinApp);
                                        }}
                                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 ${isMinApp ? 'bg-primary' : 'bg-muted'}`}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${isMinApp ? 'translate-x-4' : 'translate-x-0'}`}
                                        />
                                    </button>
                                </div>
                                {isMinApp && (
                                    <span className="text-[10px] font-semibold text-foreground tabular-nums">
                                        {fmtCurrency(toNumber(ct.minimum))}
                                    </span>
                                )}
                            </div>
                        </td>
                                )}
                                {colId === 'status' && (
                        <td className="truncate px-3 py-2.5 text-right pr-4" style={{ width: `var(--col-status)` }}>
                            <Badge
                                variant={isRejected ? 'destructive' : reviewRating ? 'info' : 'secondary'}
                                className="text-[9px] font-bold px-1.5 py-0.5 whitespace-nowrap"
                            >
                                {reviewRating === 'MET_EXPECTATIONS' ? 'APPROVED' :
                                    (reviewRating === 'DID_NOT_MEET' || reviewRating === 'NO_CALL_NO_SHOW') ? 'REJECTED' :
                                        reviewRating === 'NEEDS_IMPROVEMENT' ? 'REVIEW' : 'PENDING'}
                            </Badge>
                        </td>
                                )}
                                {colId === 'notes' && (
                        <td className="px-3 py-2.5 whitespace-normal truncate text-[10px] text-muted-foreground leading-snug" style={{ width: `var(--col-notes)` }} onClick={e => e.stopPropagation()}>
                            {isEditingNotes ? (
                                <div className="flex flex-col gap-1">
                                    <textarea
                                        value={localNotes}
                                        onChange={e => setLocalNotes(e.target.value)}
                                        className="w-full text-[10px] border border-border rounded p-1 focus:ring-1 focus:ring-primary outline-none min-h-[60px]"
                                        autoFocus
                                    />
                                    <div className="flex justify-end gap-1">
                                        <button onClick={handleSave} className="p-1 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors">
                                            <CheckIcon className="h-3 w-3" />
                                        </button>
                                        <button onClick={() => setIsEditingNotes(false)} className="p-1 bg-slate-200 rounded hover:bg-slate-300 transition-colors">
                                            <CloseIcon className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="group relative cursor-pointer hover:text-primary transition-colors" onClick={() => setIsEditingNotes(true)}>
                                    <span className="line-clamp-3">{localNotes || 'Click to add notes...'}</span>
                                    <EditIcon className="h-3 w-3 absolute -right-4 top-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            )}
                        </td>
                                )}
                            </Fragment>
                        ))}
                    </>
                )}

            </tr>

            {/* Expanded detail */}
            {isExpanded && (
                <ExpandedRowDetail
                    ct={ct}
                    onViewEvent={onViewEvent}
                    cardStyle={rowVariant === 'card'}
                    colSpan={2 + colOrder.length}
                />
            )}
        </>
    );
}