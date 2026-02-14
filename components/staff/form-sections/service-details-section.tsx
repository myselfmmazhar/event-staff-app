'use client';

import { Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { ServiceDetailsSectionProps } from './types';

export function ServiceDetailsSection({
  control,
  errors,
  disabled = false,
  className,
  services,
  serviceSearch,
  onServiceSearchChange,
}: ServiceDetailsSectionProps) {
  return (
    <div className={cn('bg-accent/5 border border-border/30 p-5 rounded-lg', className)}>
      <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">
        Service Assignment
      </h3>
      <div className="space-y-4">
        <div>
          <Label htmlFor="serviceSearch">Search Services</Label>
          <Input
            id="serviceSearch"
            type="text"
            value={serviceSearch}
            onChange={(e) => onServiceSearchChange(e.target.value)}
            placeholder="Search services..."
            disabled={disabled}
          />
        </div>

        <div>
          <Label>Select Services</Label>
          <Controller
            name="serviceIds"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-60 overflow-y-auto border rounded-md p-3">
                {services.map((service) => (
                  <label
                    key={service.id}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-accent/10 p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={field.value?.includes(service.id) || false}
                      onChange={(e) => {
                        const currentValue = field.value || [];
                        if (e.target.checked) {
                          field.onChange([...currentValue, service.id]);
                        } else {
                          field.onChange(
                            currentValue.filter((id: string) => id !== service.id)
                          );
                        }
                      }}
                      disabled={disabled}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{service.title}</span>
                  </label>
                ))}
              </div>
            )}
          />
          {errors.serviceIds && (
            <p className="text-sm text-destructive mt-1">{String(errors.serviceIds?.message || "")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
