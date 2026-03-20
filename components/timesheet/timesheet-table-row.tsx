import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ClockIcon } from '@/components/ui/icons';
import {
    ChevronDownIcon,
    ChevronUpIcon,
    EditIcon,
    CheckIcon,
    CloseIcon,
    CheckCircleIcon
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
    calcBillAmount,
    calcTotalBill,
    calcTotalInvoice,
    calcGrossProfit,
    fmtCurrency,
    toInputDatetime
} from './helpers';
import { ExpandedRowDetail } from './expanded-row-detail';
import type { CallTimeRow } from './types';
import { ActionDropdown, type ActionItem } from '@/components/common/action-dropdown';

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
    subTab = 'all',
}: {
    ct: CallTimeRow;
    isExpanded: boolean;
    isSelected: boolean;
    onToggleExpand: (id: string, e: React.MouseEvent) => void;
    onToggleSelect: (id: string, e: React.MouseEvent) => void;
    onViewEvent: (id: string) => void;
    onSaveTimeEntry?: (invitationId: string, clockIn: string | null, clockOut: string | null, breakMins: number, otCost?: number | null, otPrice?: number | null) => void;
    showEventName?: boolean;
    onApprove?: (id: string) => void;
    onReject?: (id: string) => void;
    onReview?: (id: string) => void;
    subTab?: 'all' | 'bill' | 'invoice';
}) {
    const [isEditing, setIsEditing] = useState(false);

    const te = ct.timeEntry;
    const [clockIn, setClockIn] = useState(toInputDatetime(te?.clockIn ?? null));
    const [clockOut, setClockOut] = useState(toInputDatetime(te?.clockOut ?? null));
    const [breakMins, setBreakMins] = useState(te?.breakMinutes ?? 0);
    const [otCostManual, setOtCostManual] = useState<string>(te?.overtimeCost !== undefined && te?.overtimeCost !== null ? toNumber(te.overtimeCost).toString() : '');
    const [otPriceManual, setOtPriceManual] = useState<string>(te?.overtimePrice !== undefined && te?.overtimePrice !== null ? toNumber(te.overtimePrice).toString() : '');
    const [isEditingOtCost, setIsEditingOtCost] = useState(false);
    const [isEditingOtPrice, setIsEditingOtPrice] = useState(false);
    const [isMinApp, setIsMinApp] = useState(!!ct.minimum);
    const [isCommApp, setIsCommApp] = useState(!!ct.commission);

    const hoursScheduled = calcScheduledHours(ct);
    const hoursClocked = calcClockedHours(te);
    const scheduledCost = calcScheduledCost(ct);
    const clockedCostVal = calcClockedCost(te, ct, isMinApp);
    const otCost = calcOvertimeCost(te, ct);
    const otPrice = calcOvertimePrice(te, ct);
    const billAmount = calcBillAmount(ct);
    const totalBill = calcTotalBill(te, ct, isMinApp, isCommApp);
    const totalInvoice = calcTotalInvoice(te, ct, isMinApp, isCommApp);
    const grossProfit = totalInvoice - totalBill;

    const reviewRating = useMemo(() => ct.invitations?.[0]?.internalReviewRating ?? null, [ct.invitations]);
    const isRejected = reviewRating === 'DID_NOT_MEET' || reviewRating === 'NO_CALL_NO_SHOW';

    const revisionCount = te?.revisions?.length ?? 0;
    const isEdited = revisionCount > 0;


    const handleSave = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onSaveTimeEntry) {
            const parsedOtCost = otCostManual !== '' ? parseFloat(otCostManual) : null;
            const parsedOtPrice = otPriceManual !== '' ? parseFloat(otPriceManual) : null;

            onSaveTimeEntry(
                ct.id,
                clockIn || null,
                clockOut || null,
                breakMins,
                parsedOtCost !== null && !isNaN(parsedOtCost) ? parsedOtCost : (otCostManual === '' ? null : undefined),
                parsedOtPrice !== null && !isNaN(parsedOtPrice) ? parsedOtPrice : (otPriceManual === '' ? null : undefined)
            );
        }
        setIsEditing(false);
        setIsEditingOtCost(false);
        setIsEditingOtPrice(false);
    };

    const actions: ActionItem[] = [
        {
            label: 'Edit',
            icon: <EditIcon className="h-3.5 w-3.5" />,
            onClick: () => setIsEditing(true),
        },
        {
            label: 'Approve',
            icon: <CheckIcon className="h-3.5 w-3.5" />,
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
            icon: <CloseIcon className="h-3.5 w-3.5" />,
            onClick: () => onReject?.(ct.id),
            disabled: isRejected,
            variant: 'destructive',
        }
    ];

    return (
        <>
            <tr
                onClick={(e) => onToggleExpand(ct.id, e)}
                className={`border-b border-border last:border-b-0 hover:bg-muted/20 cursor-pointer transition-colors ${isExpanded ? 'bg-muted/10' : ''} ${isSelected ? 'bg-primary/5' : ''}`}
            >
                {/* Checkbox */}
                <td className="w-8 px-2 py-2.5 text-center">
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
                <td className="w-8 px-2 py-2.5 text-center">
                    <button
                        onClick={(e) => onToggleExpand(ct.id, e)}
                        className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-muted transition-colors"
                    >
                        {isExpanded ? (
                            <ChevronUpIcon className="h-3 w-3 text-primary" />
                        ) : (
                            <ChevronDownIcon className="h-3 w-3 text-muted-foreground" />
                        )}
                    </button>
                </td>

                {/* Actions Dropdown */}
                <td className="w-10 px-2 py-2.5 text-center relative" onClick={e => e.stopPropagation()}>
                    <ActionDropdown actions={actions} align="start" />
                </td>

                {/* Staff Name or Event Name */}
                {showEventName ? (
                    <td colSpan={2} className="px-3 py-2.5 font-bold text-primary max-w-[200px] truncate">
                        {ct.event?.title || '—'}
                    </td>
                ) : (
                    <>
                        {/* Full Name */}
                        <td className="px-3 py-2.5 font-bold text-primary">
                            {ct.staff ? `${ct.staff.firstName} ${ct.staff.lastName}` : '—'}
                        </td>
                    </>
                )}

                {/* Scheduled Shift + Time Dropdown */}
                <td className="px-3 py-2.5">
                    <Popover>
                        <PopoverTrigger asChild>
                            <div className="cursor-pointer group flex flex-col items-start gap-1">
                                <Badge variant="primary" className="text-[10px] whitespace-nowrap group-hover:bg-primary/90 transition-colors">
                                    {ct.service?.title || 'Unassigned'}
                                </Badge>
                                <span className="text-[9px] text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                                    <ClockIcon className="h-2.5 w-2.5" />
                                    {formatDate(ct.startDate)} @ {formatTime(ct.startTime)}
                                </span>
                            </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3 z-[120]" align="start">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between border-b pb-1.5">
                                    <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider">Scheduled Shift</h4>
                                    <Badge variant="outline" className="text-[9px]">{ct.service?.title}</Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-muted-foreground uppercase font-medium">Start</p>
                                        <div className="flex flex-col text-xs font-semibold">
                                            <span>{formatDate(ct.startDate)}</span>
                                            <span className="text-primary">{formatTime(ct.startTime)}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-muted-foreground uppercase font-medium">End</p>
                                        <div className="flex flex-col text-xs font-semibold">
                                            <span>{formatDate(ct.endDate || ct.startDate)}</span>
                                            <span className="text-primary">{formatTime(ct.endTime)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-2 border-t flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">Total Duration:</span>
                                    <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100 italic">
                                        {hoursScheduled.toFixed(2)} hrs
                                    </span>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </td>

                <td className="px-3 py-2.5 text-center">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsMinApp(prev => !prev);
                        }}
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold transition-all border ${isMinApp
                                ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                                : 'bg-muted text-muted-foreground border-border'
                            }`}
                    >
                        {isMinApp ? 'YES' : 'NO'}
                    </button>
                </td>

                <td className="px-3 py-2.5 text-center">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsCommApp(prev => !prev);
                        }}
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold transition-all border ${isCommApp
                                ? 'bg-indigo-500 text-white border-indigo-600 shadow-sm'
                                : 'bg-muted text-muted-foreground border-border'
                            }`}
                    >
                        {isCommApp ? 'YES' : 'NO'}
                    </button>
                </td>


                {/* Pay Rate / Type - Only show in All or Bill tab */}
                {(subTab === 'all' || subTab === 'bill') && (
                    <>
                        <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                            ${toNumber(ct.payRate).toFixed(2)}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap text-[10px] uppercase">
                            {ct.payRateType.replace('PER_', '')}
                        </td>
                    </>
                )}

                {/* Clock In / Out Editor or Display */}
                {isEditing ? (
                    <td colSpan={3} className="px-3 py-1" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                            <input
                                type="datetime-local"
                                value={clockIn}
                                onChange={e => setClockIn(e.target.value)}
                                className="h-7 text-[10px] border border-border rounded px-1"
                            />
                            <input
                                type="datetime-local"
                                value={clockOut}
                                onChange={e => setClockOut(e.target.value)}
                                className="h-7 text-[10px] border border-border rounded px-1"
                            />
                            <input
                                type="number"
                                value={breakMins}
                                onChange={e => setBreakMins(parseInt(e.target.value) || 0)}
                                className="h-7 w-12 text-[10px] border border-border rounded px-1"
                                placeholder="Brk"
                            />
                            <button onClick={handleSave} className="p-1 bg-emerald-500 text-white rounded"><CheckIcon className="h-3 w-3" /></button>
                            <button onClick={(e) => { e.stopPropagation(); setIsEditing(false); }} className="p-1 bg-slate-200 rounded"><CloseIcon className="h-3 w-3" /></button>
                        </div>
                    </td>
                ) : (
                    <>
                        {/* Clock In */}
                        <td
                            className={`px-3 py-2.5 whitespace-nowrap text-[10px] hover:bg-emerald-50 transition-colors ${isEdited ? 'text-amber-700' : ''}`}
                            onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                        >
                            <div className="flex items-center gap-2">
                                {te?.clockIn ? (
                                    <span className="text-emerald-600 font-medium">{fmtDateTime(te.clockIn)}</span>
                                ) : (
                                    <span className="text-slate-300 italic">Not clocked</span>
                                )}
                                {isEdited && (
                                    <Badge variant="warning" className="text-[8px] h-3 px-1 leading-none py-0">
                                        Edited
                                    </Badge>
                                )}
                            </div>
                        </td>
                        {/* Clock Out */}
                        <td
                            className={`px-3 py-2.5 whitespace-nowrap text-[10px] hover:bg-red-50 transition-colors ${isEdited ? 'text-amber-700' : ''}`}
                            onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                        >
                            {te?.clockOut ? <span className="text-red-500 font-medium">{fmtDateTime(te.clockOut)}</span> : '—'}
                        </td>
                        {/* Hrs Clo */}
                        <td
                            className="px-3 py-2.5 text-center tabular-nums font-semibold hover:bg-slate-50 transition-colors"
                            onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                        >
                            {hoursClocked > 0 ? hoursClocked.toFixed(2) : '—'}
                        </td>
                    </>
                )}

                {/* Cost Columns - Only show in All or Bill tab */}
                {(subTab === 'all' || subTab === 'bill') && (
                    <>
                        {/* Sched Cost */}
                        <td className="px-3 py-2.5 text-right tabular-nums">
                            {scheduledCost > 0 ? fmtCurrency(scheduledCost) : '—'}
                        </td>

                        {/* Clo Cost / Bill */}
                        <td className="px-3 py-2.5 text-right tabular-nums">
                            {clockedCostVal > 0 ? fmtCurrency(clockedCostVal) : '—'}
                        </td>

                        {/* Overtime Cost */}
                        <td
                            className="px-3 py-2.5 text-right tabular-nums text-muted-foreground whitespace-nowrap hover:bg-slate-50 transition-colors"
                            onClick={(e) => { e.stopPropagation(); setIsEditingOtCost(true); }}
                        >
                            {isEditingOtCost ? (
                                <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                                    <input
                                        type="number"
                                        value={otCostManual}
                                        onChange={e => setOtCostManual(e.target.value)}
                                        className="h-7 w-16 text-[10px] border border-border rounded px-1"
                                        autoFocus
                                    />
                                    <button onClick={handleSave} className="p-0.5 bg-emerald-500 text-white rounded"><CheckIcon className="h-3 w-3" /></button>
                                    <button onClick={(e) => { e.stopPropagation(); setIsEditingOtCost(false); }} className="p-0.5 bg-slate-200 rounded"><CloseIcon className="h-3 w-3" /></button>
                                </div>
                            ) : (
                                otCost > 0 ? fmtCurrency(otCost) : '—'
                            )}
                        </td>
                    </>
                )}

                {/* Bill Amount */}
                {/* Base Bill */}
                <td className="px-3 py-2.5 text-right tabular-nums">
                    {billAmount > 0 ? fmtCurrency(billAmount) : '—'}
                </td>

                {/* Overtime Price */}
                {/* OT Price */}
                <td className="px-3 py-2.5 text-right tabular-nums">
                    {isEditingOtPrice ? (
                        <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
                            <input
                                type="number"
                                value={otPriceManual}
                                onChange={e => setOtPriceManual(e.target.value)}
                                className="h-7 w-16 text-[10px] border border-border rounded px-1"
                                autoFocus
                            />
                            <button onClick={handleSave} className="p-0.5 bg-emerald-500 text-white rounded"><CheckIcon className="h-3 w-3" /></button>
                            <button onClick={(e) => { e.stopPropagation(); setIsEditingOtPrice(false); }} className="p-0.5 bg-slate-200 rounded"><CloseIcon className="h-3 w-3" /></button>
                        </div>
                    ) : (
                        otPrice > 0 ? fmtCurrency(otPrice) : '—'
                    )}
                </td>

                {/* Financial Summary Columns (Bill, Invoice, Profit) - Always Visible */}
                <td className="px-3 py-2.5 text-right tabular-nums font-medium text-red-600 bg-red-50/10">
                    {totalBill > 0 ? fmtCurrency(totalBill) : '0.00'}
                </td>

                <td className="px-3 py-2.5 text-right tabular-nums font-medium text-emerald-600 bg-emerald-50/10">
                    {totalInvoice > 0 ? fmtCurrency(totalInvoice) : '0.00'}
                </td>

                <td className={`px-3 py-2.5 text-right tabular-nums font-bold ${grossProfit >= 0 ? 'text-blue-600 bg-blue-50/10' : 'text-red-700 bg-red-50/20'}`}>
                    {fmtCurrency(grossProfit)}
                </td>
            </tr>

            {/* Expanded detail */}
            {isExpanded && <ExpandedRowDetail ct={ct} onViewEvent={onViewEvent} />}
        </>
    );
}
