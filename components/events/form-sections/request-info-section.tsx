'use client';

import { Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { FormSectionProps } from './types';

export function RequestInfoSection({
  register,
  control,
  disabled = false,
  className,
}: FormSectionProps) {
  return (
    <div className={cn('', className)}>
      <h3 className="text-base font-bold text-slate-900 mb-5">Request Information</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="requestMethod">Request Method</Label>
            <Controller
              name="requestMethod"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? ''}
                  onValueChange={field.onChange}
                  disabled={disabled}
                >
                  <SelectTrigger id="requestMethod">
                    <SelectValue placeholder="Select method..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="TEXT_SMS">Text/SMS</SelectItem>
                    <SelectItem value="PHONE_CALL">Phone Call</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div>
            <Label htmlFor="poNumber">PO Number</Label>
            <Input
              id="poNumber"
              {...register('poNumber')}
              disabled={disabled}
              placeholder="Purchase Order Number"
            />
          </div>

          <div>
            <Label htmlFor="requestorName">Requestor Name</Label>
            <Input
              id="requestorName"
              {...register('requestorName')}
              disabled={disabled}
              placeholder="John Doe"
            />
          </div>

          <div>
            <Label htmlFor="requestorPhone">Requestor Phone</Label>
            <Input
              id="requestorPhone"
              type="tel"
              {...register('requestorPhone')}
              disabled={disabled}
              placeholder="(555) 123-4567"
            />
          </div>

          <div>
            <Label htmlFor="requestorEmail">Requestor Email</Label>
            <Input
              id="requestorEmail"
              type="email"
              {...register('requestorEmail')}
              disabled={disabled}
              placeholder="john@example.com"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
