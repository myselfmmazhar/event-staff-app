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
  startDateUBD,
  setStartDateUBD,
  endDateUBD,
  setEndDateUBD,
  startTimeTBD,
  setStartTimeTBD,
  endTimeTBD,
  setEndTimeTBD,
}: DateTimeSectionProps) {
  return (
    <div className={cn('', className)}>
      <h3 className="text-base font-bold text-slate-900 mb-5">Date & Time</h3>
      <div className="space-y-4">
        {/* Row 1: Start Date + Start Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startDate" required={!startDateUBD}>Start Date</Label>
            <div className="flex gap-2">
              <Input
                id="startDate"
                type="date"
                {...register('startDate', {
                  onChange: (e) => {
                    if (!endDateUBD && e.target.value) {
                      setValue('endDate', e.target.value);
                    }
                  },
                })}
                error={!!errors.startDate}
                disabled={disabled || startDateUBD}
                className="flex-1"
              />
              <label className="flex items-center gap-2 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={startDateUBD}
                  onChange={(e) => {
                    setStartDateUBD(e.target.checked);
                    if (e.target.checked) setValue('startDate', '');
                  }}
                  disabled={disabled}
                  className="rounded border-input"
                />
                <span className="text-sm">TBD</span>
              </label>
            </div>
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
                {...register('startTime', {
                  onChange: (e) => {
                    if (!endTimeTBD && e.target.value) {
                      setValue('endTime', e.target.value);
                    }
                  },
                })}
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
        </div>

        {/* Row 2: End Date + End Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="endDate" required={!endDateUBD}>End Date</Label>
            <div className="flex gap-2">
              <Input
                id="endDate"
                type="date"
                {...register('endDate')}
                error={!!errors.endDate}
                disabled={disabled || endDateUBD}
                className="flex-1"
              />
              <label className="flex items-center gap-2 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={endDateUBD}
                  onChange={(e) => {
                    setEndDateUBD(e.target.checked);
                    if (e.target.checked) setValue('endDate', '');
                  }}
                  disabled={disabled}
                  className="rounded border-input"
                />
                <span className="text-sm">TBD</span>
              </label>
            </div>
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
        </div>

        {/* Row 3: Timezone */}
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
