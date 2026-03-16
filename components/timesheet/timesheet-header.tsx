import { Button } from '@/components/ui/button';
import { FilterIcon, TableCellsIcon } from '@/components/ui/icons';
import { CallTimeExportDropdown } from '@/components/events/call-time-export-dropdown';
import type { CallTimeRow } from './types';

interface TimesheetHeaderProps {
    eventPluralLabel: string;
    showFilters: boolean;
    onToggleFilters: () => void;
    hasActiveFilters: boolean | string;
    callTimes: CallTimeRow[];
    selectedCallTimes: CallTimeRow[];
    selectedCount: number;
    onGenerateInvoices?: () => void;
    activeTab: 'task' | 'client' | 'talent';
    onTabChange: (tab: 'task' | 'client' | 'talent') => void;
}

export function TimesheetHeader({
    eventPluralLabel,
    showFilters,
    onToggleFilters,
    hasActiveFilters,
    callTimes,
    selectedCallTimes,
    selectedCount,
    onGenerateInvoices,
    activeTab,
    onTabChange,
}: TimesheetHeaderProps) {
    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <TableCellsIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Time Manager</h1>
                        <p className="text-sm text-muted-foreground">
                            Overview of All completed & Progress Tasks & Assignments
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {selectedCount > 0 && onGenerateInvoices && (
                        <Button
                            variant="default"
                            size="sm"
                            onClick={onGenerateInvoices}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            Generate Invoice ({selectedCount})
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onToggleFilters}
                        className={showFilters ? 'border-primary text-primary' : ''}
                    >
                        <FilterIcon className="h-4 w-4 mr-1.5" />
                        Filters
                        {hasActiveFilters && (
                            <span className="ml-1.5 h-2 w-2 rounded-full bg-primary inline-block" />
                        )}
                    </Button>
                    <CallTimeExportDropdown
                        callTimes={callTimes}
                        selectedCallTimes={selectedCallTimes}
                        selectedCount={selectedCount}
                        disabled={callTimes.length === 0}
                    />
                </div>
            </div>

            <div className="flex items-center border-b border-border">
                <button
                    onClick={() => onTabChange('task')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'task'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                        }`}
                >
                    Task
                </button>
                <button
                    onClick={() => onTabChange('client')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'client'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                        }`}
                >
                    Client
                </button>
                <button
                    onClick={() => onTabChange('talent')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'talent'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                        }`}
                >
                    Talent
                </button>
            </div>
        </div>
    );
}
