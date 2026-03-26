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
    calcClockedPrice,
    calcBillAmount,
    calcTotalBill,
    calcTotalInvoice,
    calcGrossProfit,
    fmtCurrency,
    toInputDatetime,
    calcExpenditureCost,
    calcExpenditurePrice
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
    const [isCommApp, setIsCommApp] = useState(!!ct.commission);

    const hoursScheduled = calcScheduledHours(ct);
    const hoursClocked = calcClockedHours(te);
    const scheduledCost = calcScheduledCost(ct);
    const clockedCostVal = calcClockedCost(te, ct);
    const otCost = calcOvertimeCost(te, ct);
    const otPrice = calcOvertimePrice(te, ct);
    const clockedPriceVal = calcClockedPrice(te, ct);
    const expCost = calcExpenditureCost(ct);
    const expPrice = calcExpenditurePrice(ct);
    const billAmount = calcBillAmount(ct);
    const totalBill = calcTotalBill(te, ct, isCommApp);
    const totalInvoice = calcTotalInvoice(te, ct, isCommApp);
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

                {/* Service Date */}
                <td className="px-3 py-2.5 whitespace-nowrap text-[11px] font-medium text-slate-600">
                    {formatDate(ct.startDate)}
                </td>

                {/* Full Name */}
                <td className="px-3 py-2.5 font-bold text-primary whitespace-nowrap">
                    {!showEventName ? (
                        ct.staff ? (
                            <div className="flex flex-col leading-tight">
                                <span>{ct.staff.firstName}</span>
                                <span className="text-slate-500 font-semibold">{ct.staff.lastName}</span>
                            </div>
                        ) : '—'
                    ) : (
                        <div className="whitespace-normal max-w-[200px] leading-tight">
                            {ct.event?.title || '—'}
                        </div>
                    )}
                </td>

                {/* Services / Product (Position) */}
                <td className="px-3 py-2.5">
                    <Badge variant="primary" className="text-[10px] whitespace-normal max-w-[120px] bg-blue-100 text-blue-700 hover:bg-blue-200 border-none leading-tight">
                        {ct.service?.title || '—'}
                    </Badge>
                </td>

                {/* Notes (Internal Notes) */}
                <td className="px-3 py-2.5 whitespace-normal max-w-[150px] text-[10px] text-muted-foreground leading-snug">
                    {te?.notes || ct.notes || '—'}
                </td>

                {/* Scheduled Shift */}
                <td className="px-3 py-2.5 min-w-[180px]">
                    <div className="space-y-1">
                        <div>
                            <div className="text-[8px] font-bold text-muted-foreground uppercase leading-none">Scheduled Start Date & Time</div>
                            <div className="text-[10px] font-semibold text-slate-700 flex items-center gap-1">
                                <span className="bg-slate-100 px-1 rounded-sm">{formatDate(ct.startDate)}</span>
                                <span className="text-primary font-bold">{formatTime(ct.startTime)}</span>
                            </div>
                        </div>
                        <div>
                            <div className="text-[8px] font-bold text-muted-foreground uppercase leading-none">Scheduled End Date & Time</div>
                            <div className="text-[10px] font-semibold text-slate-700 flex items-center gap-1">
                                <span className="bg-slate-100 px-1 rounded-sm">{formatDate(ct.endDate || ct.startDate)}</span>
                                <span className="text-primary font-bold">{formatTime(ct.endTime)}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 pt-0.5 border-t border-slate-50">
                            <span className="text-[8px] font-bold text-muted-foreground uppercase">Scheduled Hours:</span>
                            <span className="text-[10px] font-extrabold text-emerald-600">{hoursScheduled.toFixed(2)} hrs</span>
                        </div>
                    </div>
                </td>

                {/* Actual Shift (formerly Clock In/Out) */}
                <td className="px-3 py-2.5 min-w-[200px]" onClick={e => e.stopPropagation()}>
                    {isEditing ? (
                        <div className="flex flex-col gap-1.5 p-1 bg-slate-50 rounded border">
                            <input
                                type="datetime-local"
                                value={clockIn}
                                onChange={e => setClockIn(e.target.value)}
                                className="h-6 text-[9px] border border-border rounded px-1"
                            />
                            <input
                                type="datetime-local"
                                value={clockOut}
                                onChange={e => setClockOut(e.target.value)}
                                className="h-6 text-[9px] border border-border rounded px-1"
                            />
                            <div className="flex items-center gap-1">
                                <input
                                    type="number"
                                    value={breakMins}
                                    onChange={e => setBreakMins(parseInt(e.target.value) || 0)}
                                    className="h-6 w-full text-[9px] border border-border rounded px-1"
                                    placeholder="Break"
                                />
                                <button onClick={handleSave} className="p-1 bg-emerald-500 text-white rounded"><CheckIcon className="h-3 w-3" /></button>
                                <button onClick={(e) => { e.stopPropagation(); setIsEditing(false); }} className="p-1 bg-slate-200 rounded"><CloseIcon className="h-3 w-3" /></button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1 hover:bg-slate-50/50 rounded transition-colors" onClick={() => setIsEditing(true)}>
                            <div>
                                <div className="text-[8px] font-bold text-muted-foreground uppercase leading-none">Shift Start Date & Time</div>
                                <div className="text-[10px] font-semibold text-slate-700 flex items-center gap-1">
                                    {te?.clockIn ? (
                                        <>
                                            <span className="bg-emerald-50 text-emerald-700 px-1 rounded-sm">{formatDate(te.clockIn)}</span>
                                            <span className="text-emerald-700 font-bold">{formatTime(te.clockIn ? fmtDateTime(te.clockIn).split(', ')[1] || null : null)}</span>
                                        </>
                                    ) : (
                                        <span className="text-slate-300 italic">Not clocked</span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <div className="text-[8px] font-bold text-muted-foreground uppercase leading-none">Shift End Date & Time</div>
                                <div className="text-[10px] font-semibold text-slate-700 flex items-center gap-1">
                                    {te?.clockOut ? (
                                        <>
                                            <span className="bg-red-50 text-red-700 px-1 rounded-sm">{formatDate(te.clockOut)}</span>
                                            <span className="text-red-700 font-bold">{formatTime(te.clockOut ? fmtDateTime(te.clockOut).split(', ')[1] || null : null)}</span>
                                        </>
                                    ) : (
                                        <span className="text-slate-300 italic">No out</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 pt-0.5 border-t border-emerald-50">
                                <span className="text-[8px] font-bold text-muted-foreground uppercase">Shift Hours:</span>
                                <span className={`text-[10px] font-extrabold ${hoursClocked > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                                    {hoursClocked.toFixed(2)} hrs
                                </span>
                                {isEdited && <Badge variant="warning" className="text-[7px] h-2.5 px-0.5 leading-none">Edited</Badge>}
                            </div>
                        </div>
                    )}
                </td>

                {/* Variance */}
                <td className="px-3 py-2.5 text-center">
                    <div className="flex flex-col items-center">
                        <span className={`text-[11px] font-bold ${Math.abs(hoursScheduled - hoursClocked) < 0.1 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {(hoursScheduled - hoursClocked).toFixed(2)}
                        </span>
                        <span className="text-[8px] font-bold text-muted-foreground uppercase">Hrs</span>
                    </div>
                </td>

                {/* Rate Type */}
                <td className="px-3 py-2.5 text-center text-muted-foreground whitespace-nowrap text-[9px] uppercase font-bold">
                    {ct.payRateType.replace('PER_', '')}
                </td>

                <td className="px-3 py-2.5 text-center font-bold text-slate-700 whitespace-nowrap text-[11px]">
                    {expCost ? fmtCurrency(expCost) : '—'}
                </td>
                <td className="px-3 py-2.5 text-center font-bold text-slate-700 whitespace-nowrap text-[11px]">
                    {expPrice ? fmtCurrency(expPrice) : '—'}
                </td>

                {/* Cost Detail */}
                {(subTab === 'all' || subTab === 'bill') && (
                    <td className="px-3 py-2.5 min-w-[140px]">
                        <div className="space-y-0.5 text-right tabular-nums">
                            <div className="flex justify-between items-center gap-2">
                                <span className="text-[8px] font-bold text-muted-foreground uppercase">Shift:</span>
                                <span className="text-[10px] font-semibold">{fmtCurrency(clockedCostVal)}</span>
                            </div>
                            <div className="flex justify-between items-center gap-2">
                                <span className="text-[8px] font-bold text-muted-foreground uppercase">OT:</span>
                                <span className="text-[10px] font-semibold text-amber-600">{fmtCurrency(otCost)}</span>
                            </div>
                            <div className="flex justify-between items-center gap-2">
                                <span className="text-[8px] font-bold text-muted-foreground uppercase">Exp:</span>
                                <span className="text-[10px] font-semibold text-indigo-600">{fmtCurrency(expCost)}</span>
                            </div>
                            <div className="pt-0.5 border-t flex justify-between items-center gap-2">
                                <span className="text-[9px] font-extrabold uppercase">Cost:</span>
                                <span className="text-[10px] font-extrabold">{fmtCurrency(clockedCostVal + otCost + expCost)}</span>
                            </div>
                        </div>
                    </td>
                )}

                {/* Price Detail */}
                <td className="px-3 py-2.5 min-w-[140px]">
                    <div className="space-y-0.5 text-right tabular-nums">
                        <div className="flex justify-between items-center gap-2">
                            <span className="text-[8px] font-bold text-muted-foreground uppercase">Shift:</span>
                            <span className="text-[10px] font-semibold">{fmtCurrency(clockedPriceVal)}</span>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                            <span className="text-[8px] font-bold text-muted-foreground uppercase">OT:</span>
                            <span className="text-[10px] font-semibold text-amber-600">{fmtCurrency(otPrice)}</span>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                            <span className="text-[8px] font-bold text-muted-foreground uppercase">Exp:</span>
                            <span className="text-[10px] font-semibold text-indigo-600">{fmtCurrency(expPrice)}</span>
                        </div>
                        <div className="pt-0.5 border-t flex justify-between items-center gap-2">
                            <span className="text-[9px] font-extrabold uppercase">Price:</span>
                            <span className="text-[10px] font-extrabold">{fmtCurrency(clockedPriceVal + otPrice + expPrice)}</span>
                        </div>
                    </div>
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

                {/* Status */}
                <td className="px-3 py-2.5 text-center">
                    <Badge
                        variant={isRejected ? 'destructive' : reviewRating ? 'info' : 'secondary'}
                        className="text-[9px] font-bold px-1.5 py-0.5 whitespace-nowrap"
                    >
                        {reviewRating || 'PENDING'}
                    </Badge>
                </td>

                {/* Financial Totals */}
                <td className="px-3 py-2.5 text-right tabular-nums font-bold text-red-600 bg-red-50/10">
                    {fmtCurrency(totalBill)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums font-bold text-foreground bg-slate-50/10">
                    {fmtCurrency(totalInvoice)}
                </td>
                <td className={`px-3 py-2.5 text-right tabular-nums font-bold ${grossProfit >= 0 ? 'text-foreground' : 'text-red-600 bg-red-50/20'}`}>
                    {fmtCurrency(grossProfit)}
                </td>
            </tr>

            {/* Expanded detail */}
            {isExpanded && <ExpandedRowDetail ct={ct} onViewEvent={onViewEvent} />}
        </>
    );
}
