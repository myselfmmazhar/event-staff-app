'use client';

import { Controller } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';
import { cn } from '@/lib/utils';
import { PlusIcon } from '@/components/ui/icons';
import { useMemo } from 'react';
import type { ServiceDetailsSectionProps } from './types';

export function ServiceDetailsSection({
  control,
  errors,
  disabled = false,
  className,
  services,
  onCreateService,
}: ServiceDetailsSectionProps) {
  const options = useMemo(
    () =>
      services.map((s) => ({
        value: s.id,
        label: s.title,
      })),
    [services]
  );

  return (
    <div className={cn(className)}>
      <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">
        Service Assignment
      </h3>
      <div className="space-y-4">
        <div>
          <Label htmlFor="serviceIds">Services</Label>
          <div className="mt-1.5 flex flex-col gap-3 sm:flex-row sm:items-start">
            <Controller
              name="serviceIds"
              control={control}
              render={({ field }) => (
                <div className="min-w-0 flex-1">
                  <MultiSelect
                    id="serviceIds"
                    options={options}
                    value={field.value || []}
                    onChange={field.onChange}
                    placeholder="Select services..."
                    disabled={disabled}
                    error={!!errors.serviceIds}
                    searchable
                    searchPlaceholder="Search services..."
                  />
                </div>
              )}
            />
            {onCreateService && (
              <button
                type="button"
                onClick={onCreateService}
                disabled={disabled}
                className="flex shrink-0 items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-primary border border-primary/30 rounded-md hover:bg-primary/10 transition-colors disabled:opacity-50 whitespace-nowrap sm:mt-0 sm:self-stretch sm:py-0 sm:min-h-[36px]"
              >
                <PlusIcon className="h-4 w-4" />
                New Service
              </button>
            )}
          </div>
          {errors.serviceIds && (
            <p className="text-sm text-destructive mt-1">
              {String(errors.serviceIds?.message || '')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
