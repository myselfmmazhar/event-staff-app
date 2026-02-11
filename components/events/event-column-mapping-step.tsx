'use client';

import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckIcon, AlertIcon } from '@/components/ui/icons';
import { EVENT_FIELDS, type ColumnMapping } from '@/lib/utils/event-import';

interface EventColumnMappingStepProps {
  headers: string[];
  mapping: ColumnMapping[];
  onMappingChange: (mapping: ColumnMapping[]) => void;
}

// Required fields for events
const REQUIRED_FIELD_VALUES = [
  'title',
  'venueName',
  'address',
  'city',
  'state',
  'zipCode',
  'startDate',
  'endDate',
  'timezone',
];

export function EventColumnMappingStep({
  headers,
  mapping,
  onMappingChange,
}: EventColumnMappingStepProps) {
  // Check which required fields are mapped
  const mappedRequired = REQUIRED_FIELD_VALUES.filter((field) =>
    mapping.some((m) => m.targetField === field)
  );
  const allRequiredMapped = mappedRequired.length === REQUIRED_FIELD_VALUES.length;
  const missingRequired = REQUIRED_FIELD_VALUES.filter(
    (field) => !mapping.some((m) => m.targetField === field)
  );

  // Count how many fields are mapped (excluding skip)
  const mappedCount = mapping.filter((m) => m.targetField !== 'skip').length;

  const handleFieldChange = (sourceColumn: string, targetField: string) => {
    const newMapping = mapping.map((m) =>
      m.sourceColumn === sourceColumn ? { ...m, targetField } : m
    );
    onMappingChange(newMapping);
  };

  // Group fields for better organization in dropdown
  const groupedFields = [
    { group: 'Skip', fields: EVENT_FIELDS.filter((f) => f.value === 'skip') },
    { group: 'Required', fields: EVENT_FIELDS.filter((f) => f.group === 'Required') },
    { group: 'Event Info', fields: EVENT_FIELDS.filter((f) => f.group === 'Event Info') },
    { group: 'Client & Venue', fields: EVENT_FIELDS.filter((f) => f.group === 'Client & Venue') },
    { group: 'Date & Time', fields: EVENT_FIELDS.filter((f) => f.group === 'Date & Time') },
    { group: 'Request Info', fields: EVENT_FIELDS.filter((f) => f.group === 'Request Info') },
    { group: 'Onsite Contact', fields: EVENT_FIELDS.filter((f) => f.group === 'Onsite Contact') },
    { group: 'Other', fields: EVENT_FIELDS.filter((f) => f.group === 'Other' && f.value !== 'skip') },
  ];

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Badge variant={allRequiredMapped ? 'default' : 'destructive'}>
          {allRequiredMapped ? (
            <>
              <CheckIcon className="h-3 w-3 mr-1" />
              All required fields mapped
            </>
          ) : (
            <>
              <AlertIcon className="h-3 w-3 mr-1" />
              Missing: {missingRequired.join(', ')}
            </>
          )}
        </Badge>
        <Badge variant="secondary">
          {mappedCount} of {headers.length} columns mapped
        </Badge>
      </div>

      {/* Mapping table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 font-medium text-sm border-b">
          <div>File Column</div>
          <div>Maps To</div>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {mapping.map((m) => {
            const currentField = EVENT_FIELDS.find((f) => f.value === m.targetField);
            const isMapped = m.targetField !== 'skip';

            return (
              <div
                key={m.sourceColumn}
                className={`grid grid-cols-2 gap-4 p-3 border-b last:border-b-0 items-center ${!isMapped ? 'bg-muted/20' : ''
                  }`}
              >
                <div className="font-mono text-sm truncate" title={m.sourceColumn}>
                  {m.sourceColumn}
                </div>
                <div>
                  <Select
                    value={m.targetField}
                    onValueChange={(value) => handleFieldChange(m.sourceColumn, value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      {groupedFields.map((group) =>
                        group.fields.length > 0 ? (
                          <SelectGroup key={group.group}>
                            <SelectLabel>{group.group}</SelectLabel>
                            {group.fields.map((field) => (
                              <SelectItem key={field.value} value={field.value}>
                                {field.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ) : null
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Help text */}
      <p className="text-sm text-muted-foreground">
        Match each column from your file to the corresponding event field.
        Fields marked with * are required. Columns mapped to "Skip" will not be imported.
      </p>
    </div>
  );
}
