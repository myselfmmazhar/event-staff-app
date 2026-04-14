'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusIcon, XIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import type { CustomFieldsSectionProps } from './types';

export function CustomFieldsSection({
  register,
  errors,
  disabled = false,
  className,
  customFieldsFieldArray,
}: CustomFieldsSectionProps) {
  const { fields, append, remove } = customFieldsFieldArray;

  return (
    <div className={cn('', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold border-b border-border pb-2 flex-1">Custom Fields</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ label: '', value: '' })}
          disabled={disabled || fields.length >= 20}
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Field
        </Button>
      </div>

      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground">No custom fields added yet</p>
      )}

      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.id}>
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Input
                  {...register(`customFields.${index}.label` as const)}
                  placeholder="Field label"
                  disabled={disabled}
                  error={!!(errors.customFields?.[index]?.label)}
                />
                {errors.customFields?.[index]?.label && (
                  <p className="text-sm text-destructive">
                    {errors.customFields[index]?.label?.message}
                  </p>
                )}
              </div>
              <div className="flex-[2] space-y-1">
                <Input
                  {...register(`customFields.${index}.value` as const)}
                  placeholder="Field value"
                  disabled={disabled}
                  error={!!(errors.customFields?.[index]?.value)}
                />
                {errors.customFields?.[index]?.value && (
                  <p className="text-sm text-destructive">
                    {errors.customFields[index]?.value?.message}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(index)}
                disabled={disabled}
                className="self-start"
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {fields.length >= 20 && (
        <p className="text-sm text-muted-foreground mt-2">Maximum of 20 custom fields reached</p>
      )}
    </div>
  );
}
