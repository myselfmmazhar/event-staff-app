'use client';

import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckIcon, AlertIcon } from '@/components/ui/icons';
import { CLIENT_FIELDS, type ColumnMapping } from '@/lib/utils/client-import';

interface ClientColumnMappingStepProps {
  headers: string[];
  mapping: ColumnMapping[];
  onMappingChange: (mapping: ColumnMapping[]) => void;
}

const REQUIRED_FIELD_VALUES = [
  'businessName',
  'firstName',
  'lastName',
  'email',
  'cellPhone',
  'city',
  'state',
  'zipCode',
];

export function ClientColumnMappingStep({
  headers,
  mapping,
  onMappingChange,
}: ClientColumnMappingStepProps) {
  const mappedRequired = REQUIRED_FIELD_VALUES.filter((field) =>
    mapping.some((m) => m.targetField === field)
  );
  const allRequiredMapped = mappedRequired.length === REQUIRED_FIELD_VALUES.length;
  const missingRequired = REQUIRED_FIELD_VALUES.filter(
    (field) => !mapping.some((m) => m.targetField === field)
  );

  const mappedCount = mapping.filter((m) => m.targetField !== 'skip').length;

  const handleFieldChange = (sourceColumn: string, targetField: string) => {
    const newMapping = mapping.map((m) =>
      m.sourceColumn === sourceColumn ? { ...m, targetField } : m
    );
    onMappingChange(newMapping);
  };

  const groupedFields = [
    { group: 'Skip', fields: CLIENT_FIELDS.filter((f) => f.value === 'skip') },
    { group: 'Required', fields: CLIENT_FIELDS.filter((f) => f.group === 'Required') },
    { group: 'Optional', fields: CLIENT_FIELDS.filter((f) => f.group === 'Optional') },
    { group: 'Other', fields: CLIENT_FIELDS.filter((f) => f.group === 'Other' && f.value !== 'skip') },
  ];

  return (
    <div className="space-y-4">
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

      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 font-medium text-sm border-b">
          <div>File Column</div>
          <div>Maps To</div>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {mapping.map((m) => {
            const isMapped = m.targetField !== 'skip';

            return (
              <div
                key={m.sourceColumn}
                className={`grid grid-cols-2 gap-4 p-3 border-b last:border-b-0 items-center ${
                  !isMapped ? 'bg-muted/20' : ''
                }`}
              >
                <div className="font-mono text-sm truncate" title={m.sourceColumn}>
                  {m.sourceColumn}
                </div>
                <div>
                  <Select
                    value={m.targetField}
                    onChange={(e) => handleFieldChange(m.sourceColumn, e.target.value)}
                    className="w-full"
                  >
                    {groupedFields.map((group) =>
                      group.fields.length > 0 ? (
                        <optgroup key={group.group} label={group.group}>
                          {group.fields.map((field) => (
                            <option key={field.value} value={field.value}>
                              {field.label}
                            </option>
                          ))}
                        </optgroup>
                      ) : null
                    )}
                  </Select>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Match each column from your file to the corresponding client field. Fields marked with * are required.
        Columns mapped to "Skip" will not be imported.
      </p>
    </div>
  );
}

