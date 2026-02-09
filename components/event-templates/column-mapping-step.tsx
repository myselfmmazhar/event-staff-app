'use client';

import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckIcon, AlertIcon } from '@/components/ui/icons';
import { TEMPLATE_FIELDS, type ColumnMapping } from '@/lib/utils/event-template-import';

interface ColumnMappingStepProps {
  headers: string[];
  mapping: ColumnMapping[];
  onMappingChange: (mapping: ColumnMapping[]) => void;
}

export function ColumnMappingStep({
  headers,
  mapping,
  onMappingChange,
}: ColumnMappingStepProps) {
  // Check if required field is mapped
  const nameField = TEMPLATE_FIELDS.find((f) => f.value === 'name');
  const nameMapped = mapping.some((m) => m.targetField === 'name');

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
    { group: 'Required', fields: TEMPLATE_FIELDS.filter((f) => f.required) },
    { group: 'Skip', fields: TEMPLATE_FIELDS.filter((f) => f.value === 'skip') },
    { group: 'Template Info', fields: TEMPLATE_FIELDS.filter((f) => ['name', 'description', 'title', 'eventDescription', 'requirements', 'privateComments'].includes(f.value) && !f.required) },
    { group: 'Client & Venue', fields: TEMPLATE_FIELDS.filter((f) => ['clientName', 'venueName', 'address', 'city', 'state', 'zipCode', 'latitude', 'longitude', 'meetingPoint'].includes(f.value)) },
    { group: 'Date & Time', fields: TEMPLATE_FIELDS.filter((f) => ['startDate', 'endDate', 'startTime', 'endTime', 'timezone'].includes(f.value)) },
    { group: 'Request Info', fields: TEMPLATE_FIELDS.filter((f) => ['requestMethod', 'requestorName', 'requestorPhone', 'requestorEmail', 'poNumber', 'preEventInstructions'].includes(f.value)) },
    { group: 'Onsite Contact', fields: TEMPLATE_FIELDS.filter((f) => ['onsitePocName', 'onsitePocPhone', 'onsitePocEmail'].includes(f.value)) },
    { group: 'Other', fields: TEMPLATE_FIELDS.filter((f) => ['fileLinks', 'eventDocuments'].includes(f.value)) },
  ];

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Badge variant={nameMapped ? 'default' : 'destructive'}>
          {nameMapped ? (
            <>
              <CheckIcon className="h-3 w-3 mr-1" />
              Required field mapped
            </>
          ) : (
            <>
              <AlertIcon className="h-3 w-3 mr-1" />
              Template Name not mapped
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
          {mapping.map((m, index) => {
            const currentField = TEMPLATE_FIELDS.find((f) => f.value === m.targetField);
            const isRequired = currentField?.required;
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
        Match each column from your file to the corresponding template field.
        Columns mapped to "Skip" will not be imported.
      </p>
    </div>
  );
}
