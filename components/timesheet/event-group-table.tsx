import { Badge } from '@/components/ui/badge';
import { ChevronDownIcon, ChevronUpIcon } from '@/components/ui/icons';
import { SortIndicator } from './sort-indicator';
import { TimesheetTableRow } from './timesheet-table-row';
import { MobileRowCard } from './mobile-row-card';
import type { CallTimeRow, EventGroup, SortField, SortOrder } from './types';
import { useTableResize } from '@/hooks/use-table-resize';
import { TableColumnResizeHandle } from '@/components/common/table-column-resize-handle';
import { cn } from '@/lib/utils';

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
    const { onMouseDown, getTableStyle } = useTableResize('timesheet-assignments');
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
                        <table className="w-full text-sm table-fixed" style={getTableStyle()}>
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
                                    <th className={cn("relative group px-3 py-2 font-medium text-muted-foreground whitespace-nowrap text-center truncate")} style={{ width: `var(--col-action)` }}>
                                        Action
                                        <TableColumnResizeHandle onMouseDown={(e) => onMouseDown('action', e)} />
                                    </th>
                                    <th className={cn("relative group px-3 py-2 font-medium text-muted-foreground whitespace-nowrap text-left truncate")} style={{ width: `var(--col-talent)` }}>
                                        Talent
                                        <TableColumnResizeHandle onMouseDown={(e) => onMouseDown('talent', e)} />
                                    </th>
                                    <th className={cn("relative group px-3 py-2 font-medium text-muted-foreground whitespace-nowrap text-left truncate")} style={{ width: `var(--col-service)` }}>
                                        Service / Product
                                        <TableColumnResizeHandle onMouseDown={(e) => onMouseDown('service', e)} />
                                    </th>
                                    <th className={cn("relative group px-3 py-2 font-medium text-muted-foreground whitespace-nowrap text-left truncate")} style={{ width: `var(--col-date)` }}>
                                        Date
                                        <TableColumnResizeHandle onMouseDown={(e) => onMouseDown('date', e)} />
                                    </th>
                                    <th className={cn("relative group px-3 py-2 font-medium text-muted-foreground whitespace-nowrap text-left truncate")} style={{ width: `var(--col-scheduled)` }}>
                                        Scheduled Shift
                                        <TableColumnResizeHandle onMouseDown={(e) => onMouseDown('scheduled', e)} />
                                    </th>
                                    <th className={cn("relative group px-3 py-2 font-medium text-muted-foreground whitespace-nowrap text-left truncate")} style={{ width: `var(--col-actual)` }}>
                                        Actual Shift
                                        <TableColumnResizeHandle onMouseDown={(e) => onMouseDown('actual', e)} />
                                    </th>
                                    <th className={cn("relative group px-3 py-2 font-medium text-muted-foreground whitespace-nowrap text-center truncate")} style={{ width: `var(--col-variance)` }}>
                                        Variance
                                        <TableColumnResizeHandle onMouseDown={(e) => onMouseDown('variance', e)} />
                                    </th>
                                    <th className={cn("relative group px-3 py-2 font-medium text-muted-foreground whitespace-nowrap text-center truncate")} style={{ width: `var(--col-rateType)` }}>
                                        Rate Type
                                        <TableColumnResizeHandle onMouseDown={(e) => onMouseDown('rateType', e)} />
                                    </th>
                                    <th className={cn("relative group px-3 py-2 font-medium text-muted-foreground whitespace-nowrap text-right truncate")} style={{ width: `var(--col-invoice)` }}>
                                        Total Invoice
                                        <TableColumnResizeHandle onMouseDown={(e) => onMouseDown('invoice', e)} />
                                    </th>
                                    <th className={cn("relative group px-3 py-2 font-medium text-muted-foreground whitespace-nowrap text-right truncate")} style={{ width: `var(--col-bill)` }}>
                                        Total Bill
                                        <TableColumnResizeHandle onMouseDown={(e) => onMouseDown('bill', e)} />
                                    </th>
                                    <th className={cn("relative group px-3 py-2 font-medium text-muted-foreground whitespace-nowrap text-right truncate")} style={{ width: `var(--col-netIncome)` }}>
                                        Net Income
                                        <TableColumnResizeHandle onMouseDown={(e) => onMouseDown('netIncome', e)} />
                                    </th>
                                    <th className={cn("relative group px-3 py-2 font-medium text-muted-foreground whitespace-nowrap text-center truncate")} style={{ width: `var(--col-commission)` }}>
                                        Commission
                                        <TableColumnResizeHandle onMouseDown={(e) => onMouseDown('commission', e)} />
                                    </th>
                                    <th className={cn("relative group px-3 py-2 font-medium text-muted-foreground whitespace-nowrap text-right truncate")} style={{ width: `var(--col-minimum)` }}>
                                        Minimum
                                        <TableColumnResizeHandle onMouseDown={(e) => onMouseDown('minimum', e)} />
                                    </th>
                                    <th className={cn("relative group px-3 py-2 font-medium text-muted-foreground whitespace-nowrap text-center truncate")} style={{ width: `var(--col-status)` }}>
                                        Status
                                        <TableColumnResizeHandle onMouseDown={(e) => onMouseDown('status', e)} />
                                    </th>
                                    <th className={cn("relative group px-3 py-2 font-medium text-muted-foreground pr-6 text-left truncate")} style={{ width: `var(--col-notes)` }}>
                                        Notes
                                        <TableColumnResizeHandle onMouseDown={(e) => onMouseDown('notes', e)} />
                                    </th>
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
