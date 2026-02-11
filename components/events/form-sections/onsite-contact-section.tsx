'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { FormSectionProps } from './types';

export function OnsiteContactSection({
  register,
  disabled = false,
  className,
}: FormSectionProps) {
  return (
    <div className={cn('bg-accent/5 border border-border/30 p-5 rounded-lg', className)}>
      <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Onsite Contact</h3>
      <div className="space-y-4">
        <div>
          <Label htmlFor="meetingPoint">Meeting Point</Label>
          <Input
            id="meetingPoint"
            {...register('meetingPoint')}
            disabled={disabled}
            placeholder="Where to meet on arrival (e.g., Main lobby, Loading dock)"
          />
        </div>

        <div>
          <Label htmlFor="onsitePocName">POC Name</Label>
          <Input
            id="onsitePocName"
            {...register('onsitePocName')}
            disabled={disabled}
            placeholder="Point of Contact name"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="onsitePocPhone">POC Phone</Label>
            <Input
              id="onsitePocPhone"
              type="tel"
              {...register('onsitePocPhone')}
              disabled={disabled}
              placeholder="(555) 123-4567"
            />
          </div>

          <div>
            <Label htmlFor="onsitePocEmail">POC Email</Label>
            <Input
              id="onsitePocEmail"
              type="email"
              {...register('onsitePocEmail')}
              disabled={disabled}
              placeholder="poc@example.com"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
