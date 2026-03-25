import { Badge } from '@/components/ui/badge';
import { ChevronDownIcon, ChevronUpIcon } from '@/components/ui/icons';
import { SortIndicator } from './sort-indicator';
import { TimesheetTableRow } from './timesheet-table-row';
import { MobileRowCard } from './mobile-row-card';
import type { CallTimeRow, EventGroup, SortField, SortOrder } from './types';

interface EventGroupTableProps {
    group: EventGroup;
    isCollapsed: boolean;
    onToggleGroup: (eventId: string) => void;
    expandedRows: Set<string>;
    selectedRows: Set<string>;
    onToggleExpand: (id: string, e: React.MouseEvent) => void;
    onToggleSelect: (id: string, e: React.MouseEvent) => void;
    onToggleSelectAll: (groupIds: string[]) => void;
    onViewEvent: (id: string) => void;
    sortBy: SortField;
    sortOrder: SortOrder;
    onSort: (field: SortField) => void;
    onSaveTimeEntry?: (invitationId: string, clockIn: string | null, clockOut: string | null, breakMins: number) => void;
}

export function EventGroupTable({
    group,
    isCollapsed,
    onToggleGroup,
    expandedRows,
    selectedRows,
    onToggleExpand,
    onToggleSelect,
    onToggleSelectAll,
    onViewEvent,
    sortBy,
    sortOrder,
    onSort,
    onSaveTimeEntry,
}: EventGroupTableProps) {
    const totalStaff = group.callTimes.reduce((s, ct) => s + ct.numberOfStaffRequired, 0);
    const totalConfirmed = group.callTimes.reduce((s, ct) => s + ct.confirmedCount, 0);
    const groupNeedsStaff = totalConfirmed < totalStaff;

    return (
        <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
            {/* ── Group Header ── */}
            <button
                onClick={() => onToggleGroup(group.eventId)}
                className="flex items-center gap-3 w-full px-4 py-3 text-left bg-gradient-to-r from-muted/50 to-muted/20 hover:from-muted/70 hover:to-muted/30 transition-all border-b border-border"
            >
                <div className={`flex items-center justify-center h-6 w-6 rounded-md transition-colors ${isCollapsed ? 'bg-muted' : 'bg-primary/10'}`}>
                    {isCollapsed ? (
                        <ChevronDownIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                        <ChevronUpIcon className="h-3.5 w-3.5 text-primary" />
                    )}
                </div>
                <span className="font-semibold text-sm text-foreground">{group.eventTitle}</span>
                <Badge variant="outline" className="text-xs">{group.eventDisplayId}</Badge>
                <div className="ml-auto flex items-center gap-2">
                    <Badge variant={groupNeedsStaff ? 'warning' : 'success'} className="text-xs">
                        {totalConfirmed}/{totalStaff} staffed
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                        {group.callTimes.length} row{group.callTimes.length !== 1 ? 's' : ''}
                    </Badge>
                </div>
            </button>

            {/* ── Table ── */}
            {!isCollapsed && (
                <>
                    {/* Desktop */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/15">
                                    <th className="w-8 px-2 py-2">
                                        {(() => {
                                            const groupIds = group.callTimes.map((ct) => ct.id);
                                            const isGroupAllSelected = groupIds.length > 0 && groupIds.every((id) => selectedRows.has(id));
                                            return (
                                                <input
                                                    type="checkbox"
                                                    checked={isGroupAllSelected}
                                                    onChange={() => onToggleSelectAll(groupIds)}
                                                    className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
                                                    title={`Select all in ${group.eventTitle}`}
                                                />
                                            );
                                        })()}
                                    </th>
                                    <th className="w-8 px-2 py-2" />
                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Full Name</th>
                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Payroll ID</th>
                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">HR ID</th>
                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Position</th>
                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Start Time</th>
                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">End Time</th>
                                    <th className="text-center px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Hours Scheduled</th>
                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Pay Rate</th>
                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Clock In</th>
                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Clock Out</th>
                                    <th className="text-center px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Hours Clocked</th>
                                    <th className="text-right px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Scheduled Cost</th>
                                    <th className="text-right px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Clocked Cost</th>
                                    <th className="text-right px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Bill Amount</th>
                                    <th className="text-right px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">OT Cost</th>
                                    <th className="text-right px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">OT Price</th>
                                    <th className="px-3 py-2" />
                                </tr>
                            </thead>
                            <tbody>
                                {group.callTimes.map((ct) => (
                                    <TimesheetTableRow
                                        key={ct.id}
                                        ct={ct}
                                        isExpanded={expandedRows.has(ct.id)}
                                        isSelected={selectedRows.has(ct.id)}
                                        onToggleExpand={onToggleExpand}
                                        onToggleSelect={onToggleSelect}
                                        onViewEvent={onViewEvent}
                                        onSaveTimeEntry={onSaveTimeEntry}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile */}
                    <div className="md:hidden divide-y divide-border">
                        {group.callTimes.map((ct) => (
                            <MobileRowCard key={ct.id} ct={ct} onRowClick={onViewEvent} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
