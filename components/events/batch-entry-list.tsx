'use client';

import { Badge } from '@/components/ui/badge';
import { CheckIcon, AlertIcon } from '@/components/ui/icons';
import { Accordion } from '@/components/ui/accordion';
import { BatchEntryItem } from './batch-entry-item';
import type { RowValidationResult } from '@/lib/utils/event-import';
import type { ImportEventRow } from '@/lib/schemas/event-import.schema';
import type { ClientOption, TerminologyConfig } from './form-sections';

interface BatchEntryListProps {
  entries: RowValidationResult[];
  onUpdateEntry: (index: number, data: Partial<ImportEventRow>) => void;
  onRemoveEntry: (index: number) => void;
  clients: ClientOption[];
  terminology: TerminologyConfig;
}

export function BatchEntryList({
  entries,
  onUpdateEntry,
  onRemoveEntry,
  clients,
  terminology,
}: BatchEntryListProps) {
  const validCount = entries.filter((e) => e.valid).length;
  const invalidCount = entries.filter((e) => !e.valid).length;

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg">
        No entries remaining. Upload a new file or switch to single entry.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="default">
          <CheckIcon className="h-3 w-3 mr-1" />
          {validCount} valid
        </Badge>
        {invalidCount > 0 && (
          <Badge variant="destructive">
            <AlertIcon className="h-3 w-3 mr-1" />
            {invalidCount} invalid
          </Badge>
        )}
        <span className="text-sm text-muted-foreground ml-2">
          Click on an entry to expand and edit
        </span>
      </div>

      {/* Accordion with all entries - all collapsed by default */}
      <Accordion type="multiple" className="space-y-2">
        {entries.map((entry) => (
          <BatchEntryItem
            key={entry.rowIndex}
            entry={entry}
            index={entry.rowIndex}
            onUpdate={onUpdateEntry}
            onRemove={onRemoveEntry}
            clients={clients}
            terminology={terminology}
          />
        ))}
      </Accordion>
    </div>
  );
}
