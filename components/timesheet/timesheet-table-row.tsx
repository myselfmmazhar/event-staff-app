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
    calcExpenditureCost
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
    const clockedPriceVal = calcClockedPrice(te, ct, isMinApp);
    const expCost = calcExpenditureCost(ct);
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
                    <>
                        <td className="px-3 py-2.5 font-bold text-primary max-w-[200px] truncate">
                            {ct.event?.title || '—'}
                        </td>
                    </>
                ) : (
                    <>
                        {/* Position */}
                        <td className="px-3 py-2.5">
                            <Badge variant="primary" className="text-[10px] whitespace-nowrap bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">
                                {ct.service?.title || 'Unassigned'}
                            </Badge>
                        </td>
                        {/* Full Name */}
                        <td className="px-3 py-2.5 font-bold text-primary">
                            {ct.staff ? `${ct.staff.firstName} ${ct.staff.lastName}` : '—'}
                        </td>
                    </>
                )}

                {/* Scheduled Shift + Detailed Info */}
                <td className="px-3 py-2.5 min-w-[200px]">
                    <div className="space-y-1.5">
                        <div>
                            <div className="text-[9px] font-bold text-muted-foreground uppercase leading-none mb-0.5">Scheduled Start Date & Time</div>
                            <div className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{formatDate(ct.startDate)}</span>
                                <span className="text-primary font-bold">{formatTime(ct.startTime)}</span>
                            </div>
                        </div>
                        <div>
                            <div className="text-[9px] font-bold text-muted-foreground uppercase leading-none mb-0.5">Scheduled End Date & Time</div>
                            <div className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{formatDate(ct.endDate || ct.startDate)}</span>
                                <span className="text-primary font-bold">{formatTime(ct.endTime)}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 pt-0.5">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase">Scheduled Hours:</span>
                            <span className="text-[11px] font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                {hoursScheduled.toFixed(2)} hrs
                            </span>
                        </div>
                    </div>
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
                                placeholder="Break"
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
                    <td className="px-3 py-2.5 min-w-[150px]">
                        <div className="space-y-1 text-right tabular-nums">
                            <div className="flex justify-between items-center gap-4">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase">Shift Cost:</span>
                                <span className="text-[11px] font-semibold text-slate-700">{clockedCostVal > 0 ? fmtCurrency(clockedCostVal) : '0.00'}</span>
                            </div>
                            <div className="flex justify-between items-center gap-4">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase">Overtime:</span>
                                <span className="text-[11px] font-semibold text-amber-600">{otCost > 0 ? fmtCurrency(otCost) : '0.00'}</span>
                            </div>
                            <div className="flex justify-between items-center gap-4">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase">Travel:</span>
                                <span className="text-[11px] font-semibold text-indigo-600">{expCost > 0 ? fmtCurrency(expCost) : '0.00'}</span>
                            </div>
                            <div className="pt-0.5 mt-0.5 border-t border-slate-100 flex justify-between items-center gap-4">
                                <span className="text-[10px] font-extrabold text-slate-900 uppercase">Cost:</span>
                                <span className="text-[11px] font-extrabold text-slate-900">{fmtCurrency(clockedCostVal + otCost + expCost)}</span>
                            </div>
                        </div>
                    </td>
                )}

                {/* Consolidated Price (Bill) Column - Always Visible */}
                <td className="px-3 py-2.5 min-w-[150px]">
                    <div className="space-y-1 text-right tabular-nums">
                        <div className="flex justify-between items-center gap-4">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase">Shift Price:</span>
                            <span className="text-[11px] font-semibold text-slate-700">{clockedPriceVal > 0 ? fmtCurrency(clockedPriceVal) : '0.00'}</span>
                        </div>
                        <div className="flex justify-between items-center gap-4">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase">Overtime:</span>
                            <span className="text-[11px] font-semibold text-amber-600">{otPrice > 0 ? fmtCurrency(otPrice) : '0.00'}</span>
                        </div>
                        <div className="flex justify-between items-center gap-4">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase">Travel:</span>
                            <span className="text-[11px] font-semibold text-indigo-600">{expCost > 0 ? fmtCurrency(expCost) : '0.00'}</span>
                        </div>
                        <div className="pt-0.5 mt-0.5 border-t border-slate-100 flex justify-between items-center gap-4">
                            <span className="text-[10px] font-extrabold text-slate-900 uppercase">Price:</span>
                            <span className="text-[11px] font-extrabold text-slate-900">{fmtCurrency(clockedPriceVal + otPrice + expCost)}</span>
                        </div>
                    </div>
                </td>

                {/* Financial Summary Columns (Invoice, Bill, Net Income) - Always Visible */}
                <td className="px-3 py-2.5 text-right tabular-nums font-medium text-foreground bg-gray-50/5">
                    {totalInvoice > 0 ? fmtCurrency(totalInvoice) : '0.00'}
                </td>

                <td className="px-3 py-2.5 text-right tabular-nums font-medium text-red-600 bg-red-50/10">
                    {totalBill > 0 ? fmtCurrency(totalBill) : '0.00'}
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
