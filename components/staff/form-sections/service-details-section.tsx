'use client';

import { Controller } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { PlusIcon } from '@/components/ui/icons';
import type { ServiceDetailsSectionProps } from './types';
import { ServiceSelectionTable } from './service-selection-table';

export function ServiceDetailsSection({
  control,
  errors,
  disabled = false,
  className,
  services,
  onCreateService,
}: ServiceDetailsSectionProps) {
  return (
    <div className={cn(className)}>
      <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">
        Service Assignment
      </h3>
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label htmlFor="serviceIds">Services</Label>
            {onCreateService && (
              <button
                type="button"
                onClick={onCreateService}
                disabled={disabled}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary border border-primary/30 rounded-md hover:bg-primary/10 transition-colors disabled:opacity-50"
              >
                <PlusIcon className="h-4 w-4" />
                New Service
              </button>
            )}
          </div>
          <Controller
            name="serviceIds"
            control={control}
            render={({ field }) => (
              <ServiceSelectionTable
                services={services}
                value={field.value || []}
                onChange={field.onChange}
                disabled={disabled}
                error={!!errors.serviceIds}
              />
            )}
          />
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
