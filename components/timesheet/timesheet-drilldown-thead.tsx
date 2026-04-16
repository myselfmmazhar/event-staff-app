'use client';

import type React from 'react';
import { TableColumnResizeHandle } from '@/components/common/table-column-resize-handle';
import { cn } from '@/lib/utils';
import type { SortField, SortOrder } from '@/components/timesheet/types';
import { DRILLDOWN_COLUMN_IDS, type TimesheetDrilldownSubTab } from '@/lib/timesheet/drilldown-column-order';
import { ChevronDownIcon, ChevronUpIcon, ChevronsUpDownIcon } from '@/components/ui/icons';

type TimesheetDrilldownTheadRowProps = {
    subTab: TimesheetDrilldownSubTab;
    sortBy: SortField;
    sortOrder: SortOrder;
    onSort: (field: SortField) => void;
    onResizeMouseDown: (columnKey: string, e: React.MouseEvent) => void;
    checkboxCell: React.ReactNode;
};

function SortCell({
    id,
    label,
    align = 'text-left',
    className = '',
    sortBy,
    sortOrder,
    onSort,
}: {
    id: SortField;
    label: React.ReactNode;
    align?: 'text-left' | 'text-center' | 'text-right';
    className?: string;
    sortBy: SortField;
    sortOrder: SortOrder;
    onSort: (field: SortField) => void;
}) {
    return (
        <div
            role="button"
            tabIndex={0}
            className={cn(
                'px-3 py-3 whitespace-normal cursor-pointer hover:bg-muted/30 transition-colors text-[10px] font-bold uppercase tracking-wide text-muted-foreground',
                align,
                className
            )}
            onClick={() => onSort(id)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSort(id);
                }
            }}
        >
            <div
                className={cn(
                    'flex items-center gap-1',
                    align === 'text-right' ? 'justify-end' : align === 'text-center' ? 'justify-center' : ''
                )}
            >
                {label}
                {sortBy === id ? (
                    sortOrder === 'asc' ? (
                        <ChevronUpIcon className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                        <ChevronDownIcon className="h-3.5 w-3.5 shrink-0" />
                    )
                ) : (
                    <ChevronsUpDownIcon className="h-3.5 w-3.5 shrink-0 opacity-50" />
                )}
            </div>
        </div>
    );
}

function StaticLabel({
    label,
    align = 'text-left',
    className = '',
}: {
    label: React.ReactNode;
    align?: 'text-left' | 'text-center' | 'text-right';
    className?: string;
}) {
    return (
        <div
            className={cn(
                'px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground',
                align,
                className
            )}
        >
            {label}
        </div>
    );
}

function ResizableTh({
    className,
    style,
    children,
}: {
    className?: string;
    style?: React.CSSProperties;
    children: React.ReactNode;
}) {
    return (
        <th className={cn(className)} style={style}>
            <div className="group relative min-h-[2.5rem] min-w-0">{children}</div>
        </th>
    );
}

