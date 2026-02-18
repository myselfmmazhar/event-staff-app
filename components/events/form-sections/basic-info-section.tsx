'use client';

import { Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EventStatus } from '@prisma/client';
import { cn } from '@/lib/utils';
import type { BasicInfoSectionProps } from './types';

const STATUSES: Array<{ value: EventStatus; label: string }> = [
  { value: EventStatus.DRAFT, label: 'Draft' },
  { value: EventStatus.ASSIGNED, label: 'Assigned' },
  { value: EventStatus.IN_PROGRESS, label: 'In Progress' },
  { value: EventStatus.COMPLETED, label: 'Completed' },
  { value: EventStatus.CANCELLED, label: 'Cancelled' },
];

export function BasicInfoSection({
  register,
  control,
  errors,
  disabled = false,
  className,
  clients,
  terminology,
}: BasicInfoSectionProps) {
  return (
    <div className={cn('bg-accent/5 border border-border/30 p-5 rounded-lg', className)}>
      <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Basic Information</h3>
      <div className="space-y-4">
        <div>
          <Label htmlFor="title" required>Title</Label>
          <Input
            id="title"
            {...register('title')}
            error={!!errors.title}
            disabled={disabled}
            placeholder={`${terminology.event.singular} title`}
          />
          {errors.title && (
            <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="clientId">Client</Label>
            <Controller
              name="clientId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value || 'none'}
                  onValueChange={(val) => field.onChange(val === 'none' ? null : val)}
                  disabled={disabled}
                >
                  <SelectTrigger id="clientId">
                    <SelectValue placeholder="Not applicable" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not applicable</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.businessName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.clientId && (
              <p className="text-sm text-destructive mt-1">{errors.clientId.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="status" required>Status</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? ''}
                  onValueChange={field.onChange}
                  disabled={disabled}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.status && (
              <p className="text-sm text-destructive mt-1">{errors.status.message}</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...register('description')}
            disabled={disabled}
            rows={3}
            placeholder={`${terminology.event.singular} description`}
          />
          {errors.description && (
            <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="requirements">Requirements</Label>
          <Textarea
            id="requirements"
            {...register('requirements')}
            disabled={disabled}
            rows={3}
            placeholder="e.g., Business casual attire, Steel-toed boots required, Must have valid driver's license"
          />
          {errors.requirements && (
            <p className="text-sm text-destructive mt-1">{errors.requirements.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
