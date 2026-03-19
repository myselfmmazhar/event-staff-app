import { useMemo, useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { 
    ChevronDownIcon, 
    ChevronUpIcon, 
    EditIcon, 
    CheckIcon, 
    CloseIcon,
    MoreVerticalIcon,
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
    const [isActionsOpen, setIsActionsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    const te = ct.timeEntry;
    const [clockIn, setClockIn] = useState(toInputDatetime(te?.clockIn ?? null));
    const [clockOut, setClockOut] = useState(toInputDatetime(te?.clockOut ?? null));
    const [breakMins, setBreakMins] = useState(te?.breakMinutes ?? 0);
    const [otCostManual, setOtCostManual] = useState<string>(te?.overtimeCost !== undefined && te?.overtimeCost !== null ? toNumber(te.overtimeCost).toString() : '');
    const [otPriceManual, setOtPriceManual] = useState<string>(te?.overtimePrice !== undefined && te?.overtimePrice !== null ? toNumber(te.overtimePrice).toString() : '');
    const [isEditingOtCost, setIsEditingOtCost] = useState(false);
    const [isEditingOtPrice, setIsEditingOtPrice] = useState(false);

    const hoursScheduled = calcScheduledHours(ct);
    const hoursClocked = calcClockedHours(te);
    const scheduledCost = calcScheduledCost(ct);
    const clockedCostVal = calcClockedCost(te, ct);
    const otCost = calcOvertimeCost(te, ct);
    const otPrice = calcOvertimePrice(te, ct);
    const billAmount = calcBillAmount(ct);
    const totalBill = calcTotalBill(te, ct);
    const totalInvoice = calcTotalInvoice(te, ct);
    const grossProfit = calcGrossProfit(te, ct);

    const reviewRating = useMemo(() => ct.invitations?.[0]?.internalReviewRating ?? null, [ct.invitations]);
    const isRejected = reviewRating === 'DID_NOT_MEET' || reviewRating === 'NO_CALL_NO_SHOW';

    const revisionCount = te?.revisions?.length ?? 0;
    const isEdited = revisionCount > 0;

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsActionsOpen(false);
            }
        }
        if (isActionsOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isActionsOpen]);

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
                    <div ref={dropdownRef}>
                        <button
                            onClick={() => setIsActionsOpen(!isActionsOpen)}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                        >
                            <MoreVerticalIcon className="h-4 w-4" />
                        </button>

                        {isActionsOpen && (
                            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-32 rounded-lg border border-border bg-card shadow-lg z-[100] p-1">
                                <button
                                    onClick={() => { setIsEditing(true); setIsActionsOpen(false); }}
                                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                                >
                                    <EditIcon className="h-3.5 w-3.5" />
                                    <span>Edit</span>
                                </button>
                                <button
                                    onClick={() => { onApprove?.(ct.id); setIsActionsOpen(false); }}
                                    disabled={isRejected}
                                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <CheckIcon className="h-3.5 w-3.5" />
                                    <span>Approve</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setIsActionsOpen(false);
                                        onReview?.(ct.id);
                                    }}
                                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                    <CheckCircleIcon className="h-3.5 w-3.5 text-blue-500" />
                                    <span>Review</span>
                                </button>
                                <button
                                    onClick={() => { onReject?.(ct.id); setIsActionsOpen(false); }}
                                    disabled={isRejected}
                                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <CloseIcon className="h-3.5 w-3.5" />
                                    <span>Rejected</span>
                                </button>
                            </div>
                        )}
                    </div>
                </td>

                {/* Staff Name or Event Name */}
                {showEventName ? (
                    <td colSpan={2} className="px-3 py-2.5 font-bold text-primary max-w-[200px] truncate">
                        {ct.event?.title || '—'}
                    </td>
                ) : (
                    <>
                        {/* First Name */}
                        <td className="px-3 py-2.5 font-bold text-primary">{ct.staff?.firstName || '—'}</td>
                        {/* Last Name */}
                        <td className="px-3 py-2.5 font-bold text-primary">{ct.staff?.lastName || '—'}</td>
                    </>
                )}

                {/* Position */}
                <td className="px-3 py-2.5">
                    <Badge variant="primary" className="text-[10px] whitespace-nowrap">
                        {ct.service?.title || 'Unassigned'}
                    </Badge>
                </td>

                {/* Start Date */}
                <td className="px-3 py-2.5 text-muted-foreground text-[10px] whitespace-nowrap">
                    {formatDate(ct.startDate)}
                </td>

                {/* Start Time */}
                <td className="px-3 py-2.5 text-muted-foreground text-[10px] whitespace-nowrap">
                    {formatTime(ct.startTime)}
                </td>

                {/* End Date */}
                <td className="px-3 py-2.5 text-muted-foreground text-[10px] whitespace-nowrap">
                    {formatDate(ct.endDate || ct.startDate)}
                </td>

                {/* End Time */}
                <td className="px-3 py-2.5 text-muted-foreground text-[10px] whitespace-nowrap">
                    {formatTime(ct.endTime)}
                </td>

                {/* Hrs Sched */}
                <td className="px-3 py-2.5 text-center tabular-nums font-semibold">
                    {hoursScheduled > 0 ? hoursScheduled.toFixed(2) : '—'}
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
