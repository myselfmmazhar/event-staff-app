'use client';

import { Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EventStatus } from '@prisma/client';
import { cn } from '@/lib/utils';
import type { BasicInfoSectionProps } from './types';
import { ClientSelectWithCreate } from './client-select-with-create';

const STATUSES: Array<{ value: EventStatus; label: string }> = [
  { value: EventStatus.DRAFT, label: 'Draft' },
  { value: EventStatus.PUBLISHED, label: 'Published' },
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
  onClientCreated,
}: BasicInfoSectionProps) {
  return (
    <div className={cn('', className)}>
      <h3 className="text-base font-bold text-slate-900 mb-5">Basic Information</h3>
      <div className="space-y-4">
        {/* Row 1: Title, Client, Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <div>
            <Label htmlFor="clientId">Client</Label>
            <ClientSelectWithCreate
              control={control}
              clients={clients}
              disabled={disabled}
              onClientCreated={onClientCreated}
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

        {/* Row 2: Description, Requirements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
    </div>
  );
}