export function TimesheetDrilldownTheadRow({
    subTab,
    sortBy,
    sortOrder,
    onSort,
    onResizeMouseDown,
    checkboxCell,
}: TimesheetDrilldownTheadRowProps) {
    const sortProps = { sortBy, sortOrder, onSort };
    const columnOrder = [...DRILLDOWN_COLUMN_IDS[subTab]];

    const renderColumn = (columnId: string): React.ReactNode => {
        if (subTab === 'invoice') {
            switch (columnId) {
                case 'startDate':
                    return (
                        <ResizableTh
                            key={columnId}
                            className="relative truncate p-0"
                            style={{ width: `var(--col-startDate)` }}
                        >
                            <SortCell id="startDate" label="Service Date" {...sortProps} />
                            <TableColumnResizeHandle onMouseDown={(e) => onResizeMouseDown('startDate', e)} />
                        </ResizableTh>
                    );
                case 'service':
                    return (
                        <ResizableTh
                            key={columnId}
                            className="relative truncate p-0"
                            style={{ width: `var(--col-service)` }}
                        >
                            <SortCell
                                id="service"
                                label={
                                    <>
                                        Services / <br />
                                        Products
                                    </>
                                }
                                className="max-w-[100px]"
                                {...sortProps}
                            />
                            <TableColumnResizeHandle onMouseDown={(e) => onResizeMouseDown('service', e)} />
                        </ResizableTh>
                    );
                case 'description':
                    return (
                        <ResizableTh
                            key={columnId}
                            className="relative truncate px-0 text-left"
                            style={{ width: `var(--col-description)` }}
                        >
                            <StaticLabel
                                label="Invoice Description"
                                className="min-w-[500px] whitespace-normal"
                            />
                            <TableColumnResizeHandle onMouseDown={(e) => onResizeMouseDown('description', e)} />
                        </ResizableTh>
                    );
                case 'qty':
                    return (
                        <ResizableTh
                            key={columnId}
                            className="relative truncate text-center"
                            style={{ width: `var(--col-qty)` }}
                        >
                            <StaticLabel label="Qty" align="text-center" className="whitespace-nowrap" />
                            <TableColumnResizeHandle onMouseDown={(e) => onResizeMouseDown('qty', e)} />
                        </ResizableTh>
                    );
                case 'invoice':
                    return (
                        <ResizableTh
                            key={columnId}
                            className="relative truncate p-0"
                            style={{ width: `var(--col-invoice)` }}
                        >
                            <SortCell id="invoice" label="Total Invoice" align="text-right" {...sortProps} />
                            <TableColumnResizeHandle onMouseDown={(e) => onResizeMouseDown('invoice', e)} />
                        </ResizableTh>
                    );
                case 'netIncome':
                    return (
                        <ResizableTh
                            key={columnId}
                            className="relative truncate text-right"
                            style={{ width: `var(--col-netIncome)` }}
                        >
                            <StaticLabel label="Net Income" align="text-right" className="whitespace-nowrap" />
                            <TableColumnResizeHandle onMouseDown={(e) => onResizeMouseDown('netIncome', e)} />
                        </ResizableTh>
                    );
                default:
                    return null;
            }
        }

        if (subTab === 'bill') {
            switch (columnId) {
                case 'category':
                    return (
                        <ResizableTh
                            key={columnId}
                            className="relative truncate text-left"
                            style={{ width: `var(--col-category)` }}
                        >
                            <StaticLabel label="Category" className="whitespace-nowrap" />
                            <TableColumnResizeHandle onMouseDown={(e) => onResizeMouseDown('category', e)} />
                        </ResizableTh>
                    );
                case 'description':
                    return (
                        <ResizableTh
                            key={columnId}
                            className="relative min-w-[500px] truncate text-left"
                            style={{ width: `var(--col-description)` }}
                        >
                            <StaticLabel label="Bill Description" />
                            <TableColumnResizeHandle onMouseDown={(e) => onResizeMouseDown('description', e)} />
                        </ResizableTh>
                    );
                case 'bill':
                    return (
                        <ResizableTh
                            key={columnId}
                            className="relative truncate p-0"
                            style={{ width: `var(--col-bill)` }}
                        >
                            <SortCell id="bill" label="Total Bill" align="text-right" {...sortProps} />
                            <TableColumnResizeHandle onMouseDown={(e) => onResizeMouseDown('bill', e)} />
                        </ResizableTh>
                    );
                case 'netIncome':
                    return (
                        <ResizableTh
                            key={columnId}
                            className="relative truncate text-right"
                            style={{ width: `var(--col-netIncome)` }}
                        >
                            <StaticLabel label="Net Income" align="text-right" className="whitespace-nowrap" />
                            <TableColumnResizeHandle onMouseDown={(e) => onResizeMouseDown('netIncome', e)} />
                        </ResizableTh>
                    );
                case 'status':
                    return (
                        <ResizableTh
                            key={columnId}
                            className="relative truncate p-0"
                            style={{ width: `var(--col-status)` }}
                        >
                            <SortCell id="status" label="Status" align="text-center" {...sortProps} />
                            <TableColumnResizeHandle onMouseDown={(e) => onResizeMouseDown('status', e)} />
                        </ResizableTh>
                    );
                default:
                    return null;
            }
        }

        if (subTab === 'commission') {
            switch (columnId) {
                case 'action':
                    return (
                        <ResizableTh
                            key={columnId}
                            className="whitespace-nowrap px-3 py-3 text-center align-bottom text-[10px] font-bold uppercase tracking-wide text-muted-foreground"
                            style={{ width: `var(--col-cmAction)` }}
                        >
                            <StaticLabel label="Action" align="text-center" />
                        </ResizableTh>
                    );
                case 'staffName':
                    return (
                        <ResizableTh
                            key={columnId}
                            className="relative truncate p-0"
                            style={{ width: `var(--col-cmStaff)` }}
                        >
                            <SortCell id="staffName" label="Team / User" {...sortProps} />
                            <TableColumnResizeHandle onMouseDown={(e) => onResizeMouseDown('cmStaff', e)} />
                        </ResizableTh>
                    );
                case 'description':
                    return (
                        <ResizableTh
                            key={columnId}
                            className="relative truncate px-0 text-left align-bottom"
                            style={{ width: `var(--col-cmDesc)` }}
                        >
                            <StaticLabel label="Bill Description" />
                            <TableColumnResizeHandle onMouseDown={(e) => onResizeMouseDown('cmDesc', e)} />
                        </ResizableTh>
                    );
                case 'price':
                    return (
                        <ResizableTh
                            key={columnId}
                            className="relative truncate p-0"
                            style={{ width: `var(--col-cmPrice)` }}
                        >
                            <SortCell id="price" label="Commission Price" align="text-right" {...sortProps} />
                            <TableColumnResizeHandle onMouseDown={(e) => onResizeMouseDown('cmPrice', e)} />
                        </ResizableTh>
                    );
                case 'status':
                    return (
                        <ResizableTh
                            key={columnId}
                            className="relative truncate p-0"
                            style={{ width: `var(--col-cmStatus)` }}
                        >
                            <SortCell id="status" label="Status" align="text-center" {...sortProps} />
                            <TableColumnResizeHandle onMouseDown={(e) => onResizeMouseDown('cmStatus', e)} />
                        </ResizableTh>
                    );
                default:
                    return null;
            }
        }

        // all
        switch (columnId) {
            case 'action':
                return (
                    <ResizableTh
                        key={columnId}
                        className="whitespace-nowrap px-3 py-3 text-center align-bottom text-[10px] font-bold uppercase tracking-wide text-muted-foreground"
                        style={{ width: `var(--col-action)` }}
                    >
                        <StaticLabel label="Action" align="text-center" />
                    </ResizableTh>
                );
            case 'talent':
                return (
                    <ResizableTh
                        key={columnId}
                        className="relative truncate p-0"
                        style={{ width: `var(--col-talent)` }}
                    >
                        <SortCell id="staffName" label="Talent" {...sortProps} />
                        <TableColumnResizeHandle onMouseDown={(e) => onResizeMouseDown('talent', e)} />
                    </ResizableTh>
                );
            case 'service':
                return (
                    <ResizableTh
                        key={columnId}
                        className="relative truncate p-0"
                        style={{ width: `var(--col-service)` }}
                    >
                        <SortCell id="service" label="Services / Products" {...sortProps} />
                        <TableColumnResizeHandle onMouseDown={(e) => onResizeMouseDown('service', e)} />
                    </ResizableTh>
                );
            case 'startDate':
                return (
                    <ResizableTh
                        key={columnId}
                        className="relative truncate p-0"
                        style={{ width: `var(--col-date)` }}
                    >
                        <SortCell id="startDate" label="Schedule Date" {...sortProps} />
                        <TableColumnResizeHandle onMouseDown={(e) => onResizeMouseDown('date', e)} />
                    </ResizableTh>
                );
            case 'scheduledShift':
                return (
                    <ResizableTh
                        key={columnId}
                        className="relative truncate p-0"
                        style={{ width: `var(--col-scheduled)` }}
                    >
                        <SortCell id="scheduledShift" label="Scheduled Shift" {...sortProps} />
                        <TableColumnResizeHandle onMouseDown={(e) => onResizeMouseDown('scheduled', e)} />
                    </ResizableTh>
                );
            case 'actualShift':
                return (
                    <ResizableTh
                        key={columnId}
                        className="relative truncate p-0"
                        style={{ width: `var(--col-actual)` }}
                    >
                        <SortCell id="actualShift" label="Actual Shift" {...sortProps} />
                        <TableColumnResizeHandle onMouseDown={(e) => onResizeMouseDown('actual', e)} />
                    </ResizableTh>
                );
            case 'variance':
                return (
                    <ResizableTh
                        key={columnId}
                        className="relative truncate p-0"
                        style={{ width: `var(--col-variance)` }}
                    >
                        <SortCell id="variance" label="Variance" align="text-center" {...sortProps} />
                        <TableColumnResizeHandle onMouseDown={(e) => onResizeMouseDown('variance', e)} />
                    </ResizableTh>
                );
            case 'rateType':
                return (
                    <ResizableTh
                        key={columnId}
                        className="relative truncate p-0"
                        style={{ width: `var(--col-rateType)` }}
                    >
                        <SortCell id="rateType" label="Rate Type" align="text-center" {...sortProps} />
                        <TableColumnResizeHandle onMouseDown={(e) => onResizeMouseDown('rateType', e)} />
                    </ResizableTh>
                );
            case 'invoice':
                return (
                    <ResizableTh
                        key={columnId}
                        className="relative truncate p-0"
                        style={{ width: `var(--col-invoice)` }}
                    >
                        <SortCell id="invoice" label="Total Invoice" align="text-right" {...sortProps} />
                        <TableColumnResizeHandle onMouseDown={(e) => onResizeMouseDown('invoice', e)} />
                    </ResizableTh>
                );
            case 'bill':
                return (
                    <ResizableTh
                        key={columnId}
                        className="relative truncate p-0"
                        style={{ width: `var(--col-bill)` }}
                    >
                        <SortCell id="bill" label="Total Bill" align="text-right" {...sortProps} />
                        <TableColumnResizeHandle onMouseDown={(e) => onResizeMouseDown('bill', e)} />
                    </ResizableTh>
                );
            case 'netIncome':
                return (
                    <ResizableTh
                        key={columnId}
                        className="relative truncate text-right"
                        style={{ width: `var(--col-netIncome)` }}
                    >
                        <StaticLabel label="Net Income" align="text-right" className="whitespace-nowrap" />
                        <TableColumnResizeHandle onMouseDown={(e) => onResizeMouseDown('netIncome', e)} />
                    </ResizableTh>
                );
            case 'commission':
                return (
                    <ResizableTh
                        key={columnId}
                        className="relative truncate p-0"
                        style={{ width: `var(--col-commission)` }}
                    >
                        <SortCell id="commission" label="Commission" align="text-center" {...sortProps} />
                        <TableColumnResizeHandle onMouseDown={(e) => onResizeMouseDown('commission', e)} />
                    </ResizableTh>
                );
            case 'minimum':
                return (
                    <ResizableTh
                        key={columnId}
                        className="relative truncate p-0"
                        style={{ width: `var(--col-minimum)` }}
                    >
                        <SortCell id="minimum" label="Minimum" align="text-right" {...sortProps} />
                        <TableColumnResizeHandle onMouseDown={(e) => onResizeMouseDown('minimum', e)} />
                    </ResizableTh>
                );
            case 'status':
                return (
                    <ResizableTh
                        key={columnId}
                        className="relative truncate p-0"
                        style={{ width: `var(--col-status)` }}
                    >
                        <SortCell id="status" label="Status" align="text-center" {...sortProps} />
                        <TableColumnResizeHandle onMouseDown={(e) => onResizeMouseDown('status', e)} />
                    </ResizableTh>
                );
            case 'notes':
                return (
                    <ResizableTh
                        key={columnId}
                        className="relative truncate p-0"
                        style={{ width: `var(--col-notes)` }}
                    >
                        <SortCell id="notes" label="Notes" className="min-w-[250px]" {...sortProps} />
                        <TableColumnResizeHandle onMouseDown={(e) => onResizeMouseDown('notes', e)} />
                    </ResizableTh>
                );
            default:
                return null;
        }
    };

    return (
        <tr className="border-0 bg-transparent">
            <th className="w-8 min-w-8 max-w-8 px-2 py-3 align-bottom">{checkboxCell}</th>
            <th className="w-8 min-w-8 max-w-8 px-2 py-3 align-bottom" />
            {columnOrder.map((id) => renderColumn(id))}
        </tr>
    );
}
