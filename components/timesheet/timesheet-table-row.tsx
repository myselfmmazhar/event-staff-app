import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ChevronDownIcon, ChevronUpIcon, EditIcon, CheckIcon, CloseIcon } from '@/components/ui/icons';
import {
    getAcceptedStaff,
    combineDateTime,
    fmtDateTime,
    formatDate,
    formatTime,
    calcScheduledHours,
    calcClockedHours,
    toNumber,
    calcScheduledCost,
    calcClockedCost,
    calcBillAmount,
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
}: {
    ct: CallTimeRow;
    isExpanded: boolean;
    isSelected: boolean;
    onToggleExpand: (id: string, e: React.MouseEvent) => void;
    onToggleSelect: (id: string, e: React.MouseEvent) => void;
    onViewEvent: (id: string) => void;
    onSaveTimeEntry?: (invitationId: string, clockIn: string | null, clockOut: string | null, breakMins: number) => void;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const te = ct.timeEntry;
    const [clockIn, setClockIn] = useState(toInputDatetime(te?.clockIn ?? null));
    const [clockOut, setClockOut] = useState(toInputDatetime(te?.clockOut ?? null));
    const [breakMins, setBreakMins] = useState(te?.breakMinutes ?? 0);

    const hoursScheduled = calcScheduledHours(ct);
    const hoursClocked = calcClockedHours(te);
    const scheduledCost = calcScheduledCost(ct);
    const clockedCostVal = calcClockedCost(te, ct);
    const billAmount = calcBillAmount(ct);

    const handleSave = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onSaveTimeEntry) {
            onSaveTimeEntry(ct.id, clockIn || null, clockOut || null, breakMins);
        }
        setIsEditing(false);
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

                {/* First Name */}
                <td className="px-3 py-2.5 font-bold text-primary">{ct.staff?.firstName || '—'}</td>

                {/* Last Name */}
                <td className="px-3 py-2.5 font-bold text-primary">{ct.staff?.lastName || '—'}</td>

                {/* Payroll ID */}
                {/* <td className="px-3 py-2.5 text-muted-foreground">{ct.staff?.payrollId || '—'}</td> */}

                {/* HR ID */}
                {/* <td className="px-3 py-2.5 text-muted-foreground">{ct.staff?.hrSystemId || '—'}</td> */}

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

                {/* Pay Rate */}
                <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                    ${toNumber(ct.payRate).toFixed(2)}
                </td>

                {/* Rate Type */}
                <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap text-[10px] uppercase">
                    {ct.payRateType.replace('PER_', '')}
                </td>

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
                            className="px-3 py-2.5 whitespace-nowrap text-[10px] hover:bg-emerald-50 transition-colors"
                            onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                        >
                            {te?.clockIn ? <span className="text-emerald-600 font-medium">{fmtDateTime(te.clockIn)}</span> : <span className="text-slate-300 italic">Not clocked</span>}
                        </td>
                        {/* Clock Out */}
                        <td 
                            className="px-3 py-2.5 whitespace-nowrap text-[10px] hover:bg-red-50 transition-colors"
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

                {/* Sched Cost */}
                <td className="px-3 py-2.5 text-right tabular-nums">
                    {scheduledCost > 0 ? fmtCurrency(scheduledCost) : '—'}
                </td>

                {/* Clo Cost */}
                <td className="px-3 py-2.5 text-right tabular-nums">
                    {clockedCostVal > 0 ? fmtCurrency(clockedCostVal) : '—'}
                </td>

                {/* Bill Amount */}
                <td className="px-3 py-2.5 text-right tabular-nums font-bold text-primary">
                    {billAmount > 0 ? fmtCurrency(billAmount) : '0.00'}
                </td>

                {/* Actions */}
                <td className="px-3 py-2.5">
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsEditing(!isEditing); }}
                        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors bg-primary/5 hover:bg-primary/10 px-2 py-1 rounded-md"
                    >
                        <EditIcon className="h-3 w-3" />
                        {te ? 'Edit' : 'Clock'}
                    </button>
                </td>
            </tr>

            {/* Expanded detail */}
            {isExpanded && <ExpandedRowDetail ct={ct} onViewEvent={onViewEvent} />}
        </>
    );
}
