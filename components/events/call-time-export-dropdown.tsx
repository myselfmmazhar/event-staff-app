'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    DownloadIcon,
    ChevronDownIcon,
    FileTextIcon,
    FileSpreadsheetIcon,
} from '@/components/ui/icons';
import {
    exportCallTimesCSV,
    exportCallTimesExcel,
    type CallTimeExport,
} from '@/lib/utils/call-time-export';
import { toast } from '@/components/ui/use-toast';

interface CallTimeExportDropdownProps {
    callTimes: CallTimeExport[];
    selectedCallTimes: CallTimeExport[];
    selectedCount: number;
    disabled?: boolean;
}

export function CallTimeExportDropdown({
    callTimes,
    selectedCallTimes,
    selectedCount,
    disabled,
}: CallTimeExportDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
        return undefined;
    }, [isOpen]);

    const hasSelection = selectedCount > 0;

    const handleExportAll = async (format: 'csv' | 'xlsx') => {
        if (callTimes.length === 0) {
            toast({ title: 'No data to export', type: 'info' });
            return;
        }

        setIsExporting(true);
        try {
            if (format === 'csv') {
                exportCallTimesCSV(callTimes);
            } else {
                exportCallTimesExcel(callTimes);
            }
            toast({
                title: `Exported ${callTimes.length} assignments to ${format.toUpperCase()}`,
                type: 'success',
            });
            setIsOpen(false);
        } catch (error) {
            console.error('Export failed:', error);
            toast({ title: 'Failed to export data', type: 'error' });
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportSelected = async (format: 'csv' | 'xlsx') => {
        if (selectedCallTimes.length === 0) {
            toast({ title: 'No rows selected', type: 'info' });
            return;
        }

        setIsExporting(true);
        try {
            if (format === 'csv') {
                exportCallTimesCSV(selectedCallTimes);
            } else {
                exportCallTimesExcel(selectedCallTimes);
            }
            toast({
                title: `Exported ${selectedCallTimes.length} assignments to ${format.toUpperCase()}`,
                type: 'success',
            });
            setIsOpen(false);
        } catch (error) {
            console.error('Export failed:', error);
            toast({ title: 'Failed to export data', type: 'error' });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <Button
                variant="outline"
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled || isExporting}
                className="gap-2"
            >
                <DownloadIcon className="h-4 w-4" />
                Export
                <ChevronDownIcon
                    className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </Button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-lg border border-border bg-card shadow-lg z-50">
                    {/* Export All */}
                    <div className="p-1">
                        <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Export All ({callTimes.length})
                        </div>
                        <button
                            onClick={() => handleExportAll('csv')}
                            disabled={callTimes.length === 0 || isExporting}
                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FileTextIcon className="h-4 w-4 text-muted-foreground" />
                            <span>Export as CSV</span>
                        </button>
                        <button
                            onClick={() => handleExportAll('xlsx')}
                            disabled={callTimes.length === 0 || isExporting}
                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FileSpreadsheetIcon className="h-4 w-4 text-muted-foreground" />
                            <span>Export as Excel</span>
                        </button>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-border" />

                    {/* Export Selected */}
                    <div className="p-1">
                        <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Export Selected ({selectedCount})
                        </div>
                        <button
                            onClick={() => handleExportSelected('csv')}
                            disabled={!hasSelection || isExporting}
                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FileTextIcon className="h-4 w-4 text-muted-foreground" />
                            <span>Export Selected as CSV</span>
                        </button>
                        <button
                            onClick={() => handleExportSelected('xlsx')}
                            disabled={!hasSelection || isExporting}
                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FileSpreadsheetIcon className="h-4 w-4 text-muted-foreground" />
                            <span>Export Selected as Excel</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
