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
    onPending,
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
    onPending?: (id: string) => void;
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


    const handleSave = () => {
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




    return (
        <>
            <tr
                className={`border-b border-border last:border-b-0 hover:bg-muted/20 cursor-default transition-colors ${isExpanded ? 'bg-muted/10' : ''} ${isSelected ? 'bg-primary/5' : ''}`}
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

                {subTab === 'invoice' ? (
                    <>
                        {/* Actions Dropdown */}
                        <td className="w-10 px-2 py-2.5 text-center relative" onClick={e => e.stopPropagation()}>
                            <ActionDropdown actions={actions} align="start" />
                        </td>

                        {/* Service Date */}
                        <td className="px-3 py-2.5 whitespace-nowrap text-[11px] font-medium text-slate-600">
                            {formatDate(ct.startDate)}
                        </td>

                        {/* Service / Product (Position) */}
                        <td className="px-3 py-2.5">
                            <Badge variant="primary" className="text-[10px] whitespace-normal max-w-[120px] bg-blue-100 text-blue-700 hover:bg-blue-200 border-none leading-tight">
                                {ct.service?.title || '—'}
                            </Badge>
                        </td>

                        {/* Description - Combined Details */}
                        <td className="px-3 py-4 text-[10px] leading-snug text-slate-600 min-w-[320px]">
                            <div className="space-y-1.5">
                                <div className="flex flex-col">
                                    <span className="font-bold text-[8px] text-slate-400 uppercase tracking-tight">Scheduled Shift</span>
                                    <span className="font-medium">
                                        {formatDate(ct.startDate)} • {formatTime(ct.startTime)} - {formatTime(ct.endTime)}
                                        <span className="ml-1 text-slate-400">({hoursScheduled.toFixed(2)} hrs)</span>
                                    </span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-[8px] text-slate-400 uppercase tracking-tight">Actual Shift</span>
                                    {te?.clockIn ? (
                                        <span className="font-medium text-emerald-600">
                                            {formatDate(te.clockIn)} • {formatTime(te.clockIn ? fmtDateTime(te.clockIn).split(', ')[1] || null : null)} - {te.clockOut ? formatTime(te.clockOut ? fmtDateTime(te.clockOut).split(', ')[1] || null : null) : 'No out'}
                                            <span className="ml-1 opacity-70">({hoursClocked.toFixed(2)} hrs)</span>
                                        </span>
                                    ) : (
                                        <span className="text-slate-300 italic font-medium">Not clocked</span>
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-[8px] text-slate-400 uppercase tracking-tight">Notes</span>
                                    <span className="font-medium italic leading-tight text-slate-500">{te?.notes || ct.notes || '—'}</span>
                                </div>
                                <div className="pt-1.5 border-t border-slate-100">
                                    <input
                                        type="text"
                                        placeholder="Add your own notes..."
                                        onClick={e => e.stopPropagation()}
                                        className="w-full text-[10px] bg-transparent border-b border-dashed border-slate-200 focus:outline-none focus:border-indigo-300 focus:border-dashed py-0.5 placeholder:text-slate-300 font-medium"
                                    />
                                </div>
                            </div>
                        </td>

                        {/* QTY */}
                        <td className="px-3 py-2.5 text-center font-bold text-slate-700 tabular-nums">
                            {hoursClocked > 0 ? hoursClocked.toFixed(2) : hoursScheduled.toFixed(2)}
                        </td>

                        {/* Price */}
                        <td className="px-3 py-2.5 text-right font-semibold text-slate-600 tabular-nums cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={(e) => { e.stopPropagation(); setIsEditingOtPrice(true); }}
                        >
                            {isEditingOtPrice ? (
                                <input
                                    type="number"
                                    value={otPriceManual}
                                    onChange={(e) => setOtPriceManual(e.target.value)}
                                    onBlur={handleSave}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                    autoFocus
                                    className="w-16 h-6 text-[10px] text-right border border-border rounded px-1 focus:ring-1 focus:ring-primary outline-none"
                                    onClick={e => e.stopPropagation()}
                                />
                            ) : (
                                fmtCurrency(toNumber(ct.billRate))
                            )}
                        </td>

                        {/* Invoice Amount */}
                        <td className="px-3 py-2.5 text-right font-extrabold text-primary tabular-nums text-[13px] pr-6 cursor-pointer hover:bg-primary/5 transition-colors"
                            onClick={(e) => { e.stopPropagation(); setIsEditingOtPrice(true); }}
                        >
                            {isEditingOtPrice ? (
                                <div className="flex flex-col items-end gap-1">
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Adjust Price/OT</span>
                                    <input
                                        type="number"
                                        value={otPriceManual}
                                        onChange={(e) => setOtPriceManual(e.target.value)}
                                        onBlur={handleSave}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                        autoFocus
                                        className="w-20 h-7 text-[11px] text-right border-2 border-primary/20 rounded-md px-1.5 focus:border-primary focus:ring-0 outline-none shadow-sm"
                                        onClick={e => e.stopPropagation()}
                                    />
                                </div>
                            ) : (
                                fmtCurrency(totalInvoice)
                            )}
                        </td>
                    </>
                ) : subTab === 'bill' ? (
                    <>
                        {/* Action */}
                        <td className="w-10 px-2 py-2.5 text-center relative" onClick={e => e.stopPropagation()}>
                            <ActionDropdown actions={actions} align="start" />
                        </td>

                        {/* Category */}
                        <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                            <select className="text-[10px] p-1 bg-muted/40 border-none rounded focus:ring-1 focus:ring-primary/20 font-medium text-slate-600 cursor-pointer">
                                <option>Labor</option>
                                <option>Travel</option>
                                <option>Bonus</option>
                            </select>
                        </td>

                        {/* Bill Description */}
                        <td className="px-3 py-2.5 min-w-[350px]">
                            <div className="flex flex-col gap-0.5">
                                <span className="font-extrabold text-primary text-[11px] uppercase tracking-tight">
                                    {ct.event?.title || '—'}
                                </span>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[9px] font-bold text-blue-600 bg-blue-50 border-blue-200 uppercase">
                                        {ct.service?.title || '—'}
                                    </Badge>
                                    <span className="text-[10px] font-medium text-slate-500 italic">
                                        {te?.clockIn ? (
                                            `${formatDate(te.clockIn)} • ${formatTime(te.clockIn ? fmtDateTime(te.clockIn).split(', ')[1] || null : null)} - ${te.clockOut ? formatTime(te.clockOut ? fmtDateTime(te.clockOut).split(', ')[1] || null : null) : '?'}`
                                        ) : 'Actual shift not clocked'}
                                    </span>
                                </div>
                            </div>
                        </td>

                        {/* Bill Amount */}
                        <td className="px-3 py-2.5 text-right font-extrabold text-red-600 tabular-nums text-[13px] cursor-pointer hover:bg-red-50 transition-colors"
                            onClick={(e) => { e.stopPropagation(); setIsEditingOtCost(true); }}
                        >
                            {isEditingOtCost ? (
                                <div className="flex flex-col items-end gap-1">
                                    <span className="text-[8px] font-bold text-red-400 uppercase tracking-tight">Adjust Cost/OT</span>
                                    <input
                                        type="number"
                                        value={otCostManual}
                                        onChange={(e) => setOtCostManual(e.target.value)}
                                        onBlur={handleSave}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                        autoFocus
                                        className="w-20 h-7 text-[11px] text-right border-2 border-red-200 rounded-md px-1.5 focus:border-red-500 focus:ring-0 outline-none shadow-sm"
                                        onClick={e => e.stopPropagation()}
                                    />
                                </div>
                            ) : (
                                fmtCurrency(totalBill)
                            )}
                        </td>

                        {/* Status */}
                        <td className="px-3 py-2.5 text-center">
                            <Badge
                                variant={isRejected ? 'destructive' : reviewRating ? 'info' : 'secondary'}
                                className="text-[9px] font-bold px-1.5 py-0.5 whitespace-nowrap"
                            >
                                {reviewRating === 'MET_EXPECTATIONS' ? 'APPROVED' :
                                    (reviewRating === 'DID_NOT_MEET' || reviewRating === 'NO_CALL_NO_SHOW') ? 'REJECTED' :
                                        reviewRating === 'NEEDS_IMPROVEMENT' ? 'REVIEW' : 'PENDING'}
                            </Badge>
                        </td>
                    </>
                ) : (
                    <>
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
                                ) : 'UNASSIGNED STAFF'
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
                                    <div className="text-[10px] font-semibold text-slate-700 flex items-center gap-1">
                                        <span className="bg-slate-100 px-1 rounded-sm">{formatDate(ct.startDate)}</span>
                                        <span className=" font-bold">{formatTime(ct.startTime)}</span>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-semibold text-slate-700 flex items-center gap-1">
                                        <span className="bg-slate-100 px-1 rounded-sm">{formatDate(ct.endDate || ct.startDate)}</span>
                                        <span className=" font-bold">{formatTime(ct.endTime)}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 pt-0.5 border-t border-slate-50">
                                    <span className="text-[10px] font-extrabold ">{hoursScheduled.toFixed(2)} hrs</span>
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
                                        <button onClick={(e) => { e.stopPropagation(); handleSave(); }} className="p-1 bg-emerald-500 text-white rounded"><CheckIcon className="h-3 w-3" /></button>
                                        <button onClick={(e) => { e.stopPropagation(); setIsEditing(false); }} className="p-1 bg-slate-200 rounded"><CloseIcon className="h-3 w-3" /></button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-1 hover:bg-slate-50/50 rounded transition-colors" onClick={() => setIsEditing(true)}>
                                    <div>
                                        <div className="text-[10px] font-semibold text-slate-700 flex items-center gap-1">
                                            {te?.clockIn ? (
                                                <>
                                                    <span className="bg-emerald-50  px-1 rounded-sm">{formatDate(te.clockIn)}</span>
                                                    <span className=" font-bold">{formatTime(te.clockIn ? fmtDateTime(te.clockIn).split(', ')[1] || null : null)}</span>
                                                </>
                                            ) : (
                                                <span className="text-slate-300 italic">Not clocked</span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-semibold text-slate-700 flex items-center gap-1">
                                            {te?.clockOut ? (
                                                <>
                                                    <span className="bg-red-50  px-1 rounded-sm">{formatDate(te.clockOut)}</span>
                                                    <span className=" font-bold">{formatTime(te.clockOut ? fmtDateTime(te.clockOut).split(', ')[1] || null : null)}</span>
                                                </>
                                            ) : (
                                                <span className="text-slate-300 italic">No out</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 pt-0.5 border-t border-emerald-50">
                                        <span className={`text-[10px] font-extrabold`}>
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

                        <td className="px-3 py-2.5 text-center text-muted-foreground whitespace-nowrap text-[9px] uppercase font-bold">
                            {ct.payRateType.replace('PER_', '')}
                        </td>

                        {/* Minimum */}
                        {/* <td className="px-3 py-2.5 text-right font-medium text-slate-600 tabular-nums">
                            {fmtCurrency(toNumber(ct.minimum))}
                        </td> */}

                        {/* Cost Detail */}
                        {(subTab === 'all' || subTab === 'bill') && (
                            <td className="px-3 py-2.5 min-w-[140px] cursor-pointer hover:bg-slate-50 transition-colors"
                                onClick={(e) => { e.stopPropagation(); setIsEditingOtCost(true); }}
                            >
                                {isEditingOtCost ? (
                                    <div className="flex flex-col gap-1.5 p-1.5 bg-red-50/50 rounded border border-red-100">
                                        <span className="text-[8px] font-bold text-red-400 uppercase tracking-tight">Adj Cost/OT</span>
                                        <input
                                            type="number"
                                            value={otCostManual}
                                            onChange={(e) => setOtCostManual(e.target.value)}
                                            onBlur={handleSave}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                            autoFocus
                                            className="w-full h-6 text-[10px] text-right border border-red-200 rounded px-1 focus:ring-1 focus:ring-red-500 outline-none"
                                            onClick={e => e.stopPropagation()}
                                        />
                                    </div>
                                ) : (
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
                                            <span className="text-[8px] font-bold text-muted-foreground uppercase">Travel:</span>
                                            <span className="text-[10px] font-semibold text-indigo-600">{fmtCurrency(expCost)}</span>
                                        </div>
                                        <div className="pt-0.5 border-t flex justify-between items-center gap-2">
                                            <span className="text-[9px] font-extrabold uppercase">Cost:</span>
                                            <span className="text-[10px] font-extrabold">{fmtCurrency(clockedCostVal + otCost + expCost)}</span>
                                        </div>
                                    </div>
                                )}
                            </td>
                        )}

                        {/* Price Detail */}
                        <td className="px-3 py-2.5 min-w-[140px] cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={(e) => { e.stopPropagation(); setIsEditingOtPrice(true); }}
                        >
                            {isEditingOtPrice ? (
                                <div className="flex flex-col gap-1.5 p-1.5 bg-primary/5 rounded border border-primary/10">
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Adj Price/OT</span>
                                    <input
                                        type="number"
                                        value={otPriceManual}
                                        onChange={(e) => setOtPriceManual(e.target.value)}
                                        onBlur={handleSave}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                        autoFocus
                                        className="w-full h-6 text-[10px] text-right border border-blue-200 rounded px-1 focus:ring-1 focus:ring-primary outline-none"
                                        onClick={e => e.stopPropagation()}
                                    />
                                </div>
                            ) : (
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
                                        <span className="text-[8px] font-bold text-muted-foreground uppercase">Travel:</span>
                                        <span className="text-[10px] font-semibold text-indigo-600">{fmtCurrency(expPrice)}</span>
                                    </div>
                                    <div className="pt-0.5 border-t flex justify-between items-center gap-2">
                                        <span className="text-[9px] font-extrabold uppercase">Price:</span>
                                        <span className="text-[10px] font-extrabold">{fmtCurrency(clockedPriceVal + otPrice + expPrice)}</span>
                                    </div>
                                </div>
                            )}
                        </td>

                        <td className="px-3 py-2.5 text-center">
                            <button
                                role="switch"
                                aria-checked={isCommApp}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsCommApp(prev => !prev);
                                }}
                                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:ring-offset-1 ${isCommApp ? 'bg-indigo-600' : 'bg-slate-200'}`}
                            >
                                <span
                                    aria-hidden="true"
                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${isCommApp ? 'translate-x-4' : 'translate-x-0'}`}
                                />
                            </button>
                        </td>

                        {/* Status */}
                        <td className="px-3 py-2.5 text-center">
                            <Badge
                                variant={isRejected ? 'destructive' : reviewRating ? 'info' : 'secondary'}
                                className="text-[9px] font-bold px-1.5 py-0.5 whitespace-nowrap"
                            >
                                {reviewRating === 'MET_EXPECTATIONS' ? 'APPROVED' :
                                    (reviewRating === 'DID_NOT_MEET' || reviewRating === 'NO_CALL_NO_SHOW') ? 'REJECTED' :
                                        reviewRating === 'NEEDS_IMPROVEMENT' ? 'REVIEW' : 'PENDING'}
                            </Badge>
                        </td>
                    </>
                )}

            </tr>

            {/* Expanded detail */}
            {isExpanded && <ExpandedRowDetail ct={ct} onViewEvent={onViewEvent} />}
        </>
    );
}
