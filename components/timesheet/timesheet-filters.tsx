import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    CalendarIcon,
    FilterIcon,
    SearchIcon,
    UsersIcon,
} from '@/components/ui/icons';
import type { StaffingFilter } from './types';

interface TimesheetFiltersProps {
    search: string;
    onSearchChange: (value: string) => void;
    showFilters: boolean;
    onToggleFilters: () => void;
    dateFrom: string;
    onDateFromChange: (value: string) => void;
    dateTo: string;
    onDateToChange: (value: string) => void;
    staffingFilter: StaffingFilter;
    onStaffingFilterChange: (value: StaffingFilter) => void;
    hasActiveFilters: boolean | string;
    onClearFilters: () => void;
    totalAssignments: number;
    totalEvents: number;
    eventPluralLabel: string;
}

export function TimesheetFilters({
    search,
    onSearchChange,
    showFilters,
    dateFrom,
    onDateFromChange,
    dateTo,
    onDateToChange,
    staffingFilter,
    onStaffingFilterChange,
    hasActiveFilters,
    onClearFilters,
    totalAssignments,
    totalEvents,
    eventPluralLabel,
}: TimesheetFiltersProps) {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={`Search ${eventPluralLabel} or positions...`}
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Badge variant="secondary" className="text-xs whitespace-nowrap">
                    {totalAssignments} assignment{totalAssignments !== 1 ? 's' : ''} · {totalEvents} {eventPluralLabel}
                </Badge>
            </div>

            {/* Collapsible filter panel */}
            {showFilters && (
                <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-border bg-muted/30">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Filters</span>
                            {hasActiveFilters && (
                                <button
                                    onClick={onClearFilters}
                                    className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                                >
                                    Clear All
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="p-4">
                        <div className="flex flex-wrap gap-6">
                            {/* Date Range Group */}
                            <div className="space-y-2.5">
                                <div className="flex items-center gap-1.5">
                                    <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-xs font-medium text-muted-foreground">Date Range</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="date"
                                        value={dateFrom}
                                        onChange={(e) => onDateFromChange(e.target.value)}
                                        className="w-[150px] h-8 text-xs"
                                    />
                                    <span className="text-xs text-muted-foreground">to</span>
                                    <Input
                                        type="date"
                                        value={dateTo}
                                        onChange={(e) => onDateToChange(e.target.value)}
                                        className="w-[150px] h-8 text-xs"
                                    />
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="hidden sm:block w-px bg-border self-stretch" />

                            {/* Staffing Status Group */}
                            <div className="space-y-2.5">
                                <div className="flex items-center gap-1.5">
                                    <UsersIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-xs font-medium text-muted-foreground">Staffing Status</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {(['all', 'needsStaff', 'fullyStaffed'] as const).map((value) => {
                                        const labels: Record<StaffingFilter, string> = {
                                            all: 'All',
                                            needsStaff: 'Needs Staff',
                                            fullyStaffed: 'Fully Staffed',
                                        };
                                        const isActive = staffingFilter === value;
                                        return (
                                            <button
                                                key={value}
                                                onClick={() => onStaffingFilterChange(value)}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-all ${isActive
                                                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                                    : 'bg-background text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground'
                                                    }`}
                                            >
                                                {labels[value]}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
