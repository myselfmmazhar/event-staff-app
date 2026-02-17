import { Badge } from '@/components/ui/badge';
import { ChevronDownIcon, ChevronUpIcon } from '@/components/ui/icons';
import { formatDate, formatTimeRange, getAcceptedStaff } from './helpers';
import { ExpandedRowDetail } from './expanded-row-detail';
import type { CallTimeRow } from './types';

export function TimesheetTableRow({ ct, isExpanded, isSelected, onToggleExpand, onToggleSelect, onViewEvent }: {
    ct: CallTimeRow;
    isExpanded: boolean;
    isSelected: boolean;
    onToggleExpand: (id: string, e: React.MouseEvent) => void;
    onToggleSelect: (id: string, e: React.MouseEvent) => void;
    onViewEvent: (id: string) => void;
}) {
    const accepted = getAcceptedStaff(ct.invitations);

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

                {/* Dept */}
                <td className="px-3 py-2.5">
                    <Badge variant="primary" className="text-xs font-medium whitespace-nowrap">
                        {ct.service?.title || 'Unassigned'}
                    </Badge>
                </td>

                {/* Event Title */}
                <td className="px-3 py-2.5">
                    <span className="text-foreground font-medium truncate max-w-[180px] block">{ct.event.title}</span>
                </td>

                {/* PO */}
                <td className="px-3 py-2.5 text-muted-foreground text-xs">{ct.event.poNumber || ''}</td>

                {/* Client */}
                <td className="px-3 py-2.5">
                    {ct.event.client ? (
                        <Badge variant="secondary" className="text-xs whitespace-nowrap">{ct.event.client.businessName}</Badge>
                    ) : null}
                </td>

                {/* Start Date */}
                <td className="px-3 py-2.5 text-muted-foreground text-xs whitespace-nowrap">{formatDate(ct.startDate)}</td>

                {/* End Date */}
                <td className="px-3 py-2.5 text-muted-foreground text-xs whitespace-nowrap">{formatDate(ct.endDate || ct.event.endDate)}</td>

                {/* Time Range */}
                <td className="px-3 py-2.5 text-muted-foreground text-xs whitespace-nowrap">
                    {formatTimeRange(ct.startTime, ct.endTime)}
                </td>

                {/* Venue */}
                <td className="px-3 py-2.5">
                    <span className="text-muted-foreground text-xs truncate max-w-[160px] block">
                        {ct.event.venueName || ''}
                        {ct.event.city ? `, ${ct.event.city}` : ''}
                    </span>
                </td>

                {/* Staff Status */}
                <td className="px-3 py-2.5">
                    <Badge
                        variant={ct.needsStaff ? 'warning' : 'success'}
                        className="text-xs whitespace-nowrap"
                    >
                        {ct.confirmedCount}/{ct.numberOfStaffRequired}
                    </Badge>
                </td>

                {/* Talent */}
                <td className="px-3 py-2.5">
                    {accepted.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                            {accepted.slice(0, 2).map((inv) => (
                                <Badge key={inv.id} variant="outline" className="text-xs">
                                    {inv.staff.firstName} {inv.staff.lastName.charAt(0)}.
                                </Badge>
                            ))}
                            {accepted.length > 2 && (
                                <Badge variant="outline" className="text-xs">+{accepted.length - 2}</Badge>
                            )}
                        </div>
                    ) : ct.needsStaff ? (
                        <span className="text-xs text-muted-foreground italic">Unassigned</span>
                    ) : null}
                </td>
            </tr>

            {/* Expanded detail */}
            {isExpanded && <ExpandedRowDetail ct={ct} onViewEvent={onViewEvent} />}
        </>
    );
}
