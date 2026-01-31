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
  exportClientsCSV,
  exportClientsExcel,
  type ClientExport,
} from '@/lib/utils/client-export';
import { toast } from '@/components/ui/use-toast';

interface ClientExportDropdownProps {
  clients: ClientExport[];
  selectedClients: ClientExport[];
  selectedCount: number;
  disabled?: boolean;
}

export function ClientExportDropdown({
  clients,
  selectedClients,
  selectedCount,
  disabled,
}: ClientExportDropdownProps) {
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
    if (clients.length === 0) {
      toast({ title: 'No clients to export', type: 'info' });
      return;
    }

    setIsExporting(true);
    try {
      if (format === 'csv') {
        exportClientsCSV(clients);
      } else {
        exportClientsExcel(clients);
      }
      toast({ title: `Exported ${clients.length} clients to ${format.toUpperCase()}`, type: 'success' });
      setIsOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      toast({ title: 'Failed to export clients', type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSelected = async (format: 'csv' | 'xlsx') => {
    if (selectedClients.length === 0) {
      toast({ title: 'No clients selected', type: 'info' });
      return;
    }

    setIsExporting(true);
    try {
      if (format === 'csv') {
        exportClientsCSV(selectedClients);
      } else {
        exportClientsExcel(selectedClients);
      }
      toast({ title: `Exported ${selectedClients.length} clients to ${format.toUpperCase()}`, type: 'success' });
      setIsOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      toast({ title: 'Failed to export clients', type: 'error' });
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
              Export All ({clients.length})
            </div>
            <button
              onClick={() => handleExportAll('csv')}
              disabled={clients.length === 0 || isExporting}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileTextIcon className="h-4 w-4 text-muted-foreground" />
              <span>Export as CSV</span>
            </button>
            <button
              onClick={() => handleExportAll('xlsx')}
              disabled={clients.length === 0 || isExporting}
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
