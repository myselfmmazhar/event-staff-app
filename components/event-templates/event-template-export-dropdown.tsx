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
  exportTemplatesCSV,
  exportTemplatesExcel,
  downloadSampleTemplate,
  type EventTemplateExport,
} from '@/lib/utils/event-template-export';
import { toast } from '@/components/ui/use-toast';

interface EventTemplateExportDropdownProps {
  templates: EventTemplateExport[];
  selectedTemplates: EventTemplateExport[];
  selectedCount: number;
  disabled?: boolean;
}

export function EventTemplateExportDropdown({
  templates,
  selectedTemplates,
  selectedCount,
  disabled,
}: EventTemplateExportDropdownProps) {
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
    if (templates.length === 0) {
      toast({ title: 'No templates to export', type: 'info' });
      return;
    }

    setIsExporting(true);
    try {
      if (format === 'csv') {
        exportTemplatesCSV(templates);
      } else {
        exportTemplatesExcel(templates);
      }
      toast({ title: `Exported ${templates.length} templates to ${format.toUpperCase()}`, type: 'success' });
      setIsOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      toast({ title: 'Failed to export templates', type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSelected = async (format: 'csv' | 'xlsx') => {
    if (selectedTemplates.length === 0) {
      toast({ title: 'No templates selected', type: 'info' });
      return;
    }

    setIsExporting(true);
    try {
      if (format === 'csv') {
        exportTemplatesCSV(selectedTemplates);
      } else {
        exportTemplatesExcel(selectedTemplates);
      }
      toast({ title: `Exported ${selectedTemplates.length} templates to ${format.toUpperCase()}`, type: 'success' });
      setIsOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      toast({ title: 'Failed to export templates', type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadSample = (format: 'csv' | 'xlsx') => {
    try {
      downloadSampleTemplate(format);
      toast({ title: 'Sample template downloaded', type: 'success' });
      setIsOpen(false);
    } catch (error) {
      console.error('Download failed:', error);
      toast({ title: 'Failed to download sample template', type: 'error' });
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
              Export All ({templates.length})
            </div>
            <button
              onClick={() => handleExportAll('csv')}
              disabled={templates.length === 0 || isExporting}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileTextIcon className="h-4 w-4 text-muted-foreground" />
              <span>Export as CSV</span>
            </button>
            <button
              onClick={() => handleExportAll('xlsx')}
              disabled={templates.length === 0 || isExporting}
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

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Sample Template */}
          <div className="p-1">
            <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Sample Template
            </div>
            <button
              onClick={() => handleDownloadSample('csv')}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent"
            >
              <FileTextIcon className="h-4 w-4 text-muted-foreground" />
              <span>Download Sample (CSV)</span>
            </button>
            <button
              onClick={() => handleDownloadSample('xlsx')}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent"
            >
              <FileSpreadsheetIcon className="h-4 w-4 text-muted-foreground" />
              <span>Download Sample (Excel)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
