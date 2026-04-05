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
    calcExpenditurePrice,
    getTimeOnly
} from './helpers';
import { ExpandedRowDetail } from './expanded-row-detail';
import type { CallTimeRow } from './types';
import { TalentContactPopover } from './talent-contact-popover';
import { ActionDropdown, type ActionItem } from '@/components/common/action-dropdown';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    onSaveTimeEntry?: (invitationId: string, clockIn: string | null, clockOut: string | null, breakMins: number, otCost?: number | null, otPrice?: number | null, notes?: string | null, shiftCost?: number | null, shiftPrice?: number | null, travelCost?: number | null, travelPrice?: number | null, commission?: boolean) => void;
    showEventName?: boolean;
    onApprove?: (id: string) => void;
    onReject?: (id: string) => void;
    onReview?: (id: string) => void;
    onPending?: (id: string) => void;
    subTab?: 'all' | 'bill' | 'invoice' | 'commission';
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
    const [billBasis, setBillBasis] = useState<'ACTUAL' | 'SCHEDULED'>('ACTUAL');
    const [invoiceBasis, setInvoiceBasis] = useState<'ACTUAL' | 'SCHEDULED'>('ACTUAL');

    useEffect(() => {
        setIsCommApp(!!ct.commission);
    }, [ct.commission]);

    useEffect(() => {
        ct.commission = isCommApp;
    }, [isCommApp, ct]);

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
    const totalBill = calcTotalBill(te, ct, isCommApp, billBasis);
    const totalInvoice = calcTotalInvoice(te, ct, isCommApp, invoiceBasis);
    const grossProfit = totalInvoice - totalBill;

    const commissionCost = isCommApp ? totalBill - calcTotalBill(te, ct, false, billBasis) : 0;
    const commissionPrice = isCommApp ? totalInvoice - calcTotalInvoice(te, ct, false, invoiceBasis) : 0;



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

            onSaveTimeEntry(
                ct.id,
                clockIn || null,
                clockOut || null,
                breakMins,
                parsedOtCost !== null && !isNaN(parsedOtCost) ? parsedOtCost : (otCostManual === '' ? null : undefined),
                parsedOtPrice !== null && !isNaN(parsedOtPrice) ? parsedOtPrice : (otPriceManual === '' ? null : undefined),
                localNotes,
                parsedShiftCost !== null && !isNaN(parsedShiftCost) ? parsedShiftCost : (shiftCostManual === '' ? null : undefined),
                parsedShiftPrice !== null && !isNaN(parsedShiftPrice) ? parsedShiftPrice : (shiftPriceManual === '' ? null : undefined),
                parsedTravelCost !== null && !isNaN(parsedTravelCost) ? parsedTravelCost : (travelCostManual === '' ? null : undefined),
                parsedTravelPrice !== null && !isNaN(parsedTravelPrice) ? parsedTravelPrice : (travelPriceManual === '' ? null : undefined),
                isCommApp
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

            onSaveTimeEntry(
                ct.id,
                clockIn || null,
                clockOut || null,
                breakMins,
                parsedOtCost !== null && !isNaN(parsedOtCost) ? parsedOtCost : (otCostManual === '' ? null : undefined),
                parsedOtPrice !== null && !isNaN(parsedOtPrice) ? parsedOtPrice : (otPriceManual === '' ? null : undefined),
                localNotes,
                parsedShiftCost !== null && !isNaN(parsedShiftCost) ? parsedShiftCost : (shiftCostManual === '' ? null : undefined),
                parsedShiftPrice !== null && !isNaN(parsedShiftPrice) ? parsedShiftPrice : (shiftPriceManual === '' ? null : undefined),
                parsedTravelCost !== null && !isNaN(parsedTravelCost) ? parsedTravelCost : (travelCostManual === '' ? null : undefined),
                parsedTravelPrice !== null && !isNaN(parsedTravelPrice) ? parsedTravelPrice : (travelPriceManual === '' ? null : undefined),
                val
            );
        }
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
                        {subTab !== 'invoice' && subTab !== 'bill' && (
                            <td className="w-10 px-2 py-2.5 text-center relative" onClick={e => e.stopPropagation()}>
                                <ActionDropdown actions={actions} align="start" />
                            </td>
                        )}

                        {/* Service Date */}
                        <td className="px-3 py-2.5 whitespace-nowrap text-[11px] font-medium text-slate-600">
                            {formatDate(ct.startDate)}
                        </td>

                        {/* Services / Product (Position) */}
                        <td className="px-3 py-2.5">
                            <Badge variant="primary" className="text-[10px] whitespace-nowrap bg-blue-100 text-blue-700 hover:bg-blue-200 border-none leading-tight py-1 font-bold">
                                {ct.service?.title || '—'}
                            </Badge>
                        </td>



                        {/* Description - Simplified Format as requested */}
                        <td className="px-3 py-4 text-[11px] leading-relaxed text-slate-600 min-w-[500px]">
                            <div className="flex flex-col gap-1.5">
                                <div className="flex flex-col">
                                    <span className="font-bold text-[10px] text-slate-400 uppercase tracking-tight">Scheduled shift</span>
                                    <div className="font-medium text-slate-700">
                                        <span>{formatDate(ct.startDate)} {formatTime(ct.startTime)} - {formatDate(ct.endDate || ct.startDate)} {formatTime(ct.endTime)} ({hoursScheduled.toFixed(2)} hrs)</span>
                                    </div>
                                </div>

                                <div className="flex flex-col mt-1">
                                    {isEditingNotes ? (
                                        <div onClick={e => e.stopPropagation()}>
                                            <textarea
                                                value={localNotes}
                                                onChange={e => setLocalNotes(e.target.value)}
                                                className="w-full text-[10px] border border-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none min-h-[50px] bg-white text-slate-700 font-medium"
                                                autoFocus
                                                onBlur={handleSave}
                                            />
                                            <div className="flex justify-end mt-1">
                                                <button onClick={handleSave} className="p-1 bg-emerald-500 text-white rounded hover:bg-emerald-600">
                                                    <CheckIcon className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            className="group relative cursor-pointer hover:bg-slate-50 p-1.5 rounded transition-all font-medium text-slate-500 italic border border-transparent hover:border-slate-100"
                                            onClick={(e) => { e.stopPropagation(); setIsEditingNotes(true); }}
                                        >
                                            <p className="line-clamp-3">{localNotes || 'Click to add notes...'}</p>
                                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <EditIcon className="h-3.5 w-3.5 text-slate-400" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </td>

                        {/* QTY (Staff Count) */}
                        <td className="px-3 py-2.5 text-center font-bold text-slate-700 tabular-nums">
                            {ct.mergedRows?.length || (!ct.staff ? ct.numberOfStaffRequired : 1)}
                        </td>

                        {/* Price */}
                        <td className="px-3 py-2.5 text-right font-semibold text-slate-600 tabular-nums">
                            <Popover open={isEditingOtPrice} onOpenChange={setIsEditingOtPrice}>
                                <PopoverTrigger asChild>
                                    <div className="cursor-pointer hover:bg-slate-50 transition-colors p-1 rounded" onClick={e => e.stopPropagation()}>
                                        {fmtCurrency(toNumber(ct.billRate))}
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

                        {/* Invoice Amount */}
                        <td className="px-3 py-2.5 text-right font-extrabold text-primary tabular-nums text-[13px] pr-6">
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
                    </>
                ) : subTab === 'bill' ? (
                    <>
                        {/* Action */}
                        {subTab !== 'invoice' && subTab !== 'bill' && (
                            <td className="w-10 px-2 py-2.5 text-center relative" onClick={e => e.stopPropagation()}>
                                <ActionDropdown actions={actions} align="start" />
                            </td>
                        )}

                        {/* Category */}
                        <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                            <select className="text-[10px] p-1 bg-muted/40 border-none rounded focus:ring-1 focus:ring-primary/20 font-medium text-slate-600 cursor-pointer">
                                <option>Labor</option>
                                <option>Travel</option>
                                <option>Bonus</option>
                            </select>
                        </td>

                        {/* Bill Description - Matches Screenshot 2 + Notes */}
                        <td className="px-3 py-4 text-[10px] leading-relaxed min-w-[500px]">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col gap-1">
                                        <span className="font-bold text-primary text-[12px] uppercase tracking-tight">
                                            {ct.staff ? `${ct.staff.firstName} ${ct.staff.lastName}` : (ct.event?.title || '—')}
                                        </span>
                                        {ct.mergedRows && ct.mergedRows.length > 0 ? (
                                            <div className="flex flex-col gap-1 mt-1">
                                                {ct.mergedRows.map((row, idx) => (
                                                    <div key={row.id || idx} className="flex items-center gap-2">
                                                        <Badge variant="primary" className="bg-blue-50 text-blue-600 border-blue-100 text-[8px] px-1.5 py-0 font-bold uppercase">
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
                                                <Badge variant="primary" className="bg-blue-50 text-blue-600 border-blue-100 text-[9px] px-1.5 py-0 font-bold uppercase">
                                                    {ct.service?.title || '—'}
                                                </Badge>
                                                <td className="text-center px-3 py-2 whitespace-nowrap">
                                                    <Badge variant="outline" className="bg-muted/30 font-semibold">
                                                        {ct.mergedRows?.length || (!ct.staff ? ct.numberOfStaffRequired : 1)}
                                                    </Badge>
                                                </td>
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

                                {/* Notes Section */}
                                <div className="flex flex-col pt-1 border-t border-slate-50">
                                    <span className="font-bold text-[7px] text-slate-300 uppercase tracking-widest mb-0.5">Notes</span>
                                    {isEditingNotes ? (
                                        <div onClick={e => e.stopPropagation()}>
                                            <textarea
                                                value={localNotes}
                                                onChange={e => setLocalNotes(e.target.value)}
                                                className="w-full text-[10px] border border-border rounded p-1 focus:ring-1 focus:ring-red-500 outline-none min-h-[40px] bg-white text-slate-700 font-medium"
                                                autoFocus
                                            />
                                            <div className="flex justify-end mt-1">
                                                <button onClick={() => setIsEditingNotes(false)} className="p-1 bg-emerald-500 text-white rounded hover:bg-emerald-600">
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

                        {/* Bill Amount */}
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
                ) : subTab === 'commission' ? (
                    <>
                        {/* Action */}
                        <td className="w-10 px-2 py-2.5 text-center relative" onClick={e => e.stopPropagation()}>
                            <ActionDropdown actions={actions} align="start" />
                        </td>

                        {/* Team / User (Replacing Category) */}
                        <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                            <select className="text-[10px] p-1 bg-muted/40 border-none rounded focus:ring-1 focus:ring-primary/20 font-medium text-slate-600 cursor-pointer">
                                <option>Team A</option>
                                <option>Team B</option>
                                <option>Admin</option>
                                <option>User 1</option>
                            </select>
                        </td>

                        {/* Commission Description */}
                        <td className="px-3 py-4 text-[10px] leading-relaxed min-w-[350px]">
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

                                {/* Notes Section */}
                                <div className="flex flex-col pt-1 border-t border-slate-50">
                                    <span className="font-bold text-[7px] text-slate-300 uppercase tracking-widest mb-0.5">Notes</span>
                                    {isEditingNotes ? (
                                        <div onClick={e => e.stopPropagation()}>
                                            <textarea
                                                value={localNotes}
                                                onChange={e => setLocalNotes(e.target.value)}
                                                className="w-full text-[10px] border border-border rounded p-1 focus:ring-1 focus:ring-red-500 outline-none min-h-[40px] bg-white text-slate-700 font-medium"
                                                autoFocus
                                            />
                                            <div className="flex justify-end mt-1">
                                                <button onClick={() => setIsEditingNotes(false)} className="p-1 bg-emerald-500 text-white rounded hover:bg-emerald-600">
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


                        {/* Commission Price */}
                        <td className="px-3 py-2.5 text-right tabular-nums">
                            <div className="flex flex-col items-end">
                                <span className="text-[13px] font-extrabold text-foreground">{fmtCurrency(commissionPrice)}</span>
                                {ct.commissionAmountType === 'MULTIPLIER' && (
                                    <span className="text-[9px] text-muted-foreground font-medium">
                                        {(toNumber(ct.commissionAmount) * 100).toFixed(2)}% of {fmtCurrency(totalInvoice - commissionPrice)}
                                    </span>
                                )}
                            </div>
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
                                    <TalentContactPopover
                                        talent={ct.staff}
                                        trigger={
                                            <div className="flex flex-col leading-tight cursor-pointer hover:underline">
                                                <span>{ct.staff.firstName}</span>
                                                <span className="text-slate-500 font-semibold">{ct.staff.lastName}</span>
                                            </div>
                                        }
                                    />
                                ) : 'UNASSIGNED STAFF'
                            ) : (
                                <div className="whitespace-normal max-w-[200px] leading-tight">
                                    {ct.event?.title || '—'}
                                </div>
                            )}
                        </td>

                        {/* Services / Product (Position) */}
                        <td className="px-3 py-2.5">
                            <Badge variant="primary" className="text-[10px] whitespace-nowrap bg-blue-100 text-blue-700 hover:bg-blue-200 border-none leading-tight py-1 font-bold">
                                {ct.service?.title || '—'}
                            </Badge>
                        </td>

                        {/* Scheduled Shift */}
                        <td className="px-3 py-2.5 min-w-[220px]">
                            <div className="flex flex-col gap-1">
                                <div className="text-[10px] font-semibold text-slate-700 flex flex-col gap-0.5">
                                    <div className="flex items-center gap-1">
                                        <span className="bg-slate-100 px-1 rounded-sm">{formatDate(ct.startDate)}</span>
                                        <span className="font-bold">{formatTime(ct.startTime)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">to</span>
                                        <span className="bg-slate-100 px-1 rounded-sm">{formatDate(ct.endDate || ct.startDate)}</span>
                                        <span className="font-bold">{formatTime(ct.endTime)}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 pt-0.5 border-t border-slate-50">
                                    <span className="text-[10px] font-extrabold text-slate-500">{hoursScheduled.toFixed(2)} hrs</span>
                                </div>
                            </div>
                        </td>

                        {/* Actual Shift (formerly Clock In/Out) */}
                        <td className="px-3 py-2.5 min-w-[240px]" onClick={e => e.stopPropagation()}>
                            <Popover open={isEditing} onOpenChange={setIsEditing}>
                                <PopoverTrigger asChild>
                                    <div
                                        className={`flex flex-col gap-1 rounded transition-colors ${ct.staff ? 'cursor-pointer hover:bg-slate-50/50' : 'opacity-60 cursor-not-allowed'}`}
                                        onClick={e => !ct.staff && e.stopPropagation()}
                                    >
                                        <div className="text-[10px] font-semibold text-slate-700 flex flex-col gap-0.5">
                                            {te?.clockIn ? (
                                                <>
                                                    <div className="flex items-center gap-1">
                                                        <span className="bg-emerald-50 px-1 rounded-sm">{formatDate(te.clockIn)}</span>
                                                        <span className="font-bold">{formatTime(getTimeOnly(te.clockIn))}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">to</span>
                                                        {te?.clockOut ? (
                                                            <>
                                                                <span className="bg-red-50 px-1 rounded-sm">{formatDate(te.clockOut)}</span>
                                                                <span className="font-bold">{formatTime(getTimeOnly(te.clockOut))}</span>
                                                            </>
                                                        ) : (
                                                            <span className="text-slate-300 italic">No out</span>
                                                        )}
                                                    </div>
                                                </>
                                            ) : (
                                                <span className="text-slate-300 italic">Not clocked</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 pt-0.5 border-t border-emerald-50">
                                            <span className="text-[10px] font-extrabold text-emerald-600">
                                                {hoursClocked.toFixed(2)} hrs
                                            </span>
                                            {isEdited && <Badge variant="warning" className="text-[7px] h-2.5 px-0.5 leading-none">Edited</Badge>}
                                        </div>
                                    </div>
                                </PopoverTrigger>
                                {ct.staff && (
                                    <PopoverContent className="w-64 p-3" onClick={e => e.stopPropagation()}>
                                        <div className="space-y-3">
                                            <Label className="text-xs font-bold uppercase tracking-tight text-emerald-600">Edit Actual Shift</Label>
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
                                                    Net: {(() => {
                                                        if (!clockIn || !clockOut) return '0.00';
                                                        const start = new Date(clockIn).getTime();
                                                        const end = new Date(clockOut).getTime();
                                                        const diffHrs = (end - start) / (1000 * 60 * 60);
                                                        return Math.max(0, diffHrs - (breakMins / 60)).toFixed(2);
                                                    })()} hrs
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="h-7 text-[10px]">Cancel</Button>
                                                    <Button size="sm" onClick={handleSave} className="h-7 text-[10px] bg-emerald-600 hover:bg-emerald-700">Save</Button>
                                                </div>
                                            </div>
                                        </div>
                                    </PopoverContent>
                                )}
                            </Popover>
                        </td>

                        {/* Variance */}
                        <td className="px-3 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                                <span className={`text-[11px] font-bold ${Math.abs(hoursScheduled - hoursClocked) < 0.1 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {(hoursScheduled - hoursClocked).toFixed(2)}
                                </span>
                                <span className="text-[8px] font-bold text-muted-foreground uppercase opacity-70">Hrs</span>
                            </div>
                        </td>

                        <td className="px-3 py-2.5 text-center text-muted-foreground whitespace-nowrap text-[9px] uppercase font-bold">
                            {ct.payRateType.replace('PER_', '')}
                        </td>

                        {/* Minimum */}
                        {/* <td className="px-3 py-2.5 text-right font-medium text-slate-600 tabular-nums">
                            {fmtCurrency(toNumber(ct.minimum))}
                        </td> */}

                        {/* Cost Detail ... (Skipping the cost detail Popover part for brevity in TargetContent if possible, or just replacing the whole block) */}
                        {/* I will replace the Commission part below */}

                        {/* Cost Detail */}
                        {(subTab === 'all' || subTab === 'bill') && (
                            <td className="px-3 py-2.5 min-w-[140px]">
                                <Popover open={isEditingOtCost} onOpenChange={setIsEditingOtCost}>
                                    <PopoverTrigger asChild>
                                        <div className="space-y-0.5 text-right tabular-nums cursor-pointer hover:bg-slate-50 transition-colors p-1 rounded" onClick={e => e.stopPropagation()}>
                                            <div className="flex justify-between items-center gap-2">
                                                <span className="text-[8px] font-bold text-muted-foreground uppercase">Shift:</span>
                                                <span className="text-[10px] font-semibold">{fmtCurrency(clockedCostVal)}</span>
                                            </div>
                                            <div className="flex justify-between items-center gap-2">
                                                <span className="text-[8px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                                    OT:
                                                    {ct.approveOvertime && (
                                                        <span className="text-[7px] lowercase font-normal opacity-70">
                                                            ({ct.overtimeRateType === 'MULTIPLIER' ? `${toNumber(ct.overtimeRate || 1.5).toFixed(2)}x` : fmtCurrency(toNumber(ct.overtimeRate))})
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="text-[10px] font-semibold text-amber-600">{fmtCurrency(otCost)}</span>
                                            </div>
                                            <div className="flex justify-between items-center gap-2">
                                                <span className="text-[8px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                                    Travel:
                                                    {ct.expenditureAmountType === 'MULTIPLIER' && (
                                                        <span className="text-[7px] lowercase font-normal opacity-70">({(toNumber(ct.expenditureAmount) * 100).toFixed(0)}%)</span>
                                                    )}
                                                </span>
                                                <span className="text-[10px] font-semibold text-indigo-600">{fmtCurrency(expCost)}</span>
                                            </div>
                                            <div className="pt-0.5 border-t flex justify-between items-center gap-2">
                                                <span className="text-[9px] font-extrabold uppercase">Cost:</span>
                                                <span className="text-[10px] font-extrabold">{fmtCurrency(clockedCostVal + otCost + expCost)}</span>
                                            </div>
                                        </div>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-72" onClick={e => e.stopPropagation()}>
                                        <div className="space-y-4">
                                            <div className="space-y-3">
                                                <Label className="text-xs font-bold uppercase tracking-tight text-red-500">Adjust Cost Detail</Label>

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
                                                <Button size="sm" className="bg-red-500 hover:bg-red-600" onClick={handleSave}>Save</Button>
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </td>
                        )}

                        {/* Price Detail */}
                        <td className="px-3 py-2.5 min-w-[140px]">
                            <Popover open={isEditingOtPrice} onOpenChange={setIsEditingOtPrice}>
                                <PopoverTrigger asChild>
                                    <div className="space-y-0.5 text-right tabular-nums cursor-pointer hover:bg-slate-50 transition-colors p-1 rounded" onClick={e => e.stopPropagation()}>
                                        <div className="flex justify-between items-center gap-2">
                                            <span className="text-[8px] font-bold text-muted-foreground uppercase">Shift:</span>
                                            <span className="text-[10px] font-semibold">{fmtCurrency(clockedPriceVal)}</span>
                                        </div>
                                        <div className="flex justify-between items-center gap-2">
                                            <span className="text-[8px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                                OT:
                                                {ct.approveOvertime && (
                                                    <span className="text-[7px] lowercase font-normal opacity-70">
                                                        ({ct.overtimeRateType === 'MULTIPLIER' ? `${toNumber(ct.overtimeRate || 1.5).toFixed(2)}x` : fmtCurrency(toNumber(ct.overtimeRate))})
                                                    </span>
                                                )}
                                            </span>
                                            <span className="text-[10px] font-semibold text-amber-600">{fmtCurrency(otPrice)}</span>
                                        </div>
                                        <div className="flex justify-between items-center gap-2">
                                            <span className="text-[8px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                                Travel:
                                                {ct.expenditureAmountType === 'MULTIPLIER' && (
                                                    <span className="text-[7px] lowercase font-normal opacity-70">({(toNumber(ct.expenditureAmount) * 100).toFixed(0)}%)</span>
                                                )}
                                            </span>
                                            <span className="text-[10px] font-semibold text-indigo-600">{fmtCurrency(expPrice)}</span>
                                        </div>
                                        <div className="pt-0.5 border-t flex justify-between items-center gap-2">
                                            <span className="text-[9px] font-extrabold uppercase">Price:</span>
                                            <span className="text-[10px] font-extrabold">{fmtCurrency(clockedPriceVal + otPrice + expPrice)}</span>
                                        </div>
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-72" onClick={e => e.stopPropagation()}>
                                    <div className="space-y-4">
                                        <div className="space-y-3">
                                            <Label className="text-xs font-bold uppercase tracking-tight text-primary">Adjust Price Detail</Label>

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

                        <td className="px-3 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                                <span className={`text-[10px] font-bold ${isCommApp ? 'text-indigo-600' : 'text-slate-500'} uppercase tracking-wider min-w-[24px]`}>
                                    {isCommApp ? 'Yes' : 'No'}
                                </span>
                                <button
                                    role="switch"
                                    aria-checked={isCommApp}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleCommission(!isCommApp);
                                    }}
                                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:ring-offset-1 ${isCommApp ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${isCommApp ? 'translate-x-4' : 'translate-x-0'}`}
                                    />
                                </button>
                            </div>
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

                        {/* Notes (Internal Notes) - Moved after Status */}
                        <td className="px-3 py-2.5 whitespace-normal max-w-[400px] min-w-[250px] text-[10px] text-muted-foreground leading-snug" onClick={e => e.stopPropagation()}>
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
                    </>
                )}

            </tr>

            {/* Expanded detail */}
            {isExpanded && <ExpandedRowDetail ct={ct} onViewEvent={onViewEvent} />}
        </>
    );
}
