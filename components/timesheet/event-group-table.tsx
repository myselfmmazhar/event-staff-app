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
    const totalStaff = group.callTimes.length;
    const totalAssigned = group.callTimes.filter(ct => !!ct.staff).length;
    const groupNeedsStaff = totalAssigned < totalStaff;

    return (
        <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
            {/* ── Group Header ── */}
            <button
                onClick={() => onToggleGroup(group.eventId)}
                className="flex items-center gap-3 w-full px-4 py-3 text-left bg-muted/30 hover:bg-muted/45 transition-all border-b border-border"
            >
                <div className={`flex items-center justify-center h-6 w-6 rounded-md transition-colors ${isCollapsed ? 'bg-muted' : 'bg-muted'}`}>
                    {isCollapsed ? (
                        <ChevronDownIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                        <ChevronUpIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                </div>
                <span className="font-semibold text-sm text-foreground">{group.eventTitle}</span>
                <Badge variant="outline" className="text-xs">{group.eventDisplayId}</Badge>
                <div className="ml-auto flex items-center gap-2">
                    <Badge variant={groupNeedsStaff ? 'warning' : 'success'} className="text-xs">
                        {totalAssigned}/{totalStaff} staffed
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
                                <tr className="border-b border-border bg-muted/30">
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
                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Talent</th>
                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Service / Product</th>
                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Date</th>
                                    <th className="text-center px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Action</th>
                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Scheduled Shift</th>
                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Actual Shift</th>
                                    <th className="text-center px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Variance</th>
                                    <th className="text-center px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Rate Type</th>
                                    <th className="text-right px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Total Invoice</th>
                                    <th className="text-right px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Total Bill</th>
                                    <th className="text-right px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Net Income</th>
                                    <th className="text-center px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Commission</th>
                                    <th className="text-right px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Minimum</th>
                                    <th className="text-center px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Status</th>
                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground pr-6">Notes</th>
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
