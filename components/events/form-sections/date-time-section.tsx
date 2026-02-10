'use client';

import { Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TIMEZONES } from '@/lib/schemas/event.schema';
import { cn } from '@/lib/utils';
import type { DateTimeSectionProps } from './types';

export function DateTimeSection({
  register,
  control,
  errors,
  setValue,
  disabled = false,
  className,
  startTimeTBD,
  setStartTimeTBD,
  endTimeTBD,
  setEndTimeTBD,
}: DateTimeSectionProps) {
  return (
    <div className={cn('bg-accent/5 border border-border/30 p-5 rounded-lg', className)}>
      <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Date & Time</h3>
      <div className="space-y-4">
        <div>
          <Label htmlFor="startDate" required>Start Date</Label>
          <Input
            id="startDate"
            type="date"
            {...register('startDate', {
              onChange: (e) => {
                setValue('endDate', e.target.value);
              },
            })}
            error={!!errors.startDate}
            disabled={disabled}
          />
          {errors.startDate && (
            <p className="text-sm text-destructive mt-1">{errors.startDate.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="startTime">Start Time</Label>
          <div className="flex gap-2">
            <Input
              id="startTime"
              type="time"
              {...register('startTime')}
              error={!!errors.startTime}
              disabled={disabled || startTimeTBD}
              className="flex-1"
            />
            <label className="flex items-center gap-2 whitespace-nowrap">
              <input
                type="checkbox"
                checked={startTimeTBD}
                onChange={(e) => {
                  setStartTimeTBD(e.target.checked);
                  if (e.target.checked) setValue('startTime', '');
                }}
                disabled={disabled}
                className="rounded border-input"
              />
              <span className="text-sm">TBD</span>
            </label>
          </div>
          {errors.startTime && (
            <p className="text-sm text-destructive mt-1">{errors.startTime.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="endDate" required>End Date</Label>
          <Input
            id="endDate"
            type="date"
            {...register('endDate')}
            error={!!errors.endDate}
            disabled={disabled}
          />
          {errors.endDate && (
            <p className="text-sm text-destructive mt-1">{errors.endDate.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="endTime">End Time</Label>
          <div className="flex gap-2">
            <Input
              id="endTime"
              type="time"
              {...register('endTime')}
              error={!!errors.endTime}
              disabled={disabled || endTimeTBD}
              className="flex-1"
            />
            <label className="flex items-center gap-2 whitespace-nowrap">
              <input
                type="checkbox"
                checked={endTimeTBD}
                onChange={(e) => {
                  setEndTimeTBD(e.target.checked);
                  if (e.target.checked) setValue('endTime', '');
                }}
                disabled={disabled}
                className="rounded border-input"
              />
              <span className="text-sm">TBD</span>
            </label>
          </div>
          {errors.endTime && (
            <p className="text-sm text-destructive mt-1">{errors.endTime.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="timezone" required>Timezone</Label>
          <Controller
            name="timezone"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? ''}
                onValueChange={field.onChange}
                disabled={disabled}
              >
                <SelectTrigger id="timezone">
                  <SelectValue placeholder="Select timezone..." />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.timezone && (
            <p className="text-sm text-destructive mt-1">{errors.timezone.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
